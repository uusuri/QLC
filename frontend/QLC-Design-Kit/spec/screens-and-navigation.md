# QLC — Экраны, маршруты и навигация

Статус: подробная локальная спецификация, 9 сентября 2026. Она не доказывает создание новых экранов в Figma или наличие новой логики в приложении. Согласованная homepage защищена от переделки. Источник текущего поведения — `../source-inventory.md`; старый `build-plan.json` использован как inventory, а новые требования расширяют его.

## Как читать

`existing` означает уже существующий маршрут, а не готовность описанного расширенного экрана. `proposed` — предложение будущего маршрута; не менять backend и роутинг только ради совпадения с Figma. URL query обозначает состояние страницы, может быть адаптирован к текущему router. Все примеры данных — demo, кроме явно отмеченных существующих контрактов.

## Sitemap

```text
QLC
├─ / Главная [существующая, защищена]
│  ├─ /#how-it-works Как устроено [якорь уточнить при интеграции]
│  ├─ /courses Магазин [новый маршрут]
│  │  └─ /courses/:slug Курс [существующий маршрут]
│  │     ├─ до покупки: обзор + программа + цена
│  │     └─ при доступе: обучение → модуль → урок
│  └─ Auth: /login · /register [существуют]
│     └─ /forgot-password → /reset-password
│        /verify-email → /verify-email/success [новые]
├─ /my-learning Моё обучение [новый вход]
├─ /profile [существует; новые вкладки]
│  ├─ ?tab=overview Обзор
│  ├─ ?tab=progress Мой прогресс → раскрытые модули/уроки
│  ├─ ?tab=achievements Достижения → detail overlay
│  ├─ ?tab=activity Активность
│  └─ ?tab=settings Настройки
├─ /courses/:slug?view=learning → ?module=:id
│  └─ /lessons/:id [существует]
│     ├─ материал
│     └─ ?tab=practice&task=:id Код / тест [сохранить действующий editor]
├─ /activities/transfer/:id [новый]
├─ /activities/review/:id [новый]
├─ /activities/project/:id [новый]
├─ /incidents [optional новый hub]
│  └─ /incidents/:id → /result/:attemptId [новые]
├─ /skills/:id · /review [новые освоение/повторение]
├─ /checkout?course=:slug [существует тестовый checkout]
│  ├─ /checkout/success?order=:id [новый]
│  └─ /checkout/failed?order=:id [новый]
└─ 403 · 404 · 500 · maintenance · offline [системные шаблоны]
```

Структура и ID в машиночитаемом виде: `data/screens.json → sitemap.nodes`. `/admin/content` остаётся защищённой существующей областью вне нового пользовательского брифа; она не удаляется и не переименовывается.

## Глобальный контракт навигации

- Public: «Курсы», «Как устроено», «Войти». Auth: «Моё обучение», «Курсы», «Прогресс», «Достижения», «Профиль». Никаких параллельных основных ссылок «Мои курсы»/«Моё обучение» с неясным различием: «Мои курсы» — действие внутри dashboard/profile.
- Desktop: logo слева, ссылки в центре, avatar/level/compact XP справа. Активная ссылка имеет текстовый/линейный индикатор. В узком desktop до полного размещения переключить на меню, не сжимать кликабельные цели.
- Mobile: header56, logo + menu44. Drawer занимает ширину min(360, viewport), закрытие44, вертикальная полная навигация, user summary и выход внизу потока. Escape/backdrop закрывают, focus возвращается к trigger, фон inert, scroll блокируется только для фона.
- Breadcrumb: полный контекст desktop; mobile «← Модуль» + текущий заголовок. Полный путь доступен в раскрытии, не тянет страницу по горизонтали.
- После входа вернуться в изначальный внутренний маршрут; покупки/редактор не теряют черновик. URL не принимает внешний return. После logout переходить на public; кэш личных данных очищается в будущей реализации.
- Вкладки управляются arrow keys/Home/End, активируется выбранная согласно manual activation при дорогом содержимом. Все tabpanels имеют доступный заголовок. В редакторе Tab остаётся вводом кода: есть инструкция/команда выхода из capture, не перехватывать стрелки из Monaco глобальными tabs.
- Списки используют устойчивый ID, cursor/page и результат сервера. Карточка не является кликабельным контейнером с вложенными конфликтующими кнопками: title/artwork — ссылка, отдельные CTA — независимые actions.

## Общие состояния каждого экрана

| Состояние | Правило |
|---|---|
| Loading | Скелет повторяет геометрию; сохраняются shell и уже доступный контент. Spinner для краткой локальной операции, не для пустой всей страницы. |
| Empty | Указать, почему данных нет, и доступное действие. Нулевые метрики только если сервер действительно вернул0. |
| Error | Локализовать сбой, сохранить ввод/кэш, дать retry. Backend текст безопасный; сырой stack не показывается. |
| Disabled | Причина видна по месту, состояние не сообщается одним цветом. |
| Offline/reconnecting | Один баннер, без пачки одинаковых toasts. Возможность редактирования определяется local draft support, не обещать сохранение на сервер. |
| Success | Подтверждение связано с выполненным действием; XP начисляется только подтверждённым событием. |
| Destructive | Конкретное действие: сброс кода, удаление замечания, уход с несохранённой формой. Сохранение или простой переход не требует подтверждения. |

Приведённые ниже specific states уточняют этот общий контракт. Не каждое состояние требует отдельной полной страницы: локальные варианты собираются из общего component inventory.

## public-home — Главная

**Маршрут:** `/` · existing. **Доступ:** public. **Будущая страница Figma:** `03 / Public`.

**Задача:** Объяснить формат обучения и привести к выбору курса, сохранив согласованную композицию.

**Композиция:** PROTECTED: существующий desktop 1440×2422 и hero не перестраивать под новую сетку. Сохранить Figma 9:23, hero10:22 и synthetic-art.png. Добавляемые в будущем секции используют Course/Card и принятую ширину 1312 с полями64; не заменять текущие секции автоматически.

**Mobile:** PROTECTED: mobile 360×2728 из mobile-layout.json. Заголовок и CTA сверху, неизменённый арт ниже; сохранять его crop и spacing. Будущая лента Course/Card идёт одной колонкой. На390 разрешён только reflow существующего макета.

**Состав:** `Navigation/Header`, `Home/Hero (protected)`, `Discovery/Section`, `Course/Card`, `HowItWorks/Section`, `Footer`.

**Действия:** основное — Выбрать курс → /courses; вторичные — Как устроено → /#how-it-works; Войти → /login.

**Пример:** «Программирование через практику». «Короткая теория, задачи и проверка решения — в одном рабочем пространстве».

**Данные и видимость:** Популярное / Рекомендуем / Новое / Со скидкой — слоты Discovery/Section, а не пять обязательных новых блоков на текущем landing. Продолжить обучение показывать только авторизованному с активным курсом. Персональные рекомендации скрыты, если данных нет.

**Состояния и выходы:** Курсы грузятся собственными skeleton; hero не скрывается. Ошибка каталога имеет локальный retry. Пустая рекомендация скрывает только секцию. Никаких generated claims о количестве студентов.

## store-catalog — Магазин курсов

**Маршрут:** `/courses` · proposed; current catalog is /#courses. **Доступ:** public. **Будущая страница Figma:** `04 / Store`.

**Задача:** Выбрать курс по теме, уровню, времени и цене без потери контекста фильтров.

**Композиция:** Контент1280, 12колонок. Заголовок и поиск на12; каталог ниже: sidebar296 (3кол) + results960 (9кол), gap24. Results3колонки по304; artwork640:300. До активного поиска — компактные editorial группы «Популярные», «Со скидкой», «Новые», «Рекомендуем» (каждая до3видимых карточек + «Все»). Затем «Все курсы» с20инстансами в fixture. При запросе/фильтре только общий results grid, без дублирующих подборок.

