"""QLC local specification and editable vector specimens. No network or Figma writes."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; DATA.mkdir(exist_ok=True)
def write(name,data): (DATA/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

colors={
 'color.bg.canvas':'#0A0A0A','color.bg.surface':'#101210','color.bg.raised':'#171A16',
 'color.text.primary':'#F5F5EF','color.text.secondary':'#A6A6A0','color.text.disabled':'#777A72',
 'color.text.onAccent':'#0A0A0A','color.accent.primary':'#C4FF00','color.accent.secondary':'#4433EE',
 'color.accent.hover':'#D2FF40','color.accent.pressed':'#ADD900','color.border.subtle':'#32372E',
 'color.border.control':'#66705D','color.border.strong':'#A6A6A0','color.focus.ring':'#F5F5EF',
 'color.status.success':'#C4FF00','color.status.error':'#FF8074','color.status.warning':'#E9D774',
 'color.status.info':'#B3ACFF','color.progress.track':'#66705D','color.selection.bg':'#4433EE',
 'color.editor.bg':'#0A0A0A','color.editor.comment':'#A6A6A0','color.editor.keyword':'#C4FF00',
 'color.editor.string':'#E9D774','color.editor.number':'#C4B5FD','color.editor.type':'#9DDCFF'
}
tokens=[]
for name,value in colors.items():
 scopes=['TEXT_FILL'] if '.text.' in name or '.editor.' in name and not name.endswith('.bg') else ['FRAME_FILL','SHAPE_FILL','STROKE_COLOR']
 tokens.append(dict(name=name,type='COLOR',value=value,scopes=scopes,webSyntax='var(--'+name.replace('.','-')+')',status='existing-value' if value in ['#0A0A0A','#F5F5EF','#A6A6A0','#C4FF00','#4433EE'] else 'proposed-semantic-role'))
for n in [0,2,4,8,12,16,20,24,32,40,48,64,80,96]:tokens.append(dict(name=f'space.{n}',type='FLOAT',value=n,scopes=['GAP'],webSyntax=f'var(--space-{n})'))
for name,val in [('radius.none',0),('radius.control',2),('radius.panel',4),('radius.avatar',999),('border.hairline',1),('border.focus',2),('size.touch',44),('size.control.S',44),('size.control.M',48),('size.control.L',56),('motion.quick',120),('motion.default',180),('motion.progress',240),('motion.reward',480)]:
 tokens.append(dict(name=name,type='FLOAT',value=val,scopes=['CORNER_RADIUS'] if name.startswith('radius') else ['STROKE_FLOAT'] if name.startswith('border') else ['WIDTH_HEIGHT'] if name.startswith('size') else [],webSyntax='var(--'+name.replace('.','-')+')'))
type_styles=[
 ('Display',64,68,500),('Page/H1',40,48,500),('Page/H1-mobile',30,36,500),('Section/H2',28,36,500),('Card/H3',22,28,500),('Body/L',18,28,400),('Body/M',16,24,400),('Body/S',14,22,400),('Label',14,20,600),('Meta',12,18,400),('Technical',11,16,400),('Code',14,23,400)]
write('design-tokens.json',dict(version=2,authority='Approved QLC Synthetic homepage. Existing Figma values win over historical source styling.',mode='Dark',tokens=tokens,textStyles=[dict(name='QLC/'+n,family='IBM Plex Mono' if n in ['Technical','Code'] else 'Inter',fontSize=s,lineHeight=l,fontWeight=w,letterSpacing=0) for n,s,l,w in type_styles],effects=[dict(name='QLC/Overlay',type='solid-scrim',color='#0A0A0A',opacity=.8),dict(name='QLC/Popover',type='shadow',x=0,y=12,blur=28,color='#000000',opacity=.28)],motion=dict(easing='cubic-bezier(.2,.8,.2,1)',reducedMotion='All transitions instant; preserve feedback text and focus.',glitch='Decorative edge graphics only. Never text, input, progress fill, or editor. No flashing.'),bindingPlan='Reuse five existing color variables by exact name/value; add semantic aliases. These JSON tokens are not claimed imported/bound.'))

components=[]
def add(name,group,states,props,layout,renderer,size=None,axes=None,notes=''):
 components.append(dict(id=name.lower().replace('/','-'),name=name,group=group,states=states.split('|'),properties=props,layout=layout,renderer=renderer,size=size or [360,160],variantAxes=axes or {},bindingRoles=['color.bg.surface','color.text.primary','color.text.secondary','color.accent.primary','color.border.subtle','space.16','radius.control'],accessibility='Keyboard reachable when interactive; visible 2px focus; actions min44px; status text plus icon, never color alone.',overflow='Text wraps; containers grow. Never reduce font to fit. Tooltips expose visually truncated identifiers.',figmaRecipe='Auto Layout for content, main component with discrete state variants; text properties and instance swaps for content. SVG is editable visual source, not automatic variable binding.',notes=notes,localStatus='specified',figmaStatus='not-imported'))

buttonstates='default|hover|pressed|focus|disabled|loading'
for variant in ['Primary','Secondary','Ghost','Text','Danger','Icon']:
 add('Button/'+variant,'01-controls',buttonstates,{'label':'TEXT','icon':'INSTANCE_SWAP','showIcon':'BOOLEAN','size':'S|M|L','disabled':'BOOLEAN'},'Horizontal; centered label+icon; gap8; padX16/20/24; min-height44/48/56; text Hug, parent may Fill. Loading reserves label width.','button',[224,64],{'Size':['S','M','L'],'State':buttonstates.split('|')})
for typ in ['Text','Search','Password','Email','Number','Promo','Code']:
 add('Input/'+typ,'01-controls','empty|focus|filled|error|success|disabled',{'label':'TEXT','value':'TEXT','placeholder':'TEXT','helper':'TEXT','error':'TEXT','required':'BOOLEAN','trailingIcon':'INSTANCE_SWAP'},'Vertical label8/control48/helper8. Width Fill min240 desktop, min0 mobile. Label persists; error adds height.','input',[360,116],{'State':['empty','focus','filled','error','success','disabled']})
add('Textarea','01-controls','empty|focus|filled|error|disabled',{'label':'TEXT','value':'TEXT','helper':'TEXT','count':'TEXT'},'Vertical; min-height128; manual vertical resize in app; no horizontal resize.','textarea',[360,210])
add('Select','01-controls','default|open|selected|error|disabled',{'label':'TEXT','value':'TEXT','items':'SLOT','multiple':'BOOLEAN','searchable':'BOOLEAN'},'Trigger48; popover anchor below flips above. list max320 high; keyboard listbox.','select',[360,260])
for name,states in [('Checkbox','unchecked|checked|mixed|focus|disabled'),('Radio','unselected|selected|focus|disabled'),('Switch','off|on|focus|disabled')]:
 add(name,'01-controls',states,{'label':'TEXT','description':'TEXT','checked':'BOOLEAN'},'Horizontal hit area min44; icon20 + gap12; description wraps below.','choice',[360,72])
add('Filter/Chip','01-controls','default|selected|removable|disabled',{'label':'TEXT','count':'TEXT','showCount':'BOOLEAN'},'Horizontal Hug;44pxhitarea; selected includes check; remove has separate accessible label.','chip',[220,56])

for name,states,renderer,size,props in [
 ('Tabs','default|selected|disabled','tabs',[460,72],{'items':'SLOT','activeId':'TEXT'}),
 ('Accordion','collapsed|expanded|disabled','accordion',[440,200],{'title':'TEXT','summary':'TEXT','body':'SLOT'}),
 ('Pagination','first|middle|last|loading','pagination',[400,64],{'page':'TEXT','totalPages':'TEXT'}),
 ('LoadMore','default|loading|end','loadmore',[340,80],{'loadedCount':'TEXT','totalCount':'TEXT'}),
 ('Breadcrumbs','default|collapsed','breadcrumbs',[480,56],{'items':'SLOT'}),
 ('Menu','default|selected|disabled','menu',[280,242],{'items':'SLOT'}),
 ('Dropdown','closed|open|empty','menu',[280,242],{'trigger':'SLOT','items':'SLOT'}),
 ('ContextMenu','open|disabled','menu',[280,242],{'items':'SLOT'}),
 ('Tooltip','default|multiline','tooltip',[280,96],{'text':'TEXT'}),
 ('Popover','default|with-action','popover',[320,180],{'title':'TEXT','body':'TEXT','action':'SLOT'}),
 ('Navigation/Header','guest|authenticated','header',[1040,88],{'logo':'INSTANCE_SWAP','items':'SLOT','user':'INSTANCE_SWAP'}),
 ('Navigation/Drawer','guest|authenticated','navdrawer',[320,500],{'items':'SLOT','user':'INSTANCE_SWAP'}),
 ('Navigation/Sidebar','expanded|collapsed','sidebar',[280,450],{'course':'INSTANCE_SWAP','items':'SLOT'}),
 ('Section/Header','default|with-action','section',[640,100],{'title':'TEXT','eyebrow':'TEXT','action':'SLOT'})]:
 add(name,'02-navigation',states,props,'Auto Layout; items are extensible data, not fixed count. Preserve focus and selected ID on filtering; overflow handled by own scroll region.',''+renderer,size)

for name,states,renderer,size in [
 ('Modal/Confirm','default|danger|processing','modal',[480,310]),('Modal/Content','small|medium|large','modal',[640,380]),
 ('Drawer','default|loading','drawer',[360,460]),('Toast','success|info|warning|error','toast',[420,124]),
 ('Alert','success|info|warning|error','alert',[440,144]),('Badge/Status','new|popular|sale|locked|completed|in-progress|review-due','badge',[260,56]),
 ('Badge/Difficulty','easy|medium|hard','badge',[260,56]),('Incident/Severity','sev-1|sev-2|sev-3','badge',[260,56]),
 ('Spinner','default|reduced-motion','spinner',[120,96]),
 ('Skeleton','page|course-card|lesson|profile|achievement|task','skeleton',[360,220]),
 ('EmptyState','no-courses|no-active-courses|no-achievements|no-results|no-activity|no-payments','empty',[420,250]),
 ('ErrorState','generic|network|403|404|500|maintenance|offline|reconnecting','error',[420,250])]:
 add(name,'03-feedback',states,{'title':'TEXT','description':'TEXT','action':'SLOT','secondaryAction':'SLOT','dismissible':'BOOLEAN'},'Vertical Hug; icon optional, body wraps; buttons wrap/stack at360. Dialog focus trapped, Escape closes unless unresolved processing; restore focus to opener.',''+renderer,size)

for name,states,renderer,size in [
 ('Progress/Linear','0|37.6|100|indeterminate|unavailable','progress',[360,96]),
 ('Progress/XP','default|reward|level-up|unavailable','xp',[360,132]),
 ('Progress/Course','default|completed|unavailable','progress',[360,96]),
 ('Progress/Module','default|completed|unavailable','progress',[360,96]),
 ('Progress/Lesson','default|completed|unavailable','progress',[360,96]),
 ('Progress/Skill','default|completed|unavailable','progress',[360,96]),
 ('Progress/Circular','0|83.7|100|unavailable','circle',[140,140]),
 ('Level/Badge','1|10|100|999+','level',[200,72]),
 ('XP/Reward','25|120|pending','reward',[220,88]),
 ('XP/Summary','default|large-values','xpsummary',[360,210]),
 ('LevelUp/Modal','default|multiple-levels','levelup',[480,330]),
 ('SkillProgress/Spiral','locked|available|current|completed','spiral',[440,220]),
 ('SkillStage','locked|available|current|completed','skillstage',[240,100]),
 ('SkillMasteryBadge','learning|practiced|mastered','badge',[260,56]),
 ('Review/Due','due-soon|due|overdue|refreshed','reviewdue',[360,210])]:
 add(name,'04-progression',states,{'value':'NUMBER_CONTRACT','label':'TEXT','current':'TEXT','total':'TEXT','showLabel':'BOOLEAN','status':'VARIANT'},'Track width Fill; label/value in horizontal row, values tabular. Numbers are data; support wrapping long XP. Value0..100 continuous and independent of status.',''+renderer,size,notes='Numeric states in specimens are examples only. NEVER create percentage or level variants; use real numeric geometry + label data at runtime. Existing three Progress assets reused as baseline.')

for name,states,renderer,size,props in [
 ('Course/Card','default|hover|purchased|in-progress|completed|discounted|coming-soon','course',[360,448],{'artwork':'INSTANCE_SWAP','icon':'INSTANCE_SWAP','title':'TEXT','description':'TEXT','price':'TEXT','oldPrice':'TEXT','discount':'TEXT','metadata':'SLOT','access':'VARIANT','showBadge':'BOOLEAN'}),
 ('Course/Progress','default|expanded|completed','courseprogress',[420,310],{'course':'SLOT','value':'NUMBER_CONTRACT','currentModule':'TEXT','currentLesson':'TEXT','completed':'TEXT','total':'TEXT','xp':'TEXT'}),
 ('Module/Card','not-started|active|completed|locked|review-due|expanded','module',[440,250],{'number':'TEXT','title':'TEXT','description':'TEXT','progress':'NUMBER_CONTRACT','lessons':'SLOT','expanded':'BOOLEAN'}),
 ('Lesson/Row','not-started|current|completed|locked|review-due','lessonrow',[440,110],{'typeIcon':'INSTANCE_SWAP','title':'TEXT','duration':'TEXT','xp':'TEXT','value':'NUMBER_CONTRACT'}),
 ('Activity/Card','lesson|task|transfer|code-review|incident|project|quiz','activity',[360,250],{'type':'VARIANT','status':'VARIANT','icon':'INSTANCE_SWAP','title':'TEXT','description':'TEXT','duration':'TEXT','xp':'TEXT','value':'NUMBER_CONTRACT'}),
 ('Achievement/Card','unlocked|locked|secret|progress|newly-unlocked|rare|legendary|completed','achievement',[320,330],{'icon':'INSTANCE_SWAP','title':'TEXT','description':'TEXT','rarity':'VARIANT','progress':'NUMBER_CONTRACT','current':'TEXT','target':'TEXT','date':'TEXT','xp':'TEXT'}),
 ('Achievement/Progress','default|completed|secret','progress',[300,96],{'current':'TEXT','target':'TEXT','value':'NUMBER_CONTRACT'}),
 ('Achievement/Grid','default|filtered|empty','achievementgrid',[680,360],{'items':'SLOT','filter':'TEXT','total':'TEXT'}),
 ('Avatar','image|initials|empty|loading','avatar',[128,128],{'image':'IMAGE_FILL','initials':'TEXT','size':'24|32|48|64|96'}),
 ('User/MiniProfile','default|compact','miniprofile',[320,88],{'avatar':'INSTANCE_SWAP','name':'TEXT','username':'TEXT','level':'TEXT'}),
 ('Profile/Header','default|long-name','profile',[640,230],{'avatar':'INSTANCE_SWAP','displayName':'TEXT','username':'TEXT','joined':'TEXT','xp':'INSTANCE_SWAP'}),
 ('Profile/Stats','default|large-values|empty','stats',[600,160],{'items':'SLOT'}),
 ('Profile/Activity','default|empty','activitylog',[420,250],{'items':'SLOT'})]:
 add(name,'05-domain',states,props,'Auto Layout vertical; image fixed ratio32:15; content Hug; metadata wraps; footer action anchored by Fill spacer within equal-height grid. Collections unlimited; paginate.',''+renderer,size)

for name,states,renderer,size in [
 ('Content/Block','title|subtitle|paragraph|image|diagram|code|table|list|quote|warning|tip|note|details|checkpoint|exercise|embed','content',[560,280]),
 ('Code/Block','default|copied|overflow','code',[560,240]),('Table','default|loading|empty|sorted','table',[560,260]),
 ('Divider','plain|technical','divider',[560,48]),
 ('Task/EditorShell','idle|busy|auth-required','editor',[680,420]),
 ('Task/Status','idle|submitting|queued|compiling|running|accepted|wrong-answer|runtime-error|compilation-error|time-limit|memory-limit|output-limit|network-error|infrastructure-error|cancelled|unknown','taskstatus',[440,192]),
 ('Task/Result','accepted|wrong-answer|runtime-error|compilation-error|time-limit|infrastructure-error','taskresult',[480,280]),
 ('Task/Transfer','available|in-progress|submitted|accepted|failed|review','transfer',[480,300]),
 ('CodeReview/Finding','draft|submitted|correct|incorrect|partial','finding',[440,260]),
 ('CodeReview/Result','complete|partial','reviewresult',[440,270]),
 ('CodeReview/Line','default|selected|range|with-finding','codeline',[560,116]),
 ('Incident/Card','active|investigating|mitigated|resolved|failed','incident',[400,310]),
 ('Incident/Evidence','logs|metrics|kubernetes|database|network|code|events','evidence',[560,330]),
 ('Incident/Diagnosis','draft|submitted|rejected','diagnosis',[480,360]),
 ('Incident/Result','resolved|failed','incidentresult',[480,310])]:
 add(name,'06-learning',states,{'title':'TEXT','body':'TEXT','content':'SLOT','status':'VARIANT','metadata':'SLOT','action':'SLOT'},'Content column min0; text max70ch; internal code/table scroll only. Preserve Monaco and local autosave; editor viewport is integration slot, not new editor.',''+renderer,size)

for name,states,renderer,size in [
 ('Payment/Summary','default|discount|promo-valid|promo-invalid','summary',[360,390]),
 ('Payment/Method','unselected|selected|disabled','paymentmethod',[360,106]),
 ('Payment/Form','default|validation-error|processing|payment-error|timeout','paymentform',[420,350]),
 ('Payment/Success','default','paymentsuccess',[480,340]),
 ('Payment/Failed','retry|change-method|timeout','paymentfailed',[480,300]),
 ('Auth/Form','login|register|forgot-password|reset-password|verify-email|verification-success','auth',[420,430])]:
 add(name,'07-commerce',states,{'title':'TEXT','fields':'SLOT','course':'INSTANCE_SWAP','price':'TEXT','orderId':'TEXT','date':'TEXT','message':'TEXT'},'Form vertical gap16; explicit field labels, inline validation, primary48px; summary stacks above pay on mobile. Provider fields placeholders only; never imply paid before backend confirmation.',''+renderer,size)

# Asset-only reusable families reuse masters instead of duplicating content card definitions.
for name,count in [('Course/Artwork',20),('Course/Icon',20),('Course/Symbol',20),('Achievement/Icon',30),('Icon/Utility',0)]:
 add(name,'00-assets','default',{'asset':'INSTANCE_SWAP','size':'NUMBER_CONTRACT','tone':'TOKEN'},'Fixed vector geometry inside consistent frame. Proportional scale, no stretching; artwork crop32:15.', 'asset',[128,128],notes=f'{count} known sources or symbols; link manifest. No new Course/Card per asset.')
for c in components:
 c['specimenStates']=list(c['states'])
 if not c['variantAxes']:c['variantAxes']={'State':list(c['states'])}
 n=c['name']
 if n.startswith('Button/'):
  c['properties'].pop('disabled',None)
  c['bindingRoles']+=['color.text.onAccent'] if n in ['Button/Primary','Button/Danger'] else []
 if n.startswith('Input/') or n=='Textarea':
  c['states']=['default','focus','disabled'];c['variantAxes']={'Interaction':c['states'],'Validation':['none','error','success']};c['properties']['hasValue']='BOOLEAN'
  if n=='Input/Password':c['properties']['showPassword']='BOOLEAN'
 if n.startswith('Progress/') or n=='Achievement/Progress':
  c['sampleValues']=[0,25,37.6,50,72.4,83.7,100];c['states']=['determinate','indeterminate','unavailable'];c['variantAxes']={'State':c['states'],'Size':['compact','default']}
 if n in ['Level/Badge','XP/Reward']:
  c['sampleValues']=list(c['specimenStates']);c['states']=['default','pending'] if n=='XP/Reward' else ['default'];c['variantAxes']={'State':c['states']}
 if n=='Course/Card':
  c['states']=['available','purchased','coming-soon'];c['variantAxes']={'Access':c['states'],'Interaction':['default','hover','focus','disabled']};c['properties'].update(progressState='not-started|in-progress|completed',showDiscount='BOOLEAN',promotion='TEXT');c['notes']+=' Access controls CTA; promotion never overrides purchase state. Nested Progress component carries progress status.'
 if n=='Module/Card':
  c['states']=['not-started','active','completed','locked','review-due'];c['variantAxes']={'Status':c['states']};c['properties']['expanded']='BOOLEAN'
 if n=='Achievement/Card':
  c['states']=['locked','unlocked','secret'];c['variantAxes']={'Access':c['states'],'Rarity':['common','rare','legendary']};c['properties'].update(newlyUnlocked='BOOLEAN',progressState='not-started|in-progress|completed');c['notes']+=' Rarity independent of access. Secret projection never contains hidden criterion/title/progress.'
 if n=='Activity/Card':c['variantAxes']={'Type':c['states'],'Status':['available','in-progress','submitted','completed','locked','failed']}
 if c['group']=='00-assets':
  c['size']={'Course/Artwork':[640,300],'Course/Icon':[48,48],'Course/Symbol':[24,24],'Achievement/Icon':[128,128],'Icon/Utility':[24,24]}[n]
  c['layout']='Fixed proportional vector frame; no stretch; swap asset by stable ID. '+('Artwork32:15.' if n=='Course/Artwork' else 'Transparent background; optical center and consistent size.')
 c['contrastContract']='Lime fill → ink text; cobalt fill → paper text. Cobalt decorative only on ink; meaningful outlines use control border. Subtle border is decorative, not the sole input boundary.'
write('component-inventory.json',dict(version=2,count=len(components),scope='Full local specification + editable vector specimens; Figma Components/Variants are a later structured import step unless ledger says otherwise.',components=components))
globalstates=[
 dict(id='loading',trigger='Initial request has no data',display='Stable skeleton matching final geometry',action='Cancel navigation if desired',announce='aria-busy on region; once'),
 dict(id='refreshing',trigger='Existing data + revalidation',display='Keep current data; small updating indicator',action='Keep normal navigation',announce='Do not reannounce each poll'),
 dict(id='empty',trigger='Successful response with no items',display='Context-specific message + meaningful CTA',action='Browse courses / clear filters',announce='Status once'),
 dict(id='error',trigger='Failed request',display='Preserve data and draft; readable reason',action='Retry idempotent read',announce='alert once'),
 dict(id='offline',trigger='Connection lost',display='Persistent connection notice',action='Keep locally saved draft; reconnect',announce='polite once'),
 dict(id='reconnecting',trigger='Connection returned, pending fetch',display='One unobtrusive updating line',action='Resume status by existing submission/order ID',announce='polite'),
 dict(id='disabled',trigger='Action unavailable with known reason',display='Disabled action + adjacent explanation',action='Never represent entire page as disabled',announce='aria-disabled'),
 dict(id='success',trigger='Confirmed result',display='Inline durable confirmation plus optional toast',action='Continue in flow',announce='status'),
 dict(id='confirm-destructive',trigger='Reset/discard/remove requested',display='Named affected object and consequences',action='Cancel primary focus; confirm explicit',announce='modal title')]
write('state-inventory.json',dict(globalStates=globalstates,componentStates=[dict(component=c['name'],states=c['states'],axes=c['variantAxes']) for c in components],continuousExamplesAreNotVariants=['Progress/*','Level/Badge','XP/Reward'],combinationRules=['Access, progress, promotion, interaction are orthogonal; purchased+discount displays access CTA, price in metadata only.','Secret achievements suppress hidden title/criterion/count before unlock.','Loading preserves dimensions and prevents duplicate side effects.','Activity types can add registry entries without new card layouts.']))

lines=['# Инвентарь UI-компонентов QLC','',f'{len(components)} семейств. Это локальная спецификация и исходники элементов; статус импорта в Figma ведётся отдельно.','', 'Числа в Progress, Level и XP — примеры данных. В Figma и коде они не становятся списком числовых variants.','']
for c in components:
 lines += ['## '+c['name'],'',f"Состояния: {', '.join(c['states'])}.",'', '**Свойства:** '+', '.join(k+' → '+v for k,v in c['properties'].items())+'.','',c['layout'],'',c['overflow'],'',c['accessibility'],'',c['figmaRecipe'],'']
 if c['notes']:lines += [c['notes'],'']
(ROOT/'components.md').write_text('\n'.join(lines))
print(f'{len(tokens)} tokens; {len(type_styles)} text styles; {len(components)} component families')
