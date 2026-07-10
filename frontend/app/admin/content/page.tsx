// Страница является внутренней технической панелью, поэтому вся логика формы живет на клиенте.
"use client";

// FormEvent и ReactNode нужны только на уровне типов.
import type { FormEvent, ReactNode } from "react";

// useEffect загружает зависимые списки, useMemo вычисляет выбранные сущности, useState хранит UI.
import { useEffect, useMemo, useState } from "react";

// Все backend-запросы идут только через сервисный слой.
import {
  createAdminCourse,
  createAdminLesson,
  createAdminModule,
  createAdminTask,
  getAdminCourses,
  getAdminLessons,
  getAdminModules,
  getAdminTasks
} from "@/services/api";

// DTO строго повторяют Java record из backend.
import type {
  AdminCourseDto,
  AdminLessonDto,
  AdminModuleDto,
  AdminTaskCreatePayload,
  AdminTaskDto,
  AdminTaskType
} from "@/types";

// Четыре шага внутренней панели.
type AdminStep = "course" | "module" | "lesson" | "task";

// Универсальное состояние для каждого шага страницы.
type PanelState = {
  // loading показывает, что идет GET или POST.
  loading: boolean;
  // error показывает последнюю ошибку backend или локальной валидации.
  error: string;
  // success показывает успешное создание сущности.
  success: string;
};

// Форма создания курса.
type CourseFormState = {
  name: string;
  description: string;
  price: string;
  priceInStars: string;
};

// Форма создания модуля/урока.
type SimpleNestedFormState = {
  name: string;
  description: string;
};

// Форма создания задачи. Специфичные поля показываются только для выбранного taskType.
type TaskFormState = {
  taskType: AdminTaskType;
  statementMd: string;
  starterCode: string;
  templateCode: string;
  testCases: string;
  timeLimitMs: string;
  memoryLimitKb: string;
  outputLimitKb: string;
  testSetVersion: string;
  optionsText: string;
  correctOptionIndexes: number[];
  correctNumericAnswer: string;
};

// Пустое состояние запроса.
const idlePanelState: PanelState = {
  loading: false,
  error: "",
  success: ""
};

// Начальные значения формы курса.
const initialCourseForm: CourseFormState = {
  name: "",
  description: "",
  price: "",
  priceInStars: ""
};

// Начальные значения формы модуля/урока.
const initialSimpleForm: SimpleNestedFormState = {
  name: "",
  description: ""
};

// Начальные значения формы задачи. CODE-лимиты совпадают с backend defaults.
const initialTaskForm: TaskFormState = {
  taskType: "CODE",
  statementMd: "",
  starterCode: "",
  templateCode: "",
  testCases: "",
  timeLimitMs: "2000",
  memoryLimitKb: "65536",
  outputLimitKb: "4096",
  testSetVersion: "1",
  optionsText: "",
  correctOptionIndexes: [],
  correctNumericAnswer: ""
};

// Описание вкладок. blockedBy используется только для визуальной подсказки.
const adminSteps: Array<{
  id: AdminStep;
  label: string;
  subtitle: string;
  blockedBy?: AdminStep;
}> = [
    {
      id: "course",
      label: "Course",
      subtitle: "GET/POST /api/courses"
    },
    {
      id: "module",
      label: "Module",
      subtitle: "GET/POST /api/courses/{courseId}/modules",
      blockedBy: "course"
    },
    {
      id: "lesson",
      label: "Lesson",
      subtitle: "GET/POST /api/modules/{moduleId}/lessons",
      blockedBy: "module"
    },
    {
      id: "task",
      label: "Task",
      subtitle: "GET/POST /api/lessons/{lessonId}/tasks",
      blockedBy: "lesson"
    }
  ];

// Превращает неизвестную ошибку в строку для UI.
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown frontend error";
}

// BigDecimal на backend нормально принимает JSON number; пустое поле отправляем как null.
function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error("Price fields must be valid numbers.");
  }

  return parsed;
}

// Пустые строки для optional task-полей превращаем в null.
function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

// Парсит положительное целое CODE-поле; пустое значение оставляет backend default.
function parseOptionalPositiveInteger(value: string, label: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

// Превращает TEST textarea в массив непустых вариантов, по одному на строку.
function parseTestOptions(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean);
}

