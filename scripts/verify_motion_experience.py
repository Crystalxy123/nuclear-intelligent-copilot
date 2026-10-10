"""UI acceptance for the animation presentation; isolated Chromium contexts."""
from pathlib import Path
import json,time
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'artifacts'/'motion-experience';OUT.mkdir(parents=True,exist_ok=True)
passed=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(viewport={'width':1672,'height':1000})
 page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
 page.on('console',lambda message:errors.append(message.text) if message.type=='error' else None)
 page.goto('http://localhost:3000/',wait_until='networkidle')
 def ok(name):passed.append(name);print('PASS '+name,flush=True)
 def nav(name):page.get_by_role('navigation',name='主导航').get_by_title(name,exact=True).click()
 def store():return page.evaluate('Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes("decision-card")))')
 initial=store(); dp=page.locator('.demo-playback-controls')
 page.get_by_role('button',name='演示一次完整事故流程',exact=False).click();expect(dp).to_have_attribute('data-demo-status','playing');page.wait_for_timeout(1400);expect(page.locator('.ru-page')).to_be_visible()
 dp.get_by_role('button',name='暂停演示',exact=False).click();frozen=dp.get_attribute('data-demo-time');page.wait_for_timeout(600);assert dp.get_attribute('data-demo-time')==frozen
 page.get_by_role('button',name='继续演示',exact=False).click();page.wait_for_timeout(500);assert dp.get_attribute('data-demo-time')!=frozen
 nav('证据与审计');expect(dp).to_have_attribute('data-demo-status','paused');expect(page.locator('.dp-note')).to_contain_text('手动操作')
 page.get_by_role('button',name='重置演示',exact=True).click();expect(dp).to_have_attribute('data-demo-time','0.00');expect(page.locator('.event-context-bar')).to_contain_text('低风险');expect(page.get_by_role('button',name='事件告警 1 条，查看决策中心')).to_be_visible()
 ok('Automatic flow pauses/resumes, manual navigation pauses, Reset restores monitoring without reload')
 page.get_by_role('button',name='下一步',exact=True).click();page.get_by_role('button',name='下一步',exact=True).click();expect(page.locator('.ru-page')).to_be_visible();expect(dp).to_have_attribute('data-demo-time','3.00')
 page.get_by_role('button',name='下一步',exact=True).click();expect(page.get_by_role('button',name='事件告警 2 条，查看异常事件')).to_be_visible()
 for _ in range(4):page.get_by_role('button',name='下一步',exact=True).click()
 expect(page.locator('.event-context-bar')).to_contain_text('中低风险');expect(page.locator('.ap-agent')).to_have_count(3)
 page.get_by_role('button',name='下一步',exact=True).click();expect(page.locator('.dc-page')).to_be_visible()
 for _ in range(2):page.get_by_role('button',name='下一步',exact=True).click()
 expect(page.get_by_role('dialog')).to_contain_text('自动演示');page.get_by_role('button',name='下一步',exact=True).click();page.get_by_role('button',name='下一步',exact=True).click();expect(page.locator('.ea-page')).to_be_visible();expect(dp).to_have_attribute('data-demo-status','complete');expect(page.locator('.ea-chain-heading')).to_contain_text('已批准')
 assert store()==initial
 ok('Single step traverses alarm → 3 agents → recommendation → clearly marked review example → audit; persistent decision unchanged')
 page.get_by_role('button',name='事件回放',exact=True).click();page.get_by_role('slider',name='事件回放时间').focus();page.get_by_role('slider',name='事件回放时间').press('End');expect(page.locator('.event-replay-values')).to_contain_text('4.31')
 page.get_by_role('button',name='重置回放',exact=True).click();expect(page.get_by_role('slider',name='事件回放时间')).to_have_value('0');page.get_by_role('button',name='▶ 播放',exact=True).click();page.wait_for_timeout(600);page.get_by_role('button',name='Ⅱ 暂停',exact=True).click();clock=page.get_by_role('slider',name='事件回放时间').input_value();page.wait_for_timeout(500);assert page.get_by_role('slider',name='事件回放时间').input_value()==clock;page.keyboard.press('Escape')
 page.get_by_role('button',name='退出演示',exact=True).click();expect(dp).to_have_attribute('data-demo-active','false');assert store()==initial
 ok('Embedded replay can play after presentation completion; Pause freezes, Reset returns zero; Exit restores original records')
 page.get_by_role('button',name='演示一次完整事故流程',exact=False).click()
 expect(dp).to_have_attribute('data-demo-status','complete',timeout=31000);expect(page.locator('.ea-page')).to_be_visible();expect(page.locator('.ea-chain-heading')).to_contain_text('已批准');assert store()==initial
 page.screenshot(path=str(OUT/'automatic-audit.png'),full_page=True)
 page.get_by_role('button',name='退出演示',exact=True).click()
 ok('25-second uninterrupted automatic presentation reaches audit, including review example, with no saved-data overwrite')
 page.set_viewport_size({'width':319,'height':820});page.get_by_role('button',name='单步演示',exact=True).click();page.wait_for_timeout(300);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(OUT/'319-controls.png'),full_page=True);page.get_by_role('button',name='退出演示',exact=True).click()
 ok('Presentation controls stay usable at 319px without horizontal overflow')
 reduced=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce');rp=reduced.new_page();rp.goto('http://localhost:3000/',wait_until='networkidle');expect(rp.locator('.app-shell')).to_have_attribute('data-motion','paused');assert rp.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0
 rp.get_by_role('button',name='单步演示',exact=True).click();rp.get_by_role('button',name='下一步',exact=True).click();rp.get_by_role('button',name='下一步',exact=True).click();rp.get_by_role('button',name='下一步',exact=True).click();expect(rp.get_by_role('button',name='事件告警 2 条，查看异常事件')).to_be_visible();rp.get_by_role('button',name='退出演示',exact=True).click()
 ok('Reduced-motion disables decorative animation while data, steps, and alarm continue to function')
 assert not errors,errors
 (OUT/'validation.json').write_text(json.dumps({'passed':passed,'consoleAndPageErrors':errors},ensure_ascii=False,indent=2)+'\n');browser.close()
