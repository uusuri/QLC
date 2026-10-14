from pathlib import Path
from html import escape
import json, re, math, textwrap
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT.parent
C={'ink':'#0A0A0A','surface':'#101210','raised':'#171A16','paper':'#F5F5EF','muted':'#A6A6A0','lime':'#C4FF00','blue':'#4433EE','info':'#B3ACFF','line':'#32372E','control':'#66705D','error':'#FF8074','warn':'#E9D774'}
def esc(t):return escape(str(t),quote=True)
def rect(x,y,w,h,fill='none',stroke=None,r=0,sw=1,opacity=1):return f'<rect x="{x}" y="{y}" width="{max(0,w)}" height="{max(0,h)}" rx="{r}" fill="{C.get(fill,fill)}"'+(f' stroke="{C.get(stroke,stroke)}" stroke-width="{sw}"' if stroke else '')+f' opacity="{opacity}"/>'
def line(x1,y1,x2,y2,color='line',sw=1):return f'<path d="M{x1} {y1}H{x2}" stroke="{C.get(color,color)}" stroke-width="{sw}"/>' if y1==y2 else f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{C.get(color,color)}" stroke-width="{sw}"/>'
def path(d,color='paper',sw=2,fill='none'):return f'<path d="{d}" fill="{C.get(fill,fill)}" stroke="{C.get(color,color)}" stroke-width="{sw}" stroke-linecap="square" stroke-linejoin="miter"/>'
def circle(cx,cy,r,color='paper',sw=2,fill='none'):return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{C.get(fill,fill)}" stroke="{C.get(color,color)}" stroke-width="{sw}"/>'
def text(x,y,t,size=16,color='paper',weight=400,mono=False,anchor=None):
 return f'<text x="{x}" y="{y}" font-family="{("IBM Plex Mono, monospace" if mono else "Inter, Arial, sans-serif")}" font-size="{size}" font-weight="{weight}" fill="{C.get(color,color)}"'+(f' text-anchor="{anchor}"' if anchor else '')+f'>{esc(t)}</text>'
def wrapped(x,y,t,width,size=16,color='muted',leading=None,maxlines=None):
 lead=leading or size*1.5; result=''; lines=[]
 for para in t.split('\n'):lines.extend(textwrap.wrap(para,width=max(8,int(width/(size*.58))),break_long_words=False) or [''])
 if maxlines and len(lines)>maxlines:lines=lines[:maxlines];lines[-1]=lines[-1].rstrip('., ')+'…'
 for i,l in enumerate(lines):result+=text(x,y+i*lead,l,size,color)
 return result
def icon(name,x,y,size=20,color='paper'):
 d={'arrow-left':'M20 12H4M10 6L4 12L10 18','arrow':'M4 12H20M14 6L20 12L14 18','chevron':'M6 9L12 15L18 9','check':'M4 12L9 17L20 6','close':'M6 6L18 18M18 6L6 18','plus':'M12 4V20M4 12H20','minus':'M4 12H20','search':'M10 3A7 7 0 1 0 10 17A7 7 0 1 0 10 3M15 15L21 21','lock':'M7 10V7A5 5 0 0 1 17 7V10M5 10H19V21H5Z','menu':'M4 6H20M4 12H20M4 18H20','filter':'M3 6H21M6 12H18M9 18H15','code':'M8 6L2 12L8 18M16 6L22 12L16 18M14 3L10 21','eye':'M2 12Q12 0 22 12Q12 24 2 12M12 8A4 4 0 1 0 12 16A4 4 0 1 0 12 8','clock':'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2M12 6V12L16 15','warning':'M12 3L22 21H2ZM12 9V14M12 17V18','info':'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2M12 10V17M12 6V7','diamond':'M12 2L22 12L12 22L2 12Z','play':'M7 3L21 12L7 21Z','copy':'M8 8H21V21H8ZM3 16V3H16','grid':'M3 3H9V9H3ZM15 3H21V9H15ZM3 15H9V21H3ZM15 15H21V21H15Z','refresh':'M20 8A9 9 0 1 0 20 17M20 2V8H14','dots':'M4 12H5M11 12H12M18 12H19','user':'M8 6A4 4 0 1 0 16 6A4 4 0 1 0 8 6M3 22V19Q3 13 12 13Q21 13 21 19V22'}
 return f'<g transform="translate({x} {y}) scale({size/24})">'+path(d.get(name,d['diamond']),color,2)+'</g>'
