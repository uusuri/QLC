# QLC — библиотека интерфейса и дизайн-спецификация

Начать с [визуальной галереи](index.html). В ней поиск по имени компонента и состоянию; нажатие на элемент открывает его редактируемый SVG.

## Что готово

- **475 визуальных примеров** для 94 семейств UI: кнопки, формы, навигация, модальные окна, карточки, прогресс, обучение, ревью, инциденты, оплата и авторизация.
- **99 семейств в спецификации**: 94 UI + 5 систем ресурсов. Состояния, свойства, независимые оси, правила Auto Layout и контраста находятся в [components.md](components.md) и [component-inventory.json](data/component-inventory.json).
- **20 курсов** с заполненными демонстрационными данными; 20 новых иконок 48 px и 20 упрощённых символов 24 px. Все 20 существующих обложек переиспользованы без изменений.
- **38 примеров достижений**, использующих 30 существующих абстрактных знаков. XP, уровни, прогресс, скрытые достижения и большие коллекции описаны отдельно.
- **34 экрана/маршрутных представления**, sitemap, контент и desktop/mobile layout specs. Отдельно покрыты 17 основных мобильных представлений.
- **55 токенов и 12 текстовых стилей**, 22 служебные иконки, 94 сгруппированных SVG для импорта.

Это законченный локальный комплект спецификации и визуальных исходников текущего этапа. Новые SVG ещё не превращены в связанные Figma Components/Variants с Auto Layout и variable bindings. SVG содержит редактируемые текст и векторы, но не исполняемое поведение. Число 475 означает примеры состояний и размеров, а не 475 разных базовых компонентов.

## Где что искать

| Нужно | Файл / каталог |
|---|---|
| Смотреть элементы | [index.html](index.html) |
| UI-компоненты и свойства | [components.md](components.md) |
| Перечень состояний | [data/state-inventory.json](data/state-inventory.json) |
| Цвета, размеры, типографика | [foundations.md](foundations.md), [data/design-tokens.json](data/design-tokens.json) |
| Страницы и sitemap | [screens-and-navigation.md](screens-and-navigation.md), [data/screens.json](data/screens.json) |
| Desktop, tablet, mobile | [layouts.md](layouts.md) |
| Тексты ключевых экранов | [content-examples.md](content-examples.md) |
| Курсы и их графика | [course-identity.md](course-identity.md), [data/courses.json](data/courses.json) |
| XP и достижения | [progression-and-achievements.md](progression-and-achievements.md), [data/achievements.json](data/achievements.json) |
| Отдельные элементы | [assets/ui](assets/ui) |
| Наборы для Figma | [figma-import](figma-import), [figma-assembly.md](figma-assembly.md) |
| Результаты проверок | [data/validation-summary.json](data/validation-summary.json) |

Цены, программы курсов, XP и новые учебные механики — **demo-данные**, а не подтверждённые условия продукта. Источник Java-примера: 12 модулей, 60 уроков, 42 часа, 3 990 / 4 990 ₽. Завершены 43/60 уроков: точное заполнение 71.6667%, подпись 72%. Профиль: уровень 12, 2 840/3 500 XP текущего уровня, 21 840 XP всего.

## Что переиспользовано

До генерации проверены существующие `course-artworks/`, `achievement-symbols/`, `progress-components/`, `mobile-360.svg`, `synthetic-art.png`, прежние manifests и source inventory. Копий старых обложек и значков в `spec/assets` нет: используются ссылки на исходники. Approved homepage не менялась в этом этапе.

Существующий Monaco сохраняется. Новые Run, fullscreen и подробные результаты тестов описаны как будущие возможности, а не как уже работающие API. Исходный код сайта не изменялся.

## Проверка брифа

Отметки ниже означают наличие локальной спецификации и соответствующих визуальных элементов, а не готовую реализацию сайта или импорт всех экранов в Figma.

- [x] Homepage сохранена; reusable подборки описаны.
- [x] Course Store, 20+ courses, artworks и course icons.
- [x] Course Overview, Checkout, Payment Success и Payment Failed.
- [x] Profile, Level, XP и масштабируемые большие значения.
- [x] My Progress; Course, Module и Lesson Progress.
- [x] Achievements, Achievement Icons/Progress, фильтры и большие коллекции.
- [x] Dashboard, Purchased Course и Module Selection.
- [x] Lesson Page; все 16 типов контентных блоков.
- [x] Coding Task; контракт встраивания существующего editor.
- [x] Transfer Task, Code Review, Production Incident.
- [x] Spiral Learning и Review Due.
- [x] Auth и Navigation.
- [x] Mobile и responsive layout specs.
- [x] UI Kit, Loading, Empty и Error States.
- [x] Modals, Toasts, Dropdowns, Progress, Badges, Skeletons.

## Границы проверки

Все 475 SVG разобраны как XML, верхнеуровневые подписи проверены по размерам шрифта; просмотрены 14 сводных листов, представляющих каждое семейство. Это не проверка каждой комбинации в работающем браузере и не проверка Auto Layout после импорта. Локальный рендер может использовать Arial/Menlo вместо Inter/IBM Plex Mono; финальная типографика проверяется после подключения нужных шрифтов в Figma.
