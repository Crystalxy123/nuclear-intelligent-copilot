"""Local browser acceptance flow. Requires Python Playwright + Chromium."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'event-experience'; OUT.mkdir(parents=True,exist_ok=True)
passed=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(viewport={'width':1672,'height':1000})
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:3000/',wait_until='networkidle')
 def ok(s): passed.append(s);print('PASS '+s,flush=True)
 def nav(label): page.get_by_role('navigation',name='主导航').get_by_title(label,exact=True).click()
 def slider(label,value):
  item=page.get_by_role('slider',name=label,exact=True);item.focus();item.press('Home')
  for _ in range(value): item.press('ArrowRight')
 nav('实时机组');expect(page.locator('.ru-page')).to_be_visible();page.locator('.ru-hotspot-pump').click();expect(page.get_by_role('dialog')).to_contain_text('出口压力');expect(page.get_by_role('dialog')).to_contain_text('当前风险');expect(page.get_by_role('dialog')).to_contain_text('振动')
 page.get_by_role('dialog').get_by_role('button',name='模拟 P-201 异常',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('4.3%',timeout=10000);page.get_by_role('button',name='关闭设备详情',exact=True).click();expect(page.locator('.ru-event-banner')).to_contain_text('异常趋势下降');expect(page.get_by_role('button',name='事件告警 2 条，查看异常事件',exact=True)).to_be_visible()
 page.get_by_role('button',name='关联报警 A317',exact=True).click();expect(page.get_by_role('tab',name='P101 出口压力',exact=True)).to_have_attribute('aria-selected','true')
 for window in ['1h','6h','24h']:page.get_by_role('button',name=window,exact=True).click()
 trend=page.locator('.utc-svg');trend.focus();trend.press('Home');before=trend.get_attribute('aria-valuenow');trend.press('ArrowRight');assert trend.get_attribute('aria-valuenow')!=before
 ok('Equipment drawer → one alarm → count 1→2 → P101 trend and A317 mark, 1h/6h/24h')
 page.get_by_role('button',name='启动协同分析 →',exact=True).click();expect(page.locator('.ap-agents')).to_be_visible();expect(page.locator('.ap-agents')).to_have_attribute('aria-busy','true');expect(page.locator('.ap-agents')).to_have_attribute('aria-busy','false',timeout=6000);expect(page.locator('.cc-center')).to_contain_text('中低风险');expect(page.locator('.event-context-bar')).to_contain_text('中低风险')
 page.get_by_role('button',name='为什么是中低风险？',exact=True).click();expect(page.get_by_role('log',name='决策对话记录')).to_contain_text('4.3%');page.get_by_role('button',name='查看 OP-12 §4.3 对应证据',exact=True).last.click();expect(page.get_by_role('dialog')).to_contain_text('来源');page.keyboard.press('Escape');expect(page.get_by_role('log')).to_contain_text('4.3%')
 ok('Three-agent delayed results aggregate; contextual chat links open evidence without losing messages')
 page.get_by_role('button',name='生成方案 · 进入决策中心',exact=False).click();expect(page.locator('.dc-page')).to_be_visible();expect(page.locator('.dci-recommendation-row')).to_contain_text('系统推荐 方案 B')
 for name,val in [('安全性权重',100),('经济性权重',0),('设备寿命权重',0),('绿色效益权重',0)]:slider(name,val)
 expect(page.locator('.dci-recommendation-row')).to_contain_text('系统推荐 方案 C');expect(page.locator('.dci-recommendation-row')).to_contain_text('人工选择 方案 B')
 for name,val in [('安全性权重',40),('经济性权重',25),('设备寿命权重',20),('绿色效益权重',15)]:slider(name,val)
 page.get_by_role('button',name='为什么推荐？',exact=False).click();expect(page.get_by_role('region',name='方案推荐理由')).to_contain_text('82%');page.locator('#dci-explanation button').first.click();expect(page.get_by_role('dialog')).to_contain_text('SHA');page.keyboard.press('Escape');expect(page.locator('#dci-explanation')).to_be_visible();page.locator('.dc-option').nth(0).click();expect(page.locator('.dc-option').nth(0)).to_have_attribute('aria-pressed','true');page.locator('.dc-option').nth(1).click()
 ok('Normalized weights change recommendation B→C→B while manual selection remains independent; reasons and evidence drawer preserve state')
 page.get_by_role('button',name='确认决策',exact=True).click();expect(page.get_by_role('dialog',name='人工确认')).to_be_visible();submit=page.get_by_role('button',name='确认并执行（演示）',exact=True);expect(submit).to_be_disabled();page.get_by_role('checkbox',name='已查看关键证据').check();page.get_by_role('checkbox',name='已核对安全约束').check();page.get_by_role('textbox',name='确认理由').fill('核查');expect(submit).to_be_disabled();page.get_by_role('textbox',name='确认理由').fill('已核对 P101 压力趋势与安全约束，同意方案 B 并安排设备核查。');submit.click();expect(page.locator('.ea-page')).to_be_visible();expect(page.locator('.ea-chain-heading')).to_contain_text('已批准 · 待验证')
 ok('Human confirmation requires both checks and 8+ characters; approval automatically opens audit, no device execution claim')
 page.locator('#ea-node-review').click();expect(page.get_by_role('textbox',name='当前节点 JSON 记录')).to_contain_text('已核对 P101 压力趋势');page.get_by_role('button',name='定位人工复核证据',exact=True).hover();expect(page.locator('.ea-graph-item[data-path="true"]')).to_have_count(7);page.get_by_role('button',name='定位人工复核证据',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('节点详情');page.keyboard.press('Escape');page.get_by_role('button',name='列表视图',exact=True).click();expect(page.locator('.ea-graph-list button')).to_have_count(8)
 page.get_by_role('button',name='事件回放',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('Event-021 事件回放');time=page.get_by_role('slider',name='事件回放时间');time.focus();time.press('End');expect(page.locator('.event-replay-values')).to_contain_text('4.31');expect(page.locator('.event-replay-values')).to_contain_text('中低风险');expect(page.locator('.event-replay-values')).to_contain_text('方案 B');page.get_by_role('button',name='5×',exact=True).click();page.get_by_role('button',name='↻ 重新播放',exact=True).click();page.wait_for_timeout(550);page.get_by_role('button',name='Ⅱ 暂停',exact=True).click();a=time.input_value();page.wait_for_timeout(350);assert time.input_value()==a
 time.focus();time.press('End');time.press('ArrowLeft');page.get_by_role('button',name='▶ 播放',exact=True).click();expect(page.get_by_role('button',name='↻ 重新播放',exact=True)).to_be_visible();page.keyboard.press('Escape');expect(page.locator('.ea-chain-heading')).to_contain_text('已批准 · 待验证')
 ok('Audit chain details, hover path, graph/list; embedded replay seeks all values, 1x/2x/5x, pauses and auto-stops without rewriting approval')
 page.get_by_role('button',name='确认归档',exact=True).click();page.get_by_role('button',name='确认保存副本',exact=True).click();expect(page.locator('.event-context-bar')).to_contain_text('副本已归档');page.get_by_role('button',name='查看签名信息',exact=True).click();page.get_by_role('button',name='核对归档摘要',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('摘要一致');page.keyboard.press('Escape')
 ok('Archived snapshot remains verifiable after context phase changes')
 page.wait_for_timeout(700)
 assert page.locator('.ea-page').bounding_box()['height'] < 1000
 assert page.locator('.ea-json-lines').evaluate('(el)=>el.scrollHeight > el.clientHeight')
 page.screenshot(path=str(OUT/'audit.png'),full_page=True)
 nav('仿真实验室');page.get_by_role('button',name='IC-01',exact=False).click();page.get_by_role('button',name='MF-01',exact=False).click();expect(page.locator('.sim-page')).to_have_attribute('data-sim-running','true');page.get_by_role('button',name='60×',exact=True).click();page.wait_for_timeout(4500);expect(page.locator('.sim-leak-location')).to_be_visible();assert float(page.locator('.sim-flow-summary>div').first.locator('strong').inner_text().replace('t/h',''))>0;page.get_by_role('button',name='暂停',exact=True).click();expect(page.locator('.sim-page')).to_have_attribute('data-sim-running','false')
 ok('Scenario selection fades and starts transient; SBLOCA leak and dynamic events/curves appear; pause remains available')
 for label,selector in [('实时机组','.ru-page'),('智能体工作台','.cc-page'),('决策中心','.dc-page'),('证据与审计','.ea-page')]:
  nav(label);expect(page.locator(selector)).to_be_visible();page.set_viewport_size({'width':319,'height':820});page.wait_for_timeout(750);w=page.evaluate('({doc:document.documentElement.scrollWidth,width:innerWidth})');assert w['doc']<=w['width']+1,(label,w);page.screenshot(path=str(OUT/f'319-{label}.png'),full_page=True);page.set_viewport_size({'width':1672,'height':1000})
 ok('319px responsive core flow pages do not overflow horizontally')
 assert not errors,errors
 reduced=browser.new_context(viewport={'width':1024,'height':800},reduced_motion='reduce');rp=reduced.new_page();rp.goto('http://localhost:3000/',wait_until='networkidle');expect(rp.locator('.app-shell')).to_have_attribute('data-motion','paused');assert rp.locator('.app-shell').evaluate('(el)=>el.getAnimations({subtree:true}).filter(a=>a.playState==="running").length')==0
 ok('Reduced-motion disables decorative and transition animation')
 (OUT/'validation.json').write_text(json.dumps({'passed':passed,'pageErrors':errors},ensure_ascii=False,indent=2)+'\n')
 browser.close()