**Mobile:** 360/390: padding16, поиск328/358, строка «Фильтры (N)» + sort44px, results1колонка. Фильтры в полноэкранном drawer с независимым скроллом, закреплёнными «Сбросить» / «Показать N курсов». Выбранные chips переносятся на строки. Подборки вертикальные, не скрытый горизонтальный carousel.

**Состав:** `Navigation/Header`, `Section/Header`, `Input/Search`, `Filter/Group`, `Filter/Chip`, `Select`, `Discovery/Section`, `Course/Card`, `Pagination`, `LoadMore`, `Page/State`.

**Действия:** основное — Открыть курс; вторичные — Очистить фильтры; Показать ещё; Перейти к странице.

**Пример:** Курсы / «Практика по языкам, инструментам и инженерным задачам». Search «Найти курс». Заголовок results «Найдено 20 курсов».

**Данные и видимость:** 8групп фильтров: category multi, difficulty multi, technology multi, duration ranges, price min/max, free/paid, new boolean, discounted boolean. 5sort: popular,newest,price_asc,price_desc,difficulty. URL хранит query/filter/sort/page; возврат из курса восстанавливает скролл. OR внутри группы, AND между группами. Пользовательская сортировка не сбрасывается на ввод. Search debounce250ms, Enter немедленно. Доступность и прогресс независимы от sale/new/popular. Discount только приoldPrice>price; free=0 не «Скидка100%».

**Состояния и выходы:** Loading первой страницы:6skeleton. Следующая страница: footer loader, старые карточки доступны. No search «По запросу “ruts” курсов нет» + «Очистить поиск». Filters empty «Нет курсов с такими условиями» + сброс. Pagination и Load more — альтернативные presentation одного контракта, не два конкурирующих набора сразу. Page size20, totalдинамический; snapshot содержит20, не limitсистемы.

## course-overview — Курс до покупки

**Маршрут:** `/courses/[slug]` · existing route; expanded view proposed. **Доступ:** public. **Будущая страница Figma:** `04 / Store`.

**Задача:** Понять результат курса, программу и цену до покупки.

**Композиция:** Hero: 7кол описание + 5кол artwork и purchase panel; контент1280. Купить не скрывать ниже fold: название≤3строк, facts одной переносимой строкой, CTA48. Ниже основная колонка840 и sticky aside416 с ценой после выходаhero. Секции01About,02Skills,03Program,04Format,05Included,06Requirements,07ForWhom,08FinalCTA. Module accordion строка96min, expanded lessons без искусственного ограничения.

**Mobile:** Artwork перед короткими facts, H132/38, покупка после описания. Summary без sticky sidebar. Нижняя sticky CTA допустима только после hero и не закрывает контент: safe-area+72pxreserve; рядом полная текущая цена, полная цена также у кнопки.

**Состав:** `Breadcrumbs`, `Course/Artwork`, `Course/Icon`, `Course/Meta`, `Payment/Price`, `Button/Primary`, `Accordion`, `Module/Card`, `Learning/Format`, `Course/Requirements`.

**Действия:** основное — Купить курс → /checkout?course=slug; вторичные — Открыть вводный урок; К программе.

**Пример:** «Java Backend». «Коллекции, HTTP, работа с данными и проверка решений на практических задачах». «Что вы освоите»: выбирать коллекции, строить API, находить причины ошибок.

**Данные и видимость:** При access=owned primary «Продолжить обучение», цена остаётся только в истории заказа, вторичная «Программа». Preview доступен только у отмеченных lesson. Locked показывает причину и цену, но раскрытие названий программы разрешено. Rating slot скрыт до реальных оценок; нет выдуманных рейтингов.

**Состояния и выходы:** Loading сохраняетheroheight. Coming soon: «Курс готовится», purchase disabled + фактическая доступная альтернатива. 404 неизвестныйslug. Ошибка цены/доступа не показывает ложное «Купить»: retry соответствующего блока. Free CTA «Начать бесплатно» с безопасной authredirect.

## auth-login — Вход

**Маршрут:** `/login` · existing; current identifier username. **Доступ:** public. **Будущая страница Figma:** `05 / Auth`.

**Задача:** Войти и вернуться к сохранённой цели.

**Композиция:** Форма448px на левой6кол, справа статическая фрагментарная coursegeometry; панель почти чёрная без glass. Верх logo + «На главную». Заголовок32. Поля48, gap20.

**Mobile:** Одноколоночная форма328/358, без декоративной колонны. Кнопка48fullwidth. Password toggle44. Клавиатура не перекрывает сообщение; submit не fixed.

**Состав:** `Auth/Shell`, `Input/Text`, `Input/Password`, `Button/Primary`, `Alert`, `SocialAuth/Slot`.

**Действия:** основное — Войти; вторичные — Создать аккаунт; Забыли пароль?.

**Пример:** «Вход в QLC». Label «Имя пользователя» в совместимом режиме; «Email» только в будущем authvariant. «Пароль».

**Данные и видимость:** Сохранить текущий username login, не заменить его молча email. Будущий identifier=email|username параметр. Password visibility не очищает значение. Google/GitHub только optionaldisabledslots до подключения; существующий Telegram — отдельный supportedslot. Return URL только внутренний allowlisted, ошибка не раскрывает существование аккаунта.

**Состояния и выходы:** Invalid credentials: «Не удалось войти. Проверьте данные». Processing блокирует повторную отправку, поля остаются читаемы. Network error сretry без потериidentifier, пароль не логируется. Успешный вход→safe return или/my-learning. Signed-in visits→dashboard.

## auth-register — Регистрация

**Маршрут:** `/register` · existing. **Доступ:** public. **Будущая страница Figma:** `05 / Auth`.

**Задача:** Создать учётную запись без потери выбранного курса.

**Композиция:** Authform480px, поля username,email,password,confirmation. Passwordhelpпередsubmit, условия одной компактной группой. Не добавлять необоснованные профилирующие поля.

**Mobile:** Какlogin; длинные legal labels переносятся, checkbox имеет44target. Ошибки резервируют строку без перекрытия соседнего поля.

**Состав:** `Auth/Shell`, `Input/Text`, `Input/Email`, `Input/Password`, `Checkbox`, `Form/Errors`, `SocialAuth/Slot`.

**Действия:** основное — Создать аккаунт; вторичные — Уже есть аккаунт? Войти.

**Пример:** «Создать аккаунт». «Имя пользователя», «Email», «Пароль», «Повторите пароль».

**Данные и видимость:** Validation onblur/submit, не кричатьerrorнапервомнажатии. Правила пароля братьизbackendpolicy. Поддержать pending emailverification какбудущийсценарий. Подписка нарассылку не предвыбрана и не нужнапоумолчанию.

**Состояния и выходы:** Fieldinvalid показываетсяпо месту+focusfirstinvalid. Emailconflictтекстпоauthpolicy. Submitbusy+повторблокирован. Успехлибоloginreturn,либоверификациявзависимостиотреальногопотока.

## auth-forgot — Восстановление пароля

**Маршрут:** `/forgot-password` · proposed. **Доступ:** public. **Будущая страница Figma:** `05 / Auth`.

**Задача:** Запросить письмо для восстановления.

**Композиция:** Центрированнаяформа448, logoиback, короткоепояснение.

**Mobile:** 328/358ширина; всеэлементывпотоке, экраннефиксируетсяпоheight.

**Состав:** `Auth/Shell`, `Input/Email`, `Button/Primary`, `Alert`.

**Действия:** основное — Отправить письмо; вторичные — Вернуться ко входу.

**Пример:** «Восстановить пароль». «Укажите email, который использовали при регистрации».

**Данные и видимость:** Ответнеподтверждаетналичиеemail. Rate-limitпоказываетвремяразрешённойповторнойотправкибезфальшивоготаймера.

**Состояния и выходы:** Послеотправки: «Если аккаунт с таким адресом есть, мы отправили письмо». Retryпослекулдауна; networkfailureсохраняетemail.

## auth-reset — Новый пароль

**Маршрут:** `/reset-password?token=…` · proposed. **Доступ:** public. **Будущая страница Figma:** `05 / Auth`.

