# QLC — Desktop, tablet и mobile layout specs

Это локальные правила будущей сборки, а не макеты, уже собранные в Figma. Согласованная homepage остаётся отдельным защищённым исключением: существующие поля 64 px, ширина desktop 1440 px и композиция из `../mobile-layout.json` не заменяются новой продуктовой сеткой.

## Общая сетка новых продуктовых экранов

| Ширина viewport | Контент | Колонки | Gap | Правило |
|---|---:|---:|---:|---|
| 1440 | 1280; поля 80 | 12 | 24 | Основной desktop specimen |
| 1280 | 1216; поля 32 | 12 | 24 | Свободная адаптация; сложные workspace могут перейти к tabs |
| 1024 | 960; поля 32 | 8 | 24 | Каталог 2 колонки; sidebar становится drawer |
| 768 | 720; поля 24 | 8 | 24 | Tablet specimen; 2 карточки по348, формы в один столбец |
| 390 | 358; поля 16 | 4 | 16 | Mobile проверка длинного текста |
| 360 | 328; поля 16 | 4 | 16 | Минимальная проектная ширина; обязательный mobile specimen |

На1280 контент не увеличивается за максимальную ширину. Колонки используются для внешнего каркаса; внутренний контент имеет собственный `min-width:0`. Равные карточки заполняют колонку, текст задаёт высоту, кнопка может прижиматься к низу через отдельный spacer. Не растягивать картинки и иконки при увеличении карточки: artwork имеет постоянное отношение640:300, маленький символ — квадратный slot.

12-колоночная desktop сетка: ширина колонки84⅔ px. Блок3колонки =302 px,4колонки=410⅔ px,5=519⅓ px,6=628 px,7=736⅔ px,8=845⅓ px,9=954 px. В спецификациях допустимы округления до целых; сумма колонок + gap должна совпадать с родительским1280. Не прибавлять gutters повторно.

## Визуальная плотность и типографика

- Основной фон `#0A0A0A`; текст `#F5F5EF`; primary `#C4FF00`; secondary `#4433EE`. Вторичный текст использует существующий token muted. Кобальт служит фоном акцента/графики, а не мелким текстом на чёрном без проверки контраста.
- UI — Inter. Заголовок страницы desktop36/44 medium, mobile28/34; заголовок секции28/36 и24/32; карточки20/28; body16/24. Учебный материал desktop17/28, mobile16/26. Mono IBM Plex Mono: технические метки12/16, обычные метаданные13/18, код14/23. Текущий landing сохраняет свою типографику.
- У страницы одна сильная композиционная точка: artwork курса, продолжение обучения или рабочее поле. Не делать каждую секцию кислотной панелью. Внутренние рабочие поверхности отличаются тонкой линией и отступами; не крупным мутно-серым заполнением.
- Внешние секции отделяются48–64 px; связанные группы24–32; поля16–20; метаданные8–12. Заголовок и относящееся к нему описание ближе, чем соседняя секция.
- Технические мини-элементы группируются по2–4: координатная метка, тонкая полоса, маленький символ. Они декоративные, не названы «статусом системы», если не отражают реальные данные. В редакторе и reading area их нет поверх текста.
- Радиус0–4 px для рабочих блоков, до8 только там, где уже требует существующая система. Art может содержать стекло, но UI не получает backdrop blur или glassmorphism.

## Каркасы и wireframes

### Каталог

```text
1440 viewport / 1280 content
┌ Header: QLC · Courses · ... · user ─────────────────────────┐
│ Курсы                         короткая техническая метка    │
│ [ Найти курс .......................................... ] │
├ filters302 ────────┬ results954 ────────────────────────────┤
│ Категория          │ 20 курсов                    [Sort ▾] │
│ Уровень            │ [chip ×] [chip ×]                      │
│ Технология         │ [Card302] [Card302] [Card302]           │
│ Время              │ [Card302] [Card302] [Card302]           │
│ Цена               │ ...20 instances, height by content     │
│ Free/Paid          │ [Pagination or Load more]              │
│ New / Discount     │                                         │
└────────────────────┴─────────────────────────────────────────┘
360 viewport / 328 content
QLC                                              [Menu44]
Курсы
[ Search328 .......................................... ]
[ Фильтры (3)                    ] [ Сортировка       ]
[ Категория × ] [ Java × ]
[ Card328 — artwork328×153.75                         ]
[ Card328                                            ]
[ Показать ещё                                      ]
```

