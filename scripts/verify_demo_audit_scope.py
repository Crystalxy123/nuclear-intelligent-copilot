"""Regression: delayed audit work must not cross a Demo begin/reset/exit boundary.

Uses isolated browser contexts and a deterministic slow Web Crypto fixture.
Requires the local dev server at localhost:3000 and Python Playwright.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "event-experience" / "demo-audit-scope-validation.json"
DECISION_KEY = "nuclear-copilot:decision-card:DC-2026-00821:v1"
AUDIT_KEY = "nuclear-copilot:evidence-audit:DC-2026-00821:v1"
ORIGINAL_REVIEW = {
    "version": 1, "selected": "A", "status": "approved", "revision": 3,
    "adjustments": {}, "audit": [{
        "id": "original-review-preserved", "timestamp": "2026-10-04T10:00:00.000Z",
        "action": "approved", "plan": "A", "revision": 3,
        "message": "Existing local reviewer record; preserve across presentation scopes.",
    }],
}
passed = []
errors = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)

    def setup():
        context = browser.new_context(viewport={"width": 1672, "height": 1050})
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.add_init_script("""
            const digest = SubtleCrypto.prototype.digest;
            SubtleCrypto.prototype.digest = async function(...args) {
                const delay = window.__auditTestDigestDelay || 0;
                const result = await digest.apply(this, args);
                if (delay) await new Promise(resolve => setTimeout(resolve, delay));
                return result;
            };
        """)
        page.add_init_script(f"localStorage.setItem({json.dumps(DECISION_KEY)}, {json.dumps(json.dumps(ORIGINAL_REVIEW))});")
        page.goto("http://localhost:3000/", wait_until="networkidle")
        return context, page

    def nav_audit(page):
        page.get_by_role("navigation", name="主导航").get_by_title("证据与审计", exact=True).click()
        expect(page.locator(".ea-page")).to_be_visible()

    def complete_demo(page):
        page.get_by_role("button", name="单步演示", exact=True).click()
        for _ in range(12):
            page.get_by_role("button", name="下一步", exact=True).click()
        expect(page.locator(".demo-playback-controls")).to_have_attribute("data-demo-time", "25.00")
        expect(page.locator(".ea-page")).to_be_visible()

    def start_archive(page):
        page.get_by_role("button", name="确认归档", exact=True).click()
        page.get_by_role("button", name="确认保存副本", exact=True).click()

    def close_dialog(page):
        page.get_by_role("dialog").get_by_role("button", name="关闭", exact=True).click()

    def persisted(page, key):
        return page.evaluate("key => JSON.parse(localStorage.getItem(key) || 'null')", key)

    def confirm_preserved(page):
        assert persisted(page, DECISION_KEY) == ORIGINAL_REVIEW
        assert not (persisted(page, AUDIT_KEY) or {}).get("archives", [])
        expect(page.locator(".event-context-bar")).not_to_contain_text("副本已归档")

    for boundary in ("exit", "reset", "begin"):
        context, page = setup()
        if boundary == "begin":
            nav_audit(page)
        else:
            complete_demo(page)
        page.evaluate("window.__auditTestDigestDelay = 1500")
        start_archive(page)
        close_dialog(page)
        if boundary == "begin":
            page.get_by_role("button", name="单步演示", exact=True).click()
        else:
            page.get_by_role("button", name="退出演示" if boundary == "exit" else "重置演示", exact=True).click()
        page.wait_for_timeout(1800)
        confirm_preserved(page)
        if boundary != "exit":
            nav_audit(page)
            expect(page.get_by_role("button", name="确认归档", exact=True)).to_be_visible()
            expect(page.locator(".ea-access-list")).not_to_contain_text("归档本地证据副本")
        passed.append(f"Pending archive cancelled at Demo {boundary}; original review/storage/event preserved")
        print("PASS " + passed[-1], flush=True)
        context.close()

    for boundary in ("exit", "reset"):
        context, page = setup()
        complete_demo(page)
        start_archive(page)
        expect(page.get_by_role("button", name="查看归档", exact=True)).to_be_visible()
        page.get_by_role("button", name="查看签名信息", exact=True).click()
        page.evaluate("window.__auditTestDigestDelay = 1500")
        page.get_by_role("button", name="核对归档摘要", exact=True).click()
        close_dialog(page)
        page.get_by_role("button", name="退出演示" if boundary == "exit" else "重置演示", exact=True).click()
        page.wait_for_timeout(1800)
        confirm_preserved(page)
        records = persisted(page, AUDIT_KEY) or {}
        assert not any(item["action"] == "校验本地归档摘要" for item in records.get("logs", []))
        nav_audit(page)
        expect(page.locator(".ea-access-list")).not_to_contain_text("校验本地归档摘要")
        expect(page.locator(".ea-page")).not_to_contain_text("本地归档内容与保存的 SHA-256 摘要一致。")
        passed.append(f"Pending verification ignored at Demo {boundary}; no stale log, toast or event update")
        print("PASS " + passed[-1], flush=True)
        context.close()

    # Positive control: same-scope archive and verification continue to work and persist.
    context, page = setup()
    nav_audit(page)
    start_archive(page)
    expect(page.get_by_role("button", name="查看归档", exact=True)).to_be_visible()
    page.get_by_role("button", name="查看签名信息", exact=True).click()
    page.get_by_role("button", name="核对归档摘要", exact=True).click()
    expect(page.get_by_role("dialog")).to_contain_text("本地归档内容与保存的 SHA-256 摘要一致。")
    records = persisted(page, AUDIT_KEY)
    assert len(records["archives"]) == 1
    assert records["archives"][0]["payload"]["decision"] == ORIGINAL_REVIEW
    assert any(item["action"] == "校验本地归档摘要" for item in records["logs"])
    assert persisted(page, DECISION_KEY) == ORIGINAL_REVIEW
    passed.append("Same-scope archive and hash verification still persist the original review snapshot")
    print("PASS " + passed[-1], flush=True)
    context.close()
    assert not errors, errors
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"passed": passed, "pageErrors": errors}, ensure_ascii=False, indent=2) + "\n")
    browser.close()