**Задача:** Безопасно завершить восстановление.

**Композиция:** Форма448; дваполяпароля; пояснениевыходаизстарыхсессийеслиподдержано.

**Mobile:** Одноколоночно; toggle44; нетавтофокусаоткрывающегоклавиатурубезнеобходимости.

**Состав:** `Auth/Shell`, `Input/Password`, `Alert`, `Page/State`.

**Действия:** основное — Сохранить пароль; вторичные — Запросить новую ссылку.

**Пример:** «Новый пароль». «Повторите новый пароль». Успех «Пароль обновлён. Теперь можно войти».

**Данные и видимость:** Tokenобрабатываетсяприложением,непоказываетсявтекстах/логах. Недействительнаяилиистёкшаяссылкаведётнаforgot. Сохранениенезначитавтоматическийвходеслиbackendтакнерасположен.

**Состояния и выходы:** Tokenloading; expired/invalidstate+requestnew. SuccessсCTA«Войти». Formerrorнеобнуляетполя.

## auth-verification — Подтверждение email

**Маршрут:** `/verify-email` · proposed. **Доступ:** public. **Будущая страница Figma:** `05 / Auth`.

**Задача:** Объяснить следующее действие после регистрации.

**Композиция:** Колонка480смалойгеометрическойметкой; emailмаскируетсяпри необходимости.

**Mobile:** ПояснениеиCTAвпотоке, «Отправить ещё раз»44target.

**Состав:** `Auth/Shell`, `Verification/Status`, `Button`, `Alert`.

**Действия:** основное — Отправить письмо ещё раз; вторичные — Изменить email; Вернуться ко входу.

**Пример:** «Подтвердите email». «Откройте ссылку в письме, чтобы завершить регистрацию».

**Данные и видимость:** ResendкулдаунсserverretryAfter, nohardcoded60еслиAPIдругое. Изменитьemailтолькоприавторизованномpendingаккаунте.

**Состояния и выходы:** Pending,resent,expired,ratelimited,networkerror. КодовыйinputoptionalтолькоприOTPbackend; основнойflowlink.

## auth-verification-success — Email подтверждён

**Маршрут:** `/verify-email/success` · proposed. **Доступ:** public. **Будущая страница Figma:** `05 / Auth`.

**Задача:** Понятно завершить верификацию.

**Композиция:** Небольшойорбитальныйсимволсинтетическойсистемы, текстикнопка; неогромнаязелёнаягалка.

**Mobile:** Центрированныйконтентсвыравниваниемтекставлево, CTAfullwidth.

**Состав:** `Auth/Shell`, `Verification/Status`, `Button/Primary`.

**Действия:** основное — Продолжить; вторичные — Выбрать курс.

**Пример:** «Email подтверждён». «Можно продолжить обучение в QLC».

**Данные и видимость:** Перейтиксохранённойцелиеслионасуществует; guest→loginсreturn; signed-in→dashboard.

**Состояния и выходы:** Повторнопосещённаяссылканеошибкаеслиужеverified. Failedtoken→verificationwithreason.

## dashboard — Моё обучение

**Маршрут:** `/my-learning` · proposed; current progress entry /profile. **Доступ:** authenticated. **Будущая страница Figma:** `07 / Learning`.

**Задача:** Показать следующее осмысленное действие и состояние активного обучения.

**Композиция:** 1280, 8колleft +4colsummary, gap24. ContinueLearningглавныйблок; справаXP/уровень. Ниже Today2×2activity; ReviewDue; ActiveCoursesлист; NearAchievementsкомпактногалереей; RecentActivity. Sectiontitles24–28; однамаленькаятехническаяметканасекцию, нешумвкаждойстроке.

**Mobile:** Order: greetingcompact→continue→XPsummary→today→reviewdue→activecourses→nearachievements→recentactivity. Карточкиполнойширины; summaryможносвернутьпослепервогопосещенияявнойкнопкой.

**Состав:** `Navigation/Header`, `Profile/UserMini`, `Level/Badge`, `Progress/XP`, `Course/Progress`, `Activity/Card`, `Review/Card`, `Achievement/Card`, `Activity/Timeline`.

**Действия:** основное — Продолжить HashMap; вторичные — Все мои курсы; Открыть повторение.

**Пример:** «Продолжить: Java Backend / Коллекции / HashMap». «Сегодня»: HashMap·12мин; «Сводка заказов»·TRANSFER; «equals и hashCode»·Повторить; «Рост задержки API»·INCIDENT.

**Данные и видимость:** Continueосновываетсянапоследнейдоступнойактивности, ненарандомномкурсе. Todayнеобязательныйпланбезштрафа. Streakпоказыватьтолькоприналичииданных. Недоступныеfutureactivitiesскрыватьfeatureflag. Каждыйразделимеетнезависимыеданные.

**Состояния и выходы:** Новыйпрофиль: «Вы ещё не начали обучение» +catalog; XP0свалиднымпорогом. Noreviewскрываетreviewsectionспокойным«Повторений пока нет»вдетальнойочереди. Activityerrorнеблокируетcontinue. Конфликтдоступавcontinue→coursewithaccessnotice.

## profile-overview — Профиль / Обзор

**Маршрут:** `/profile?tab=overview` · existing route; tab proposed. **Доступ:** authenticated. **Будущая страница Figma:** `06 / Profile`.

**Задача:** Увидеть профиль, уровень и общую статистику без соревнования за интерфейсное место.

**Композиция:** Profileheader12кол: avatar88,name/username/date6кол, XP5кол. Ниже5tabs, далее8колoverview+4колsummary. Statsшестьравныхячееквслабойлинейнойсетке, незелёныеогромныеплашки.

**Mobile:** Avatar64сnameпотомXPfullwidth. 5tabsоднаскроллируемаястрокасвидимымкраемследующего, доступнатакжекнопка«Разделы профиля». Stats2колонки; цифрырастутвертикально, нелезутзаэкран.

**Состав:** `Profile/Header`, `Avatar`, `Level/Badge`, `Progress/XP`, `Profile/Stats`, `Tabs`, `Course/Progress`, `Achievement/Card`.

**Действия:** основное — Продолжить обучение; вторичные — Редактировать профиль; Все достижения.

**Пример:** «Алексей», @alexdev, «В QLC с 12 апреля 2026». LEVEL12. 2840 /3500XP; всего21840XP. 2курса,43урока,86задач,4инцидента,12достижений — независимыйdemoнабор.

**Данные и видимость:** 5tabs: «Обзор», «Мой прогресс», «Достижения», «Активность», «Настройки». TabURLиBackсохраняются. Registrationdate/XP/avatarновые поля. Usernameвыводитсяцеликомилипереноситсясbreak-anywhere, ненакладываетсянаlevel.

**Состояния и выходы:** Loadingprofileheaderструктурный; statsunknown«—», ненеобоснованный0. Emptyoverviewпредлагаетпервыйкурс. Avatarerror→initials. 401→loginwithreturn. Privateprofileневыдаётчужиеданные.

## profile-progress — Мой прогресс

**Маршрут:** `/profile?tab=progress` · existing progress surface; expanded tab proposed. **Доступ:** authenticated. **Будущая страница Figma:** `06 / Profile`.

**Задача:** Найти активный курс и понять, что уже завершено и что требует внимания.

**Композиция:** Основнойлисткурсшириной1280; collapsedcard: thumbnail160,bodyflex,progress224,CTA144. Expandedмодулиподкурсомвотдельномвложенномстеке. Толькокурссодержитart, lessonrowsспокойные.

**Mobile:** Coursecardстек: icon/title→currentlesson→progress→counts+XP→CTA44. Expansionмодулейоднаколонка, lessonrow2lineсметаданными. Триуровнявложенностинеобозначать32pxотступомкаждый: max16pxсветкаялиния.

**Состав:** `Profile/Header`, `Tabs`, `Course/Progress`, `Module/Card`, `Lesson/Row`, `Progress/Course`, `Progress/Module`, `Progress/Lesson`, `Select`.

