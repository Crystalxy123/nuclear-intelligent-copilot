"""Focused pause/resume and desktop rendering sample (not a hardware benchmark)."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright,expect
out=Path('artifacts/motion-experience');out.mkdir(parents=True,exist_ok=True)
errors=[];samples=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1672,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://localhost:3000/',wait_until='networkidle')
 for label in ['运行总览','实时机组','智能体工作台','决策中心','证据与审计']:
  page.get_by_role('navigation',name='主导航').get_by_title(label,exact=True).click();page.wait_for_timeout(1400)
  profile=page.evaluate('''async()=>{const frames=[];let previous=performance.now();await new Promise(resolve=>{function next(now){frames.push(now-previous);previous=now;if(frames.length<90)requestAnimationFrame(next);else resolve();}requestAnimationFrame(next)});const sorted=frames.slice(1).sort((a,b)=>a-b);return {viewport:[innerWidth,innerHeight],animationCount:document.getAnimations().filter(a=>a.playState==="running").length,medianFrameMs:sorted[Math.floor(sorted.length/2)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],framesAbove50ms:sorted.filter(v=>v>50).length,pageHeight:document.documentElement.scrollHeight}}''')
  samples.append({'page':label,**profile})
  if label=='实时机组':
   page.evaluate('window.__motionRotor=document.querySelector(".twin-pump-rotor").getAnimations()[0]')
   page.get_by_role('button',name='暂停页面动画',exact=True).click();expect(page.locator('.app-shell')).to_have_attribute('data-motion','paused');stamp=page.evaluate('window.__motionRotor.currentTime');page.wait_for_timeout(400);assert abs(page.evaluate('window.__motionRotor.currentTime')-stamp)<30;assert page.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0
   page.get_by_role('button',name='开启页面动画',exact=True).click();page.wait_for_timeout(180);assert page.evaluate('window.__motionRotor === document.querySelector(".twin-pump-rotor").getAnimations()[0]');assert page.evaluate('window.__motionRotor.currentTime')>stamp
  if label=='决策中心':
   page.evaluate('window.__motionCards=[...document.querySelectorAll(".dc-option")].map(el=>el.getAnimations()[0])');page.get_by_role('button',name='暂停页面动画',exact=True).click();page.get_by_role('button',name='开启页面动画',exact=True).click();page.wait_for_timeout(90);assert page.evaluate('window.__motionCards.every((a,i)=>a===document.querySelectorAll(".dc-option")[i].getAnimations()[0] && a.playState==="finished")')
  page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(out/(label+'.png')),full_page=False)
 assert not errors,errors
 (out/'performance.json').write_text(json.dumps({'samples':samples,'checks':['ambient animation pauses in place and resumes same instance','completed card entrances do not replay on pause toggle'],'pageErrors':errors,'scope':'Local Chromium 1672×1000 short sample; hardware-specific FPS is not guaranteed.'},ensure_ascii=False,indent=2)+'\n');print(json.dumps(samples,ensure_ascii=False,indent=2));b.close()
