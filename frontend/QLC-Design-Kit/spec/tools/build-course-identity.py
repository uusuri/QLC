"""Build only the missing compact course identities; reuse existing text-free artwork.

No network, Figma, website source, raster generation, or changes to original artworks.
Run from any directory. Output paths are resolved from this script.
"""
from pathlib import Path
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape
import hashlib
import json
import math

SPEC = Path(__file__).resolve().parents[1]
ROOT = SPEC.parent
NS = 'http://www.w3.org/2000/svg'
PAPER, LIME, BLUE, INK = '#f5f5ef', '#c4ff00', '#4433ee', '#0a0a0a'


def path(d, color=PAPER, fill='none'):
    return f'<path d="{d}" fill="{fill}" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'


def line(x1, y1, x2, y2, color=PAPER):
    return path(f'M{x1} {y1}L{x2} {y2}', color)


def circle(cx, cy, r, color=PAPER, fill='none'):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{color}" stroke-width="2"/>'


def ellipse(cx, cy, rx, ry, color=PAPER, rotate=0):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" transform="rotate({rotate} {cx} {cy})" fill="none" stroke="{color}" stroke-width="2"/>'


def polygon(points, color=PAPER, fill='none'):
    return path('M'+'L'.join(f'{x:g} {y:g}' for x,y in points)+'Z', color, fill)


def diamond(cx, cy, r, color=PAPER):
    return polygon([(cx,cy-r),(cx+r,cy),(cx,cy+r),(cx-r,cy)],color)


def ring_points(n, outer, inner, center=24):
    return [(round(center+(outer if i%2==0 else inner)*math.cos(-math.pi/2+i*math.pi/n),2), round(center+(outer if i%2==0 else inner)*math.sin(-math.pi/2+i*math.pi/n),2)) for i in range(n*2)]


def knot(center, scale):
    pts=[]
    for i in range(145):
        t=math.tau*i/144
        pts.append((center+scale*(math.sin(t)+2*math.sin(2*t)),center+scale*(math.cos(t)-2*math.cos(2*t))))
    return 'M'+'L'.join(f'{x:.2f} {y:.2f}' for x,y in pts)