**Действия:** основное — Продолжить; вторичные — Развернуть модули; Все курсы.

**Пример:** «Java Backend», 43/60 завершено,72%label, fill71.6667%. «Коллекции / HashMap».1840XP. Вложенные «Основы Java»100%; «Коллекции»72%; «Работа с API»31% — процентыдемоматрицы.

**Данные и видимость:** Courseprogressиlessonreadingнеравнозначны. ExistingDTOсчитаетacceptedtasks; дорасширенияпродуктовыхданныхподпись«Решено X из Y задач». Lessoncompletedcurrentlockedreviewdueимеютиконку+текст. Collapseхранитсостояниевсессии; страницыпагинируютсяпосле20курсов, expandedchildrenlazyloaded.

**Состояния и выходы:** Noactive: «Активных курсов пока нет» +catalog, completedтаб/фильтрдоступен. Errorchildrenлокальнаяretryrow. Потерядоступаобъясняетlocked, невыдаётпотерянныйпрогресс. Resetprogressнепредусмотренбезявнойфункции.

## profile-achievements — Достижения

**Маршрут:** `/profile?tab=achievements` · proposed. **Доступ:** authenticated. **Будущая страница Figma:** `06 / Profile`.

**Задача:** Просматривать коллекцию любого размера и понимать путь к следующему достижению.

**Композиция:** 1280,headercount+filters+sort, grid4кол по302gap24. Символ128вкарточке, текст16, описание2–3строки. Rarityмикробейдж, нецелаяцветнаяподложка. Передспискомoptional2близкихкзавершению; списокнеfixedlength.

**Mobile:** Grid2колонкина360покомпактномуAchievement/Card(min156), либоlisttoggleдляподробностей. Вcompactиконка64,title14≤3строк, reward/числопрогрессавидимо; описаниевdetaildrawer. Фильтрыdrawer; карточкався44minclickarea.

**Состав:** `Profile/Header`, `Tabs`, `Achievement/Card`, `Achievement/Grid`, `Achievement/Progress`, `Filter/Chip`, `Select`, `Pagination`, `Achievement/Detail`.

**Действия:** основное — Открыть достижение; вторичные — Показать полученные; Сбросить фильтры.

**Пример:** «Достижения»,12получено. «Поиск причины»: исправить10ошибок;7/10,70%,+120XP. «Первое решение»: получено8сентября2026.

**Данные и видимость:** CategoriesLearning,Coding,Courses,Incidents,Reviews,Streak,XP,Special,Hidden — реестр, неварианткартынатег. Statusall/unlocked/locked/inprogress+categorymulti; sortrecent/progress/rarity. Secretпоказываетнейтральныйglyph/title«Скрытое достижение», безспойлерацели/наградыеслиониsecret. Tierтекстовыйslotбезmax. Pagination24cursor, тысячиitemsнеодновременновDOM.

**Состояния и выходы:** Нетполученных: «Здесь появятся ваши достижения» +первыйурок; списокдоступныхцелейостаётся. Emptyfilterclear. Newlyunlockedкороткийконтур+toast, затемunlocked; reduce-motionстатично. Lockedнеdisabledcard: условияоткрываются. Необъявлятьредкостьгарантиейуспеха.

## profile-activity — Профиль / Активность

**Маршрут:** `/profile?tab=activity` · proposed. **Доступ:** authenticated. **Будущая страница Figma:** `06 / Profile`.

**Задача:** Просмотреть факты учебной активности и начисления XP.

**Композиция:** Timeline8кол, справа4colпериод+summary. Группыдня, строки64min:typeicon32,описаниеflex,time+XPright. Деталинебольшимраскрытием, неновымиплашками.

**Mobile:** Однаколонка, датакакsectionlabel, времяиXPвторойстрокой. Фильтры2контроланаоднойстроке.

**Состав:** `Profile/Header`, `Tabs`, `Activity/Timeline`, `Filter/Chip`, `XP/Reward`, `LoadMore`.

**Действия:** основное — Открыть активность; вторичные — Загрузить ещё; Изменить период.

**Пример:** «Сегодня, 9 сентября». «Решена задача “Две суммы”» +120XP. «Завершён урок “HashMap”» +25XP.

**Данные и видимость:** Нисходящийcursorпоtime+id, неoffsetприпоступленииновыхсобытий. XPrefund/correctionотдельноописан, нескрыт. Персональнаяисторияпоauth. Текущаядатаfixtureфиксирована, невыдаётсязаливеданные.

**Состояния и выходы:** Noactivity→«История пока пуста» +continue. Pagederrorretryfooter. Удалённаяактивностьостаётсяфактомбезбитоголинка: «Материал недоступен».

## profile-settings — Настройки профиля

**Маршрут:** `/profile?tab=settings` · existing identity display; editing proposed. **Доступ:** authenticated. **Будущая страница Figma:** `06 / Profile`.

**Задача:** Управлять личными данными и предпочтениями с понятным сохранением.

**Композиция:** Форма7кол, справа5colкороткиепояснения. Секции«Профиль»,«Уведомления»,«Доступность»,«Безопасность»; paymenthistoryoptionalcollapse. КаждаясекцияссобственнымsaveеслиAPIчастичное.

**Mobile:** Fullwidthform, действиявпотоке. Avatarpickeropensnativeflowlater. Dangersectionвконцептеотсутствуетеслинетbackenddeletion.

**Состав:** `Profile/Header`, `Tabs`, `Avatar/Upload`, `Input`, `Switch`, `Select`, `Button`, `Modal/Confirm`, `Payment/History`.

**Действия:** основное — Сохранить изменения; вторичные — Отменить изменения; Изменить пароль.

**Пример:** «Отображаемое имя», «Имя пользователя», «Email». «Уменьшить анимацию». «Письма о повторении».

**Данные и видимость:** Нередактироватьemailбезverificationflow. Unsavedchangesпринавигации→discardconfirm; кнопкаОтменаоткатываетлокально. Имя/аватар/preferenceAPIsбудущие. Paymenthistoryнетзаказов→«Покупок пока нет», но этоoptionalподсекция.

**Состояния и выходы:** Savebusy, fieldvalidation, serverconflict, success«Изменения сохранены». Failedsaveсохраняетввод. Discardconfirm«Отменить изменения?» +«Продолжить редактирование». Offlineсохранениеdisabledсвидимойпричиной.

## purchased-course — Купленный курс

**Маршрут:** `/courses/[slug]?view=learning` · existing /courses/[slug] access branch; query proposed. **Доступ:** authenticated/access. **Будущая страница Figma:** `07 / Learning`.

**Задача:** Продолжить курс и видеть всю учебную программу.

**Композиция:** Courseheader12колсartthumbnailсправа4; summaryprogressinline. Списокmodules8кол, aside4сcontinue/currentpath/skills. Не повторятьмаркетинговыйheroсценойспокупкой.

**Mobile:** Headericon48,title28,progress/counts,continuefullwidth; modulesоднаколонка. Asideпереноситсявпорядокпослеsummary; skilldetailscollapse.

**Состав:** `Course/Header`, `Course/Icon`, `Progress/Course`, `XP/Summary`, `Module/Card`, `Lesson/Row`, `Review/Card`.

**Действия:** основное — Продолжить текущий урок; вторичные — Программа курса; Повторить тему.

**Пример:** «Java Backend» /43из60 завершено /1840XP. «Следующий урок: HashMap».

**Данные и видимость:** При100%primary«Повторить материал»или«Открыть итоговый проект»еслионещёнезавершён; неложныйcontinue. Modulelockнезначитнельзяпосмотретьсодержание. Enrollmentдоступпроверяетсяbackend. Viewrouteproposalнеобязательнаприинтеграции.

**Состояния и выходы:** Loadingпрограммы; nocontent«Программа готовится»; expiredaccessnoticeссохранённымпрогрессом. Reviewdueвмодулеможетсосуществоватьсcompleted; splitstatus/accessнеоднаперечислимаяось.

