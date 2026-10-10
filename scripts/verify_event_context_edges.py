"""Focused Event-021 regressions; all browser storage lives in disposable contexts."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

REPORT = Path('artifacts/event-context-edge-validation.json')
checks = []

def check(name, passed, detail):
    checks.append({'test': name, 'passed': bool(passed), 'detail': detail})

def ready(page):
    page.goto('http://localhost:3000')
    page.wait_for_timeout(1500)

def analyze(page, wait=True):
    page.get_by_title('智能体工作台', exact=True).click()
    page.get_by_role('button', name='启动协同分析', exact=True).click()
    if wait:
        page.wait_for_timeout(3500)

def archive(page):
    page.get_by_title('证据与审计', exact=True).click()
    page.get_by_role('button', name='确认归档', exact=True).click()
    page.get_by_role('button', name='确认保存副本', exact=True).click()
    expect(page.locator('.event-context-phase')).to_have_text('副本已归档')

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width':1672,'height':941}, reduced_motion='reduce')
    page = context.new_page()
    ready(page)
    analyze(page, wait=False)
    archive(page)
    page.wait_for_timeout(3500)
    phase = page.locator('.event-context-phase').inner_text()
    check('分析完成回调不覆盖已归档阶段', phase == '副本已归档', {'phase':phase})
    page.get_by_role('button', name='搜索页面与功能').click()
    page.get_by_role('combobox', name='搜索页面或功能').fill('新能源')
    page.locator('#qn-option-agent-energy').click()
    page.get_by_role('button', name='生成协同计划', exact=False).click()
    page.get_by_role('button', name='提交决策复核 →', exact=True).click()
    page.get_by_role('button', name='确认更新并前往', exact=True).click()
    expect(page.locator('.dc-page')).to_be_visible()
    phase = page.locator('.event-context-phase').inner_text()
    record_text = page.locator('.event-context-record').inner_text()
    check('归档后新能源修订进入人工复核', phase == '人工复核' and 'r2' in record_text and '待确认' in record_text, {'phase':phase,'record':record_text})
    context.close()

    context = browser.new_context(viewport={'width':1672,'height':941}, reduced_motion='reduce')
    page = context.new_page()
    ready(page)
    analyze(page)
    page.get_by_title('决策中心', exact=True).click()
    for label, key in [('安全性权重','End'),('经济性权重','Home'),('设备寿命权重','Home'),('绿色效益权重','Home')]:
        page.get_by_role('slider',name=label,exact=True).focus()
        page.keyboard.press(key)
    page.locator('.dc-option').filter(has_text='进入保守运行模式').click()
    page.get_by_role('button',name='确认决策',exact=True).click()
    page.get_by_role('checkbox',name='已查看关键证据').check()
    page.get_by_role('checkbox',name='已核对安全约束').check()
    page.get_by_label('确认理由',exact=True).fill('优先保障安全性并持续跟踪主泵参数。')
    page.get_by_role('button',name='确认并执行（演示）',exact=True).click()
    expect(page.locator('.ea-page')).to_be_visible()
    page.reload()
    page.wait_for_timeout(1300)
    text = page.locator('.event-context-bar').inner_text()
    check('原标签刷新保留已确认阶段与推荐C', '人工复核' in text and '方案 C' in text and '已确认' in text, text)
    other = context.new_page()
    ready(other)
    other.get_by_title('决策中心',exact=True).click()
    labels = ['安全性权重','经济性权重','设备寿命权重','绿色效益权重']
    weights = [other.get_by_role('slider',name=label,exact=True).input_value() for label in labels]
    recommendation = other.locator('.event-context-plan').inner_text()
    check('新标签恢复已确认审核权重与推荐', weights == ['100','0','0','0'] and '方案 C' in recommendation, {'weights':weights,'recommendation':recommendation})
    context.close()
    browser.close()

REPORT.write_text(json.dumps(checks, ensure_ascii=False, indent=2))
print(REPORT.read_text())
raise SystemExit(0 if all(item['passed'] for item in checks) else 1)