На desktop filters могут быть sticky с `top=header+16`, но их максимальная высота ограничена viewport; последняя группа достижима собственным scroll. При переключении фильтра focus остаётся в контроле; `aria-live` сообщает только «Найдено N курсов» после ответа. На mobile результат обновляется по «Показать», закрытие drawer без применения не теряет уже действующие фильтры. Selected temporary filters могут быть отменены крестиком; «Сбросить» внутри drawer сбрасывает pending selection.

### Профиль

```text
[ avatar88 ] Алексей / @alexdev        LEVEL12   [XP..........]
             В QLC с 12.04.2026        2840 /3500 XP
[Обзор] [Мой прогресс] [Достижения] [Активность] [Настройки]
┌ main845 ──────────────────────┬ aside411 ──────────────────┐
│ Continue / Course progress    │ XP и статистика           │
│ Recent / selected tab data    │ Короткая сводка            │
└───────────────────────────────┴────────────────────────────┘
```

Mobile сначала avatar/name, потом XP, потом tabs и выбранная панель. Не повторять полный profile header над каждой карточкой. Сетка статистики2 колонки, achievements compact2 колонки по156 приgap16; detailed list — одна колонка. Вкладки можно скроллить внутри строки; страница не получает горизонтального overflow. В списке учебных курсов вложенные уровни имеют максимум16 px дополнительного inset; глубину показывают линией и меткой модуля.

### Кодовая задача

```text
[ Breadcrumb ] Task014 / Две суммы · Средняя · 120XP
┌ brief477 ──────────────────────┬ editor779 ─────────────────┐
│ Условие                        │ Main.java · Java21        │
│ Вход / Выход                   │ Автосохранение на устройстве│
│ Примеры                        │ Existing Monaco           │
│ Ограничения                    │                           │
│ Подсказки (closed)              │ [Сбросить] [Проверить]     │
│                                │ Status / безопасный вывод │
└────────────────────────────────┴───────────────────────────┘
```

Процентное деление применяется к ширине после вычета24gap:1256×.38≈477; editor≈779. Не превращать библиотечный SVG shell в новый редактор. Для реальной вёрстки используется существующий Monaco с текущим autosave/reset/submit/resume. Future fullscreen / Run / Console / Tests — скрытые capability slots до реализации соответствующих API. Ниже1100 px, включая768, перейти к «Задача / Код / Результат», сохранив состояние mounted editor. Не помещать console внутрь страницы с глобальным горизонтальным скроллом.

## Поведение sticky и focus

| Область | Desktop | Mobile | Защита |
|---|---|---|---|
| Header | Sticky76 максимум | Sticky56 | Высота учитывается scroll-margin-top |
| Каталог filters | Sticky, own scroll | Drawer | Focus trap только когда drawer открыт |
| Course purchase summary | Sticky после hero | Optional bottom bar после hero | Резерв под бар и safe-area; цена полная |
| Lesson sidebar | Sticky, own scroll | Drawer | Возврат focus на «Содержание» |
| Task tabs | В основном не нужны | Sticky ниже header | Tab switch не сбрасывает код |
| Editor toolbar | В shell, не page fixed | В tab «Код» | Не закрывает последнюю строку editor |
| Checkout CTA | В потоке | В потоке | Soft keyboard, validation summary доступны |
| Toast | Нижний правый угол, max360 | Снизу над safe-area, ширина328/358 | Не покрывает primary action; максимум3, остальные queue |