## module-selection — Модуль / Список занятий

**Маршрут:** `/courses/[slug]?module=[moduleId]` · proposed deep link on existing course route. **Доступ:** authenticated/access. **Будущая страница Figma:** `07 / Learning`.

**Задача:** Выбрать занятие внутри модуля и понять порядок доступности.

**Композиция:** Навигация288слева+968контент; moduleheaderprogress; lessonsтабличныйсписоксколонкамиtype/title,duration,XP,status. Rowmin72; текстможетувеличитьвысоту.

**Mobile:** Кнопка«Модули»drawer; headerиlessonrowsstack. Type16icon+label, titleflex;duration/XPниже. Нетсжатойdesktopтаблицы.

**Состав:** `Breadcrumbs`, `Module/Header`, `Progress/Module`, `Lesson/Row`, `Activity/Card`, `Module/Navigation`.

**Действия:** основное — Открыть занятие; вторичные — Предыдущий модуль; Следующий модуль.

**Пример:** «Модуль 05 / Коллекции». «Списки, множества и соответствие ключей значениям». «HashMap»·Теория·12мин·25XP·В процессе.

**Данные и видимость:** TypesTHEORY/TASK/QUIZ/TRANSFER/CODE_REVIEW/INCIDENT/PROJECTизреестра. Последовательностьспроектирована,нопереходмеждуразблокированнымиурокамисвободный. Currentstatusтолькодлятекущеговучебномконтексте, ненавсехпосещённых.

**Состояния и выходы:** Lockedlessonпоказывает«Завершите …»ссылку; недоступностьнепоцвету. Emptyprogram/errorretry. Reorderingотbackendстабильнопоid; текущийурокненазначаетсяиндексом.

## lesson — Урок / Материал

**Маршрут:** `/lessons/[id]` · existing; block library expanded. **Доступ:** authenticated/access or allowed preview. **Будущая страница Figma:** `07 / Learning`.

**Задача:** Спокойно прочитать материал и перейти к связанной практике.

**Композиция:** 1280:sidebar264+gap32+readingmax760+остатокполя. Body17/28,max75знаковстрока. H132/40. 16типовблоковописанывcontent-examples.md. Topstickybreadcrumbнеболее56; sidebarимеетсобственныйscrollприviewportheight.

**Mobile:** Padding16; навигациячерез«Содержание модуля»drawer. Readingwidth328/358,body16/26. Кодитаблицыскроллятсятольковнутриблока. Footer«Назад»и«Далее»в2колонки44, «Завершить»отдельнойстрокойеслиявнонеобходим.

**Состав:** `Breadcrumbs`, `Learning/Sidebar`, `Lesson/Header`, `Lesson/Block`, `Code/Block`, `Lesson/Navigation`, `Progress/Lesson`, `XP/Reward`.

**Действия:** основное — Перейти к практике / Завершить урок; вторичные — Предыдущий урок; Следующий урок; Содержание модуля.

**Пример:** «HashMap: ключи и значения». «HashMap хранит значение по ключу. Когда ключ уже есть, put заменяет связанное значение». +25XP,12мин.

**Данные и видимость:** Completionявноеилиподтверждённоеactivityrule, неавтоматический100%отscroll. Readprogressиtaskprogressразделены. Exercise linkназадачуэтогоурока. Previewневыдаётзакрытыйконтент. Reviewdueнеобнуляетcompletion. Positionвозвратапослезадачисохраняется.

**Состояния и выходы:** Loadingcontentзаголовоксkeleton, sidebarнезависим. Notfound,locked403собъяснением, contenterrorretry. Offlinecachedcontentтолькосмаркером. Markcompletedbusyидемпотентный; failedостаётсявпредыдущемсостоянии. Embedblockedимеетссылкуилитекстовыйfallback.

## coding-task — Задача / Код

**Маршрут:** `/lessons/[id]?tab=practice&task=[taskId]` · existing lesson practice; query convention proposed. **Доступ:** guest editor; authenticated submit/access. **Будущая страница Figma:** `08 / Tasks`.

**Задача:** Решить задачу в существующем Monaco и получить честный результат проверки.

**Композиция:** 1280workspace:brief475(38%послеgap)+gap24+editor781(62%). Перетаскиваемыйsplitoptionalбудущий, minbrief360/mineditor600, fallbacktabsниже1100. Monacoсуществующий; filebar48,toolbar48,editorнепересоздаётсяприlayoutchange. Console/resultslotнижесfixedmin160, workspaceverticalscrollосмысленный.

**Mobile:** Табы «Задача / Код / Результат»44, stickyподheader56. Monaco min-width0,width100%,heightclamp340..640 или50dvhпо существующемуповедению. Сменаtabнеразмонтируетeditorиdraft. Кодмонопространственный14/23; неужиматьшрифт. ФайлMain.java,фиксированныйязык21.

**Состав:** `Breadcrumbs`, `Task/Brief`, `Editor/ExistingMonacoShell`, `Task/Toolbar`, `Task/Status`, `Task/Result`, `Code/Block`, `Tabs`, `Modal/Confirm`.

**Действия:** основное — Проверить решение (existing); вторичные — Сбросить код (confirm); Обновить статус (existing); Запустить (future); Полный экран (future).

**Пример:** «Задача014 / Две суммы». «Верните индексы двух различных элементов, сумма которых равна target». Средняя·25мин·120XP. Accepted: «Решение принято»,18/18tests,+120XP.

**Данные и видимость:** Existing:Java21/C++23позадаче,localdrafttaskId+testversion,resetstarter,bytecap65535,submit+polling/resume,runtime/memory/safelog. Run/stdin/fullscreen/tabsConsoleTestsиindividualexpectedactual — planned optionalslots, скрытывcompatibilitymode. Никакихprivatejudgefixtures. FutureRunнедаётXP/accepted; толькоSubmit. Прохождениепроцессаqueued→compiling→runningобновляетсяпоserver, непридумываетсятаймером.

**Состояния и выходы:** Всефазы:idle,submitting,queued,compiling,running,accepted,wrong_answer,compilation_error,runtime_error,time_limit,memory_limit,output_limit,network_error,infrastructure_error,cancelled,unknown. Busyзапрещаетповторsubmit/reset, codeeditingсохраняетновыйdraftнезависимоотsnapshotпроверки. Networkpollfail«Связь прервана — проверить статус»неозначаетwronganswer. GuestCTAloginreturn; resetconfirmпредупреждаетзаменукода. Unknownsafeописание+submissionid.

## transfer-task — Перенос навыка

**Маршрут:** `/activities/transfer/[id]` · proposed, no current DTO. **Доступ:** authenticated/access. **Будущая страница Figma:** `08 / Tasks`.

**Задача:** Применить знания к незнакомой ситуации без подсказки технологии.

**Композиция:** Brief5кол, workspace7кол. MarkerTRANSFER / UNGUIDED — единичныйmicrolabel. Ситуация, результат, ограничения, optionalenvironment; submissionвидзависитотданных(code/text/link/files).

**Mobile:** Ситуациявпервомtab, «Решение»вторым; длякороткойтекстовойформыоднастраница. Результатпослеsubmitотдельныйtabсbadge.

**Состав:** `Activity/Header`, `Transfer/Brief`, `Transfer/Constraints`, `Submission/Composer`, `Task/Result`, `Details/Explanation`.

**Действия:** основное — Отправить решение; вторичные — Сохранить черновик; Посмотреть условия.

**Пример:** «Сводка заказов». «Сервис получает повторяющиеся события об оплате. Подготовьте обработку, при которой заказ учитывается один раз». Результат: корректная сумма за день; ограничения: порядок событий произвольный.

**Данные и видимость:** Неозвучивать«используйтеHashMap/Redis»дозавершения. Expectedresultописываетнаблюдаемоеповедение. Rubricчастичнооткрываетсяпослеsubmittedпоpolicy; reviewпоказываетобратнуюсвязьнеполныйответприограниченныхattempts. Dataslottechnologyhintотсутствует.

