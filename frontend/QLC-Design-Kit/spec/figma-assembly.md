# Сборка QLC в Figma

## Источник и сохранность

Работать в существующем файле `XRhj2StjAQ4JKIUQcVXONx`, сохраняя утверждённую страницу Synthetic. Идентификаторы уже созданных объектов находятся в `../figma-state.json`; перед следующими правками их нужно сверить с живым файлом. В последнем подтверждённом срезе там есть главная desktop/mobile и библиотека 30 значков, 20 обложек и трёх форм прогресса. Повторно импортировать эти ресурсы не нужно.

В этой поставке создавались локальные элементы. Полные страницы в редакторе не раскладывались — по последнему указанию пользователя.

## Структура страниц

| Страница | Содержимое |
|---|---|
| 00 / Foundations | Цвета, шрифты, размеры, доступность, motion |
| 01 / Design System | Инструкция, соглашения и карта компонентов |
| 02 / Components | Controls, Navigation, Feedback, Domain |
| 03 / Public | Сохранённая homepage; подборки как instances |
| 04 / Store | Каталог и overview |
| 05 / Auth | Вход, регистрация, восстановление, verification |
| 06 / Profile | Профиль, прогресс, достижения, активность |
| 07 / Learning | Dashboard, курс, модуль, урок, skill/review |
| 08 / Tasks | Coding, Transfer, Code Review |
| 09 / Incidents | Brief, evidence, diagnosis, result |
| 10 / Checkout | Summary, оплата, success/failed/pending |
| 11 / States | Loading, empty, error, offline, access |
| 12 / Mobile | Только основные композиции из layouts.md |
| 13 / Assets | Course, Achievement и Utility resources |

Существующие страницы сначала оставить на месте. Эта структура — целевая организация, а не разрешение удалять или переименовывать сохранённые макеты без проверки ссылок.

## Порядок работы без повторного рисования

1. Сверить существующие пять переменных цвета. Добавить семантические роли и типографику из `data/design-tokens.json`. Существующие значения имеют приоритет над старой CSS-палитрой.
2. Новые resources: импортировать `assets/course-icons/*.svg`, `assets/course-symbols/*.svg` и `assets/utility-icons/*.svg`. Каждый уникальный glyph — main component; в карточках использовать instance swap. Course/Card остаётся один.
3. Для UI использовать `figma-import/*.svg`, а не вручную собирать 475 отдельных файлов. Каждый файл содержит одно семейство с именованными вложенными frames и сохранёнными размерами. Список — `data/figma-import-manifest.json`.
4. После SVG-импорта оформить actual components по `data/component-inventory.json`: связать состояния с корректными осями, тексты — с TEXT properties, optional slots — с BOOLEAN, изображения/иконки — с INSTANCE_SWAP.
5. Преобразовать связанные контентные контейнеры в Auto Layout: label/control/helper у поля; art/body/metadata/action у Course/Card; icon/copy/progress/action у доменных карточек. `Hug` для текстов и переменной высоты; `Fill` для доступной ширины; min-width0 для длинного кода/метаданных. Внутренний artwork остаётся геометрией с фиксированным соотношением сторон.
6. Привязать fills/strokes, padding/gaps/radii к variables. Сначала Controls, затем Feedback/Progress, затем Domain, Content/Task и Payment/Auth. Только после этого собирать страницы из instances, если это понадобится.
7. Проверить длинное название, замену иконки, широкое число XP, открытие/закрытие optional content и ширины360/768/1440. Записать реальные node IDs и результаты проверки. SVG-импорт сам по себе не считается готовой библиотекой компонентов.

## Что не превращать в variants

- Процент, число XP, уровень, цена, title, количество уроков и достижений — данные. `Progress` принимает любое число0…100. В import-наборах оставлен один произвольный determinate пример плюс отдельные indeterminate/unavailable, а не лесенка0/25/50/75/100.
- Course identity — artwork/icon swap; не20 разных карточек.
- Expansion у Module/Card — BOOLEAN, progress status — отдельная ось.
- Rarity у Achievement/Card независима от locked/unlocked/secret; newlyUnlocked — отдельный флаг.
- Input может быть заполнен, сфокусирован и содержать ошибку одновременно. Interaction, Validation и HasValue независимы.

## Что обязательно должно стать Components/Variants

Все 94 UI-семейства и5систем assets из component inventory. Для Button существуют SizeS/M/L и Interaction; для Input — Interaction/Validation; для статусных блоков — State/Status; для Activity — Type и Status. Общие вложенные компоненты должны переиспользоваться вместо полной декартовой матрицы сотен дубликатов.

Иллюстративные SVG для сложных блоков не являются готовым редактором, платёжной формой провайдера или схемой API. Они задают внешний вид и slots. Существующее поведение Monaco берётся из source inventory.

## Ручной импорт: точный список

| Ресурс | Количество | Действие |
|---|---:|---|
| Новые Course/Icon | 20 | assets/course-icons |
| Новые Course/Symbol | 20 | assets/course-symbols |
| Utility icons | 22 | assets/utility-icons |
| UI-семейства | 94 файла | figma-import; каждый файл уже содержит примеры своего семейства |
| Прежние Course/Artwork | 20 | Переиспользовать существующие mains; исходники ../course-artworks |
| Прежние Achievement/Icon | 30 | Переиспользовать существующие mains128×128 |
| Прежний approved hero | 1 | Сохранить image fill; не генерировать заново |

`previews/` и контактные таблицы служат просмотру. Не импортировать PNG-таблицу вместо компонентов.
