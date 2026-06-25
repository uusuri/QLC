// Страница является внутренней технической панелью, поэтому вся логика формы живет на клиенте.
"use client";

// FormEvent и ReactNode нужны только на уровне типов.
import type { FormEvent, ReactNode } from "react";

// useEffect загружает зависимые списки, useMemo вычисляет выбранные сущности, useState хранит формы.
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
  AdminTaskDto,
  AdminTaskType
} from "@/types";

// Универсальное состояние для каждого блока страницы.
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

// Форма создания задачи.
type TaskFormState = {
  taskType: AdminTaskType;
  taskText: string;
  templateCode: string;
  testCases: string;
  options: string;
  correctOptionIndex: string;
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

// Начальные значения формы задачи.
const initialTaskForm: TaskFormState = {
  taskType: "CODE",
  taskText: "",
  templateCode: "",
  testCases: "",
  options: "",
  correctOptionIndex: "",
  correctNumericAnswer: ""
};

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

// options в TaskDTO — List<String>, поэтому из textarea делаем массив строк или null.
function parseOptions(value: string): string[] | null {
  const options = value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return options.length > 0 ? options : null;
}

// Числовое поле задачи может быть пустым.
function parseOptionalInteger(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (!Number.isFinite(parsed)) {
    throw new Error("correctOptionIndex must be a valid integer.");
  }

  return parsed;
}

// Числовой ответ может быть пустым.
function parseOptionalDecimal(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error("correctNumericAnswer must be a valid number.");
  }

  return parsed;
}