**Состояния и выходы:** available,in_progress,submitted,accepted,failed,review. Emptydraftнеотправляетсясобъяснением. Submittedзамораживаетпроверяемыйsnapshot; draftможноскопироватьдляновойпопытки. Upload/neterrorсохраняетлокальноеслиподдержано. Reset/discardconfirm.

## code-review — Ревью кода

**Маршрут:** `/activities/review/[id]` · proposed, no current DTO. **Доступ:** authenticated/access. **Будущая страница Figma:** `08 / Tasks`.

**Задача:** Найти проблему, объяснить влияние и предложить исправление с привязкой к коду.

**Композиция:** Code8кол, findings4кол. Headerпостановка≤4строк, codearealinenumbersсвыборомдиапазона. Кнопка«Добавить замечание»привязана к selection, но дублируетсявtoolbarдляклавиатуры. Findingsстек, неаннотацииповерхкода.

**Mobile:** Tabs«Код / Замечания / Результат». Выбранныйдиапазонфиксируетсяcompactbar«Строки18–21». Composerfullscreen/длинныйdrawer; полявертикально. Вкодедопустимгоризонтальныйвнутреннийscroll.

**Состав:** `Activity/Header`, `Review/Code`, `Review/Finding`, `Review/FindingComposer`, `Review/Summary`, `Task/Result`, `Tabs`.

**Действия:** основное — Отправить ревью; вторичные — Добавить замечание; Сохранить черновик.

**Пример:** «Проверка обработки платежа». Строки18–21: «Повтор события может увеличить сумму заказа второй раз». КатегорияКорректность, severityHigh, suggestion«Проверять идентификатор события до применения изменения».

**Данные и видимость:** Finding{id,file,fromLine,toLine,category,severity,explanation,suggestion?}. Диапазонстабиленкнеизменяемойверсииsnippet. Severityиcategoryнезависятотправильностиfinding. SelectionсShift+стрелкиилидоступнымrangeinput; min44rowinteraction. Missedissuesтолькопослеsubmissionпоpolicy.

**Состояния и выходы:** draft/submitted +findingcorrect/incorrect/partially_correct. Result«Найдено3из4проблем»сотдельнойвкладкой«Пропущено»безустногоукора. Duplicatefindingwarnнесilentdelete. Removefindingconfirmеслиестьтекст; submitbusyсохраняетdraft. Backendfailureнетнулевогооценивания.

## incident-list — Практика / Инциденты

**Маршрут:** `/incidents` · proposed, optional hub. **Доступ:** authenticated/access. **Будущая страница Figma:** `09 / Incidents`.

**Задача:** Найти доступный учебный инцидент и его сложность.

**Композиция:** 1280, filterrow, grid3cols; artworkмалыйсинтетическийрагментвверхукарты, dominanttextинцидента. Severityвверхсправа, service/environmentвметаданных.

**Mobile:** Одноколонныйлист;filterdrawer,sortelect. CardCTA«Разобрать инцидент»внизу.

**Состав:** `Section/Header`, `Incident/Card`, `Filter/Chip`, `Select`, `Pagination`, `Page/State`.

**Действия:** основное — Разобрать инцидент; вторичные — Фильтры; Вернуться к обучению.

**Пример:** INCIDENT0042 / «Рост задержки API заказов». SEV-2,orders-api,учебнаяproductionсреда,35мин,180XP.

**Данные и видимость:** Учебнаясредаобозначенаодинразявно; ненастоящийсистемныйинцидентQLC. Severityнеdifficulty. Evidence/actioncontentизfixture. Hubнеобязателендлявходаизурока.

**Состояния и выходы:** Emptyavailable«Доступных инцидентов пока нет»,filtersclear. Inprogresscard«Продолжить расследование». Completedcardсresultshortcut. Noentitlementlockreason.

## incident-workspace — Инцидент / Рабочая область

**Маршрут:** `/incidents/[id]` · proposed, no current DTO. **Доступ:** authenticated/access. **Будущая страница Figma:** `09 / Incidents`.

**Задача:** Сопоставить свидетельства, сформулировать гипотезу и диагноз.

**Композиция:** 1280:brief3кол296,evidence6кол628,notes3кол296,gap16междумодулямивнутриworkspace. Допускаетсяwideworkspaceдо1600приlargescreenноcanonical1280. Headerid/severity/service/environment/start/statusв2строки. Evidence-tabsна7источниковсoverflowmenu. Notesссекциямиhypothesis/proposedfix. Terminalнижевидимойevidenceвотдельномcollapsiblepane.

**Mobile:** Tabsверхнегоуровня «Условия / Данные / Диагноз». В«Данные»selectиз7источниковиviewer, не14узкихtabsscroll. Notes/draftживётмеждусменойtab. Terminalplaceholderreadonly; softkeyboardнеперекрываетsubmit.

**Состав:** `Incident/Header`, `Incident/Brief`, `Incident/EvidenceTabs`, `Evidence/Viewer`, `Terminal/Placeholder`, `Incident/Hypothesis`, `Textarea`, `Task/Status`.

**Действия:** основное — Отправить диагноз; вторичные — Сохранить заметки; Открыть журнал событий.

**Пример:** INCIDENT0042;SEV-2;orders-api;Production (учебная среда);начало14:32;РАССЛЕДОВАНИЕ. «p95 вырос с120мсдо2.4с послерелиза». Гипотеза: «Рост числа запросов к БД на каждый заказ».

**Данные и видимость:** 7evidenceреестр:Logs,Metrics,Kubernetes,Database,Network,Code,Events. Каждаяимеетloading/empty/error/permission. StatusACTIVE→INVESTIGATING→MITIGATED→RESOLVED;FAILEDтерминалныйрезультатпопытки. НиUIничатнеисполняютреальныеоперационныекоманды;terminalplaceholder. Таймеручебный, сервернаяelapsedtimeнеускоряетсяотtab.

**Состояния и выходы:** Evidenceempty«В этом сценарии данных нет». Loadingоднойвкладкинезатираетnotes. Submitteddiagnosisfreeze, networkfailurecanretryidempotent. Resetinvestigationтолькосconfirm. Offlineпоказываетcachedfixtures,draftлокальнобеззаявленияcloudsave.

## incident-result — Инцидент / Разбор

**Маршрут:** `/incidents/[id]/result/[attemptId]` · proposed. **Доступ:** authenticated/access. **Будущая страница Figma:** `09 / Incidents`.

**Задача:** Понять причину, оценку диагноза и переносимый навык.

**Композиция:** 1280:headerresult,8колrootcause/fix/evidence,4колtime/attempts/XP/skills. Связанныестрокилоговиmetricsссылкивозвращаютвevidencecontext.

**Mobile:** Стекresult→rootcause→fix→evidence→numbers→skills→actions. Таблицырезультата2coldefinitionlist.

**Состав:** `Incident/Result`, `Task/Status`, `XP/Summary`, `Skill/Progress`, `Evidence/Reference`, `Button`.

**Действия:** основное — Продолжить обучение; вторичные — Вернуться к данным; Повторить сценарий.

**Пример:** «Диагноз подтверждён». Причина: «После релиза список заказов стал делать отдельный запрос для каждой позиции». Исправление: «Загрузить связанные данные одним запросом». 18мин,2попытки,+180XP.

**Данные и видимость:** Сравнениеоцениваетsubmittedsnapshot, неподменяетпользовательскийdraft. Rootcauseфиксированныйсценарныйответдоступенпослеусловияраскрытия. XPserverawardedonce, повторныйпросмотрненачисляет. Skillsimprovedобъясняетконкретныетемы.

**Состояния и выходы:** Resolved/partial/failed, pendingreview. Failedprimary«Повторить попытку», ноавторскийразборпоказываетсяпоattemptpolicy. Неполныеметрики«—», ненеобоснованные0. Resultfetcherrorretry.

## skill-detail — Навык / Освоение

