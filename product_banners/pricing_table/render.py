#!/usr/bin/env python3
"""pricing_table 렌더러 — stageN.html → PNG(1720px). SUIT 웹폰트 로드 대기 포함.
사용: venv python3 render.py  → stage1_new.png / stage2_new.png 생성.
CDN 반영: gh api PUT repos/SuhanGu0912/widepullup-cdn/contents/verYYMMDD/pricing_stages_vNN_stageN.png
그 후 상품126 description의 이미지 참조 교체(PUT {"shop_no":1,"request":{"description":...}} +헤더)."""
from playwright.sync_api import sync_playwright
import pathlib
BIN="/Users/passionateco.ltd./Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=BIN)
    for st in ['stage1','stage2']:
        url="file://"+str(pathlib.Path(st+".html").resolve())
        pg=b.new_page(viewport={"width":1720,"height":1000}, device_scale_factor=1)
        pg.goto(url); pg.wait_for_timeout(1800)
        h=pg.evaluate("document.querySelector('.wrap').getBoundingClientRect().height")
        pg.set_viewport_size({"width":1720,"height":int(h)}); pg.wait_for_timeout(300)
        pg.locator(".wrap").screenshot(path=st+"_new.png"); pg.close()
    b.close()
