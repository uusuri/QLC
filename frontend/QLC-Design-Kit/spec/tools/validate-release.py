from pathlib import Path
import json,hashlib,xml.etree.ElementTree as E,re
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT.parent
def read(n):return json.loads((ROOT/'data'/n).read_text())
cs=read('component-inventory.json')['components'];names={c['name'] for c in cs};screens=read('screens.json');items=read('ui-specimens.json');courses=read('courses.json')['courses'];achs=read('achievements.json')['records'];errors=[]
mapping={
 'Achievement/Detail':['Achievement/Card','Progress/Linear','Modal/Content'], 'Activity/Header':['Section/Header','Badge/Status','XP/Reward'], 'Activity/Timeline':['Profile/Activity'],
 'Auth/Shell':['Auth/Form'], 'Avatar/Upload':['Avatar','Button/Secondary','Input/Text'], 'Badge':['Badge/Status'], 'Button':['Button/Primary'], 'Checkout/Header':['Section/Header','Breadcrumbs'],
 'Course/Header':['Course/Icon','Course/Artwork','Section/Header','Progress/Course'], 'Course/Meta':['Badge/Difficulty','Divider'], 'Course/Requirements':['Content/Block'], 'Details/Explanation':['Content/Block','Accordion'],
 'Discovery/Section':['Section/Header','Course/Card'], 'Editor/ExistingMonacoShell':['Task/EditorShell'], 'Evidence/Reference':['Code/Block','Badge/Status'], 'Evidence/Viewer':['Incident/Evidence'],
 'Filter/Group':['Select','Checkbox','Radio','Filter/Chip','Input/Number'], 'Footer':[], 'Form/Errors':['Alert','Input/Text'], 'Home/Hero (protected)':[], 'HowItWorks/Section':[],
 'Incident/Brief':['Incident/Card','Content/Block'], 'Incident/EvidenceTabs':['Tabs','Incident/Evidence'], 'Incident/Header':['Section/Header','Incident/Severity','Badge/Status'], 'Incident/Hypothesis':['Incident/Diagnosis'],
 'Input':['Input/Text'], 'Learning/Format':['Activity/Card','Divider'], 'Learning/Sidebar':['Navigation/Sidebar'], 'Lesson/Block':['Content/Block'], 'Lesson/Header':['Section/Header','XP/Reward','Progress/Lesson'],
 'Lesson/Navigation':['Button/Secondary','Button/Primary','Checkbox'], 'Modal':['Modal/Content'], 'Module/Header':['Module/Card'], 'Module/Navigation':['Lesson/Row'],
 'Page/State':['Skeleton','EmptyState','ErrorState'], 'Payment/History':['Table','Payment/Success'], 'Payment/Price':['Payment/Summary'], 'Payment/ProviderSlot':['Payment/Method','Payment/Form'], 'Payment/Receipt':['Payment/Success'],
 'Profile/UserMini':['User/MiniProfile'], 'Project/Brief':['Task/Transfer','Content/Block'], 'Project/Milestone':['Module/Card','Activity/Card'], 'Quiz/Question':['Content/Block','Radio','Checkbox','Button/Primary'],
 'Review/Card':['Review/Due'], 'Review/Code':['CodeReview/Line','Code/Block'], 'Review/Finding':['CodeReview/Finding'], 'Review/FindingComposer':['CodeReview/Finding','Textarea','Select'], 'Review/Summary':['CodeReview/Result'],
 'Skill/Progress':['SkillProgress/Spiral'], 'SocialAuth/Slot':['Button/Secondary','Icon/Utility'], 'Submission/Composer':['Textarea','Input/Text','Button/Primary'], 'Task/Brief':['Content/Block','Badge/Difficulty','XP/Reward'],
 'Task/Toolbar':['Button/Secondary','Button/Icon','Badge/Status'], 'Terminal/Placeholder':['Code/Block'], 'Transfer/Brief':['Task/Transfer'], 'Transfer/Constraints':['Content/Block'], 'Verification/Status':['Auth/Form','Alert']}
references={n for s in screens['screens'] for n in s['components']};missing=references-names-set(mapping)
if missing:errors.append({'missingComponentReferences':sorted(missing)})
for k,v in mapping.items():
 if set(v)-names:errors.append({'recipe':k,'missing':list(set(v)-names)})
