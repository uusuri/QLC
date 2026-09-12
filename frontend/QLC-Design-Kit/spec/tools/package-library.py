from ui_common import *
import collections
items=json.loads((ROOT/'data/primitive-specimens.json').read_text())+json.loads((ROOT/'data/domain-workspace-specimens.json').read_text())
(ROOT/'data/ui-specimens.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n')
families=collections.defaultdict(list)
for it in items:families[it['component']].append(it)
imports=ROOT/'figma-import';imports.mkdir(exist_ok=True)
records=[]
for name,variants in families.items():
 if name.startswith('Progress/') or name in ['Achievement/Progress','Level/Badge','XP/Reward']:
  variants=[next((v for v in variants if v['state'] in ['37.6','83.7','default','25','1']),variants[0])]+[v for v in variants if v['state'] in ['unavailable','indeterminate','pending']]
 width=max(v['width'] for v in variants)+40;cellh=max(v['height'] for v in variants)+40;cols=min(4,len(variants));rows=math.ceil(len(variants)/cols);nodes=[]
 for i,v in enumerate(variants):
  node=embedded(ROOT/v['file'],(i%cols)*width,(i//cols)*cellh,v['width'],v['height'],'v'+str(i))
  root=ET.fromstring(node);root.set('id',name.replace('/','-')+'--'+('State-'+v['state'])+('--Size-'+v['sizeVariant'] if v.get('sizeVariant') else ''));nodes.append(ET.tostring(root,encoding='unicode'))
 filename=name.lower().replace('/','-')+'.svg';(imports/filename).write_text(svg(cols*width,rows*cellh,''.join(nodes),name))
 records.append(dict(component=name,file='figma-import/'+filename,visualFrames=len(variants),status='Native editable SVG frames; not pre-bound components',numericValues='Only one determinate specimen; values remain data'))
(ROOT/'data/figma-import-manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')

# One browseable offline gallery. No remote scripts, libraries or media.
cards=[]
for it in items:
 cards.append('<article data-search="'+esc(it['component']+' '+it['state']+' '+str(it.get('sizeVariant') or ''))+'"><header><b>'+esc(it['component'])+'</b><span>'+esc(it['state']+' '+str(it.get('sizeVariant') or ''))+'</span></header><a href="'+esc(it['file'])+'" target="_blank"><img loading="lazy" width="'+str(it['width'])+'" height="'+str(it['height'])+'" src="'+esc(it['file'])+'" alt="'+esc(it['component']+' '+it['state'])+'"></a></article>')
page='''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QLC / Библиотека интерфейса</title><style>
*{box-sizing:border-box}body{margin:0;background:#0a0a0a;color:#f5f5ef;font:15px/1.55 Arial,sans-serif}main{padding:32px;max-width:1720px;margin:auto}h1{font-size:36px;font-weight:500;margin:0 0 12px}p{max-width:850px;color:#a6a6a0}nav{display:flex;gap:20px;flex-wrap:wrap}a{color:#c4ff00}input{display:block;background:#101210;color:#f5f5ef;border:1px solid #66705d;padding:14px 16px;font:inherit;width:100%;max-width:640px;margin:24px 0}input:focus{outline:2px solid #c4ff00;outline-offset:3px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px;align-items:start}article{border:1px solid #32372e;min-width:0;overflow:hidden}article header{padding:14px 18px;background:#171a16;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:13px}article span{color:#a6a6a0}article>a{display:flex;min-height:90px;padding:16px;align-items:center;justify-content:center}article img{display:block;max-width:100%;height:auto;object-fit:contain}article[hidden]{display:none}.meta{font:12px monospace;color:#c4ff00}button{min-height:44px;background:none;border:1px solid #66705d;color:#f5f5ef;padding:8px 16px;cursor:pointer}aside{border-left:2px solid #c4ff00;padding-left:16px;margin:20px 0}@media(max-width:600px){main{padding:20px}h1{font-size:28px}}
</style><main><div class="meta">QLC / UI LIBRARY / V2</div><h1>Элементы интерфейса</h1><p>Редактируемые SVG-исходники в утверждённом направлении QLC. Это визуальные элементы и примеры состояний; поведение, Auto Layout и связь с variables задаются при сборке компонентов в Figma.</p><nav><a href="README.md">Что в наборе</a><a href="components.md">Спецификация компонентов</a><a href="screens-and-navigation.md">Страницы и навигация</a><a href="assets/course-identity-contact-sheet.png">20 курсов</a><a href="../achievement-contact-sheet.png">30 значков достижений</a></nav><aside>Состояния оплаты, XP и новых механик — демонстрационные. Существующий редактор Monaco сохраняется. Значения прогресса непрерывные: числовые примеры не становятся variants.</aside><input id="q" type="search" placeholder="Поиск: Button, Input, Course, Incident…" aria-label="Поиск компонентов"><p id="count"></p><div class="grid">'''+''.join(cards)+'''</div></main><script>const q=document.getElementById('q'),a=[...document.querySelectorAll('article')],count=document.getElementById('count');function filter(){let n=0;const s=q.value.toLowerCase();for(const el of a){el.hidden=!el.dataset.search.toLowerCase().includes(s);if(!el.hidden)n++}count.textContent=n+' элементов / '+a.length;}q.addEventListener('input',filter);filter();</script></html>'''
(ROOT/'index.html').write_text(page)

# Compact visual audit boards: show each family once, plus substantive edge states.
preview=ROOT/'previews';preview.mkdir(exist_ok=True)
for group in ['01-controls','02-navigation','03-feedback','04-progression','05-domain','06-learning','07-commerce']:
 selected=[]
 for name,vs in families.items():
  if group not in vs[0]['file']:continue
  selected.append(next((v for v in vs if v.get('sizeVariant') in [None,'M']),vs[0]))
 for chunk in range(math.ceil(len(selected)/9)):
  rows=selected[chunk*9:(chunk+1)*9];bw=1536;cellw=488;cellh=490;bh=70+math.ceil(len(rows)/3)*cellh;body=rect(0,0,bw,bh,'ink')+text(24,35,'QLC / '+group+' / '+str(chunk+1),20,'paper',500)
  for j,v in enumerate(rows):
   x=24+(j%3)*504;y=64+(j//3)*cellh;scale=min(1,cellw/v['width'],(cellh-60)/v['height']);body+=text(x,y+20,v['component'],15,'muted')+embedded(ROOT/v['file'],x,y+42,v['width']*scale,v['height']*scale,'p'+str(j))
  (preview/f'{group}-{chunk+1}.svg').write_text(svg(bw,bh,body,group))
print(len(items),'UI specimens;',len(families),'families;',len(records),'SVG import sets')
