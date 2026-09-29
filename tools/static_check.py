#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
知行书城 - 代码静态审查脚本(无需安装任何依赖,Python 3 标准库)

检查项:
  1. 所有 .json 文件可被解析
  2. app.json 里注册的每个页面都有 js/json/wxml 文件;tabBar 页面必须在 pages 里
  3. 所有业务 .js 通过 node --check 语法检查(本机装有 node 时)
  4. 所有 .wxml 标签配平(捕获未闭合/错配)
  5. 代码中的页面跳转路径必须已在 app.json 注册;switchTab 目标必须是 tabBar 页
  6. WXAPI.xxx() 调用的方法必须存在于 miniprogram_npm/apifm-wxapi 构建产物中
  7. 已裁剪模块(cps/fx/直播/VOP/分销等)不允许有残留引用

用法: python tools/static_check.py
"""
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {'.git', 'node_modules', 'miniprogram_npm', 'typings', 'tools'}
CODE_DIRS = ['pages', 'utils', 'components', 'custom-tab-bar']

issues = []   # 错误
warns = []    # 警告


def rel(p):
    return os.path.relpath(p, ROOT).replace('\\', '/')


def iter_code_files(ext):
    for d in CODE_DIRS:
        base = os.path.join(ROOT, d)
        if not os.path.isdir(base):
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            for fn in filenames:
                if fn.endswith(ext):
                    yield os.path.join(dirpath, fn)
    for fn in ('app.js', 'config.js'):
        p = os.path.join(ROOT, fn)
        if os.path.exists(p):
            yield p


# ---------- 1. JSON ----------
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fn in filenames:
        if fn.endswith('.json'):
            p = os.path.join(dirpath, fn)
            try:
                json.load(io.open(p, encoding='utf-8'))
            except Exception as e:
                issues.append('JSON 解析失败 %s: %s' % (rel(p), e))

# ---------- 2. app.json ----------
appjson = json.load(io.open(os.path.join(ROOT, 'app.json'), encoding='utf-8'))
all_pages = list(appjson['pages'])
for sub in appjson.get('subpackages', []):
    all_pages += [sub['root'] + '/' + p for p in sub['pages']]
page_set = set(all_pages)
tab_set = set(t['pagePath'] for t in appjson['tabBar']['list'])

for pg in all_pages:
    for ext in ('.js', '.json', '.wxml'):
        if not os.path.exists(os.path.join(ROOT, pg + ext)):
            issues.append('app.json 页面缺少文件: %s%s' % (pg, ext))
for tp in tab_set:
    if tp not in page_set:
        issues.append('tabBar 页面未注册: %s' % tp)

# ---------- 3. JS 语法(node --check) ----------
js_files = list(iter_code_files('.js'))
node_ok = True
try:
    subprocess.check_output(['node', '--version'])
except Exception:
    node_ok = False
    warns.append('未检测到 node,跳过 JS 语法检查')
if node_ok:
    for f in js_files:
        r = subprocess.run(['node', '--check', f], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if r.returncode != 0:
            issues.append('JS 语法错误 %s:\n%s' % (rel(f), r.stderr.decode('utf-8', 'ignore').strip()))

# ---------- 4. WXML 标签配平 ----------
VOID_TAGS = {'input', 'image', 'import', 'include', 'switch', 'slider', 'progress',
             'icon', 'checkbox', 'radio', 'picker-view-column', 'canvas', 'camera'}
TAG_RE = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9_-]*)((?:"[^"]*"|\'[^\']*\'|[^>"\'])*?)(/?)>')

for f in iter_code_files('.wxml'):
    s = io.open(f, encoding='utf-8').read()
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    s = re.sub(r'<wxs[^>]*>[\s\S]*?</wxs>', '', s, flags=re.I)
    stack = []
    ok = True
    for m in TAG_RE.finditer(s):
        close, name, _attrs, selfclose = m.groups()
        if close:
            if name.lower() in VOID_TAGS:
                # <image>...</image> 显式闭合也是合法的,跳过
                continue
            if not stack or stack[-1] != name:
                top = stack[-1] if stack else 'EMPTY'
                issues.append('WXML 标签错配 %s: </%s> 但当前未闭合标签是 <%s>' % (rel(f), name, top))
                ok = False
                while stack and stack[-1] != name:
                    stack.pop()
                if stack:
                    stack.pop()
            else:
                stack.pop()
        elif not selfclose and name.lower() not in VOID_TAGS:
            stack.append(name)
    if ok and stack:
        issues.append('WXML 有未闭合标签 %s: %s' % (rel(f), ', '.join(stack)))

# ---------- 5. 路由一致性 ----------
for f in list(iter_code_files('.js')) + list(iter_code_files('.wxml')):
    s = io.open(f, encoding='utf-8').read()
    for m in re.finditer(r'/pages/[a-zA-Z0-9/_-]+', s):
        path = m.group(0).lstrip('/')
        # 跳过 import/include 的模板引用
        ctx = s[max(0, m.start() - 40):m.start()]
        if 'import src' in ctx or 'include src' in ctx:
            continue
        if path not in page_set:
            issues.append('跳转到未注册页面 %s: %s' % (rel(f), m.group(0)))
    # wx.switchTab({ url: '...' }):目标必须是 tabBar 页
    for m in re.finditer(r'switchTab\(\s*\{[\s\S]{0,80}?url:\s*[\'"]([^\'"]+)[\'"]', s):
        path = m.group(1).split('?')[0].lstrip('/')
        if path in page_set and path not in tab_set:
            warns.append('switchTab 目标不是 tabBar 页 %s: %s' % (rel(f), path))
    # <navigator open-type="switchTab" url="...">:目标必须是 tabBar 页
    for m in re.finditer(r'<navigator[^>]*open-type="switchTab"[^>]*>', s):
        mm = re.search(r'url="([^"]+)"', m.group(0))
        if mm:
            path = mm.group(1).split('?')[0].lstrip('/')
            if path in page_set and path not in tab_set:
                warns.append('switchTab 目标不是 tabBar 页 %s: %s' % (rel(f), path))

# ---------- 6. WXAPI 方法存在性 ----------
bundle_path = os.path.join(ROOT, 'miniprogram_npm', 'apifm-wxapi', 'index.js')
wxapi_methods = set()
if os.path.exists(bundle_path):
    bundle = io.open(bundle_path, encoding='utf-8').read()
    wxapi_methods = set(re.findall(r'\n  ([a-zA-Z0-9_]+): function', bundle))
for f in js_files:
    s = io.open(f, encoding='utf-8').read()
    for m in re.finditer(r'WXAPI\.([a-zA-Z0-9_]+)\(', s):
        name = m.group(1)
        if wxapi_methods and name not in wxapi_methods:
            issues.append('WXAPI 方法不存在 %s: %s()' % (rel(f), name))

# ---------- 7. 已裁剪模块残留 ----------
LEFTOVER_RE = re.compile(
    r'packageCps|packageFx|packageStreamMedia|marketing/|game/numberBomb|jdvop|cps_jd|vop_jd'
    r'|bindSeller|sphpay|sdkAppID|peisongMember|memberCheckedChange|pages/(start|test|live|recycle'
    r'|qingdan|raffle|maidan|peisong|deposit|list-vop)|goods-details/vop')
for f in list(iter_code_files('.js')) + list(iter_code_files('.wxml')):
    s = io.open(f, encoding='utf-8').read()
    for m in LEFTOVER_RE.finditer(s):
        warns.append('已裁剪模块残留 %s: %s' % (rel(f), m.group(0)))

# ---------- 输出 ----------
print('=' * 60)
print('知行书城 静态审查报告')
print('=' * 60)
for w in warns:
    print('[警告] %s' % w)
for i in issues:
    print('[错误] %s' % i)
print('-' * 60)
print('警告 %d 个,错误 %d 个' % (len(warns), len(issues)))
if issues:
    sys.exit(1)