Все основные controls имеют touch target минимум44×44. Визуальный compact badge может быть24, если не интерактивен; интерактивный маленький glyph помещается в44slot. Focus видим на чёрном и кислотном фоне, не обрезается `overflow:hidden` у карточки. Закрытие overlay возвращает focus в исходный trigger. Modal требует dialog name, доступный close и последовательный Tab; после ошибки фокус на первом неверном поле с сохранённым значением.

## Mobile: обязательные17 view layouts

| View | Порядок и адаптация | Критичный edge |
|---|---|---|
| Homepage | Существующий header/copy/CTA/art/catalog/method/footer | Арт и принятый crop не меняются |
| Store | Search → filter/sort → chips → single-column cards | Drawer apply, no page overflow |
| Course overview | Title/icon → art → facts/price → CTA → sections | Sticky CTA не закрывает финальную секцию |
| Profile | Avatar/name → XP → tabs → content | Level999+ и длинный username |
| Achievements | Count → filters → compact grid2/list → more | Secret content hidden, glyph читается64 |
| My progress | Course summary → count/bar/CTA → modules → lessons | 3 уровня вложенности помещаются в328 |
| Dashboard | Continue → XP → today → reviews → courses → achievements/activity | Независимые loading states |
| Purchased course | Header/progress → continue → module list | Completed course имеет осмысленный CTA |
| Module selection | Module drawer trigger → summary → lesson rows | Lock reason текстом, не только иконкой |
| Lesson | Breadcrumb/back → title/meta → article → practice/nav | Code/table contained scroll |
| Coding task | Task/Code/Result tabs → preserved editor | Keyboard, autosave и scroll position |
| Transfer | Brief → submission tabs или короткая форма → result | Нет названия рекомендуемой технологии |
| Code review | Code/Findings/Result → selected range bar → composer | Диапазон доступен без mouse drag |
| Production incident | Brief/Data/Diagnosis; data source select7 | Заметки сохраняются между tabs |
| Checkout | Order compact → customer → method → promo → total → agreement → pay | Итог виден непосредственно перед Pay |
| Payment success | Confirmed label → course → receipt → start | Long orderID wraps |
| Auth | Logo/back → form → help → secondary action | Password visibility44, errors не перекрывают поля |

У каждого из17 есть реальный mobile layout contract в `data/screens.json`, дополнительные390/768 правила распространяются на него. Не нужны отдельные mobile variants для каждого микрокомпонента: intrinsic sizing, wrap и slot properties дают reflow. Отдельные compositions нужны там, где меняется порядок или навигационная модель.

## Content stress и проверка при будущей сборке

1. Длинный title курса: «Алгоритмы и структуры данных для инженерных задач»; карточка минимум3 строки заголовка без наложения price. Description максимум3 строки в grid, полный текст в overview.
2. Level9999, XP9 999 999 999 /12 000 000 000: поле умеет переносить весь числовой блок, summary label допускает компактное «9,99млрд» только при доступном полном числе. Digit field не fixed-width под2 цифры.
3. Progress0/0 → unavailable, не100%;37.6% остаётся37.6геометрией; long counts показываются отдельно. Изменение fill240ms, reduce motion без перехода.
4. До1000 achievements: cursor/page, skeleton только следующей партии, detail не загружает весь список. Новая категория не требует новой ширины фиксированного menu.
5. Модуль с30 уроками: accordion не обрезает дочерние строки; route deep link раскрывает нужный модуль и прокручивает текущий урок ниже sticky header.
6. Long code/token/table: собственный scroll area с подписью, внешняя страница остаётся360. Нельзя решать проблему обрезкой текста `overflow:hidden`.
7. Zoom200%, browser text enlargement и клавиатурная навигация: контент увеличивает высоту. Не использовать фиксированные высоты под параграфы/validation messages.
8. Все состояния checked в1440/768/390/360. Локальная спецификация не является доказательством browser QA; эту проверку выполнить после настоящей вёрстки.