# Twenty optical originals. The 24 px family is deliberately drawn separately.
ICONS = [
    ellipse(24,24,19,8,LIME,-28)+ellipse(24,24,14,5,PAPER,-28)+diamond(24,24,4,LIME),
    path('M9 27L21 9L39 14L27 35Z',PAPER)+path('M9 27V33L27 40L39 20V14M27 35V40',BLUE)+line(16,24,32,29,LIME),
    path('M24 24C17 8 5 10 5 22C5 36 20 35 24 24C28 13 43 12 43 26C43 38 31 40 24 24',LIME)+path('M11 23C11 29 17 29 20 23M28 25C31 19 37 19 37 25',PAPER),
    path('M8 39L13 7L20 9ZM8 39L27 6L33 11ZM8 39L41 17L43 25ZM8 39L42 33L39 40Z',LIME)+line(8,39,24,42,PAPER),
    diamond(24,24,19,PAPER)+diamond(24,24,13,LIME)+path('M24 5L31 25L24 43M5 24L31 25L43 24',PAPER),
    path('M5 14C14 3 16 30 26 18S37 12 43 8M5 24C14 13 16 40 26 28S37 22 43 18',LIME)+path('M5 34C14 23 16 47 26 38S37 32 43 28',PAPER),
    polygon(ring_points(8,19,15),LIME)+circle(24,24,9,PAPER)+path('M24 5V9M43 24H39M24 43V39M5 24H9',PAPER),
    path('M15 5C41 12 7 18 33 25C7 32 41 38 15 43',LIME)+path('M33 5C7 12 41 18 15 25C41 32 7 38 33 43',PAPER)+line(18,16,30,16,BLUE)+line(18,34,30,34,BLUE),
    path('M5 8H17V20H5ZM31 8H43V20H31ZM18 30H30V42H18Z',PAPER)+path('M17 14H31M11 20V26H24V30M37 20V26H24',LIME)+line(9,12,13,12,BLUE),
    path('M7 7H29V25H7ZM19 21H41V41H19Z',PAPER)+path('M12 12H23M24 34H36',LIME)+path('M33 7H41V15M7 33V41H15',BLUE),
    path('M8 10Q24 2 40 10Q24 18 8 10ZM8 20Q24 28 40 20M8 30Q24 38 40 30M8 10V36Q24 44 40 36V10',LIME)+line(16,17,16,34,PAPER)+line(32,17,32,34,PAPER),
    path('M6 9Q24 35 42 9M6 24Q24 45 42 24M6 39Q24 15 42 39',PAPER)+path('M6 9Q17 24 6 39M18 17Q25 26 18 30M30 17Q23 26 30 30M42 9Q31 24 42 39',LIME),
    path('M7 12L24 5L41 12L24 19ZM7 22L24 15L41 22L24 29ZM7 32L24 25L41 32L24 39Z',LIME)+path('M12 39L24 44L36 39',PAPER),
    path('M6 16L24 6L42 16V33L24 43L6 33ZM6 16L24 26L42 16M24 26V43',PAPER)+path('M15 17L24 12L33 17L24 22Z',LIME)+line(12,24,18,27,BLUE),
    polygon([(24,6),(39,15),(39,33),(24,42),(9,33),(9,15)],PAPER)+path('M24 6V18M39 15L29 21M39 33L29 27M24 42V30M9 33L19 27M9 15L19 21',LIME)+diamond(24,24,6,PAPER),
    path('M7 40V25Q7 7 24 7Q41 7 41 25V40M13 40V25Q13 13 24 13Q35 13 35 25V40M19 40V25Q19 19 24 19Q29 19 29 25V40',PAPER)+path('M7 40H19M29 40H41',LIME),
    path('M10 40V29L24 20V8M24 20L38 29V40',LIME)+diamond(24,8,4,PAPER)+diamond(10,40,4,PAPER)+diamond(38,40,4,PAPER)+path('M10 29L10 18L15 13',BLUE),
    polygon([(24,5),(43,40),(5,40)],PAPER)+polygon([(24,15),(35,35),(13,35)],LIME)+polygon([(24,25),(28,32),(20,32)],PAPER),
    path('M7 7H41V41H7ZM7 17H41M7 31H41M17 7V41M31 7V41',PAPER)+path('M17 17H31V31H17Z',LIME,INK)+line(21,24,27,24,LIME),
    path(knot(24,6.5),LIME)+circle(24,24,4,PAPER),
]