// Главная страница внутренней панели контента.
export default function AdminContentPage() {
  // Списки сущностей, которые приходят из backend.
  const [courses, setCourses] = useState<AdminCourseDto[]>([]);
  const [modules, setModules] = useState<AdminModuleDto[]>([]);
  const [lessons, setLessons] = useState<AdminLessonDto[]>([]);
  const [tasks, setTasks] = useState<AdminTaskDto[]>([]);

  // ID выбранных сущностей задают текущий путь Course -> Module -> Lesson.
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);

  // Последняя созданная задача нужна для главного результата карточки.
  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  // Формы создания сущностей.
  const [courseForm, setCourseForm] = useState<CourseFormState>(initialCourseForm);
  const [moduleForm, setModuleForm] = useState<SimpleNestedFormState>(initialSimpleForm);
  const [lessonForm, setLessonForm] = useState<SimpleNestedFormState>(initialSimpleForm);
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm);

  // Отдельный status на каждый блок, чтобы ошибки не перетирали друг друга.
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
    setCreatedTaskId(null);

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
    setCreatedTaskId(null);

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
    setCreatedTaskId(null);

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
      setLessonState({
        loading: false,
        error: "",
        success: `Lesson created. ID: ${created.id}`
      });
    } catch (error) {
      setLessonState({ loading: false, error: getErrorMessage(error), success: "" });
    }
  }

  // Создание задачи требует выбранный урок и показывает главный taskId.
  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (selectedLessonId === null) {
        throw new Error("Select Lesson before creating Task.");
      }

      if (!taskForm.taskText.trim()) {
        throw new Error("Task text is required.");
      }

      setTaskState({ loading: true, error: "", success: "" });
      setCreatedTaskId(null);
      setCopyStatus("");

      const created = await createAdminTask(selectedLessonId, {
        taskType: taskForm.taskType,
        taskText: taskForm.taskText.trim(),
        templateCode: optionalText(taskForm.templateCode),
        testCases: optionalText(taskForm.testCases),
        options: parseOptions(taskForm.options),
        correctOptionIndex: parseOptionalInteger(taskForm.correctOptionIndex),
        correctNumericAnswer: parseOptionalDecimal(taskForm.correctNumericAnswer)
      });

      const nextTasks = await getAdminTasks(selectedLessonId);

      setTasks(nextTasks);
      setCreatedTaskId(created.id);
      setTaskForm(initialTaskForm);
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
    setCreatedTaskId(null);
    setCopyStatus("");
  }

  // Выбор модуля сбрасывает уроки/задачи.
  function handleSelectModule(moduleId: number) {
    setSelectedModuleId(moduleId);
    setSelectedLessonId(null);
    setCreatedTaskId(null);
    setCopyStatus("");
  }

  // Выбор урока сбрасывает последний созданный taskId.
  function handleSelectLesson(lessonId: number) {
    setSelectedLessonId(lessonId);
    setCreatedTaskId(null);
    setCopyStatus("");
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
          <p className="mt-4 max-w-3xl text-sm leading-snug text-white/54">
            Техническая панель для быстрого создания цепочки Course - Module - Lesson - Task
            и получения taskId для POST /api/v1/tasks/{"{taskId}"}/submissions.
          </p>
        </header>

        <section className="grid gap-px bg-line lg:grid-cols-2">
          <EntityPanel title="Course" subtitle="GET/POST /api/courses" state={courseState}>
            <SelectedBox
              id={selectedCourse?.id ?? null}
              label="Selected Course"
              title={selectedCourse?.name ?? "No course selected"}
            />

            <EntityList
              emptyText="No courses yet. Create the first course."
              items={courses.map((course) => ({
                id: course.id,
                meta: `courseId: ${course.id} / ${course.priceInStars ?? 0} stars`,
                title: course.name
              }))}
              loading={courseState.loading && courses.length === 0}
              selectedId={selectedCourseId}
              onSelect={handleSelectCourse}
            />

            <form className="grid gap-3" onSubmit={handleCreateCourse}>
              <TextInput
                label="name"
                value={courseForm.name}
                onChange={(value) => setCourseForm((current) => ({ ...current, name: value }))}
              />
              <TextArea
                label="description"
                rows={3}
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
          </EntityPanel>

          <EntityPanel
            title="Module"
            subtitle="GET/POST /api/courses/{courseId}/modules"
            state={moduleState}
          >
            <SelectedBox
              id={selectedModule?.id ?? null}
              label="Selected Module"
              title={selectedModule?.name ?? "No module selected"}
            />

            {!selectedCourse ? (
              <BlockedMessage text="Select Course before creating Module." />
            ) : (
              <>
                <EntityList
                  emptyText="No modules for selected course."
                  items={modules.map((moduleItem) => ({
                    id: moduleItem.id,
                    meta: `moduleId: ${moduleItem.id} / courseId: ${moduleItem.courseId}`,
                    title: moduleItem.name
                  }))}
                  loading={moduleState.loading && modules.length === 0}
                  selectedId={selectedModuleId}
                  onSelect={handleSelectModule}
                />

                <form className="grid gap-3" onSubmit={handleCreateModule}>
                  <TextInput
                    label="name"
                    value={moduleForm.name}
                    onChange={(value) =>
                      setModuleForm((current) => ({ ...current, name: value }))
                    }
                  />
                  <TextArea
                    label="description"
                    rows={3}
                    value={moduleForm.description}
                    onChange={(value) =>
                      setModuleForm((current) => ({ ...current, description: value }))
                    }
                  />
                  <SubmitButton disabled={moduleState.loading} label="Create Module" />
                </form>
              </>
            )}
          </EntityPanel>

          <EntityPanel
            title="Lesson"
            subtitle="GET/POST /api/modules/{moduleId}/lessons"
            state={lessonState}
          >
            <SelectedBox
              id={selectedLesson?.id ?? null}
              label="Selected Lesson"
              title={selectedLesson?.name ?? "No lesson selected"}
            />

            {!selectedModule ? (
              <BlockedMessage text="Select Module before creating Lesson." />
            ) : (
              <>
                <EntityList
                  emptyText="No lessons for selected module."
                  items={lessons.map((lesson) => ({
                    id: lesson.id,
                    meta: `lessonId: ${lesson.id} / moduleId: ${lesson.moduleId}`,
                    title: lesson.name
                  }))}
                  loading={lessonState.loading && lessons.length === 0}
                  selectedId={selectedLessonId}
                  onSelect={handleSelectLesson}
                />

                <form className="grid gap-3" onSubmit={handleCreateLesson}>
                  <TextInput
                    label="name"
                    value={lessonForm.name}
                    onChange={(value) =>
                      setLessonForm((current) => ({ ...current, name: value }))
                    }
                  />
                  <TextArea
                    label="description"
                    rows={3}
                    value={lessonForm.description}
                    onChange={(value) =>
                      setLessonForm((current) => ({ ...current, description: value }))
                    }
                  />
                  <SubmitButton disabled={lessonState.loading} label="Create Lesson" />
                </form>
              </>
            )}
          </EntityPanel>

          <EntityPanel
            title="Task"
            subtitle="GET/POST /api/lessons/{lessonId}/tasks"
            state={taskState}
          >
            {createdTaskId !== null && (
              <div className="border border-acid bg-acid p-4 text-ink">
                <p className="text-sm font-black uppercase">Task created. ID: {createdTaskId}</p>
                <p className="mt-2 text-xs font-bold uppercase">
                  Use for POST /api/v1/tasks/{createdTaskId}/submissions
                </p>
                <button
                  className="mt-4 border border-ink px-3 py-2 text-xs font-black uppercase transition hover:bg-ink hover:text-acid"
                  onClick={() => handleCopyTaskId(createdTaskId)}
                  type="button"
                >
                  Copy taskId
                </button>
                {copyStatus && <p className="mt-2 text-xs font-bold">{copyStatus}</p>}
              </div>
            )}

            {!selectedLesson ? (
              <BlockedMessage text="Select Lesson before creating Task." />
            ) : (
              <>
                <EntityList
                  emptyText="No tasks for selected lesson."
                  items={tasks.map((task) => ({
                    id: task.id,
                    meta: `taskId: ${task.id} / type: ${task.taskType}`,
                    title: task.taskText
                  }))}
                  loading={taskState.loading && tasks.length === 0}
                  selectedId={createdTaskId}
                  onSelect={(taskId) => setCreatedTaskId(taskId)}
                />

                <form className="grid gap-3" onSubmit={handleCreateTask}>
                  <label className="grid gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase text-white/48">
                      taskType
                    </span>
                    <select
                      className="min-h-12 border border-line bg-ink px-3 text-sm font-bold text-white outline-none focus:border-acid"
                      value={taskForm.taskType}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          taskType: event.target.value as AdminTaskType
                        }))
                      }
                    >
                      <option value="CODE">CODE</option>
                    </select>
                  </label>

                  <TextArea
                    label="taskText"
                    rows={5}
                    value={taskForm.taskText}
                    onChange={(value) =>
                      setTaskForm((current) => ({ ...current, taskText: value }))
                    }
                  />
                  <TextArea
                    label="templateCode"
                    rows={6}
                    value={taskForm.templateCode}
                    onChange={(value) =>
                      setTaskForm((current) => ({ ...current, templateCode: value }))
                    }
                  />
                  <TextArea
                    label="testCases"
                    rows={5}
                    value={taskForm.testCases}
                    onChange={(value) =>
                      setTaskForm((current) => ({ ...current, testCases: value }))
                    }
                  />

                  <div className="grid gap-3 border border-line p-3">
                    <p className="font-mono text-[10px] font-bold uppercase text-white/40">
                      Optional fields for TEST/NUMERIC task types
                    </p>
                    <TextArea
                      label="options"
                      rows={3}
                      value={taskForm.options}
                      onChange={(value) =>
                        setTaskForm((current) => ({ ...current, options: value }))
                      }
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextInput
                        inputMode="numeric"
                        label="correctOptionIndex"
                        value={taskForm.correctOptionIndex}
                        onChange={(value) =>
                          setTaskForm((current) => ({
                            ...current,
                            correctOptionIndex: value
                          }))
                        }
                      />
                      <TextInput
                        inputMode="decimal"
                        label="correctNumericAnswer"
                        value={taskForm.correctNumericAnswer}
                        onChange={(value) =>
                          setTaskForm((current) => ({
                            ...current,
                            correctNumericAnswer: value
                          }))
                        }
                      />
                    </div>
                  </div>

                  <SubmitButton disabled={taskState.loading} label="Create Task" />
                </form>
              </>
            )}
          </EntityPanel>
        </section>
      </section>
    </main>
  );
}

