from playwright.sync_api import sync_playwright,expect
import json
from pathlib import Path
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1672,'height':1050});page.goto('http://localhost:3000/',wait_until='networkidle')
 for title in ['实时机组','智能体工作台','决策中心','仿真实验室','证据与审计','运行总览']:
  page.get_by_role('navigation',name='主导航').get_by_title(title,exact=True).click();page.wait_for_timeout(650)
  coords=page.evaluate('''() => { const active=document.querySelector('.motion-navigation button[aria-current]'),h=document.querySelector('.motion-nav-highlight'); const a=active.getBoundingClientRect(),b=h.getBoundingClientRect();return {a:[a.x,a.y,a.width,a.height],b:[b.x,b.y,b.width,b.height],transform:getComputedStyle(h).transform};}''')
  print(title,json.dumps(coords));assert all(abs(a-b)<2 for a,b in zip(coords['a'],coords['b'])),coords
 page.get_by_role('button',name='单步演示',exact=True).click()
 for _ in range(2):page.get_by_role('button',name='下一步',exact=True).click()
 expect(page.locator('.demo-playback-controls')).to_have_attribute('data-demo-time','3.00')
 page.get_by_role('button',name='启动协同分析 →',exact=True).click();expect(page.locator('.ap-agents')).to_have_attribute('aria-busy','true')
 page.get_by_role('button',name='下一步',exact=True).click();expect(page.locator('.demo-playback-controls')).to_have_attribute('data-demo-time','5.00')
 before=page.locator('.event-context-bar').inner_text();page.wait_for_timeout(3300);after=page.locator('.event-context-bar').inner_text()
 assert before==after,(before,after)
 print('PASS manual timers cancelled on Demo step')
 page.get_by_role('button',name='退出演示',exact=True).click()
 page.get_by_role('navigation',name='主导航').get_by_title('决策中心',exact=True).click()
 page.locator('.dc-option').nth(2).click()
 page.get_by_role('button',name='确认决策',exact=True).click()
 page.get_by_role('checkbox',name='已查看关键证据').check()
 page.get_by_role('checkbox',name='已核对安全约束').check()
 page.get_by_label('确认理由',exact=True).fill('保留既有人工复核记录并验证演示退出后的完整恢复。')
 page.get_by_role('button',name='确认并执行（演示）',exact=True).click()
 expect(page.locator('.ea-page')).to_be_visible()
 page.get_by_role('button',name='搜索页面与功能').click()
 page.get_by_role('combobox',name='搜索页面或功能').fill('绿色')
 page.locator('#qn-option-agent-green').click()
 expect(page.get_by_role('heading',name='绿色增效工作台',exact=True)).to_be_visible()
 before=page.evaluate('Object.fromEntries(Object.entries(localStorage))')
 page.get_by_role('button',name='单步演示',exact=True).click()
 for _ in range(4):page.get_by_role('button',name='下一步',exact=True).click()
 expect(page.locator('.ap-agents')).to_be_visible()
 for _ in range(8):page.get_by_role('button',name='下一步',exact=True).click()
 expect(page.locator('.ea-page')).to_be_visible()
 after=page.evaluate('Object.fromEntries(Object.entries(localStorage))');assert before==after,[(k,before.get(k),after.get(k)) for k in set(before)|set(after) if before.get(k)!=after.get(k)]
 page.get_by_role('button',name='退出演示',exact=True).click()
 page.get_by_role('navigation',name='主导航').get_by_title('决策中心',exact=True).click()
 expect(page.locator('.dc-option').nth(2)).to_have_attribute('aria-pressed','true')
 after=page.evaluate('Object.fromEntries(Object.entries(localStorage))')
 for key,original in before.items():
  if 'evidence-audit' in key:
   a,c=json.loads(original),json.loads(after[key])
   assert a['archives']==c['archives'] and a['reviewRequests']==c['reviewRequests']
   assert c['logs'][:len(a['logs'])]==a['logs']
   assert not any('demo-playback-approval' in json.dumps(log) for log in c['logs'])
  else:assert original==after[key]

 page.get_by_role('navigation',name='主导航').get_by_title('证据与审计',exact=True).click()
 page.locator('#ea-node-review').click()
 expect(page.get_by_role('textbox',name='当前节点 JSON 记录')).to_contain_text('保留既有人工复核记录')
 print('PASS Demo starts safety workspace even after green tab; original approved C review survives full presentation')
 Path('artifacts/motion-experience/edges.json').write_text(json.dumps({'checks':['Navigation highlight follows all six pages','Manual timers cancelled on Demo step','Demo safety workspace ignores prior green tab','Existing C approval and review survive Demo entry/completion/exit'],'passed':True},ensure_ascii=False,indent=2))
 b.close()
