from ui_common import *

COMPS=json.loads((ROOT/'data/component-inventory.json').read_text())['components'];out=[]
ART=BASE/'course-artworks/Course-01-Java.svg';GLYPH=BASE/'achievement-symbols/Achievement-02.svg'
def codeblock(x,y,w,rows,selected=None):
 b=rect(x,y,w,len(rows)*25+28,'ink','line',2)
 for j,t in enumerate(rows):
  if selected is not None and j==selected:b+=rect(x+1,y+14+j*25,w-2,25,'blue')
  b+=text(x+12,y+31+j*25,str(j+1),12,'muted',mono=True)+text(x+44,y+31+j*25,t,13,'lime' if any(v in t for v in ['return','public','class','int ']) else 'paper',mono=True)
 return b
def kv(x,y,w,k,v,color='paper'):return text(x,y,k,14,'muted')+text(x+w,y,v,14,color,anchor='end')
def glyph(x,y,s=64):return embedded(GLYPH,x,y,s,s,'glyph')
def status_icon(state):return 'check' if state in ['completed','accepted','resolved','unlocked'] else 'lock' if state=='locked' else 'warning' if state in ['failed','review-due','overdue'] else 'play'
def resultbox(w,h,title,desc,good=False):return panel(w,h)+glyph(22,18,56)+pill(w-142,30,'ПРИНЯТО' if good else 'РЕЗУЛЬТАТ','lime' if good else 'muted',120)+text(24,114,title,22,'paper',500)+wrapped(24,149,desc,w-48,16)