SYMBOLS = [
    ellipse(12,12,9,4,LIME,-28)+diamond(12,12,3,PAPER),
    path('M4 14L10 4L20 7L14 18ZM4 14V17L14 21L20 11V7',PAPER)+line(9,12,15,14,LIME),
    path('M12 12C8 3 3 5 3 11C3 18 10 18 12 12C14 6 21 6 21 13C21 19 16 21 12 12',LIME),
    path('M4 20L7 3L11 5ZM4 20L16 4L20 8ZM4 20L21 14L20 20Z',LIME),
    diamond(12,12,9,PAPER)+path('M12 3L16 12L12 21M3 12H16L21 12',LIME),
    path('M3 8C7 2 9 18 14 11S18 8 21 5M3 15C7 9 9 25 14 18S18 15 21 12',LIME),
    polygon(ring_points(6,9,7,12),PAPER)+circle(12,12,3,LIME),
    path('M7 3C20 7 4 9 17 13C4 17 20 19 7 21',LIME)+path('M17 3C4 7 20 9 7 13C20 17 4 19 17 21',PAPER),
    path('M3 4H9V10H3ZM15 4H21V10H15ZM9 15H15V21H9Z',PAPER)+path('M9 7H15M6 10V13H12V15M18 10V13H12',LIME),
    path('M3 3H14V13H3ZM10 11H21V21H10Z',PAPER)+line(14,16,18,16,LIME),
    path('M4 5Q12 1 20 5Q12 9 4 5ZM4 12Q12 17 20 12M4 5V18Q12 23 20 18V5',LIME),
    path('M3 4Q12 18 21 4M3 20Q12 6 21 20M3 4Q9 12 3 20M21 4Q15 12 21 20',PAPER)+line(12,9,12,15,LIME),
    path('M3 6L12 3L21 6L12 10ZM3 12L12 9L21 12L12 16ZM3 18L12 15L21 18L12 21Z',LIME),
    path('M3 7L12 3L21 7V17L12 21L3 17ZM3 7L12 12L21 7M12 12V21',PAPER)+line(8,7,12,5,LIME),
    polygon([(12,3),(20,8),(20,16),(12,21),(4,16),(4,8)],PAPER)+path('M12 3V9M20 16L15 13M4 16L9 13',LIME)+circle(12,12,3,PAPER),
    path('M4 20V12Q4 4 12 4Q20 4 20 12V20M9 20V12Q9 9 12 9Q15 9 15 12V20',PAPER)+line(4,20,9,20,LIME),
    path('M5 20V15L12 10V4M12 10L19 15V20',LIME)+circle(12,4,2,PAPER)+circle(5,20,2,PAPER)+circle(19,20,2,PAPER),
    polygon([(12,3),(21,20),(3,20)],PAPER)+polygon([(12,10),(16,17),(8,17)],LIME),
    path('M3 3H21V21H3ZM3 9H21M3 15H21M9 3V21M15 3V21',PAPER)+path('M9 9H15V15H9Z',LIME,INK),
    path(knot(12,3.05),LIME),
]

