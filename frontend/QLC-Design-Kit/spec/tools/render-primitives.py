from ui_common import *

COMPS=json.loads((ROOT/'data/component-inventory.json').read_text())['components']
result=[]
for c in COMPS:
 if c['group'] not in ['01-controls','02-navigation','03-feedback']:continue
 for state in c.get('specimenStates',c['states']):
  w,h=c['size'];r=c['renderer'];body='';name=c['name'];tone='lime'
  if r=='button':
   for sz,ht,pad in [('S',44,16),('M',48,20),('L',56,24)]:
    k=name.split('/')[-1].lower();bw=200 if k!='icon' else ht
    b=button(8,8,bw,'Продолжить' if k not in ['danger','text'] else 'Сбросить код' if k=='danger' else 'Подробнее',k,state,ht,k not in ['text','ghost','icon'])
    if k=='icon':
     b=rect(8,8,ht,ht,'raised' if state in ['hover','pressed'] else 'none','control',2)+icon('plus',8+(ht-20)/2,8+(ht-20)/2,20,'muted' if state=='disabled' else 'paper')
     if state=='focus':b+=rect(4,4,ht+8,ht+8,'none','paper',4,2)
     if state=='loading':b=rect(8,8,ht,ht,'none','control',2)+circle(8+ht/2,8+ht/2,8,'lime')
    result.append(save_component(c,state,b,bw+16,ht+16,sz))
   continue
  if r=='input':
   typ=name.split('/')[-1];labels={'Text':'Имя','Search':'Поиск курсов','Password':'Пароль','Email':'Электронная почта','Number':'Количество','Promo':'Промокод','Code':'Код подтверждения'}
   values={'Text':'Алексей','Search':'Java','Password':'••••••••••••','Email':'alex@example.com','Number':'12','Promo':'LEARN20','Code':'042 719'}
   helper='Проверьте значение поля' if state=='error' else 'Значение подтверждено' if state=='success' else None
   value=values[typ] if state not in ['empty','disabled'] else {'Search':'Название или технология','Text':'Как к вам обращаться','Password':'Не менее 8 символов','Email':'name@example.com','Number':'0','Promo':'Введите промокод','Code':'000 000'}[typ]
   body=field(4,0,w-8,labels[typ],value,state,helper,typ=='Password')
   if state=='success':body+=icon('check',w-34,36,18,'lime')
   if typ=='Search':body+=icon('search',w-34,36,18,'muted')
  elif r=='textarea':
   body=field(4,0,w-8,'Ваше объяснение','',state)+rect(4,22,w-8,136,'surface','error' if state=='error' else 'lime' if state=='focus' else 'control',2)
   body+=wrapped(18,52,'Опишите, почему выбранное решение подходит.' if state=='empty' else 'Проблема возникает при одновременном обновлении данных. Изменение должно выполняться атомарно.',w-40,16,'muted' if state=='empty' else 'paper')
   h=228;body+=text(4,184,'Объясните причину, а не только действие.',12,'error' if state=='error' else 'muted')+text(w-4,214,'127 / 2 000',12,'muted',anchor='end')
  elif r=='select':
   body=field(4,0,w-8,'Сложность','Любая' if state in ['default','open'] else 'Начальный уровень',state)+icon('chevron',w-34,36,18,'muted')
   if state=='open':
    body+=rect(4,78,w-8,176,'raised','control',2)
    for j,t in enumerate(['Любая','Начальный уровень','Средний уровень','Продвинутый']):
     if j==1:body+=rect(8,124,w-16,40,'blue')
     body+=text(20,106+j*42,t,14)+ (icon('check',w-34,132,18) if j==1 else '')
  elif r=='choice':
   ison=state in ['checked','selected','on','mixed'];fg='muted' if state=='disabled' else 'paper'
   if name=='Switch':body=rect(4,20,44,24,'lime' if ison else 'line',None,12)+circle(36 if ison else 16,32,8,'ink',0,'ink' if ison else 'paper');x=62
   elif name=='Radio':body=circle(16,32,10,'lime' if ison else 'control')+(circle(16,32,4,'lime',0,'lime') if ison else '');x=44
   else:
    body=rect(6,22,20,20,'lime' if ison else 'none','lime' if ison else 'control',2)
    if ison:body+=icon('minus' if state=='mixed' else 'check',7,23,18,'ink')
    x=44
   body+=text(x,31,'Получать уведомления',14,fg)+text(x,53,'Прогресс и важные изменения',12,'muted')
   if state=='focus':body=rect(0,4,w,h-8,'none','paper',4,2)+body
  elif r=='chip':
   body=rect(4,4,206,44,'blue' if state=='selected' else 'surface','control',2)+text(18,32,'Начальный · 8',14,'muted' if state=='disabled' else 'paper')
   if state in ['selected','removable']:body+=icon('check' if state=='selected' else 'close',180,16,18)
  elif r=='tabs':
   body=line(0,59,w,59)
   for j,t in enumerate(['Обзор','Мой прогресс','Достижения']):
    body+=text(j*148+14,35,t,14,'muted' if j!=1 or state=='disabled' else 'paper',500)
   body+=rect(148,57,138,3,'lime' if state!='disabled' else 'line')
  elif r=='accordion':
   body=panel(w,h if state=='expanded' else 76)+text(20,28,'01 / ОСНОВЫ ЯЗЫКА',11,'muted',mono=True)+text(20,56,'Типы, выражения и условия',18)+icon('minus' if state=='expanded' else 'plus',w-42,28,22,'muted')
   if state=='expanded':body+=line(20,82,w-20,82)+wrapped(20,112,'Разберёмся с переменными, условиями и циклами. После теории — задачи с проверкой решения.',w-40,16)+text(20,178,'5 уроков · 2 ч 30 мин',12,'muted')
  elif r=='pagination':
   body=icon('arrow-left',12,18,20,'muted');active=1 if state=='first' else 9 if state=='last' else 4
   for j,t in enumerate(['1','2','…','4','5','…','9']):
    x=44+j*43
    if t==str(active):body+=rect(x,6,40,44,'lime',None,2)
    body+=text(x+20,34,t,14,'ink' if t==str(active) else 'paper',500,anchor='middle')
   body+=icon('arrow',w-28,18,20,'muted' if state in ['last','loading'] else 'paper')
  elif r=='loadmore':body=button(4,4,w-8,'Все курсы загружены' if state=='end' else 'Показать ещё', 'secondary','loading' if state=='loading' else 'disabled' if state=='end' else 'default',48,False)+text(w/2,74,'20 из 120 курсов',12,'muted',anchor='middle')
  elif r=='breadcrumbs':
   body=text(4,33,'Курсы',14,'muted')+text(64,33,'/',14,'muted')+text(84,33,'…' if state=='collapsed' else 'Java',14,'muted')+text(133,33,'/',14,'muted')+text(151,33,'HashMap',14,'paper')
  elif r=='menu':
   body=panel(w,h)
   labels=['Моё обучение','Мой прогресс','Достижения','Профиль','Выйти'] if name!='ContextMenu' else ['Открыть','Копировать ссылку','Добавить в список','Убрать из списка']
   if state=='closed':labels=['Сортировка: популярные'];h=56;body=panel(w,h)
   if state=='empty':labels=['Совпадений нет']
   for j,t in enumerate(labels):
    if j==1 and state=='selected':body+=rect(6,52,w-12,44,'blue',None,2)
    body+=icon(['play','grid','diamond','user','arrow'][j%5],16,17+j*44,18,'muted')+text(46,32+j*44,t,14,'muted' if state=='disabled' else 'paper')
  elif r=='tooltip':body=rect(4,4,w-8,h-8,'raised','control',2)+wrapped(16,29,'Прогресс обновится после проверки решения.' if state=='multiline' else 'Копировать ссылку',w-32,14,'paper')
  elif r=='popover':
   body=panel(w,h)+text(20,37,'Как считается прогресс',18,'paper',500)+wrapped(20,66,'Доля завершённых обязательных заданий. Прочитанный текст считается отдельно.',w-40,14)
   if state=='with-action':body+=button(20,h-58,w-40,'Подробнее','text',with_icon=False)
  elif r=='header':
   body=rect(0,0,w,h,'ink')+line(0,h-1,w,h-1)+icon('diamond',24,27,32,'lime')+text(66,51,'QLC',26,'paper',600)
   labels=['Курсы','Как устроено'] if state=='guest' else ['Моё обучение','Курсы','Прогресс','Достижения']
   for j,t in enumerate(labels):body+=text(230+j*142,47,t,14,'muted')
   body+=button(w-148,20,124,'Войти','primary',with_icon=False) if state=='guest' else icon('user',w-104,26,28,'lime')+text(w-66,40,'@alex',12)+text(w-66,58,'LVL 12',11,'muted',mono=True)
  elif r=='navdrawer':
   body=panel(w,h)+text(24,42,'QLC',26,'paper',600)+icon('close',w-46,24,24,'paper')+line(24,72,w-24,72)
   labels=['Курсы','Как устроено','Войти'] if state=='guest' else ['Моё обучение','Курсы','Мой прогресс','Достижения','Профиль']
   for j,t in enumerate(labels):body+=text(24,120+j*56,t,18)+icon('arrow',w-44,103+j*56,20,'muted')
   body+=text(24,h-28,'QUANTUM LEARNING CORE',11,'muted',mono=True)
  elif r=='sidebar':
   if state=='collapsed':w=72;body=panel(w,h)+''.join(icon(ic,24,24+j*56,24,'lime' if j==1 else 'muted') for j,ic in enumerate(['diamond','grid','play','code','user']))
   else:
    body=panel(w,h)+text(20,38,'Java',22,'paper',500)+text(20,65,'43 / 60 уроков',12,'muted')+bar(20,82,w-40,71.6667)
    for j,t in enumerate(['Основы языка','Условия и циклы','Методы','Классы','Коллекции','Исключения']):body+=text(20,133+j*44,t,14,'paper' if j==4 else 'muted')+icon('check' if j<4 else 'play' if j==4 else 'lock',w-40,116+j*44,18,'lime' if j<5 else 'muted')
  elif r=='section':body=text(0,18,'02 / ОБУЧЕНИЕ',11,'muted',mono=True)+text(0,60,'Популярные курсы',28,'paper',500)+line(0,88,w,88)+cross(w-6,18,'lime')+(text(w-136,60,'Все курсы ↗',14,'lime') if state=='with-action' else '')
  elif r=='modal':
   if state in ['small','medium','large']:w={'small':320,'medium':480,'large':640}[state];h=320
   body=panel(w,h)+text(24,39,'ПОДТВЕРЖДЕНИЕ',11,'muted',mono=True)+icon('close',w-44,20,20,'muted')+wrapped(24,85,'Сбросить изменения?' if state=='danger' else 'Сохранить изменения?',w-48,24,'paper',30)
   body+=wrapped(24,143,'Текущий код заменится стартовым шаблоном. Это действие затронет только открытую задачу.' if state=='danger' else 'Изменения будут применены к вашему профилю.',w-48,16)
   body+=button(24,h-72,(w-56)/2,'Отмена','secondary',with_icon=False)+button(32+(w-56)/2,h-72,(w-56)/2,'Сбросить' if state=='danger' else 'Сохранить','danger' if state=='danger' else 'primary','loading' if state=='processing' else 'default',with_icon=False)
  elif r=='drawer':
   body=panel(w,h)+text(24,45,'Фильтры',24,'paper',500)+icon('close',w-48,27,22)+field(24,78,w-48,'Категория','Все категории')+field(24,183,w-48,'Сложность','Любая')+text(24,308,'Только бесплатные',14)+rect(w-48,292,20,20,'none','control',2)+button(24,h-112,w-48,'Показать курсы','primary','loading' if state=='loading' else 'default')+text(w/2,h-28,'Сбросить фильтры',14,'muted',anchor='middle')
  elif r in ['toast','alert']:
   color={'success':'lime','info':'info','warning':'warn','error':'error'}[state];titles={'success':'Изменения сохранены','info':'Проверка ещё идёт','warning':'Соединение нестабильно','error':'Не удалось сохранить'};descs={'success':'Профиль обновлён.','info':'Результат появится здесь.','warning':'Черновик сохранён на устройстве.','error':'Черновик сохранён. Повторите попытку.'}
   body=panel(w,h)+rect(0,0,3,h,color)+icon('check' if state=='success' else 'info' if state=='info' else 'warning',20,22,22,color)+text(54,38,titles[state],16,'paper',500)+wrapped(54,65,descs[state],w-82,14)+icon('close',w-35,14,18,'muted')
   if r=='alert' and state=='error':body+=text(54,h-22,'Повторить',14,'error',500)
  elif r=='badge':
   labels={'new':'НОВЫЙ','popular':'ПОПУЛЯРНЫЙ','sale':'−20%','locked':'ЗАКРЫТО','completed':'ЗАВЕРШЕНО','in-progress':'В ПРОЦЕССЕ','review-due':'ПОВТОРЕНИЕ','easy':'НАЧАЛЬНЫЙ','medium':'СРЕДНИЙ','hard':'СЛОЖНЫЙ','sev-1':'SEV-1 / КРИТИЧЕСКИЙ','sev-2':'SEV-2 / ВЫСОКИЙ','sev-3':'SEV-3 / СРЕДНИЙ'}
   color='error' if state=='sev-1' else 'warn' if state in ['sev-2','review-due','hard'] else 'lime' if state in ['completed','new','sale'] else 'muted';body=pill(4,12,labels.get(state,state.upper()),color)
  elif r=='spinner':
   body=circle(w/2,34,14,'line',3)+path(f'M{w/2} 20A14 14 0 0 1 {w/2+14} 34','lime',3)+text(w/2,76,'Загрузка…',12,'muted',anchor='middle')
   if state=='reduced-motion':body=icon('clock',w/2-14,20,28,'muted')+text(w/2,76,'Загрузка…',12,'muted',anchor='middle')
  elif r=='skeleton':
   body=panel(w,h)
   if state=='course-card':body+=rect(16,16,w-32,90,'raised')+rect(16,126,w-72,18,'line')+rect(16,160,w-48,10,'raised')+rect(16,184,w-100,10,'raised')
   elif state in ['profile','achievement']:body+=rect(20,24,64,64,'raised',None,4)+rect(104,32,w-138,16,'line')+rect(104,62,w-156,10,'raised')+rect(20,120,w-40,8,'raised')+rect(20,148,w-92,8,'raised')+rect(20,180,w-72,8,'raised')
   elif state=='task':
    for j in range(7):body+=rect(18,20+j*26,12,8,'raised')+rect(46,20+j*26,[130,218,166,244,178,206,126][j],8,'line' if j==1 else 'raised')
   else:
    body+=rect(20,22,w-100,22,'line')
    for j in range(5):body+=rect(20,74+j*26,w-40-(j%3)*36,10,'raised')
  elif r=='empty':
   titles={'no-courses':'Курсов пока нет','no-active-courses':'Пора выбрать первый курс','no-achievements':'Достижения появятся здесь','no-results':'Ничего не найдено','no-activity':'Активности пока нет','no-payments':'Покупок пока нет'}
   desc='Попробуйте другой запрос или уберите часть фильтров.' if state=='no-results' else 'Здесь будет история вашего обучения.' if state=='no-activity' else 'Выберите курс, чтобы начать практику.' if state in ['no-courses','no-active-courses','no-payments'] else 'Пройдите первый урок или решите задачу.'
   body=panel(w,h)+icon('search' if state=='no-results' else 'grid',24,26,28,'lime')+text(24,96,titles[state],22,'paper',500)+wrapped(24,129,desc,w-48,16)+button(24,h-62,w-48,'Сбросить фильтры' if state=='no-results' else 'Выбрать курс','secondary',with_icon=True)
  elif r=='error':
   titles={'generic':'Не удалось загрузить','network':'Нет соединения','403':'Нет доступа','404':'Страница не найдена','500':'Ошибка сервера','maintenance':'Технические работы','offline':'Вы не в сети','reconnecting':'Восстанавливаем связь'}
   desc='Проверьте соединение. Сохранённый черновик останется на этом устройстве.' if state in ['network','offline','reconnecting'] else 'Войдите в аккаунт с доступом к этому материалу.' if state=='403' else 'Адрес мог измениться. Откройте каталог курсов.' if state=='404' else 'Попробуйте ещё раз немного позже.'
   body=panel(w,h)+icon('refresh' if state=='reconnecting' else 'warning',24,25,28,'warn' if state=='maintenance' else 'error')+text(24,94,titles[state],22,'paper',500)+wrapped(24,126,desc,w-48,16)+button(24,h-62,w-48,'В каталог' if state=='404' else 'Войти' if state=='403' else 'Повторить','secondary','loading' if state=='reconnecting' else 'default')
  else:raise ValueError((name,r))
  result.append(save_component(c,state,body,w,h))
(ROOT/'data/primitive-specimens.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f'{len(result)} primitive/nav/feedback editable SVG specimens')