def cross(x,y,color='muted'):return line(x-4,y,x+4,y,color)+line(x,y-4,x,y+4,color)
def pill(x,y,label,tone='muted',width=None):
 w=width or max(64,len(label)*7.5+24)
 return rect(x,y,w,26,'none',tone,2)+text(x+12,y+18,label,11,tone,mono=True)
def button(x,y,w,label,kind='primary',state='default',h=48,with_icon=True):
 fill='lime' if kind=='primary' else 'error' if kind=='danger' else 'none'; stroke=None if kind in ['primary','danger','text','ghost'] else 'control';fg='ink' if kind in ['primary','danger'] else 'paper'
 if state=='hover':fill='#D2FF40' if kind=='primary' else '#FF9A90' if kind=='danger' else 'raised'
 if state=='pressed':fill='#ADD900' if kind=='primary' else '#E2685D' if kind=='danger' else 'line'
 if state=='disabled':fill='raised';fg='muted';stroke='line'
 out=rect(x,y,w,h,fill,stroke,2)
 if state=='focus':out+=rect(x-4,y-4,w+8,h+8,'none','paper',4,2)
 if state=='loading':out+=circle(x+22,y+h/2,7,fg,2)+text(x+40,y+h/2+5,'Подождите',14,fg,600)
 else:
  out+=text(x+16,y+h/2+5,label,14,fg,600)
  if with_icon:out+=icon('arrow',x+w-32,y+(h-18)/2,18,fg)
 return out
def field(x,y,w,label,value='',state='filled',helper=None,password=False):
 stroke='lime' if state=='focus' else 'error' if state=='error' else 'control'; fg='muted' if state=='empty' or state=='disabled' else 'paper'
 out=text(x,y+12,label,12,'muted')+rect(x,y+22,w,48,'surface',stroke,2)+text(x+14,y+52,value or 'Введите значение',16,fg)
 if password:out+=icon('eye',x+w-34,y+37,18,'muted')
 if helper:out+=text(x,y+91,helper,12,'error' if state=='error' else 'muted')
 return out
def bar(x,y,w,value,thick=6,tone='lime'):
 value=max(0,min(100,value));return rect(x,y,w,thick,'control')+(rect(x,y,w*value/100,thick,tone) if value else '')
def embedded(file,x,y,w,h,prefix):
 p=Path(file);root=ET.parse(p).getroot(); ids={el.attrib['id']:prefix+'-'+el.attrib['id'] for el in root.iter() if 'id'in el.attrib}
 for el in root.iter():
  for k,v in list(el.attrib.items()):
   if k=='id':el.set(k,ids[v])
   else:
    for old,new in ids.items():v=v.replace('url(#'+old+')','url(#'+new+')')
    el.set(k,v)
 ET.register_namespace('','http://www.w3.org/2000/svg');root.set('x',str(x));root.set('y',str(y));root.set('width',str(w));root.set('height',str(h))
 return ET.tostring(root,encoding='unicode')
def svg(w,h,body,name):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{esc(name)}</title>{body}</svg>'
def save_component(c,state,body,w=None,h=None,suffix=''):
 w=w or c['size'][0];h=h or c['size'][1];filename=c['id']+'--'+state+(('--'+suffix) if suffix else '')+'.svg';p=ROOT/'assets/ui'/c['group'];p.mkdir(parents=True,exist_ok=True)
 p.joinpath(filename).write_text(svg(w,h,body,c['name']+' / '+state))
 return dict(component=c['name'],state=state,sizeVariant=suffix or None,file=str(p.joinpath(filename).relative_to(ROOT)),width=w,height=h,status='editable-svg-specimen',notFigmaComponentYet=True)
def panel(w,h,label=None):return rect(0,0,w,h,'surface','line',2)+(text(20,29,label,11,'muted',mono=True) if label else '')
def heading(title,sub='',w=400,h=240):return panel(w,h)+text(24,49,title,22,'paper',500)+(wrapped(24,80,sub,w-48,14) if sub else '')