# All commercial and learning estimates below are demonstration content, not product claims.
ROWS = [
    ('java','Java','Java','Языки программирования','Базовый',42,12,60,36,399000,499000,['Java 21','ООП','Коллекции'],'Основы Java, работа с коллекциями и решение задач с проверкой.',['Писать небольшие программы на Java','Работать с коллекциями и исключениями','Проверять решение на разных входных данных']),
    ('cpp','C++','C++','Языки программирования','Базовый',48,9,54,42,449000,None,['C++23','STL','Память'],'Типы, память, стандартная библиотека и практические задачи на C++.',['Использовать контейнеры STL','Управлять ресурсами через RAII','Находить ошибки работы с памятью']),
    ('python','Python','Python','Языки программирования','Базовый',32,7,40,30,299000,None,['Python','Коллекции','Автоматизация'],'Основы Python, обработка данных и небольшие прикладные программы.',['Работать со списками и словарями','Разбивать программу на функции и модули','Автоматизировать обработку файлов']),
    ('javascript','JavaScript','JavaScript','Языки программирования','Базовый',36,8,44,34,349000,None,['JavaScript','DOM','Async'],'Язык JavaScript, браузерные события и асинхронная работа с данными.',['Понимать области видимости и замыкания','Обрабатывать события интерфейса','Работать с Promise и fetch']),
    ('typescript','TypeScript','TypeScript','Языки программирования','Средний',24,6,30,24,299000,399000,['TypeScript','Типы','Generics'],'Типизация прикладного кода: от моделей данных до обобщённых функций.',['Моделировать данные типами','Сужать объединения и проверять входные данные','Применять generics без избыточных абстракций']),
    ('go','Go','Go','Языки программирования','Базовый',36,8,42,32,349000,None,['Go','Goroutines','HTTP'],'Программы и HTTP-сервисы на Go, конкурентность и обработка ошибок.',['Работать с интерфейсами и ошибками','Организовать конкурентную обработку','Создать и проверить HTTP-сервис']),
    ('rust','Rust','Rust','Языки программирования','Средний',48,10,56,44,499000,None,['Rust','Ownership','Traits'],'Владение данными, безопасная работа с памятью и выразительные модели типов.',['Применять ownership и borrowing','Описывать поведение через traits','Обрабатывать ошибки с Result']),
    ('spring','Spring','Spring','Разработка приложений','Средний',44,9,50,38,599000,749000,['Spring Boot','REST','JPA'],'Разработка Java-сервисов с Spring: HTTP, данные, транзакции и тесты.',['Создавать REST API','Управлять транзакциями и доступом к данным','Проверять сервис интеграционными тестами']),
    ('backend-engineering','Backend Engineering','Backend','Разработка приложений','Продвинутый',64,12,72,52,799000,None,['API','Очереди','Архитектура'],'Проектирование серверных систем, надёжность и работа с ограничениями.',['Выбирать границы сервисов и контрактов','Разбирать сбои и повторную обработку','Обосновывать решения по хранению данных']),
    ('frontend-engineering','Frontend Engineering','Frontend','Разработка приложений','Средний',56,11,64,46,699000,None,['React','Доступность','Состояние'],'Интерфейсы с понятным состоянием, доступной навигацией и измеримой скоростью.',['Собирать повторно используемые компоненты','Управлять загрузкой, ошибками и состоянием','Проверять доступность и производительность']),
    ('sql','SQL','SQL','Данные','Базовый',24,6,32,28,249000,None,['SQL','JOIN','Агрегация'],'Запросы, соединения таблиц и анализ данных на практических примерах.',['Объединять таблицы через JOIN','Группировать данные и использовать оконные функции','Проверять корректность запроса на краевых случаях']),
    ('postgresql','PostgreSQL','PostgreSQL','Данные','Средний',36,8,44,32,449000,None,['PostgreSQL','Индексы','Транзакции'],'Модель данных, планы запросов, индексы и конкурентный доступ в PostgreSQL.',['Читать EXPLAIN и находить дорогие операции','Подбирать индексы под нагрузку','Понимать блокировки и уровни изоляции']),
    ('redis','Redis','Redis','Данные','Средний',18,5,24,18,199000,249000,['Redis','Кеш','Streams'],'Структуры Redis, кеширование и обработка событий с контролем надёжности.',['Выбирать структуры данных Redis','Управлять сроком жизни и инвалидацией кеша','Разбирать доставку сообщений через Streams']),
    ('docker','Docker','Docker','Инфраструктура','Базовый',20,5,26,20,249000,None,['Docker','Образы','Compose'],'Контейнеризация приложения, сборка образов и локальное окружение.',['Создать воспроизводимый Dockerfile','Настроить сеть, тома и переменные','Запустить несколько сервисов через Compose']),
    ('kubernetes','Kubernetes','Kubernetes','Инфраструктура','Продвинутый',40,9,48,34,549000,None,['Kubernetes','Deployments','Диагностика'],'Запуск сервисов в кластере, обновления и диагностика проблем окружения.',['Описывать Deployment, Service и конфигурацию','Проверять готовность и ресурсы приложения','Разбирать причины сбоев по событиям и логам']),
    ('linux','Linux','Linux','Инфраструктура','Базовый',24,6,32,26,199000,None,['Linux','Shell','Процессы'],'Командная строка, файловая система, процессы и базовая диагностика Linux.',['Находить файлы и обрабатывать текст','Работать с правами и процессами','Диагностировать сеть и использование ресурсов']),
    ('git','Git','Git','Инструменты','Базовый',10,4,18,14,0,None,['Git','Ветки','Конфликты'],'История изменений, ветки и безопасная совместная работа с репозиторием.',['Создавать понятные коммиты','Разрешать конфликты с сохранением изменений','Проверять историю и восстанавливать нужное состояние']),
    ('algorithms','Алгоритмы и структуры данных','Алгоритмы','Фундаментальные знания','Средний',52,10,60,50,499000,599000,['Алгоритмы','Структуры данных','Сложность'],'Выбор структуры данных и алгоритма с учётом ограничений задачи.',['Оценивать время и память решения','Использовать деревья, графы и хеш-таблицы','Объяснять корректность алгоритма']),
    ('computer-science','Computer Science','Computer Science','Фундаментальные знания','Базовый',40,8,48,30,399000,None,['ОС','Сети','Представление данных'],'Как программа исполняется: память, процессы, сети и представление данных.',['Понимать взаимодействие процесса и операционной системы','Прослеживать путь сетевого запроса','Объяснять ограничения хранения и вычислений']),
    ('mathematics','Математика для программирования','Математика','Фундаментальные знания','Базовый',36,8,44,36,349000,None,['Логика','Комбинаторика','Вероятность'],'Дискретная математика и вероятностные модели для практических задач.',['Работать с логикой, множествами и отношениями','Считать комбинаторные величины','Применять вероятность и математическое ожидание']),
]