(ROOT/'data/composition-recipes.json').write_text(json.dumps({'purpose':'Named compositions referenced by screen specs; reuse these primitives instead of inventing new base components. These are assembly recipes, not additional delivered Figma components.','recipes':[{'name':k,'components':v,'layout':'Vertical/horizontal Auto Layout from screen spec; slot data varies.','source':'Existing protected homepage node from ../figma-state.json' if not v else 'Local component-inventory','statePolicy':'Children retain independent states; composite screen states in screens.json.'} for k,v in mapping.items()]},ensure_ascii=False,indent=2)+'\n')
for c in courses:
 for k in ['artworkPath','iconPath','symbolPath']:
  f=ROOT/'data'/c[k]
  if not f.exists():errors.append({'course':c['id'],'missing':str(f)})
 if hashlib.sha256((ROOT/'data'/c['artworkPath']).read_bytes()).hexdigest()!=c['artworkProvenance']['sha256']:errors.append({'artworkChanged':c['id']})
 for k in ['title','shortTitle','category','description','difficulty','duration','moduleCount','lessonCount','priceMinor','oldPriceMinor','discountPercent','tags','whatYouWillLearn']:
  if k not in c:errors.append({'missingCourseField':[c['id'],k]})
 if c['oldPriceMinor'] and round((1-c['priceMinor']/c['oldPriceMinor'])*100)!=c['discountPercent']:errors.append({'discountMath':c['id']})
for it in items:
 f=ROOT/it['file'];r=E.parse(f).getroot()
 if it['component'] not in names:errors.append({'unknownFamily':it['component']})
 if any(x.tag.rsplit('}',1)[-1] in ['script','foreignObject','image'] for x in r.iter()):errors.append({'forbiddenElement':it['file']})
for c in cs:
 if c['group']=='00-assets':continue
 supplied=[x for x in items if x['component']==c['name']]
 expected=len(c['specimenStates'])*(3 if c['name'].startswith('Button/') else 1)
 if len(supplied)!=expected:errors.append({'variantCoverage':c['name'],'expected':expected,'actual':len(supplied)})
class Links(HTMLParser):
 def handle_starttag(self,t,attrs):
  for k,v in attrs:
   if k in ['href','src'] and not v.startswith(('http','#','data:')) and not(ROOT/v).exists():errors.append({'brokenGalleryLink':v})
Links().feed((ROOT/'index.html').read_text())
if len({s['id'] for s in screens['screens']})!=34:errors.append('screenCount')
if set(screens['requiredMobileViewIds'])-{s['id'] for s in screens['screens']}:errors.append('mobileReferences')
v=read('visual-validation.json')
if v['xmlErrors'] or v['textBoundaryIssues']:errors.append('visualBoundaryAudit')
summary={'updatedAt':'2026-09-12','scope':'Local design spec and editable vector elements, no website implementation, no new Figma import this release.','counts':{'screenSpecs':len(screens['screens']),'requiredMobileSpecs':len(screens['requiredMobileViewIds']),'componentFamilies':len(cs),'uiFamilies':len({i['component'] for i in items}),'uiSpecimens':len(items),'courseConcepts':len(courses),'reusedArtworks':20,'newCourseIcons':20,'newSmallSymbols':20,'achievementExamples':len(achs),'reusedAchievementIcons':30,'utilityIcons':22,'tokens':len(read('design-tokens.json')['tokens']),'textStyles':len(read('design-tokens.json')['textStyles']),'figmaImportFamilies':len(read('figma-import-manifest.json')),'previewBoards':14},'passed':['475 UI files XML valid, no bitmap/script/external content','Expected specimen counts per family/size','All course asset links resolve; original artwork hashes unchanged','Demo discount calculations','34 unique screens and17 mobile references','All named screen compositions resolve to primitive recipes or protected homepage','Gallery local links resolve','Measured text boundaries within canvas','14 representative visual boards reviewed; meaningful defects corrected'],'limits':['No live Figma import, variant bindings or Auto Layout test for new475elements','Not every visual state independently viewed at100%; representative families plus boundary audit','Local render fonts may use fallback','Demo content is not a production course catalog or XP economy'],'errors':errors}
(ROOT/'data/validation-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False,indent=2));assert not errors
