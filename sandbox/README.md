# Запуск решений

Из корня репозитория соберите образы (Docker должен быть запущен):

```sh
docker build -f sandbox/Dockerfile -t qlc-cpp-runner:dev .
docker build -f sandbox/Dockerfile.python --build-arg PYTHON_IMAGE=python:3.12-slim-trixie -t qlc-python312-runner:dev .
docker build -f sandbox/Dockerfile.python --build-arg PYTHON_IMAGE=pypy:3.12-slim-trixie -t qlc-pypy312-runner:dev .
docker build -f sandbox/Dockerfile.java21 -t qlc-java21-runner:dev .
```

Образ Java наследует общий sandbox/judge из C++-образа, поэтому собирается после него.
Из `backend/` можно запустить контейнерные тесты с `QLC_DOCKER_TESTS=true ./gradlew test --tests com.qlc.runners.DockerCodeRunnerIntegrationTest`.

Профили находятся в `backend/src/main/java/com/qlc/runners/LanguageProfile.java`.
Лимиты задачи считаются базой для C++: C++ получает 1× время и 1× память;
CPython 3.12 — 3× время и не менее 128 МиБ (обычно 2× память);
PyPy 3.12 — 3× время и не менее 256 МиБ (обычно 4× память);
Java 21 — 2× время плюс 500 мс на запуск JVM и не менее 256 МиБ (обычно 3× память).
К лимиту памяти программы контейнер добавляет 256 МиБ для компилятора и проверяющего процесса.
Ограничение на объём виртуального адресного пространства отключено для Java и PyPy (JIT резервирует большое виртуальное пространство);
фактическую память ограничивает Docker, а judge сравнивает пиковую RSS с лимитом программы.

Это стартовая политика, а не гарантия одинакового времени для любого алгоритма.
Перед публикацией задачи с несколькими языками прогоняйте эталонные решения и пограничные тесты
на каждом поддерживаемом языке и корректируйте политику, если один из них оказывается несправедливо зажат.
Остальные языки в редакторе пока остаются демонстрационными и не отправляются в контейнер.