def build():
    for directory in ('assets/course-icons','assets/course-symbols','data'):
        (SPEC/directory).mkdir(parents=True,exist_ok=True)
    existing=json.loads((ROOT/'course-artworks-manifest.json').read_text())['assets']
    assert len(existing)==len(ROWS)==len(ICONS)==len(SYMBOLS)==20
    courses=[]
    validation=[]
    for index,(row,art,icon,symbol) in enumerate(zip(ROWS,existing,ICONS,SYMBOLS),1):
        id,title,short,category,difficulty,hours,modules,lessons,practice,price,old,tags,description,skills=row
        source=ROOT/'course-artworks'/art['file']
        raw=source.read_bytes()
        root=ET.fromstring(raw)
        forbidden=[e.tag for e in root.iter() if e.tag.split('}')[-1] in {'text','image','script','foreignObject'}]
        assert not forbidden, (source,forbidden)
        assert root.attrib['viewBox']=='0 0 640 300'
        assert all(not any(k.endswith('href') for k in e.attrib) for e in root.iter())
        for size,body,kind in [(48,icon,'icons'),(24,symbol,'symbols')]:
            asset=SPEC/f'assets/course-{kind}/{id}.svg'
            asset.write_text(f'<svg xmlns="{NS}" width="{size}" height="{size}" viewBox="0 0 {size} {size}"><g id="Course-{id}-{size}">{body}</g></svg>')
        discount=round((old-price)/old*100) if old else 0
        courses.append({
            'id':id,'title':title,'shortTitle':short,'category':category,'description':description,
            'difficulty':difficulty,'duration':{'hours':hours,'display':f'{hours} ч','basis':'Ориентир для макета, не срок прохождения'},
            'moduleCount':modules,'lessonCount':lessons,'practiceCount':practice,
            'currency':'RUB','priceMinor':price,'oldPriceMinor':old,'discountPercent':discount,
            'tags':tags,'whatYouWillLearn':skills,
            'artworkPath':f'../../course-artworks/{art["file"]}',
            'iconPath':f'../assets/course-icons/{id}.svg','symbolPath':f'../assets/course-symbols/{id}.svg',
            'accentToken':'color.accent.secondary' if index in {2,5,10,12,15,19} else 'color.accent.primary',
            'accentHex':BLUE if index in {2,5,10,12,15,19} else LIME,
            'composition':art['composition'],'dataStatus':'demo',
            'demoFields':['description','difficulty','duration','moduleCount','lessonCount','practiceCount','priceMinor','oldPriceMinor','discountPercent','tags','whatYouWillLearn'],
            'artworkProvenance':{'action':'reused-unchanged','sha256':hashlib.sha256(raw).hexdigest(),'size':[640,300]},
        })
        validation.append({'id':id,'artwork':'reused-unchanged','artworkTextNodes':0,'artworkBitmapNodes':0,'iconSize':48,'symbolSize':24,'discountMath':'passed'})
    out={
        'schemaVersion':1,
        'dataStatus':'demo',
        'notice':'Демонстрационный каталог для макетов. Цены, длительности, программы и количество материалов придуманы для проверки интерфейса; это не существующее коммерческое предложение QLC.',
        'pathBase':'Пути artworkPath/iconPath/symbolPath относительны spec/data/courses.json; оригинальные обложки не копируются.',
        'discountRule':'discountPercent = round((oldPriceMinor - priceMinor) / oldPriceMinor * 100); при oldPriceMinor=null скидка 0. UI не пересчитывает цену по округлённому проценту.',
        'collectionPolicy':'20 демонстрационных записей, не ограничение продукта. id стабилен; Course/Card получает контент и asset properties.',
        'courses':courses,
        'validation':{'courseCount':20,'reusedArtworkCount':20,'new48pxIconCount':20,'new24pxSymbolCount':20,'uniqueIds':len({x['id'] for x in courses}), 'records':validation},
    }
    assert len({hashlib.sha256(x.encode()).hexdigest() for x in ICONS})==20
    assert len({hashlib.sha256(x.encode()).hexdigest() for x in SYMBOLS})==20
    assert all(c['oldPriceMinor'] is None or c['oldPriceMinor']>c['priceMinor'] for c in courses)
    (SPEC/'data/courses.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    sheet=['<svg xmlns="http://www.w3.org/2000/svg" width="1480" height="1510" viewBox="0 0 1480 1510">',f'<rect width="1480" height="1510" fill="{INK}"/>',
           f'<text x="36" y="40" fill="{PAPER}" font-family="Inter,Arial,sans-serif" font-size="24">QLC / Course identity · 20 направлений</text>',
           f'<text x="36" y="67" fill="#a6a6a0" font-family="Inter,Arial,sans-serif" font-size="13">Обложки 320 × 150 — уже существовали. Новые иконки 48 px и отдельные символы 24 px показаны в реальном размере.</text>']
    for index,(c,icon,symbol) in enumerate(zip(courses,ICONS,SYMBOLS)):
        x=36+(index%4)*362;y=100+(index//4)*278
        raw=(SPEC/'data'/c['artworkPath']).read_text()
        content=raw[raw.index('>')+1:raw.rfind('</svg>')]
        sheet += [f'<svg x="{x}" y="{y}" width="320" height="150" viewBox="0 0 640 300">{content}</svg>',
                  f'<path d="M{x} {y+161}H{x+320}" stroke="#343630"/>',
                  f'<svg x="{x+3}" y="{y+177}" width="48" height="48" viewBox="0 0 48 48">{icon}</svg>',
                  f'<svg x="{x+67}" y="{y+189}" width="24" height="24" viewBox="0 0 24 24">{symbol}</svg>',
                  f'<text x="{x+108}" y="{y+197}" fill="{PAPER}" font-family="Inter,Arial,sans-serif" font-size="16">{escape(c["shortTitle"])}</text>',
                  f'<text x="{x+108}" y="{y+219}" fill="#a6a6a0" font-family="Inter,Arial,sans-serif" font-size="11">{escape(c["category"])}</text>',
                  f'<text x="{x+6}" y="{y+247}" fill="#a6a6a0" font-family="monospace" font-size="10">48 px</text>',
                  f'<text x="{x+65}" y="{y+247}" fill="#a6a6a0" font-family="monospace" font-size="10">24 px</text>']
    sheet.append('</svg>')
    (SPEC/'assets/course-identity-contact-sheet.svg').write_text(''.join(sheet))
    print(json.dumps({'courses':20,'reusedArtworks':20,'newIcons48':20,'newSymbols24':20,'data':str(SPEC/'data/courses.json'),'sheet':str(SPEC/'assets/course-identity-contact-sheet.svg')},ensure_ascii=False))


if __name__=='__main__':
    build()