**Маршрут:** `/skills/[skillId]` · proposed. **Доступ:** authenticated. **Будущая страница Figma:** `07 / Learning`.

**Задача:** Понять текущий этап навыка и доступную практику.

**Композиция:** HeaderHashMapиmastery, трёхстадийнаягоризонтальнаясхема8кол, aside4сreviewdue. Нижеactivitylistнаследующийэтап. Графикасвязи тонкаялиния, несхематичныйтребовательныйигровойtree.

**Mobile:** UNDERSTAND/APPLY/MASTERвертикальныестроки, русскиепояснения. Lockedreasonссылкойнакритерий, неtooltip-only.

**Состав:** `SkillProgress/Spiral`, `SkillStage`, `SkillMasteryBadge`, `Review/Card`, `Activity/Card`.

**Действия:** основное — Продолжить практику; вторичные — Открыть материал; Повторить навык.

**Пример:** «HashMap». «Понимание»✓, «Применение»72%, «Самостоятельное решение»Закрыто. Mastery84%, последняяпрактика42дняназад.

**Данные и видимость:** Stageslocked/available/current/completed, completioncriteriaизbackend. UIнеобъясняет«пройти три раза»; каждаястадияимеетразныерезультаты. Masteryнеcourseprogressи может снижаться отдавностипоучебноймодели, ноcompletedматериалнеисчезает.

**Состояния и выходы:** Unknownmastery«Оценка появится после практики». Noactivity«Новая практика пока не назначена». Reviewrefreshedобновляетдатуиmasteryтолькосserverответом. Никакихпустыхlocked безпричины.

## review-queue — Повторение

**Маршрут:** `/review` · proposed. **Доступ:** authenticated. **Будущая страница Figma:** `07 / Learning`.

**Задача:** Выбрать короткую практику для освежения знаний.

**Композиция:** 1280:8колсписок,4колcompactsummary. Itemsимеютskill,mastery,lastpracticed,due,date,duration; избытокдекораубран.

**Mobile:** Однаколонка;summaryкороткойстрокой. Кнопка«Повторить»44, длинныеназвания2строки.

**Состав:** `Section/Header`, `Review/Card`, `Filter/Chip`, `Activity/Card`, `SkillMasteryBadge`, `Page/State`.

**Действия:** основное — Повторить тему; вторичные — Показать все навыки; Отложить (optional).

**Пример:** «HashMap»·Освоение84%·Практика42дняназад·Пораповторить·8мин.

**Данные и видимость:** due_soon/due/overdue/refreshed — временнаяось, accessотдельно. Sortdueseveritythenplannedtime. Отложитьoptionalеслиbackendподдерживает; никакоговечногосбросаобязательнойработыкнопкой.

**Состояния и выходы:** Empty«На сегодня повторений нет»+continuecourse. Duecountunknown«—». Refreshedrowврезультатепоказываетдатупрактики. Errorretryбезисчезновенияcachedqueue.

## checkout — Оформление покупки

**Маршрут:** `/checkout?course=[slug]` · existing test flow; real payment designed only. **Доступ:** authenticated or guest contact with auth step. **Будущая страница Figma:** `10 / Checkout`.

**Задача:** Проверить состав заказа и оплатить понятную итоговую сумму.

**Композиция:** 1280:form7кол737,summary5кол519;maxform640. Summarystickyподheader80, artwork160×75+icon/title, price/old/discount/promo/totalстроки. Группыcustomer,payment,agreements;providerfieldsизproviderSDKвбудущем, несобственныйсборкарточныхданных.

**Mobile:** Порядокcompactorder→contact→method/provider→promo→total→agreement→pay. Summaryнаверхуможетсвернутьсяв«Заказ: Java Backend», полнаясуммаобязательнопередCTA. Нестикиpayпокане проверена высотасофт-клавиатуры; предпочтительнопоток.

**Состав:** `Checkout/Header`, `Input/Email`, `Input/Text`, `Payment/Method`, `Payment/ProviderSlot`, `Input/Promo`, `Checkbox`, `Payment/Summary`, `Alert`, `Button/Primary`.

**Действия:** основное — Оплатить {total} ₽; вторичные — Вернуться к курсу; Изменить способ оплаты.

**Пример:** «Оформление покупки». «Java Backend». Email«alex@example.com»,имя«Алексей». «Промокод». «Я принимаю условия покупки».

**Данные и видимость:** Текущийrepoтестоваяпокупка, distinctcompatibilitymode«Получить тестовый доступ»безмимикриирелальнойоплаты. Futureemail/name/billingplaceholder/providerсогласоватьсинтеграцией. Promoappliedпересчитываетсервернаяцена; не trustclient. Ценаизменилась→сообщитьиповторноподтвердитьновуюсумму. Processingблокируетduplicatepayments.

**Состояния и выходы:** Default,validationerror,promovalid,promoinvalid,processing,paymenterror,timeout. Promoinvalid«Промокод не найден»неттостаединственным. Timeout«Статус оплаты уточняется»+checkstatus, не мгновеннаяповторнаяоплатадопроверки. Formvalidationfocusfirst. Cancelnavigationwhileprocessingобъясняетсостояние, но не удерживает пользователянавечно.

## payment-success — Покупка подтверждена

**Маршрут:** `/checkout/success?order=[id]` · proposed; current test purchase redirects profile. **Доступ:** authenticated/order owner. **Будущая страница Figma:** `10 / Checkout`.

**Задача:** Подтвердить оплату и сразу открыть приобретённый курс.

**Композиция:** Содержательнаяколонка800сасимметричнымglyph/receipt, black+paper+малыйlime. HeaderPAYMENT / CONFIRMED12mono, H136«Курс доступен». Receiptтаблица2колонки,необщаязелёнаягалочка.

**Mobile:** Padding16,иконка64,курсовойart320:150optionalпослеreceipt. Receiptdefinitionlistсwraporderid;CTA48fullwidth, secondary44.

**Состав:** `Payment/Success`, `Course/Icon`, `Course/Artwork`, `Payment/Receipt`, `Button`.

**Действия:** основное — Начать обучение; вторичные — Мои курсы; Детали заказа.

**Пример:** «Курс успешно куплен». Java Backend. ЗаказQLC-2026-0042. Дата9сентября2026. Ценаизorderfixture,немоковыйсуммарныйподсчёт.

**Данные и видимость:** Страницатолькопослеподтверждениясервером, querysuccessнесвидетельствооплаты. Pendingverificationпоказываетprocessingвариант. Receiptполученпоauthowner. Reward+XPзаоплатунепоказыватьбезпродуктовогорешения.

**Состояния и выходы:** Confirmed,pending,errorfetch,alreadyaccess. Retryloadingreceiptнеповторяетпокупку. Invalidorder404/403. Revisitуспехаидемпотентен.

## payment-failed — Оплата не завершена

**Маршрут:** `/checkout/failed?order=[id]` · proposed. **Доступ:** authenticated/order owner. **Будущая страница Figma:** `10 / Checkout`.

**Задача:** Объяснить подтверждённую ошибку оплаты и безопасные следующие действия.

**Композиция:** Колонка800смалойtechnicalstatusметкой; errorсемантическийакцентлокален. Courseinfoисуммаостаются, причинаподзаголовком.

**Mobile:** Стекпричина→заказ→retry→changemethod→course; кнопки44+, нетхаотическогоредиректа.

**Состав:** `Payment/Failed`, `Alert`, `Payment/Summary`, `Button`.

**Действия:** основное — Повторить оплату; вторичные — Выбрать другой способ; Вернуться к курсу.

**Пример:** PAYMENT / FAILED. «Оплата не прошла». «Банк отклонил операцию. Попробуйте другой способ оплаты».

**Данные и видимость:** Retryтолькоприconfirmedfailed/cancelled, аunknown/pending→checkstatus. Reasonбезсырогоstack/providersecret. Необещать«деньги не списаны»безподтвержденияпровайдером.