for c in COMPS:
 if c['group'] not in ['04-progression','05-domain','06-learning','07-commerce']:continue
 for state in c.get('specimenStates',c['states']):
  name=c['name'];r=c['renderer'];w,h=c['size'];b=''
  if r=='progress':
   value=0 if state=='0' else 100 if state in ['100','completed'] else 37.6 if name=='Progress/Linear' else 72 if name=='Achievement/Progress' else 71.6667
   label={'Progress/Course':'Курс Java','Progress/Module':'Коллекции','Progress/Lesson':'HashMap','Progress/Skill':'Применение','Achievement/Progress':'Решено задач'}.get(name,'Прогресс')
   b=text(4,24,label,14)+text(w-4,24,'—' if state=='unavailable' else 'Проверяем…' if state=='indeterminate' else f'{value:g}%' if value in [0,100,37.6] else '72%',14,'muted',anchor='end')
   b+=bar(4,42,w-8,value if state not in ['unavailable','indeterminate'] else 0)
   if state=='indeterminate':b+=rect((w-8)*.28,42,(w-8)*.22,6,'lime')
   b+=text(4,78,'Данные временно недоступны' if state=='unavailable' else '43 / 60 уроков' if 'Course' in name else '72 / 100 задач' if name=='Achievement/Progress' else 'Выполненная часть материала',12,'muted')
  elif r in ['xp','xpsummary']:
   if r=='xp':
    b=text(4,22,'УРОВЕНЬ 12',11,'muted',mono=True)+text(w-4,22,'+120 XP' if state=='reward' else 'LEVEL UP' if state=='level-up' else 'XP',11,'lime',mono=True,anchor='end')+text(4,57,'2 840 / 3 500 XP' if state!='unavailable' else 'XP недоступен',22,'paper',500)+bar(4,78,w-8,81.142857 if state!='unavailable' else 0)+text(4,113,'До следующего уровня: 660 XP',12,'muted')
   else:
    b=panel(w,h,'ОПЫТ')+text(20,72,'1 284 840 XP' if state=='large-values' else '21 840 XP',28,'paper',500)+text(20,99,'Всего за время обучения',14,'muted')+line(20,120,w-20,120)+kv(20,151,w-40,'Текущий уровень','12')+kv(20,181,w-40,'До следующего уровня','660 XP','lime')
  elif r=='circle':
   v=0 if state=='0' else 100 if state=='100' else 83.7;cx=w/2;cy=h/2;rad=52
   b=circle(cx,cy,rad,'control',6)
   if state!='unavailable' and v:
    if v==100:b+=circle(cx,cy,rad,'lime',6)
    else:
     a=math.radians(-90+v*3.6);ex=cx+rad*math.cos(a);ey=cy+rad*math.sin(a);b+=path(f'M{cx} {cy-rad}A{rad} {rad} 0 {1 if v>50 else 0} 1 {ex:.4f} {ey:.4f}','lime',6)
   b+=text(cx,cy+6,'—' if state=='unavailable' else f'{v:g}%',22,'paper',500,anchor='middle')
  elif r=='level':b=rect(4,8,w-8,52,'none','control',2)+glyph(12,16,36)+text(62,42,'LEVEL '+state,18,'paper',500,mono=True)
  elif r=='reward':b=icon('plus',16,22,24,'lime')+text(56,44,'Ожидает выдачи' if state=='pending' else '+'+state+' XP',20,'muted' if state=='pending' else 'lime',500)+text(16,74,'За подтверждённый результат',12,'muted')
  elif r=='levelup':b=resultbox(w,h,'Уровень 13' if state=='default' else 'Уровень 15','Новый опыт учтён. Продолжайте с текущего места.',True)+text(24,205,'22 520 XP всего · 20 / 3 750 XP',14,'muted')+button(24,h-72,w-48,'Продолжить обучение')
  elif r in ['spiral','skillstage']:
   if r=='spiral':
    b=panel(w,h,'НАВЫК / HASHMAP')
    for j,t in enumerate(['UNDERSTAND','APPLY','MASTER']):
     st='completed' if state=='completed' or j==0 and state!='locked' else 'current' if j==1 and state=='current' else 'locked' if j==2 or state=='locked' else 'available'
     y=56+j*51;b+=icon(status_icon(st),20,y,22,'lime' if st=='completed' else 'muted')+text(56,y+18,t,13,'paper',mono=True)+text(w-22,y+18,'100%' if st=='completed' else '72%' if st=='current' else 'Закрыто' if st=='locked' else 'Доступно',12,'muted',anchor='end')
   else:b=panel(w,h)+icon(status_icon(state),16,20,24,'lime' if state=='completed' else 'muted')+text(52,38,'APPLY',14,'paper',mono=True)+text(16,76,{'locked':'Сначала завершите основу','available':'Можно приступить','current':'Прогресс: 72%','completed':'Этап завершён'}[state],12,'muted')
  elif r=='badge':b=pill(4,12,{'learning':'ИЗУЧАЕТСЯ','practiced':'ПРИМЕНЯЕТСЯ','mastered':'ОСВОЕНО'}.get(state,state),'lime' if state=='mastered' else 'muted')
  elif r=='reviewdue':
   labels={'due-soon':'СКОРО ПОВТОРЕНИЕ','due':'ПОРА ПОВТОРИТЬ','overdue':'ПОВТОРЕНИЕ ПРОСРОЧЕНО','refreshed':'НАВЫК ОБНОВЛЁН'}
   b=panel(w,h)+text(20,28,labels[state],11,'lime' if state=='refreshed' else 'warn',mono=True)+text(20,65,'HashMap',22,'paper',500)+kv(20,98,w-40,'Освоение','84%')+text(20,127,'Практика: 42 дня назад' if state!='refreshed' else 'Практика: сегодня',12,'muted')+button(20,h-64,w-40,'К навыку' if state=='refreshed' else 'Повторить','secondary')
  elif r=='course':
   h=466;b=panel(w,h)+embedded(ART,0,0,w,w*300/640,'java')
   if state in ['discounted','coming-soon','completed']:b+=pill(16,16,{'discounted':'−20%','coming-soon':'СКОРО','completed':'ЗАВЕРШЕНО'}[state],'lime' if state!='coming-soon' else 'muted')
   b+=text(20,197,'01 / ПРОГРАММИРОВАНИЕ',11,'muted',mono=True)+text(20,234,'Java',28,'paper',500)+wrapped(20,264,'Язык, объектная модель и коллекции. Теория и задачи с проверкой кода.',w-40,14)+text(20,334,'Начальный · 42 ч · 12 модулей',12,'muted')
   if state in ['purchased','in-progress','completed']:
    b+=bar(20,352,w-40,100 if state=='completed' else 71.6667 if state=='in-progress' else 0)+text(20,385,'Курс завершён' if state=='completed' else '43 / 60 уроков' if state=='in-progress' else 'Доступ открыт',14,'muted')
   else:b+=text(20,385,'3 990 ₽',22,'paper',500)+text(130,385,'4 990 ₽',14,'muted')+line(130,380,186,380,'muted')
   b+=button(20,402,w-40,'Уведомить о старте' if state=='coming-soon' else 'Повторить материал' if state=='completed' else 'Продолжить' if state=='in-progress' else 'Начать обучение' if state=='purchased' else 'О курсе','secondary' if state in ['default','coming-soon','completed'] else 'primary','hover' if state=='hover' else 'default')
  elif r=='courseprogress':
   h=432 if state=='expanded' else 292;b=panel(w,h)+embedded(ART,20,20,100,47,'java')+text(140,46,'Java',22,'paper',500)+text(140,68,'12 модулей · 60 уроков',12,'muted')+text(20,114,'100%' if state=='completed' else '72%',26,'paper',500)+text(w-20,114,'60 / 60 уроков' if state=='completed' else '43 / 60 уроков',14,'muted',anchor='end')+bar(20,135,w-40,100 if state=='completed' else 71.6667)+text(20,174,'Коллекции / HashMap',16)+text(20,200,'Заработано: 1 840 XP',12,'muted')
   if state=='expanded':
    for j,(t,v) in enumerate([('Модуль 01',100),('Модуль 02',72),('Модуль 03',31)]):b+=kv(20,236+j*45,w-40,t,str(v)+'%')+bar(20,248+j*45,w-40,v,4)
   b+=button(20,h-66,w-40,'Открыть курс' if state=='completed' else 'Продолжить')
  elif r=='module':
   h=368 if state=='expanded' else 212;b=panel(w,h,'05 / МОДУЛЬ')+icon(status_icon(state),w-44,20,24,'lime' if state=='completed' else 'muted')+text(20,72,'Коллекции',24,'paper',500)+text(20,102,'6 уроков · 3 часа · 420 XP',12,'muted')+bar(20,125,w-40,100 if state=='completed' else 66.6667 if state in ['active','expanded','review-due'] else 0)+text(20,161,'Требуется предыдущий модуль' if state=='locked' else '4 / 6 уроков' if state in ['active','expanded'] else 'Готово' if state=='completed' else 'Нужна практика' if state=='review-due' else 'Ещё не начат',14,'muted')
   if state=='expanded':
    for j,t in enumerate(['ArrayList','HashMap','Set']):b+=line(20,188+j*51,w-20,188+j*51)+icon('check' if j==0 else 'play' if j==1 else 'lock',20,203+j*51,20,'lime' if j==0 else 'muted')+text(54,219+j*51,t,16)
   else:b+=icon('chevron',w-44,164,20,'muted')
  elif r=='lessonrow':b=panel(w,h)+icon(status_icon(state),16,22,22,'lime' if state=='completed' else 'muted')+text(52,37,'HashMap: частоты значений',16,'paper',500)+text(52,63,'Теория · 12 мин · 25 XP',12,'muted')+bar(52,83,w-74,100 if state=='completed' else 37.6 if state=='current' else 0,4)+text(w-18,63,{'not-started':'Не начат','current':'37.6%','completed':'100%','locked':'Закрыто','review-due':'Повторить'}[state],11,'warn' if state=='review-due' else 'muted',anchor='end')
  elif r=='activity':
   t={'lesson':('Урок','Частоты значений'),'task':('Задача','Подсчёт повторений'),'transfer':('Перенос','Учёт заказов'),'code-review':('Ревью','Проверка обработчика'),'incident':('Инцидент','Рост задержки API'),'project':('Проект','Каталог товаров'),'quiz':('Тест','Работа с коллекциями')}[state]
   b=panel(w,h)+text(20,28,t[0].upper(),11,'muted',mono=True)+icon('code' if state in ['task','code-review'] else 'diamond',w-42,18,22,'lime')+text(20,77,t[1],22,'paper',500)+wrapped(20,108,'Примените изученное и проверьте результат на практическом примере.',w-40,14)+text(20,169,'20 мин · +120 XP',12,'muted')+button(20,h-64,w-40,'Открыть','secondary')
  elif r=='achievement':
   h=352;b=panel(w,h)+glyph(20,20,84)+pill(w-138,24,'ЛЕГЕНДАРНОЕ' if state=='legendary' else 'РЕДКОЕ' if state=='rare' else 'ПРАКТИКА','warn' if state=='legendary' else 'info' if state=='rare' else 'muted',118)
   if state in ['locked','secret']:b+=icon('lock',w-50,78,24,'muted')
   b+=text(20,142,'Скрытое достижение' if state=='secret' else 'Сто решений' if state=='progress' else 'Первая задача',20,'paper',500)+wrapped(20,175,'Условия откроются после получения.' if state=='secret' else 'Решите сто разных задач с подтверждённым результатом.' if state=='progress' else 'Решите первую задачу и получите подтверждённый результат.',w-40,14)+text(20,244,'Награда скрыта' if state=='secret' else '+25 XP',14,'muted' if state=='secret' else 'lime',500)
   if state in ['unlocked','newly-unlocked','completed','rare','legendary']:b+=icon('check',20,276,20,'lime')+text(50,292,'Получено 09.09.2026',12,'muted')
   elif state!='secret':b+=bar(20,274,w-40,72 if state=='progress' else 0)+text(20,308,'72 / 100 задач' if state=='progress' else '0 / 1 задача',12,'muted')
   if state=='newly-unlocked':b+=rect(1,1,w-2,h-2,'none','lime',2,2)
  elif r=='achievementgrid':
   b=panel(w,h)+text(20,36,'Достижения',24,'paper',500)+text(w-20,36,'38 всего',12,'muted',anchor='end')+pill(20,56,'В ПРОЦЕССЕ' if state=='filtered' else 'ВСЕ','lime')
   if state=='empty':b+=wrapped(24,161,'В этой категории пока нет достижений. Попробуйте убрать фильтр.',w-48,18,'muted')
   else:
    for j,t in enumerate(['Первая тема','Сто решений','Три модуля']):
     x=20+j*218;b+=rect(x,110,202,200,'ink','line',2)+embedded(BASE/f'achievement-symbols/Achievement-{j+1:02}.svg',x+16,126,64,64,'a'+str(j))+text(x+16,221,t,16,'paper',500)+bar(x+16,247,170,[100,72,33.3333][j])+text(x+16,283,['Получено','72 / 100','1 / 3'][j],12,'muted')
  elif r=='avatar':
   b=rect(16,16,96,96,'blue' if state=='image' else 'raised','control',4)
   b+=embedded(BASE/'achievement-symbols/Achievement-20.svg',30,30,68,68,'avatar') if state=='image' else text(64,78,'АК' if state=='initials' else '…' if state=='loading' else '+',32,'paper',500,anchor='middle')
  elif r=='miniprofile':b=rect(8,12,52,52,'blue',None,4)+text(34,46,'АК',18,'paper',500,anchor='middle')+text(76,36,'Алексей',16,'paper',500)+text(76,60,'@alex · LEVEL 12',11,'muted',mono=True)
  elif r=='profile':
   b=panel(w,h)+rect(24,24,80,80,'blue',None,4)+text(64,77,'АК',28,'paper',500,anchor='middle')+text(128,53,'Алексей Константинопольский' if state=='long-name' else 'Алексей',24,'paper',500)+text(128,84,'@alex · с 12 марта 2026',13,'muted')+line(24,127,w-24,127)+kv(24,160,w-48,'УРОВЕНЬ 12','2 840 / 3 500 XP')+bar(24,178,w-48,81.142857)+text(24,209,'Всего: 21 840 XP · До следующего: 660 XP',12,'muted')
  elif r=='stats':
   b=panel(w,h)
   for j,(v,t) in enumerate([('3','Курса'),('43','Урока'),('120','Задач'),('8','Достижений')]):
    x=20+j*145;b+=text(x,67,'—' if state=='empty' else '12 840' if state=='large-values' and j==2 else v,28,'paper',500)+text(x,108,t,14,'muted')
    if j:b+=line(x-12,24,x-12,h-24)
  elif r=='activitylog':
   b=panel(w,h,'ПОСЛЕДНЯЯ АКТИВНОСТЬ')
   if state=='empty':b+=wrapped(20,98,'Здесь появится история обучения.',w-40,18)
   else:
    for j,(t,m) in enumerate([('Решена задача','Подсчёт частот · +120 XP'),('Завершён урок','HashMap · +25 XP'),('Открыт курс','Java · вчера')]):b+=icon('check' if j<2 else 'play',20,62+j*58,20,'lime' if j<2 else 'muted')+text(55,76+j*58,t,14)+text(55,97+j*58,m,12,'muted')
  elif r in ['content','code','table']:
   h=320;b=panel(w,h)
   kind=state if r=='content' else 'code' if r=='code' else 'table'
   if kind in ['title','subtitle','paragraph']:b=text(24,60,'HashMap: поиск по ключу',30 if kind=='title' else 24,'paper',500)+wrapped(24,108,'Коллекция связывает ключ со значением. Найти данные можно по ключу, без последовательного просмотра всех элементов.',w-48,18,'paper')
   elif kind=='code':b=codeblock(16,18,w-32,['Map<String, Integer> counts = new HashMap<>();','for (String item : items) {','  counts.merge(item, 1, Integer::sum);','}','return counts;'])+text(20,205,'Скопировано' if state=='copied' else 'Java · Копировать',12,'lime' if state=='copied' else 'muted')
   elif kind=='table':
    b=text(20,34,'Операции Map',20,'paper',500)
    for j,(a,d) in enumerate([('Метод','Назначение'),('get(key)','Получить значение'),('put(key, value)','Сохранить значение'),('containsKey(key)','Проверить наличие')]):b+=line(20,56+j*52,w-20,56+j*52)+text(20,87+j*52,a,14,'muted' if j==0 else 'paper',mono=j>0)+text(w*.52,87+j*52,d,14,'muted' if j==0 else 'paper')
    if state=='loading':b=rect(20,24,w-40,240,'raised')
    if state=='empty':b=wrapped(24,116,'Данных для таблицы пока нет.',w-48,18)
   elif kind in ['image','diagram','embed']:
    b=rect(20,20,w-40,222,'ink','control',2)
    if kind=='diagram':
     for j,t in enumerate(['Ключ','HashMap','Значение']):b+=rect(36+j*168,86,138,70,'surface','control',2)+text(105+j*168,128,t,14,'paper',anchor='middle')+(icon('arrow',180+j*168,110,20,'lime') if j<2 else '')
    else:b+=icon('play' if kind=='embed' else 'grid',w/2-22,97,44,'lime')+text(w/2,181,'Видеоматериал' if kind=='embed' else 'Изображение к уроку',16,'muted',anchor='middle')
    b+=text(20,276,'Подпись и текстовое описание доступны рядом.',14,'muted')
   elif kind in ['warning','tip','note','quote']:
    tone='warn' if kind=='warning' else 'lime' if kind=='tip' else 'muted';b=rect(20,26,3,220,tone)+text(44,63,{'warning':'Осторожно','tip':'Подсказка','note':'Примечание','quote':'Из документации'}[kind],20,'paper',500)+wrapped(44,105,'Ключи должны сохранять согласованность equals и hashCode. Изменение ключа после вставки может нарушить поиск.',w-76,18)
   elif kind=='list':
    for j,t in enumerate(['Создайте коллекцию.','Добавьте пары ключ–значение.','Проверьте результат поиска.']):b+=text(24,54+j*68,f'0{j+1}',12,'lime',mono=True)+text(62,54+j*68,t,18)
   elif kind=='details':b=text(20,52,'Почему поиск работает быстро',20,'paper',500)+icon('chevron',w-44,34,24)+line(20,77,w-20,77)+wrapped(20,112,'Хеш помогает выбрать область поиска. При совпадении хешей сравниваются ключи.',w-40,18)
   elif kind=='checkpoint':b=heading('Проверьте понимание','Что произойдёт при повторной записи по тому же ключу?',w,h)+button(24,160,w-48,'Значение заменится','secondary',with_icon=False)+button(24,222,w-48,'Появится второй ключ','secondary',with_icon=False)
   else:b=heading('Перейти к практике','Решите задачу на подсчёт частот.',w,h)+button(24,150,w-48,'Открыть задачу')
  elif r=='divider':b=line(0,24,w,24)+ (cross(8,24,'lime')+cross(w-8,24,'muted') if state=='technical' else '')
  elif r=='editor':
   h=440;b=panel(w,h)+text(20,30,'Ваше решение',16,'paper',500)+text(w-20,30,'Java 21 · Main.java',12,'muted',mono=True,anchor='end')+text(20,59,'Черновик сохраняется на этом устройстве',12,'muted')+text(w-20,59,'Сбросить код',12,'muted',anchor='end')
   b+=codeblock(12,78,w-24,['public class Main {','  public static void main(String[] args) {','    // Ваше решение','  }','}'])+text(20,272,'127 / 65 535 байт',12,'muted')+line(20,292,w-20,292)+button(20,312,250,'Войти для проверки' if state=='auth-required' else 'Проверить решение','primary','loading' if state=='busy' else 'default')+text(296,343,'Обновить статус',14,'muted')+text(20,407,'Проверка решения не удаляет черновик.',12,'muted')
  elif r in ['taskstatus','taskresult']:
   labels={'idle':'Готово к проверке','submitting':'Отправляем решение','queued':'В очереди','compiling':'Компиляция','running':'Выполняются тесты','accepted':'Решение принято','wrong-answer':'Неверный ответ','runtime-error':'Ошибка выполнения','compilation-error':'Ошибка компиляции','time-limit':'Превышено время','memory-limit':'Превышена память','output-limit':'Превышен вывод','network-error':'Ошибка соединения','infrastructure-error':'Ошибка проверки','cancelled':'Проверка отменена','unknown':'Статус уточняется'}
   good=state=='accepted';busy=state in ['submitting','queued','compiling','running'];tone='lime' if good else 'muted' if busy or state=='idle' else 'error'
   b=panel(w,h)+icon('check' if good else 'clock' if busy else 'code' if state=='idle' else 'warning',20,20,24,tone)+text(58,39,labels[state],20,'paper',500)+wrapped(20,83,'Все проверки пройдены.' if good else 'Дождитесь результата. Черновик сохранён.' if busy else 'Изучите сообщение и проверьте решение.' if state not in ['idle','infrastructure-error','network-error'] else 'Можно отправить решение на проверку.' if state=='idle' else 'Решение сохранено. Повторите запрос статуса.',w-40,14)
   if r=='taskresult':b+=kv(20,158,w-40,'Тесты','18 / 18' if good else 'Публичные примеры')+kv(20,190,w-40,'Награда','+120 XP' if good else '—','lime' if good else 'muted')+button(20,h-66,w-40,'Следующий урок' if good else 'Вернуться к решению','primary' if good else 'secondary')
   else:b+=text(20,h-23,'Время: 124 мс · Память: 18 МБ' if good else 'Черновик не удаляется',12,'muted')
  elif r=='transfer':b=panel(w,h,'TRANSFER / UNGUIDED')+text(20,74,'Объединение заказов',24,'paper',500)+wrapped(20,111,'В систему приходят заказы из двух источников. Подготовьте единый список без повторной обработки.',w-40,16)+text(20,208,'Ожидается: решение и объяснение',12,'muted')+button(20,h-66,w-40,'Посмотреть результат' if state in ['accepted','failed','review'] else 'Ожидает проверки' if state=='submitted' else 'Отправить решение','secondary','disabled' if state=='submitted' else 'default')
  elif r=='finding':
   h=300;b=panel(w,h)+pill(20,20,'СТРОКИ 12–15','muted')+pill(w-140,20,'HIGH','warn',120)+text(20,90,'Потеря обновления',22,'paper',500)+wrapped(20,128,'Проверка и изменение значения разделены. Два запроса могут перезаписать результат друг друга.',w-40,16)+text(20,232,{'draft':'Черновик · Конкурентность','submitted':'Отправлено','correct':'Замечание засчитано','incorrect':'Замечание не подтверждено','partial':'Частично верное замечание'}[state],14,'lime' if state=='correct' else 'warn' if state=='partial' else 'muted')+text(20,275,'Добавить предложение по исправлению',12,'muted')
  elif r=='reviewresult':b=resultbox(w,h,'4 / 4 замечания' if state=='complete' else '3 / 4 замечания','После отправки доступны пояснения и пропущенные проблемы.',state=='complete')+text(24,212,'✓  Конкурентность     ✓  Валидация',14,'lime')+text(24,244,'✓  Ресурсы              ✓  Обработка ошибок' if state=='complete' else '✓  Ресурсы              ×  Обработка ошибок',14,'lime' if state=='complete' else 'muted')
  elif r=='codeline':b=codeblock(0,0,w,['Integer count = cache.get(key);','cache.put(key, count + 1);'],0 if state in ['selected','range','with-finding'] else None)+(pill(w-164,77,'ЗАМЕЧАНИЕ','warn',156) if state=='with-finding' else text(12,99,'Добавить замечание к выбранным строкам',12,'muted'))
  elif r=='incident':
   b=panel(w,h,'INCIDENT / 0042')+pill(w-104,18,'SEV-2','warn',84)+text(20,80,'Рост задержки API',24,'paper',500)+text(20,112,'orders-api · production',13,'muted',mono=True)+line(20,134,w-20,134)+kv(20,163,w-40,'Начало','09:42 UTC')+kv(20,195,w-40,'Статус',state.upper(),'lime' if state=='resolved' else 'warn')+text(20,228,'Диагностика · 30 мин · 240 XP',12,'muted')+button(20,h-66,w-40,'Результат' if state in ['resolved','failed'] else 'Расследовать','secondary')
  elif r=='evidence':
   b=panel(w,h,'EVIDENCE / '+state.upper())+text(20,64,{'logs':'Логи сервиса','metrics':'Задержка p95','kubernetes':'Состояние pod','database':'Активные запросы','network':'Сетевые соединения','code':'Фрагмент обработчика','events':'События'}[state],22,'paper',500)
   if state=='metrics':
    for j in range(4):b+=line(44,100+j*44,w-24,100+j*44)+text(20,104+j*44,str(800-j*200),10,'muted',mono=True)
    b+=path('M44 230L90 220L132 227L180 210L223 214L270 190L314 178L356 112L402 91L454 101L520 83','lime',2)+text(44,300,'09:30                  09:40                  09:50',12,'muted',mono=True)
   else:
    rows={'logs':['09:42:01 WARN pool exhausted','09:42:02 INFO waiting for connection','09:42:03 ERROR request timeout','trace_id=demo-a81f'],'kubernetes':['NAME             READY   STATUS','orders-api-01    1/1     Running','orders-api-02    1/1     Running','RESTARTS: 0      CPU: 42%'],'database':['pid   state              duration','142   idle in transaction  04:21','178   active               00:02','connection pool: 50 / 50'],'network':['orders-api -> db:5432  ESTABLISHED','rtt p95: 2.8ms','packet loss: 0%','open connections: 50'],'code':['Connection connection = pool.get();','Order order = readOrder(connection);','return order;'],'events':['09:31 Deployment completed','09:40 Traffic increased','09:42 Latency alert fired','09:43 Investigation started']}[state]
    b+=codeblock(16,88,w-32,rows)
   b+=text(20,h-14,'Учебные данные · доступно для расследования',11,'muted')
  elif r=='diagnosis':
   h=438;b=panel(w,h,'ДИАГНОСТИКА')+field(20,54,w-40,'Гипотеза','Соединения не возвращаются в пул')+field(20,151,w-40,'Предлагаемое исправление','Гарантированно закрывать соединение')+text(20,282,'Подтверждение: логи + состояние БД',14,'muted')+text(20,321,'Добавьте подтверждающие данные' if state=='rejected' else 'Диагноз будет проверен после отправки',12,'error' if state=='rejected' else 'muted')+button(20,h-70,w-40,'Отправлено' if state=='submitted' else 'Отправить диагноз','primary','disabled' if state=='submitted' else 'default')
  elif r=='incidentresult':b=resultbox(w,h,'Инцидент разрешён' if state=='resolved' else 'Диагноз не подтверждён','Причина: соединения остаются открытыми. Исправление: гарантировать освобождение ресурса.',state=='resolved')+kv(24,233,w-48,'Время / попытки','18 мин / 2')+kv(24,269,w-48,'Награда','+240 XP' if state=='resolved' else '—','lime' if state=='resolved' else 'muted')
  elif r=='summary':
   h=426;b=panel(w,h,'ЗАКАЗ')+embedded(ART,20,51,w-40,(w-40)*300/640,'order')+text(20,230,'Java',24,'paper',500)+kv(20,267,w-40,'Цена курса','4 990 ₽')+kv(20,298,w-40,'Скидка','−1 000 ₽','lime')+line(20,317,w-20,317)+kv(20,350,w-40,'Итого','3 990 ₽')+text(20,391,'Промокод применён' if state=='promo-valid' else 'Промокод не найден' if state=='promo-invalid' else 'Доступ к курсу после подтверждения',12,'error' if state=='promo-invalid' else 'lime' if state=='promo-valid' else 'muted')
  elif r=='paymentmethod':b=panel(w,h)+circle(30,35,10,'lime' if state=='selected' else 'control')+(circle(30,35,4,'lime',0,'lime') if state=='selected' else '')+text(58,41,'Банковская карта',16,'muted' if state=='disabled' else 'paper',500)+text(58,72,'Оплата на стороне платёжного сервиса',12,'muted')
  elif r=='paymentform':
   h=428;b=panel(w,h)+field(20,16,w-40,'Электронная почта','alex@example.com','error' if state=='validation-error' else 'filled','Проверьте адрес' if state=='validation-error' else None)+field(20,120,w-40,'Имя','Алексей')+rect(20,230,20,20,'lime',None,2)+icon('check',21,231,18,'ink')+wrapped(52,245,'Согласен с условиями покупки',w-76,14,'paper')+button(20,293,w-40,'Оплатить 3 990 ₽','primary','loading' if state=='processing' else 'default')+wrapped(20,375,'Время ожидания истекло. Проверяем статус заказа.' if state=='timeout' else 'Платёж не подтверждён. Попробуйте другой способ.' if state=='payment-error' else 'Данные карты вводятся в форме провайдера.',w-40,12,'error' if state in ['timeout','payment-error'] else 'muted')
  elif r=='paymentsuccess':
   h=382;b=panel(w,h,'PAYMENT / CONFIRMED')+embedded(BASE/'achievement-symbols/Achievement-20.svg',22,46,72,72,'paid')+text(116,88,'Доступ открыт',26,'paper',500)+text(24,159,'Курс Java',20,'paper',500)+kv(24,195,w-48,'Заказ','QLC-2026-0042')+kv(24,225,w-48,'Оплачено / дата','3 990 ₽ · 09.09.2026')+button(24,268,w-48,'Начать обучение')+text(w/2,354,'Мои курсы',14,'muted',anchor='middle')
  elif r=='paymentfailed':
   h=354;b=panel(w,h,'PAYMENT / '+('PENDING' if state=='timeout' else 'FAILED'))+text(24,82,'Проверяем платёж' if state=='timeout' else 'Оплата не прошла',26,'paper',500)+wrapped(24,124,'Не оплачивайте повторно, пока уточняется статус заказа.' if state=='timeout' else 'Доступ к курсу пока не открыт. Можно повторить оплату или выбрать другой способ.',w-48,16)+button(24,220,w-48,'Проверить статус' if state=='timeout' else 'Другой способ' if state=='change-method' else 'Повторить оплату')+text(w/2,322,'Вернуться к курсу',14,'muted',anchor='middle')
  elif r=='auth':
   h=526 if state=='register' else 440;title={'login':'Войти в QLC','register':'Создать аккаунт','forgot-password':'Восстановить пароль','reset-password':'Новый пароль','verify-email':'Подтвердите почту','verification-success':'Почта подтверждена'}[state]
   b=panel(w,h)+text(24,56,title,26,'paper',500)
   if state in ['verify-email','verification-success']:b+=wrapped(24,110,'Мы отправили письмо на alex@example.com. Откройте ссылку для подтверждения.' if state=='verify-email' else 'Теперь можно продолжить обучение.',w-48,16)+glyph(24,196,80)+button(24,h-80,w-48,'Отправить письмо ещё раз' if state=='verify-email' else 'К обучению',with_icon=False)
   else:
    y=92;b+=field(24,y,w-48,'Новый пароль' if state=='reset-password' else 'Электронная почта','••••••••' if state=='reset-password' else 'alex@example.com',password=state=='reset-password')
    if state!='forgot-password':b+=field(24,y+104,w-48,'Повторите пароль' if state=='reset-password' else 'Пароль','••••••••••',password=True)
    if state=='register':b+=field(24,y+208,w-48,'Повторите пароль','••••••••••',password=True)
    b+=button(24,h-110,w-48,'Отправить ссылку' if state=='forgot-password' else 'Сохранить пароль' if state=='reset-password' else 'Зарегистрироваться' if state=='register' else 'Войти',with_icon=False)+text(w/2,h-28,'Уже есть аккаунт? Войти' if state=='register' else 'Забыли пароль?' if state=='login' else 'Назад ко входу',14,'muted',anchor='middle')
  else:raise ValueError((name,r))
  out.append(save_component(c,state,b,w,h))
(ROOT/'data/domain-workspace-specimens.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(f'{len(out)} domain/progression/learning/commerce SVG specimens')
