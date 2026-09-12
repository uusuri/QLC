from pathlib import Path
import json,xml.etree.ElementTree as E
from PIL import ImageFont
ROOT=Path(__file__).resolve().parents[1]
bad=[];xml_bad=[];fontcache={}
items=json.loads((ROOT/'data/ui-specimens.json').read_text())
for it in items:
 f=ROOT/it['file']
 try:r=E.parse(f).getroot()
 except Exception as e:xml_bad.append([str(f),str(e)]);continue
 w,h=float(r.get('width')),float(r.get('height'))
 for n in r.findall('{http://www.w3.org/2000/svg}text'):
  v=''.join(n.itertext());s=float(n.get('font-size','16'));mono='Mono' in n.get('font-family','');key=(mono,s)
  if key not in fontcache:fontcache[key]=ImageFont.truetype('/System/Library/Fonts/Menlo.ttc' if mono else '/System/Library/Fonts/Supplemental/Arial.ttf',round(s))
  tw=fontcache[key].getlength(v);x,y=float(n.get('x')),float(n.get('y'));a=n.get('text-anchor','start');x-=tw if a=='end' else tw/2 if a=='middle' else 0
  if x < -1 or x+tw>w+1 or y>h+1 or y-s< -1:bad.append({'file':it['file'],'text':v,'bounds':[round(x,1),y-s,round(x+tw,1),y],'canvas':[w,h]})
result={'method':'AllSVG XML parsing; top-level text measured using local Arial/Menlo fallback. Does not prove all text overlap, nested geometry, Figma fonts or Auto Layout.','svgCount':len(items),'xmlErrors':xml_bad,'textBoundaryIssues':bad}
(ROOT/'data/visual-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False,indent=2))