**Состояния и выходы:** Failed,cancelled,timeoutunknown. Priceexpired→checkoutсrevalidation. Retrybusyзащищаетотduplicate; authloss→loginreturnsameorder.

## project-task — Проект

**Маршрут:** `/activities/project/[id]` · proposed reusable future extension. **Доступ:** authenticated/access. **Будущая страница Figma:** `08 / Tasks`.

**Задача:** Собрать самостоятельный результат с критериями и этапами.

**Композиция:** Brief8кол+rubrex4;milestonesкакaccordion,finalsubmissionвконце. Нетновогонавигационногокаркаса.

**Mobile:** Однаколонка,criteriaскладнойdetails;submissionполя48.

**Состав:** `Activity/Card`, `Project/Brief`, `Project/Milestone`, `Submission/Composer`, `Task/Result`.

**Действия:** основное — Отправить проект; вторичные — Сохранить черновик; Открыть критерии.

**Пример:** «Сервис каталога». Результат:APIсо списком, фильтромипагинацией. «Критерии: корректные ответы, валидация, обработка ошибок».

**Данные и видимость:** НовыйtypeизActivityregistry, неновыйsingle-purposecard. Submissiontext/link/archiveпоcapability, размеры/типыявны. Privacyrepoдоступпроверяетсяпонятносостоянием.

**Состояния и выходы:** Notstarted,inprogress,submitted,reviewneeded,accepted,changesrequested; uploaderrorсretry. Удалениеfileсconfirmationеслипотеряетсязагрузка.

## quiz-task — Проверка понимания

**Маршрут:** `/lessons/[id]?task=[quizId]` · existing TEST practice; richer quiz proposed. **Доступ:** authenticated/access or preview. **Будущая страница Figma:** `08 / Tasks`.

**Задача:** Проверить понимание небольшими вопросами с объяснением.

**Композиция:** Основнаяколонка760,sidebarпрогрессвопросовесли>1. Вариантыс48minконтроломиwrapтекста.

**Mobile:** Одноколонно; длинныеcodeanswersвконтейнереscroll. Кнопкапроверкидоступнабезугаданнойвысоты.

**Состав:** `Activity/Header`, `Quiz/Question`, `Radio`, `Checkbox`, `Task/Result`, `Lesson/Navigation`.

**Действия:** основное — Проверить ответ; вторичные — Следующий вопрос; К материалу.

**Пример:** «Что произойдёт, если вызвать put с уже существующим ключом?» Ответ: «Значение будет заменено».

**Данные и видимость:** ExistingTESTпоказатьодинвопрос/нескольковариантовкакbackendподдерживает. Numericбудущийcontrolledfieldсобъяснениемформата. Неотмечатьcorrectдопроверки; answersversionstable.

**Состояния и выходы:** Emptyselectionhelper; submitting; correct; incorrectwithexplanation;partialеслиmulti; networkfailureнеисчерпываетпопыткубезсервернойфиксации.

## achievement-detail — Достижение / Детали

**Маршрут:** `/profile?tab=achievements&achievement=[id]` · proposed deep link overlay. **Доступ:** authenticated. **Будущая страница Figma:** `06 / Profile`.

**Задача:** Прочитать условия, прогресс и историю конкретного достижения.

**Композиция:** Modal640max:icon128left,title/detailsright;progressbelow;relatedactivityCTAoptional. Неотдельнаякопиякарточкинатип.

**Mobile:** Drawerполнойширинысmax-heightcalc100dvh-safearea;icon96,scrollbody,close44. Backзакрываетdrawer, неуходитизпрофиля.

**Состав:** `Achievement/Icon`, `Achievement/Progress`, `Modal`, `Drawer`, `XP/Reward`, `Badge`.

**Действия:** основное — Перейти к подходящей практике; вторичные — Закрыть.

**Пример:** «Поиск причины». «Исправьте10ошибок в проверяемых задачах».7/10,+120XP,categoryCoding,rarityRare.

**Данные и видимость:** Secretскрываетцель/награду/dateдоunlockеслиpolicy. Dateполноценнаялокализованная. Tierunboundedstring. Mainiconinstance128slotпередмасштабированиемдолженбытьнормализован.

**Состояния и выходы:** Unknownid→локальная«Достижение недоступно». Unlockedполнаядата; newoptionalafteranimation→steady. Relatedactivitylockedобъяснить.

## level-up — Новый уровень

**Маршрут:** `event://level-up` · proposed transient overlay. **Доступ:** authenticated. **Будущая страница Figma:** `11 / States`.

**Задача:** Коротко сообщить о новом уровне, не прерывая учебную работу.

**Композиция:** Modal560, уровень64цифрыадаптируютсяк999+,summaryxp12/16. Artнебольше160и расположенпозадипустойобластибезперекрытиятекста.

**Mobile:** Drawer/centeredmodal328,close44;maxheightcalc100dvh-32,content scroll. ПрипечатаниивMonacoавтоматическиmodalнеоткрывать, использоватьtoastс«Подробнее».

**Состав:** `LevelUp/Modal`, `Level/Badge`, `XP/Summary`, `Button`, `Toast`.

**Действия:** основное — Продолжить; вторичные — Посмотреть прогресс.

**Пример:** «Новый уровень:13». «За эту активность:120XP». «До следующего уровня:3380XP».

**Данные и видимость:** Хранитьlevelcurrent,nextthreshold,currentlevelxp,totalxpраздельно. Rewardсserveridempotency, повышениенаNуровнейможетоднимсообщением«Уровень12→15». Level999+нелимит; числавfulltext/tooltipдоступныполностью.

**Состояния и выходы:** Reward+25micro,+120summary;multi-levelup;xpmaxrangeunavailable. Reducedmotionбезчастиц/счётчика, screenreaderоднократно. Dismissнеотменяетнаграду.

## global-states — Системные страницы и общий сбой

**Маршрут:** `state://global` · system templates; implementation varies. **Доступ:** public/authenticated. **Будущая страница Figma:** `11 / States`.

**Задача:** Дать понятный выход при отсутствии данных, доступа или соединения.

**Композиция:** Контейнер720центрв1280сshellсохранённым; значок64сгеометрическойсистемой. Ошибкакоротка, correlationidoptionalcopy, nofullstack.

**Mobile:** Padding16,контентестественнойвысоты, CTAfullwidthилидо2stacked. Ошибка—немодальныйэкраннакаждыйfailedrequest.

**Состав:** `Page/State`, `Skeleton`, `Spinner`, `Alert`, `Toast`, `Button`, `Modal/Confirm`.

**Действия:** основное — Повторить / Вернуться; вторичные — На главную; Выбрать курс.

**Пример:** 403:«Этот материал пока недоступен».404:«Страница не найдена».500:«Не удалось загрузить страницу».Maintenance:«QLC временно недоступен».Offline:«Нет соединения».

**Данные и видимость:** Pageemptyотдельноотnetworkerror. Disabledlogicвозлеcontrol; successnoextrafullpageкромепокупки/verification. Destructiveconfirmationконкретноописываетпотерюданных. Пользовательскиеданныевerrorsнеотправляютсявтретьистороны.

**Состояния и выходы:** Loading/skeleton/empty/error/disabled/offline/reconnecting/success/destructive. Emptyvariants:nocourses,noactivecourses,noachievements,nosearchresults,noactivity,nopayments. Errorgeneric/network/403/404/500/maintenance. Retryboundedmanual, нетбесконечнойанимациибезвыхода.

## Покрытие обязательных mobile views

- [x] `public-home` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `store-catalog` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `course-overview` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `profile-overview` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `profile-achievements` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `profile-progress` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `dashboard` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `purchased-course` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `module-selection` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `lesson` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `coding-task` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `transfer-task` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `code-review` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `incident-workspace` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `checkout` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `payment-success` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.
- [x] `auth-login` — спецификация mobile присутствует; это не утверждение о готовом Figma frame.

Дополнительно mobile описан для всех остальных перечисленных экранов и overlays, включая payment failed, все auth flows, project и quiz.