// Обертка одного технического блока.
function EntityPanel({
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
    <section className="grid content-start gap-5 bg-ink p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
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

// Компактный блок выбранной сущности.
function SelectedBox({ id, label, title }: { id: number | null; label: string; title: string }) {
  return (
    <div className="border border-line bg-panel/80 p-4">
      <p className="font-mono text-[10px] font-bold uppercase text-white/40">{label}</p>
      <p className="mt-2 text-lg font-black uppercase leading-tight text-white">{title}</p>
      <p className="mt-3 font-mono text-xs font-bold uppercase text-acid">
        {id === null ? "id: none" : `id: ${id}`}
      </p>
    </div>
  );
}

// Сообщение о заблокированной вложенной форме.
function BlockedMessage({ text }: { text: string }) {
  return (
    <div className="border border-line bg-panel/50 p-4 text-sm font-bold uppercase text-white/46">
      {text}
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

// Тип одного пункта списка сущностей.
type EntityListItem = {
  id: number;
  title: string;
  meta: string;
};

// Список курсов/модулей/уроков/задач.
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
      <div className="border border-line bg-panel/50 p-4 font-mono text-xs font-bold uppercase text-white/48">
        Loading list...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border border-line bg-panel/50 p-4 font-mono text-xs font-bold uppercase text-white/48">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid max-h-72 gap-px overflow-y-auto border border-line bg-line">
      {items.map((item) => {
        const isSelected = item.id === selectedId;

        return (
          <button
            className={`grid gap-2 p-3 text-left transition ${
              isSelected ? "bg-acid text-ink" : "bg-panel text-white hover:bg-white/8"
            }`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <span className="line-clamp-2 text-sm font-black uppercase leading-tight">
              {item.title}
            </span>
            <span className="font-mono text-[10px] font-bold uppercase opacity-60">
              {item.meta}
            </span>
          </button>
        );
      })}
    </div>
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
      <span className="font-mono text-[10px] font-bold uppercase text-white/48">{label}</span>
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
  label,
  onChange,
  rows,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[10px] font-bold uppercase text-white/48">{label}</span>
      <textarea
        className="resize-y border border-line bg-ink px-3 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/22 focus:border-acid"
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
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