// Поиск по названию/тексту без учета регистра.
function matchesSearch(value: string, search: string): boolean {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

// Главная страница внутренней панели контента.
export default function AdminContentPage() {
  // Активная вкладка определяет единственную видимую рабочую область.
  const [activeStep, setActiveStep] = useState<AdminStep>("course");

  // Списки сущностей, которые приходят из backend.
  const [courses, setCourses] = useState<AdminCourseDto[]>([]);
  const [modules, setModules] = useState<AdminModuleDto[]>([]);
  const [lessons, setLessons] = useState<AdminLessonDto[]>([]);
  const [tasks, setTasks] = useState<AdminTaskDto[]>([]);

  // ID выбранных сущностей задают текущий путь Course -> Module -> Lesson -> Task.
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Последняя созданная задача нужна для главного результата карточки.
  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  // Поиск по спискам каждого шага.
  const [courseSearch, setCourseSearch] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [lessonSearch, setLessonSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");

  // Формы создания сущностей.
  const [courseForm, setCourseForm] = useState<CourseFormState>(initialCourseForm);
  const [moduleForm, setModuleForm] = useState<SimpleNestedFormState>(initialSimpleForm);
  const [lessonForm, setLessonForm] = useState<SimpleNestedFormState>(initialSimpleForm);
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm);

  // Отдельный status на каждый шаг, чтобы ошибки не перетирали друг друга.
  const [courseState, setCourseState] = useState<PanelState>(idlePanelState);
  const [moduleState, setModuleState] = useState<PanelState>(idlePanelState);
  const [lessonState, setLessonState] = useState<PanelState>(idlePanelState);
  const [taskState, setTaskState] = useState<PanelState>(idlePanelState);

  // Выбранные сущности вычисляются из списков по ID.
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const selectedModule = useMemo(
    () => modules.find((moduleItem) => moduleItem.id === selectedModuleId) ?? null,
    [modules, selectedModuleId]
  );

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === selectedLessonId) ?? null,
    [lessons, selectedLessonId]
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  // Фильтрованные списки не меняют исходные данные, только отображение.
  const filteredCourses = useMemo(
    () => courses.filter((course) => matchesSearch(course.name, courseSearch)),
    [courses, courseSearch]
  );

  const filteredModules = useMemo(
    () => modules.filter((moduleItem) => matchesSearch(moduleItem.name, moduleSearch)),
    [modules, moduleSearch]
  );

  const filteredLessons = useMemo(
    () => lessons.filter((lesson) => matchesSearch(lesson.name, lessonSearch)),
    [lessons, lessonSearch]
  );

  const filteredTasks = useMemo(
    () => tasks.filter((task) => matchesSearch(task.statementMd, taskSearch)),
    [tasks, taskSearch]
  );

  // Первичная загрузка курсов. Пустая база даст пустой список, не падение страницы.
  useEffect(() => {
    let ignore = false;

    async function loadCourses() {
      setCourseState({ loading: true, error: "", success: "" });

      try {
        const nextCourses = await getAdminCourses();

        if (!ignore) {
          setCourses(nextCourses);
          setCourseState(idlePanelState);
        }
      } catch (error) {
        if (!ignore) {
          setCourseState({ loading: false, error: getErrorMessage(error), success: "" });
        }
      }
    }

    loadCourses();

    return () => {
      ignore = true;
    };
  }, []);

  // При смене курса загружаем только его модули и сбрасываем нижние уровни.
  useEffect(() => {
    let ignore = false;

    setModules([]);
    setLessons([]);
    setTasks([]);
    setSelectedModuleId(null);
    setSelectedLessonId(null);
    setSelectedTaskId(null);
    setCreatedTaskId(null);
    setCopyStatus("");
    setModuleSearch("");
    setLessonSearch("");
    setTaskSearch("");

    if (selectedCourseId === null) {
      setModuleState(idlePanelState);
      return () => {
        ignore = true;
      };
    }

    async function loadModules(courseId: number) {
      setModuleState({ loading: true, error: "", success: "" });

      try {
        const nextModules = await getAdminModules(courseId);

        if (!ignore) {
          setModules(nextModules);
          setModuleState(idlePanelState);
        }
      } catch (error) {
        if (!ignore) {
          setModuleState({ loading: false, error: getErrorMessage(error), success: "" });
        }
      }
    }

    loadModules(selectedCourseId);

    return () => {
      ignore = true;
    };
  }, [selectedCourseId]);

  // При смене модуля загружаем только его уроки и сбрасываем задачи.
  useEffect(() => {
    let ignore = false;

    setLessons([]);
    setTasks([]);
    setSelectedLessonId(null);
    setSelectedTaskId(null);
    setCreatedTaskId(null);
    setCopyStatus("");
    setLessonSearch("");
    setTaskSearch("");

    if (selectedModuleId === null) {
      setLessonState(idlePanelState);
      return () => {
        ignore = true;
      };
    }

    async function loadLessons(moduleId: number) {
      setLessonState({ loading: true, error: "", success: "" });

      try {
        const nextLessons = await getAdminLessons(moduleId);

        if (!ignore) {
          setLessons(nextLessons);
          setLessonState(idlePanelState);
        }
      } catch (error) {
        if (!ignore) {
          setLessonState({ loading: false, error: getErrorMessage(error), success: "" });
        }
      }
    }

    loadLessons(selectedModuleId);

    return () => {
      ignore = true;
    };
  }, [selectedModuleId]);

  // При смене урока загружаем только его задачи.
  useEffect(() => {
    let ignore = false;

    setTasks([]);
    setSelectedTaskId(null);
    setCreatedTaskId(null);
    setCopyStatus("");
    setTaskSearch("");

    if (selectedLessonId === null) {
      setTaskState(idlePanelState);
      return () => {
        ignore = true;
      };
    }

    async function loadTasks(lessonId: number) {
      setTaskState({ loading: true, error: "", success: "" });

      try {
        const nextTasks = await getAdminTasks(lessonId);

        if (!ignore) {
          setTasks(nextTasks);
          setTaskState(idlePanelState);
        }
      } catch (error) {
        if (!ignore) {
          setTaskState({ loading: false, error: getErrorMessage(error), success: "" });
        }
      }
    }

    loadTasks(selectedLessonId);

    return () => {
      ignore = true;
    };
  }, [selectedLessonId]);

  // Создание курса и обновление списка без перезагрузки страницы.
  async function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (!courseForm.name.trim()) {
        throw new Error("Course name is required.");
      }

      setCourseState({ loading: true, error: "", success: "" });

      const created = await createAdminCourse({
        name: courseForm.name.trim(),
        description: courseForm.description.trim(),
        price: parseOptionalNumber(courseForm.price),
        priceInStars: parseOptionalNumber(courseForm.priceInStars)
      });

      const nextCourses = await getAdminCourses();

      setCourses(nextCourses);
      setSelectedCourseId(created.id);
      setCourseForm(initialCourseForm);
      setCourseSearch("");
      setActiveStep("module");
      setCourseState({
        loading: false,
        error: "",
        success: `Course created. ID: ${created.id}`
      });
    } catch (error) {
      setCourseState({ loading: false, error: getErrorMessage(error), success: "" });
    }
  }

  // Создание модуля требует выбранный курс.
  async function handleCreateModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (selectedCourseId === null) {
        throw new Error("Select Course before creating Module.");
      }

      if (!moduleForm.name.trim()) {
        throw new Error("Module name is required.");
      }

      setModuleState({ loading: true, error: "", success: "" });

      const created = await createAdminModule(selectedCourseId, {
        name: moduleForm.name.trim(),
        description: moduleForm.description.trim()
      });

      const nextModules = await getAdminModules(selectedCourseId);

      setModules(nextModules);
      setSelectedModuleId(created.id);
      setModuleForm(initialSimpleForm);
      setModuleSearch("");
      setActiveStep("lesson");
      setModuleState({
        loading: false,
        error: "",
        success: `Module created. ID: ${created.id}`
      });
    } catch (error) {
      setModuleState({ loading: false, error: getErrorMessage(error), success: "" });
    }
  }

  // Создание урока требует выбранный модуль.
  async function handleCreateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (selectedModuleId === null) {
        throw new Error("Select Module before creating Lesson.");
      }

      if (!lessonForm.name.trim()) {
        throw new Error("Lesson name is required.");
      }

      setLessonState({ loading: true, error: "", success: "" });

      const created = await createAdminLesson(selectedModuleId, {
        name: lessonForm.name.trim(),
        description: lessonForm.description.trim()
      });

      const nextLessons = await getAdminLessons(selectedModuleId);

      setLessons(nextLessons);
      setSelectedLessonId(created.id);
      setLessonForm(initialSimpleForm);
      setLessonSearch("");
      setLessonState({
        loading: false,
        error: "",
        success: `Lesson created. ID: ${created.id}`
      });
    } catch (error) {
      setLessonState({ loading: false, error: getErrorMessage(error), success: "" });
    }
  }

  // Создание задачи требует выбранный урок и формирует payload строго по выбранному taskType.
  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (selectedLessonId === null) {
        throw new Error("Select Lesson before creating Task.");
      }

      if (!taskForm.statementMd.trim()) {
        throw new Error("Task statementMd is required.");
      }

      setTaskState({ loading: true, error: "", success: "" });
      setCreatedTaskId(null);
      setCopyStatus("");

      const payload: AdminTaskCreatePayload = {
        taskType: taskForm.taskType,
        statementMd: taskForm.statementMd.trim(),
        starterCode: null,
        timeLimitMs: null,
        memoryLimitKb: null,
        outputLimitKb: null,
        testSetVersion: null,
        templateCode: null,
        testCases: null,
        options: null,
        correctOptionIndexes: null,
        correctNumericAnswer: null
      };

      if (taskForm.taskType === "CODE") {
        payload.starterCode = optionalText(taskForm.starterCode);
        payload.templateCode = optionalText(taskForm.templateCode);
        payload.testCases = optionalText(taskForm.testCases);
        payload.timeLimitMs = parseOptionalPositiveInteger(taskForm.timeLimitMs, "timeLimitMs");
        payload.memoryLimitKb = parseOptionalPositiveInteger(
          taskForm.memoryLimitKb,
          "memoryLimitKb"
        );
        payload.outputLimitKb = parseOptionalPositiveInteger(
          taskForm.outputLimitKb,
          "outputLimitKb"
        );
        payload.testSetVersion = parseOptionalPositiveInteger(
          taskForm.testSetVersion,
          "testSetVersion"
        );
      }

      if (taskForm.taskType === "TEST") {
        const options = parseTestOptions(taskForm.optionsText);

        if (options.length < 2) {
          throw new Error("TEST task requires at least two non-empty options.");
        }

        if (taskForm.correctOptionIndexes.length === 0) {
          throw new Error("Select at least one correct TEST option.");
        }

        if (
          taskForm.correctOptionIndexes.some(
            (index) => !Number.isSafeInteger(index) || index < 0 || index >= options.length
          )
        ) {
          throw new Error(`Every correct option index must be between 0 and ${options.length - 1}.`);
        }

        payload.options = options;
        payload.correctOptionIndexes = [...taskForm.correctOptionIndexes].sort((a, b) => a - b);
      }

      if (taskForm.taskType === "NUMERIC") {
        const rawAnswer = taskForm.correctNumericAnswer.trim();
        const correctNumericAnswer = Number(rawAnswer);

        if (!rawAnswer || !Number.isFinite(correctNumericAnswer)) {
          throw new Error("correctNumericAnswer must be a valid number.");
        }

        payload.correctNumericAnswer = correctNumericAnswer;
      }

      const created = await createAdminTask(selectedLessonId, payload);

      const nextTasks = await getAdminTasks(selectedLessonId);

      setTasks(nextTasks);
      setSelectedTaskId(created.id);
      setCreatedTaskId(created.id);
      setTaskForm(initialTaskForm);
      setTaskSearch("");
      setTaskState({
        loading: false,
        error: "",
        success: `Task created. ID: ${created.id}`
      });
    } catch (error) {
      setTaskState({ loading: false, error: getErrorMessage(error), success: "" });
    }
  }

  // Копирует taskId для ручной проверки submission API.
  async function handleCopyTaskId(taskId: number) {
    try {
      await navigator.clipboard.writeText(String(taskId));
      setCopyStatus(`Copied taskId ${taskId}`);
    } catch (error) {
      setCopyStatus(getErrorMessage(error));
    }
  }

  // Выбор курса явно сбрасывает нижние уровни, чтобы не создать сущность не туда.
  function handleSelectCourse(courseId: number) {
    setSelectedCourseId(courseId);
    setSelectedModuleId(null);
    setSelectedLessonId(null);
    setSelectedTaskId(null);
    setCreatedTaskId(null);
    setCopyStatus("");
    setActiveStep("module");
  }

  // Выбор модуля сбрасывает уроки/задачи.
  function handleSelectModule(moduleId: number) {
    setSelectedModuleId(moduleId);
    setSelectedLessonId(null);
    setSelectedTaskId(null);
    setCreatedTaskId(null);
    setCopyStatus("");
    setActiveStep("lesson");
  }

  // Выбор урока сбрасывает выбранную задачу.
  function handleSelectLesson(lessonId: number) {
    setSelectedLessonId(lessonId);
    setSelectedTaskId(null);
    setCreatedTaskId(null);
    setCopyStatus("");
    setActiveStep("task");
  }

  // Выбор задачи нужен для selected path и копирования уже существующего taskId.
  function handleSelectTask(taskId: number) {
    setSelectedTaskId(taskId);
    setCreatedTaskId(null);
    setCopyStatus("");
  }

  // Проверяет, можно ли реально работать с выбранной вкладкой.
  function isStepReady(step: AdminStep): boolean {
    if (step === "module") {
      return selectedCourse !== null;
    }

    if (step === "lesson") {
      return selectedModule !== null;
    }

    if (step === "task") {
      return selectedLesson !== null;
    }

    return true;
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl border border-line bg-ink/95">
        <header className="border-b border-line p-5 sm:p-7">
          <p className="font-mono text-xs font-bold uppercase text-acid">
            internal / sprint 2 content tool
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
            Admin Content Builder
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-snug text-white/64">
            4-step interface для создания Course - Module - Lesson - Task и получения taskId для
            POST /api/v1/tasks/{"{taskId}"}/submissions.
          </p>
        </header>

        <SelectedPath
          course={selectedCourse}
          moduleItem={selectedModule}
          lesson={selectedLesson}
          task={selectedTask}
          createdTaskId={createdTaskId}
        />

        <nav className="grid border-b border-line bg-panel/40 sm:grid-cols-4">
          {adminSteps.map((step) => (
            <TabButton
              active={activeStep === step.id}
              blocked={!isStepReady(step.id)}
              key={step.id}
              label={step.label}
              subtitle={step.subtitle}
              onClick={() => setActiveStep(step.id)}
            />
          ))}
        </nav>

        <section className="p-5 sm:p-7">
          {activeStep === "course" && (
            <WorkspacePanel
              state={courseState}
              subtitle="Course step"
              title="Select or create Course"
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="grid content-start gap-4">
                  <SearchInput
                    label="Search courses"
                    value={courseSearch}
                    onChange={setCourseSearch}
                  />
                  <EntityList
                    emptyText={
                      courseSearch
                        ? "No courses match current search."
                        : "No courses yet. Create the first course."
                    }
                    items={filteredCourses.map((course) => ({
                      id: course.id,
                      meta: `courseId: ${course.id} / ${course.priceInStars ?? 0} stars`,
                      title: course.name
                    }))}
                    loading={courseState.loading && courses.length === 0}
                    selectedId={selectedCourseId}
                    onSelect={handleSelectCourse}
                  />
                </div>

                <form className="grid content-start gap-3 border border-line bg-panel/60 p-4" onSubmit={handleCreateCourse}>
                  <FormTitle title="Create Course" idLabel={selectedCourseId} />
                  <TextInput
                    label="name"
                    value={courseForm.name}
                    onChange={(value) =>
                      setCourseForm((current) => ({ ...current, name: value }))
                    }
                  />
                  <TextArea
                    label="description"
                    rows={4}
                    value={courseForm.description}
                    onChange={(value) =>
                      setCourseForm((current) => ({ ...current, description: value }))
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextInput
                      inputMode="decimal"
                      label="price"
                      value={courseForm.price}
                      onChange={(value) =>
                        setCourseForm((current) => ({ ...current, price: value }))
                      }
                    />
                    <TextInput
                      inputMode="decimal"
                      label="priceInStars"
                      value={courseForm.priceInStars}
                      onChange={(value) =>
                        setCourseForm((current) => ({ ...current, priceInStars: value }))
                      }
                    />
                  </div>
                  <SubmitButton disabled={courseState.loading} label="Create Course" />
                </form>
              </div>
            </WorkspacePanel>
          )}

          {activeStep === "module" && (
            <WorkspacePanel state={moduleState} subtitle="Module step" title="Select or create Module">
              {!selectedCourse ? (
                <BlockedMessage text="Сначала выбери курс" />
              ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
                  <div className="grid content-start gap-4">
                    <ContextNote
                      label="Creating inside Course"
                      title={selectedCourse.name}
                      id={selectedCourse.id}
                    />
                    <SearchInput
                      label="Search modules"
                      value={moduleSearch}
                      onChange={setModuleSearch}
                    />
                    <EntityList
                      emptyText={
                        moduleSearch
                          ? "No modules match current search."
                          : "No modules for selected course."
                      }
                      items={filteredModules.map((moduleItem) => ({
                        id: moduleItem.id,
                        meta: `moduleId: ${moduleItem.id} / courseId: ${moduleItem.courseId}`,
                        title: moduleItem.name
                      }))}
                      loading={moduleState.loading && modules.length === 0}
                      selectedId={selectedModuleId}
                      onSelect={handleSelectModule}
                    />
                  </div>

                  <form className="grid content-start gap-3 border border-line bg-panel/60 p-4" onSubmit={handleCreateModule}>
                    <FormTitle title="Create Module" idLabel={selectedModuleId} />
                    <TextInput
                      label="name"
                      value={moduleForm.name}
                      onChange={(value) =>
                        setModuleForm((current) => ({ ...current, name: value }))
                      }
                    />
                    <TextArea
                      label="description"
                      rows={5}
                      value={moduleForm.description}
                      onChange={(value) =>
                        setModuleForm((current) => ({ ...current, description: value }))
                      }
                    />
                    <SubmitButton disabled={moduleState.loading} label="Create Module" />
                  </form>
                </div>
              )}
            </WorkspacePanel>
          )}

          {activeStep === "lesson" && (
            <WorkspacePanel state={lessonState} subtitle="Lesson step" title="Select or create Lesson">
              {!selectedModule ? (
                <BlockedMessage text="Сначала выбери модуль" />
              ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
                  <div className="grid content-start gap-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedCourse && (
                        <ContextNote
                          label="Course"
                          title={selectedCourse.name}
                          id={selectedCourse.id}
                        />
                      )}
                      <ContextNote
                        label="Creating inside Module"
                        title={selectedModule.name}
                        id={selectedModule.id}
                      />
                    </div>
                    <SearchInput
                      label="Search lessons"
                      value={lessonSearch}
                      onChange={setLessonSearch}
                    />
                    <EntityList
                      emptyText={
                        lessonSearch
                          ? "No lessons match current search."
                          : "No lessons for selected module."
                      }
                      items={filteredLessons.map((lesson) => ({
                        id: lesson.id,
                        meta: `lessonId: ${lesson.id} / moduleId: ${lesson.moduleId}`,
                        title: lesson.name
                      }))}
                      loading={lessonState.loading && lessons.length === 0}
                      selectedId={selectedLessonId}
                      onSelect={handleSelectLesson}
                    />
                  </div>

                  <form className="grid content-start gap-3 border border-line bg-panel/60 p-4" onSubmit={handleCreateLesson}>
                    <FormTitle title="Create Lesson" idLabel={selectedLessonId} />
                    <TextInput
                      label="name"
                      value={lessonForm.name}
                      onChange={(value) =>
                        setLessonForm((current) => ({ ...current, name: value }))
                      }
                    />
                    <TextArea
                      label="description"
                      rows={5}
                      value={lessonForm.description}
                      onChange={(value) =>
                        setLessonForm((current) => ({ ...current, description: value }))
                      }
                    />
                    <SubmitButton disabled={lessonState.loading} label="Create Lesson" />
                  </form>
                </div>
              )}
            </WorkspacePanel>
          )}

          {activeStep === "task" && (
            <WorkspacePanel state={taskState} subtitle="Task step" title="Create Task">
              {!selectedLesson ? (
                <BlockedMessage text="Сначала выбери урок" />
              ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px]">
                  <div className="grid content-start gap-4">
                    <div className="grid gap-3 xl:grid-cols-3">
                      {selectedCourse && (
                        <ContextNote label="Course" title={selectedCourse.name} id={selectedCourse.id} />
                      )}
                      {selectedModule && (
                        <ContextNote label="Module" title={selectedModule.name} id={selectedModule.id} />
                      )}
                      <ContextNote
                        label="Creating inside Lesson"
                        title={selectedLesson.name}
                        id={selectedLesson.id}
                      />
                    </div>

                    {createdTaskId !== null && (
                      <TaskCreatedBlock
                        copyStatus={copyStatus}
                        taskId={createdTaskId}
                        onCopy={() => handleCopyTaskId(createdTaskId)}
                      />
                    )}

                    {selectedTaskId !== null && createdTaskId === null && (
                      <SelectedTaskBlock
                        copyStatus={copyStatus}
                        taskId={selectedTaskId}
                        onCopy={() => handleCopyTaskId(selectedTaskId)}
                      />
                    )}

                    <SearchInput
                      label="Search tasks"
                      value={taskSearch}
                      onChange={setTaskSearch}
                    />
                    <EntityList
                      emptyText={
                        taskSearch
                          ? "No tasks match current search."
                          : "No tasks for selected lesson."
                      }
                      items={filteredTasks.map((task) => ({
                        id: task.id,
                        meta: `taskId: ${task.id} / type: ${task.taskType}`,
                        title: task.statementMd
                      }))}
                      loading={taskState.loading && tasks.length === 0}
                      selectedId={selectedTaskId}
                      onSelect={handleSelectTask}
                    />
                  </div>

                  <form className="grid content-start gap-3 border border-line bg-panel/60 p-4" onSubmit={handleCreateTask}>
                    <FormTitle title={`Create ${taskForm.taskType} Task`} idLabel={selectedTaskId} />
                    <TaskTypeSelector
                      value={taskForm.taskType}
                      onChange={(taskType) =>
                        setTaskForm((current) => ({ ...current, taskType }))
                      }
                    />
                    <div className="border border-acid/50 bg-acid/10 p-3">
                      <p className="font-mono text-[10px] font-bold uppercase text-acid">
                        statementMd / Markdown
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase leading-snug text-white/62">
                        Условие хранится как Markdown. Заголовки, списки и fenced code blocks
                        отобразятся студенту через безопасный renderer.
                      </p>
                    </div>
                    <TextArea
                      help="Обязательное условие задачи в Markdown. Приватные ответы сюда не добавляй."
                      label="statementMd (Markdown)"
                      rows={8}
                      value={taskForm.statementMd}
                      onChange={(value) =>
                        setTaskForm((current) => ({ ...current, statementMd: value }))
                      }
                    />

                    {taskForm.taskType === "CODE" && (
                      <div className="grid gap-3 border-t border-line pt-3">
                        <TextArea
                          help="Код, который первым откроется студенту в Monaco Editor."
                          label="starterCode"
                          rows={8}
                          value={taskForm.starterCode}
                          onChange={(value) =>
                            setTaskForm((current) => ({ ...current, starterCode: value }))
                          }
                        />
                        <TextArea
                          help="Legacy-поле backend. Learner UI использует его только если starterCode пуст."
                          label="templateCode (legacy fallback)"
                          rows={6}
                          value={taskForm.templateCode}
                          onChange={(value) =>
                            setTaskForm((current) => ({ ...current, templateCode: value }))
                          }
                        />
                        <TextArea
                          help="Приватные judge-тесты. Learner UI намеренно никогда их не показывает."
                          label="testCases (private)"
                          rows={7}
                          value={taskForm.testCases}
                          onChange={(value) =>
                            setTaskForm((current) => ({ ...current, testCases: value }))
                          }
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <TextInput
                            inputMode="numeric"
                            label="timeLimitMs"
                            value={taskForm.timeLimitMs}
                            onChange={(value) =>
                              setTaskForm((current) => ({ ...current, timeLimitMs: value }))
                            }
                          />
                          <TextInput
                            inputMode="numeric"
                            label="memoryLimitKb"
                            value={taskForm.memoryLimitKb}
                            onChange={(value) =>
                              setTaskForm((current) => ({ ...current, memoryLimitKb: value }))
                            }
                          />
                          <TextInput
                            inputMode="numeric"
                            label="outputLimitKb"
                            value={taskForm.outputLimitKb}
                            onChange={(value) =>
                              setTaskForm((current) => ({ ...current, outputLimitKb: value }))
                            }
                          />
                          <TextInput
                            inputMode="numeric"
                            label="testSetVersion"
                            value={taskForm.testSetVersion}
                            onChange={(value) =>
                              setTaskForm((current) => ({ ...current, testSetVersion: value }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    {taskForm.taskType === "NUMERIC" && (
                      <div className="grid gap-3 border-t border-line pt-3">
                        <TextInput
                          inputMode="decimal"
                          label="correctNumericAnswer"
                          value={taskForm.correctNumericAnswer}
                          onChange={(value) =>
                            setTaskForm((current) => ({ ...current, correctNumericAnswer: value }))
                          }
                        />
                        <p className="text-xs font-bold uppercase leading-snug text-white/46">
                          Ответ сохраняется в backend, но learner UI его не получает из интерфейса и
                          не отображает.
                        </p>
                      </div>
                    )}

                    {taskForm.taskType === "TEST" && (
                      <div className="grid gap-3 border-t border-line pt-3">
                        <TextArea
                          help="Один вариант на строку. Затем отметь один или несколько правильных вариантов ниже."
                          label="options"
                          rows={7}
                          value={taskForm.optionsText}
                          onChange={(value) =>
                            setTaskForm((current) => {
                              const optionsCount = parseTestOptions(value).length;

                              return {
                                ...current,
                                optionsText: value,
                                correctOptionIndexes: current.correctOptionIndexes.filter(
                                  (index) => index < optionsCount
                                )
                              };
                            })
                          }
                        />
                        {parseTestOptions(taskForm.optionsText).length > 0 && (
                          <div className="grid gap-2 border border-line bg-ink p-3">
                            <p className="font-mono text-[10px] font-bold uppercase text-white/48">
                              Correct option indexes
                            </p>
                            {parseTestOptions(taskForm.optionsText).map((option, index) => (
                              <label
                                className={`grid cursor-pointer grid-cols-[auto_auto_1fr] items-start gap-3 border p-3 text-xs transition ${
                                  taskForm.correctOptionIndexes.includes(index)
                                    ? "border-acid bg-acid/10 text-white"
                                    : "border-line text-white/70 hover:border-white/30"
                                }`}
                                key={`${option}-${index}`}
                              >
                                <input
                                  checked={taskForm.correctOptionIndexes.includes(index)}
                                  className="mt-0.5 accent-[#9ef651]"
                                  onChange={(event) =>
                                    setTaskForm((current) => ({
                                      ...current,
                                      correctOptionIndexes: event.target.checked
                                        ? [...current.correctOptionIndexes, index]
                                        : current.correctOptionIndexes.filter(
                                            (selectedIndex) => selectedIndex !== index
                                          )
                                    }))
                                  }
                                  type="checkbox"
                                />
                                <span className="font-mono font-black text-acid">[{index}]</span>
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <SubmitButton
                      disabled={taskState.loading}
                      label={`Create ${taskForm.taskType} Task`}
                    />
                  </form>
                </div>
              )}
            </WorkspacePanel>
          )}
        </section>
      </section>
    </main>
  );
}

// Верхний selected context всегда показывает текущий путь.
function SelectedPath({
  course,
  createdTaskId,
  lesson,
  moduleItem,
  task
}: {
  course: AdminCourseDto | null;
  createdTaskId: number | null;
  lesson: AdminLessonDto | null;
  moduleItem: AdminModuleDto | null;
  task: AdminTaskDto | null;
}) {
  return (
    <section className="grid gap-px border-b border-line bg-line sm:grid-cols-4">
      <PathCell label="Course" title={course?.name ?? "Not selected"} id={course?.id ?? null} />
      <PathCell
        label="Module"
        title={moduleItem?.name ?? "Not selected"}
        id={moduleItem?.id ?? null}
      />
      <PathCell label="Lesson" title={lesson?.name ?? "Not selected"} id={lesson?.id ?? null} />
      <PathCell
        label="Task"
        title={createdTaskId !== null ? "Created task" : task?.statementMd ?? "Not selected"}
        id={createdTaskId ?? task?.id ?? null}
      />
    </section>
  );
}

// Одна ячейка selected path.
function PathCell({ id, label, title }: { id: number | null; label: string; title: string }) {
  return (
    <div className="min-w-0 bg-panel/90 p-4">
      <p className="font-mono text-[10px] font-bold uppercase text-white/50">{label}</p>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm font-black uppercase leading-tight text-white">
        {title}
      </p>
      <p className="mt-3 font-mono text-xs font-bold uppercase text-acid">
        {id === null ? "ID: none" : `ID: ${id}`}
      </p>
    </div>
  );
}

// Кнопка вкладки с явным активным и blocked-состоянием.
function TabButton({
  active,
  blocked,
  label,
  onClick,
  subtitle
}: {
  active: boolean;
  blocked: boolean;
  label: string;
  onClick: () => void;
  subtitle: string;
}) {
  return (
    <button
      className={`grid gap-2 border-b p-4 text-left transition sm:border-b-0 sm:border-r ${active
        ? "border-acid bg-acid text-ink"
        : "border-line bg-ink text-white hover:bg-white/8"
        }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-black uppercase">{label}</span>
        {blocked && (
          <span className="border border-current px-2 py-1 font-mono text-[9px] font-bold uppercase opacity-70">
            locked
          </span>
        )}
      </span>
      <span className="font-mono text-[10px] font-bold uppercase opacity-60">{subtitle}</span>
    </button>
  );
}

// Обертка одной активной рабочей области.
function WorkspacePanel({
  children,
  state,
  subtitle,
  title
}: {
  children: ReactNode;
  state: PanelState;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="grid gap-5 border border-line bg-ink p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase text-acid">{subtitle}</p>
          <h2 className="mt-2 text-3xl font-black uppercase leading-none">{title}</h2>
        </div>
        {state.loading && (
          <span className="border border-acid px-2 py-1 font-mono text-[10px] font-bold uppercase text-acid">
            loading
          </span>
        )}
      </div>

      {state.error && <StatusMessage tone="error" text={state.error} />}
      {state.success && <StatusMessage tone="success" text={state.success} />}

      {children}
    </section>
  );
}

// Заголовок формы и ID выбранной сущности этого шага.
function FormTitle({ idLabel, title }: { idLabel: number | null; title: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
      <h3 className="text-lg font-black uppercase">{title}</h3>
      <span className="font-mono text-[10px] font-bold uppercase text-white/50">
        {idLabel === null ? "selected: none" : `selected: ${idLabel}`}
      </span>
    </div>
  );
}

// Небольшой блок контекста внутри зависимых шагов.
function ContextNote({ id, label, title }: { id: number; label: string; title: string }) {
  return (
    <div className="min-w-0 border border-line bg-panel/70 p-3">
      <p className="font-mono text-[10px] font-bold uppercase text-white/48">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-black uppercase leading-tight text-white">
        {title}
      </p>
      <p className="mt-2 font-mono text-[10px] font-bold uppercase text-acid">ID: {id}</p>
    </div>
  );
}

// Сообщение о заблокированной вложенной форме.
function BlockedMessage({ text }: { text: string }) {
  return (
    <div className="border border-line bg-panel/60 p-6">
      <p className="text-2xl font-black uppercase leading-tight text-white">{text}</p>
      <p className="mt-3 max-w-xl text-sm font-bold uppercase leading-snug text-white/58">
        Выбери родительскую сущность в предыдущей вкладке, и этот шаг станет доступен.
      </p>
    </div>
  );
}

// Универсальное сообщение success/error.
function StatusMessage({ text, tone }: { text: string; tone: "error" | "success" }) {
  const className =
    tone === "error"
      ? "border-red-500/50 bg-red-500/10 text-red-200"
      : "border-acid/60 bg-acid/10 text-acid";

  return <div className={`border p-3 text-xs font-bold uppercase ${className}`}>{text}</div>;
}

// Заметный блок с главным результатом карточки.
function TaskCreatedBlock({
  copyStatus,
  onCopy,
  taskId
}: {
  copyStatus: string;
  onCopy: () => void;
  taskId: number;
}) {
  return (
    <div className="border border-acid bg-acid p-4 text-ink">
      <p className="text-sm font-black uppercase">Task created. ID: {taskId}</p>
      <p className="mt-2 text-xs font-bold uppercase">
        Use for POST /api/v1/tasks/{taskId}/submissions
      </p>
      <button
        className="mt-4 border border-ink px-3 py-2 text-xs font-black uppercase transition hover:bg-ink hover:text-acid"
        onClick={onCopy}
        type="button"
      >
        Copy taskId
      </button>
      {copyStatus && <p className="mt-2 text-xs font-bold">{copyStatus}</p>}
    </div>
  );
}

// Блок для выбранной уже существующей задачи.
function SelectedTaskBlock({
  copyStatus,
  onCopy,
  taskId
}: {
  copyStatus: string;
  onCopy: () => void;
  taskId: number;
}) {
  return (
    <div className="border border-line bg-panel/70 p-4">
      <p className="text-sm font-black uppercase text-white">Selected task. ID: {taskId}</p>
      <p className="mt-2 text-xs font-bold uppercase text-white/58">
        Use for POST /api/v1/tasks/{taskId}/submissions
      </p>
      <button
        className="mt-4 border border-acid px-3 py-2 text-xs font-black uppercase text-acid transition hover:bg-acid hover:text-ink"
        onClick={onCopy}
        type="button"
      >
        Copy taskId
      </button>
      {copyStatus && <p className="mt-2 text-xs font-bold text-acid">{copyStatus}</p>}
    </div>
  );
}

// Тип одного пункта списка сущностей.
type EntityListItem = {
  id: number;
  title: string;
  meta: string;
};

// Список курсов/модулей/уроков/задач с ограниченной высотой и собственным scroll.
function EntityList({
  emptyText,
  items,
  loading,
  onSelect,
  selectedId
}: {
  emptyText: string;
  items: EntityListItem[];
  loading: boolean;
  onSelect: (id: number) => void;
  selectedId: number | null;
}) {
  if (loading) {
    return (
      <div className="border border-line bg-panel/50 p-4 font-mono text-xs font-bold uppercase text-white/58">
        Loading list...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border border-line bg-panel/50 p-4 font-mono text-xs font-bold uppercase text-white/58">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid max-h-[340px] gap-px overflow-y-auto border border-line bg-line">
      {items.map((item) => {
        const isSelected = item.id === selectedId;

        return (
          <button
            className={`grid gap-2 p-3 text-left transition ${isSelected ? "bg-acid text-ink" : "bg-panel text-white hover:bg-white/8"
              }`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            title={item.title}
            type="button"
          >
            <span className="line-clamp-2 text-sm font-black uppercase leading-tight">
              {item.title}
            </span>
            <span className="font-mono text-[10px] font-bold uppercase opacity-70">
              {item.meta}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Поле поиска для списков.
function SearchInput({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[10px] font-bold uppercase text-white/58">{label}</span>
      <input
        className="min-h-12 border border-line bg-panel/60 px-3 text-sm font-bold text-white outline-none transition placeholder:text-white/22 focus:border-acid"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type to filter..."
        value={value}
      />
    </label>
  );
}

// Выбор discriminator TaskDTO. Специфичные поля формы зависят от этого значения.
function TaskTypeSelector({
  onChange,
  value
}: {
  onChange: (value: AdminTaskType) => void;
  value: AdminTaskType;
}) {
  const taskTypes: AdminTaskType[] = ["CODE", "NUMERIC", "TEST"];

  return (
    <fieldset className="grid gap-2">
      <legend className="font-mono text-[10px] font-bold uppercase text-white/58">
        taskType
      </legend>
      <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
        {taskTypes.map((taskType) => (
          <button
            aria-pressed={value === taskType}
            className={`min-h-12 px-3 text-xs font-black uppercase transition ${
              value === taskType
                ? "bg-acid text-ink"
                : "bg-ink text-white/68 hover:text-acid"
            }`}
            key={taskType}
            onClick={() => onChange(taskType)}
            type="button"
          >
            {taskType}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// Общий input с жесткой темной стилистикой.
function TextInput({
  inputMode,
  label,
  onChange,
  value
}: {
  inputMode?: "decimal" | "numeric" | "text";
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[10px] font-bold uppercase text-white/58">{label}</span>
      <input
        className="min-h-12 border border-line bg-ink px-3 text-sm font-bold text-white outline-none transition placeholder:text-white/22 focus:border-acid"
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

// Общая textarea для описаний, кода и testCases.
function TextArea({
  help,
  label,
  onChange,
  rows,
  value
}: {
  help?: string;
  label: string;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[10px] font-bold uppercase text-white/58">{label}</span>
      <textarea
        className="resize-y border border-line bg-ink px-3 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/22 focus:border-acid"
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
      {help && <span className="text-xs font-bold uppercase leading-snug text-white/46">{help}</span>}
    </label>
  );
}

// Общая submit-кнопка.
function SubmitButton({ disabled, label }: { disabled: boolean; label: string }) {
  return (
    <button
      className="min-h-12 border border-acid bg-acid px-5 text-xs font-black uppercase text-ink transition hover:bg-transparent hover:text-acid disabled:cursor-wait disabled:border-white/20 disabled:bg-white/8 disabled:text-white/34"
      disabled={disabled}
      type="submit"
    >
      {disabled ? "Loading..." : label}
    </button>
  );
}
