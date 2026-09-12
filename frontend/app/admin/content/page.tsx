"use client";

import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { AdminGuard } from "@/components/AdminGuard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  createAdminCourse,
  createAdminLesson,
  createAdminModule,
  createAdminTask,
  getAdminCourses,
  getAdminLessons,
  getAdminModules,
  getAdminTasks,
  updateAdminCourse,
  updateAdminLesson,
  updateAdminModule,
  updateAdminTask
} from "@/services/api";

import { Alert, Button, Panel, PanelBody, PanelHeader, StatusBadge } from "@/components/ui";

import type {
  AdminCourseCreatePayload,
  AdminCourseDto,
  AdminLessonCreatePayload,
  AdminLessonDto,
  AdminModuleCreatePayload,
  AdminModuleDto,
  AdminTaskCreatePayload,
  AdminTaskDto,
  AdminTaskType,
  SubmissionLanguage
} from "@/types";

type AdminStep = "course" | "module" | "lesson" | "task";

type PanelState = {
  loading: boolean;
  error: string;
  success: string;
};

type CourseFormState = {
  name: string;
  description: string;
  price: string;
  priceInStars: string;
};

type ModuleFormState = {
  name: string;
  description: string;
  position: string;
};

type LessonFormState = {
  name: string;
  description: string;
  position: string;
  contentMd: string;
  published: boolean;
};

type TaskFormState = {
  taskType: AdminTaskType;
  language: SubmissionLanguage;
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

type AdminWorkspaceSnapshot = {
  version: 1;
  activeStep: AdminStep;
  selectedCourseId: number | null;
  selectedModuleId: number | null;
  selectedLessonId: number | null;
  selectedTaskId: number | null;
  createdTaskId: number | null;
  taskForm: TaskFormState;
  savedAt: string;
};

const ADMIN_WORKSPACE_STORAGE_KEY = "qlc:admin-content-workspace:v1";

const idlePanelState: PanelState = {
  loading: false,
  error: "",
  success: ""
};

const initialCourseForm: CourseFormState = {
  name: "",
  description: "",
  price: "",
  priceInStars: ""
};

const initialModuleForm: ModuleFormState = {
  name: "",
  description: "",
  position: "0"
};

const initialLessonForm: LessonFormState = {
  name: "",
  description: "",
  position: "0",
  contentMd: "",
  published: false
};

const initialTaskForm: TaskFormState = {
  taskType: "CODE",
  language: "CPP23",
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

const adminSteps: Array<{
  id: AdminStep;
  label: string;
  subtitle: string;
  blockedBy?: AdminStep;
}> = [
    {
      id: "course",
      label: "01 / Курс",
      subtitle: "Название и стоимость"
    },
    {
      id: "module",
      label: "02 / Модуль",
      subtitle: "Структура программы",
      blockedBy: "course"
    },
    {
      id: "lesson",
      label: "03 / Урок",
      subtitle: "Материалы и публикация",
      blockedBy: "module"
    },
    {
      id: "task",
      label: "04 / Задача",
      subtitle: "Практика и проверка",
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

// DTO position принимает целое число от нуля: ноль означает первую/default позицию.
function parseNonNegativeInteger(value: string, label: string): number {
  const parsed = Number(value.trim());

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
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

// Type guard защищает восстановление от поврежденного JSON в localStorage.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Возвращает строку из неизвестного JSON или fallback.
function storedString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

// ID из storage должен быть положительным безопасным integer или null.
function storedId(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

// Восстанавливает Task draft по полям, не доверяя форме сохраненного JSON.
function restoreTaskForm(value: unknown): TaskFormState {
  if (!isRecord(value)) {
    return initialTaskForm;
  }

  const taskType: AdminTaskType =
    value.taskType === "TEST" || value.taskType === "NUMERIC" || value.taskType === "CODE"
      ? value.taskType
      : initialTaskForm.taskType;
  const language: SubmissionLanguage = value.language === "JAVA21" ? "JAVA21" : "CPP23";
  const correctOptionIndexes = Array.isArray(value.correctOptionIndexes)
    ? value.correctOptionIndexes.filter(
        (index): index is number => Number.isSafeInteger(index) && Number(index) >= 0
      )
    : initialTaskForm.correctOptionIndexes;

  return {
    taskType,
    language,
    statementMd: storedString(value.statementMd, initialTaskForm.statementMd),
    starterCode: storedString(value.starterCode, initialTaskForm.starterCode),
    templateCode: storedString(value.templateCode, initialTaskForm.templateCode),
    testCases: storedString(value.testCases, initialTaskForm.testCases),
    timeLimitMs: storedString(value.timeLimitMs, initialTaskForm.timeLimitMs),
    memoryLimitKb: storedString(value.memoryLimitKb, initialTaskForm.memoryLimitKb),
    outputLimitKb: storedString(value.outputLimitKb, initialTaskForm.outputLimitKb),
    testSetVersion: storedString(value.testSetVersion, initialTaskForm.testSetVersion),
    optionsText: storedString(value.optionsText, initialTaskForm.optionsText),
    correctOptionIndexes,
    correctNumericAnswer: storedString(
      value.correctNumericAnswer,
      initialTaskForm.correctNumericAnswer
    )
  };
}

// Читает последний шаг и Task draft. Любая ошибка дает чистое рабочее место.
function readAdminWorkspace(): AdminWorkspaceSnapshot | null {
  try {
    const raw = window.localStorage.getItem(ADMIN_WORKSPACE_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed) || parsed.version !== 1) {
      return null;
    }

    const activeStep: AdminStep =
      parsed.activeStep === "module" ||
      parsed.activeStep === "lesson" ||
      parsed.activeStep === "task" ||
      parsed.activeStep === "course"
        ? parsed.activeStep
        : "course";

    return {
      version: 1,
      activeStep,
      selectedCourseId: storedId(parsed.selectedCourseId),
      selectedModuleId: storedId(parsed.selectedModuleId),
      selectedLessonId: storedId(parsed.selectedLessonId),
      selectedTaskId: storedId(parsed.selectedTaskId),
      createdTaskId: storedId(parsed.createdTaskId),
      taskForm: restoreTaskForm(parsed.taskForm),
      savedAt: storedString(parsed.savedAt, "")
    };
  } catch {
    return null;
  }
}

// Преобразует Course form в payload для POST и PUT.
function buildCoursePayload(form: CourseFormState): AdminCourseCreatePayload {
  if (!form.name.trim()) {
    throw new Error("Course name is required.");
  }

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: parseOptionalNumber(form.price),
    priceInStars: parseOptionalNumber(form.priceInStars)
  };
}

// Преобразует Module form в полный DTO payload.
function buildModulePayload(form: ModuleFormState): AdminModuleCreatePayload {
  if (!form.name.trim()) {
    throw new Error("Module name is required.");
  }

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    position: parseNonNegativeInteger(form.position, "position")
  };
}

// Преобразует Lesson form в полный DTO payload.
function buildLessonPayload(form: LessonFormState): AdminLessonCreatePayload {
  if (!form.name.trim()) {
    throw new Error("Lesson name is required.");
  }

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    position: parseNonNegativeInteger(form.position, "position"),
    contentMd: optionalText(form.contentMd),
    published: form.published
  };
}

// Собирает Task payload и валидирует поля конкретного discriminator-типа.
function buildTaskPayload(form: TaskFormState): AdminTaskCreatePayload {
  if (!form.statementMd.trim()) {
    throw new Error("Task statementMd is required.");
  }

  const payload: AdminTaskCreatePayload = {
    taskType: form.taskType,
    language: form.taskType === "CODE" ? form.language : null,
    statementMd: form.statementMd.trim(),
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

  if (form.taskType === "CODE") {
    payload.starterCode = optionalText(form.starterCode);
    payload.templateCode = optionalText(form.templateCode);
    payload.testCases = optionalText(form.testCases);
    payload.timeLimitMs = parseOptionalPositiveInteger(form.timeLimitMs, "timeLimitMs");
    payload.memoryLimitKb = parseOptionalPositiveInteger(form.memoryLimitKb, "memoryLimitKb");
    payload.outputLimitKb = parseOptionalPositiveInteger(form.outputLimitKb, "outputLimitKb");
    payload.testSetVersion = parseOptionalPositiveInteger(form.testSetVersion, "testSetVersion");
  }

  if (form.taskType === "TEST") {
    const options = parseTestOptions(form.optionsText);

    if (options.length < 2) {
      throw new Error("TEST task requires at least two non-empty options.");
    }

    if (form.correctOptionIndexes.length === 0) {
      throw new Error("Select at least one correct TEST option.");
    }

    if (
      form.correctOptionIndexes.some(
        (index) => !Number.isSafeInteger(index) || index < 0 || index >= options.length
      )
    ) {
      throw new Error(`Every correct option index must be between 0 and ${options.length - 1}.`);
    }

    payload.options = options;
    payload.correctOptionIndexes = [...form.correctOptionIndexes].sort((a, b) => a - b);
  }

  if (form.taskType === "NUMERIC") {
    const rawAnswer = form.correctNumericAnswer.trim();
    const correctNumericAnswer = Number(rawAnswer);

    if (!rawAnswer || !Number.isFinite(correctNumericAnswer)) {
      throw new Error("correctNumericAnswer must be a valid number.");
    }

    payload.correctNumericAnswer = correctNumericAnswer;
  }

  return payload;
}

// Заполняет формы данными выбранной сущности для последующего PUT.
function courseDtoToForm(course: AdminCourseDto): CourseFormState {
  return {
    name: course.name,
    description: course.description,
    price: course.price === null ? "" : String(course.price),
    priceInStars: course.priceInStars === null ? "" : String(course.priceInStars)
  };
}

function moduleDtoToForm(moduleItem: AdminModuleDto): ModuleFormState {
  return {
    name: moduleItem.name,
    description: moduleItem.description,
    position: String(moduleItem.position)
  };
}

function lessonDtoToForm(lesson: AdminLessonDto): LessonFormState {
  return {
    name: lesson.name,
    description: lesson.description,
    position: String(lesson.position),
    contentMd: lesson.contentMd ?? "",
    published: lesson.published
  };
}

function taskDtoToForm(task: AdminTaskDto): TaskFormState {
  return {
    taskType: task.taskType,
    language: task.language ?? "CPP23",
    statementMd: task.statementMd,
    starterCode: task.starterCode ?? "",
    templateCode: task.templateCode ?? "",
    testCases: task.testCases ?? "",
    timeLimitMs: task.timeLimitMs === null ? "" : String(task.timeLimitMs),
    memoryLimitKb: task.memoryLimitKb === null ? "" : String(task.memoryLimitKb),
    outputLimitKb: task.outputLimitKb === null ? "" : String(task.outputLimitKb),
    testSetVersion: task.testSetVersion === null ? "" : String(task.testSetVersion),
    optionsText: (task.options ?? []).join("\n"),
    correctOptionIndexes: [...(task.correctOptionIndexes ?? [])],
    correctNumericAnswer:
      task.correctNumericAnswer === null ? "" : String(task.correctNumericAnswer)
  };
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
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(initialModuleForm);
  const [lessonForm, setLessonForm] = useState<LessonFormState>(initialLessonForm);
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm);

  // Пока restore не завершен, autosave не должен затереть сохраненный путь пустыми ID.
  const [workspaceStorageReady, setWorkspaceStorageReady] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const pendingRestoreRef = useRef<AdminWorkspaceSnapshot | null>(null);

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

  // На первом client mount читаем последний шаг и Task draft.
  useEffect(() => {
    const snapshot = readAdminWorkspace();

    if (!snapshot) {
      setWorkspaceStorageReady(true);
      return;
    }

    pendingRestoreRef.current = snapshot;
    setActiveStep(snapshot.activeStep);
    setTaskForm(snapshot.taskForm);
    setLastSavedAt(snapshot.savedAt);
    setSelectedCourseId(snapshot.selectedCourseId);

    // Без Course каскадно восстанавливать больше нечего.
    if (snapshot.selectedCourseId === null) {
      pendingRestoreRef.current = null;
      setWorkspaceStorageReady(true);
    }
  }, []);

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

          const pending = pendingRestoreRef.current;

          // Если сохраненный Course удалили, сбрасываем невалидный путь до первого шага.
          if (
            pending?.selectedCourseId !== null &&
            pending?.selectedCourseId !== undefined &&
            !nextCourses.some((course) => course.id === pending.selectedCourseId)
          ) {
            pendingRestoreRef.current = null;
            setSelectedCourseId(null);
            setActiveStep("course");
            setWorkspaceStorageReady(true);
          }
        }
      } catch (error) {
        if (!ignore) {
          setCourseState({ loading: false, error: getErrorMessage(error), success: "" });
          pendingRestoreRef.current = null;
          setWorkspaceStorageReady(true);
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

          const pending = pendingRestoreRef.current;
          const restoredModuleId =
            pending?.selectedCourseId === courseId &&
            pending.selectedModuleId !== null &&
            nextModules.some((moduleItem) => moduleItem.id === pending.selectedModuleId)
              ? pending.selectedModuleId
              : null;

          if (restoredModuleId !== null) {
            setSelectedModuleId(restoredModuleId);
          } else if (pending?.selectedCourseId === courseId) {
            // Course существует, но сохраненного Module уже нет: продолжаем с Module step.
            pendingRestoreRef.current = null;
            setActiveStep(
              pending.activeStep === "course" ? pending.activeStep : "module"
            );
            setWorkspaceStorageReady(true);
          }
        }
      } catch (error) {
        if (!ignore) {
          setModuleState({ loading: false, error: getErrorMessage(error), success: "" });

          if (pendingRestoreRef.current?.selectedCourseId === courseId) {
            const pending = pendingRestoreRef.current;
            pendingRestoreRef.current = null;
            setActiveStep(pending.activeStep);
            setWorkspaceStorageReady(true);
          }
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

          const pending = pendingRestoreRef.current;
          const restoredLessonId =
            pending?.selectedModuleId === moduleId &&
            pending.selectedLessonId !== null &&
            nextLessons.some((lesson) => lesson.id === pending.selectedLessonId)
              ? pending.selectedLessonId
              : null;

          if (restoredLessonId !== null) {
            setSelectedLessonId(restoredLessonId);
          } else if (pending?.selectedModuleId === moduleId) {
            // Module существует, но Lesson удален или не был выбран.
            pendingRestoreRef.current = null;
            setActiveStep(
              pending.activeStep === "course" || pending.activeStep === "module"
                ? pending.activeStep
                : "lesson"
            );
            setWorkspaceStorageReady(true);
          }
        }
      } catch (error) {
        if (!ignore) {
          setLessonState({ loading: false, error: getErrorMessage(error), success: "" });

          if (pendingRestoreRef.current?.selectedModuleId === moduleId) {
            const pending = pendingRestoreRef.current;
            pendingRestoreRef.current = null;
            setActiveStep(pending.activeStep);
            setWorkspaceStorageReady(true);
          }
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

          const pending = pendingRestoreRef.current;

          if (pending?.selectedLessonId === lessonId) {
            const restoredTaskId =
              pending.selectedTaskId !== null &&
              nextTasks.some((task) => task.id === pending.selectedTaskId)
                ? pending.selectedTaskId
                : null;
            const restoredCreatedTaskId =
              pending.createdTaskId !== null &&
              nextTasks.some((task) => task.id === pending.createdTaskId)
                ? pending.createdTaskId
                : null;

            setSelectedTaskId(restoredTaskId);
            setCreatedTaskId(restoredCreatedTaskId);
            pendingRestoreRef.current = null;
            setWorkspaceStorageReady(true);
          }
        }
      } catch (error) {
        if (!ignore) {
          setTaskState({ loading: false, error: getErrorMessage(error), success: "" });

          if (pendingRestoreRef.current?.selectedLessonId === lessonId) {
            const pending = pendingRestoreRef.current;
            pendingRestoreRef.current = null;
            setActiveStep(pending.activeStep);
            setWorkspaceStorageReady(true);
          }
        }
      }
    }

    loadTasks(selectedLessonId);

    return () => {
      ignore = true;
    };
  }, [selectedLessonId]);

  // Сохраняет последний шаг, выбранный путь и каждое изменение Task draft.
  useEffect(() => {
    if (!workspaceStorageReady) {
      return;
    }

    const savedAt = new Date().toISOString();
    const snapshot: AdminWorkspaceSnapshot = {
      version: 1,
      activeStep,
      selectedCourseId,
      selectedModuleId,
      selectedLessonId,
      selectedTaskId,
      createdTaskId,
      taskForm,
      savedAt
    };

    try {
      window.localStorage.setItem(ADMIN_WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
      setLastSavedAt(savedAt);
    } catch {
      // Админка продолжает работать, даже если storage запрещен политикой браузера.
    }
  }, [
    activeStep,
    createdTaskId,
    selectedCourseId,
    selectedLessonId,
    selectedModuleId,
    selectedTaskId,
    taskForm,
    workspaceStorageReady
  ]);

  // Создание курса и обновление списка без перезагрузки страницы.
  async function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCourseState({ loading: true, error: "", success: "" });
      const created = await createAdminCourse(buildCoursePayload(courseForm));

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

      setModuleState({ loading: true, error: "", success: "" });
      const created = await createAdminModule(
        selectedCourseId,
        buildModulePayload(moduleForm)
      );

      const nextModules = await getAdminModules(selectedCourseId);

      setModules(nextModules);
      setSelectedModuleId(created.id);
      setModuleForm(initialModuleForm);
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

      setLessonState({ loading: true, error: "", success: "" });
      const created = await createAdminLesson(
        selectedModuleId,
        buildLessonPayload(lessonForm)
      );

      const nextLessons = await getAdminLessons(selectedModuleId);

      setLessons(nextLessons);
      setSelectedLessonId(created.id);
      setLessonForm(initialLessonForm);
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

      setTaskState({ loading: true, error: "", success: "" });
      setCreatedTaskId(null);
      setCopyStatus("");
      const created = await createAdminTask(selectedLessonId, buildTaskPayload(taskForm));

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

  // PUT обновляет выбранный Course, не создавая дубликат записи.
  async function handleUpdateCourse() {
    try {
      if (selectedCourseId === null) {
        throw new Error("Select Course before updating it.");
      }

      setCourseState({ loading: true, error: "", success: "" });
      const updated = await updateAdminCourse(
        selectedCourseId,
        buildCoursePayload(courseForm)
      );
      const nextCourses = await getAdminCourses();

      setCourses(nextCourses);
      setCourseForm(courseDtoToForm(updated));
      setCourseState({ loading: false, error: "", success: `Course updated. ID: ${updated.id}` });
    } catch (error) {
      setCourseState({ loading: false, error: getErrorMessage(error), success: "" });
    }
  }

  // PUT обновляет выбранный Module всеми полями frontend DTO.
  async function handleUpdateModule() {
    try {
      if (selectedCourseId === null || selectedModuleId === null) {
        throw new Error("Select Module before updating it.");
      }

      setModuleState({ loading: true, error: "", success: "" });
      const updated = await updateAdminModule(
        selectedModuleId,
        buildModulePayload(moduleForm)
      );
      const nextModules = await getAdminModules(selectedCourseId);

      setModules(nextModules);
      setModuleForm(moduleDtoToForm(updated));
      setModuleState({ loading: false, error: "", success: `Module updated. ID: ${updated.id}` });
    } catch (error) {
      setModuleState({ loading: false, error: getErrorMessage(error), success: "" });
    }
  }

  // PUT обновляет выбранный Lesson всеми полями frontend DTO.
  async function handleUpdateLesson() {
    try {
      if (selectedModuleId === null || selectedLessonId === null) {
        throw new Error("Select Lesson before updating it.");
      }

      setLessonState({ loading: true, error: "", success: "" });
      const updated = await updateAdminLesson(
        selectedLessonId,
        buildLessonPayload(lessonForm)
      );
      const nextLessons = await getAdminLessons(selectedModuleId);

      setLessons(nextLessons);
      setLessonForm(lessonDtoToForm(updated));
      setLessonState({ loading: false, error: "", success: `Lesson updated. ID: ${updated.id}` });
    } catch (error) {
      setLessonState({ loading: false, error: getErrorMessage(error), success: "" });
    }
  }

  // PUT обновляет Task и оставляет форму заполненной последней серверной версией.
  async function handleUpdateTask() {
    try {
      if (selectedLessonId === null || selectedTaskId === null) {
        throw new Error("Select Task before updating it.");
      }

      setTaskState({ loading: true, error: "", success: "" });
      setCreatedTaskId(null);
      setCopyStatus("");
      const updated = await updateAdminTask(selectedTaskId, buildTaskPayload(taskForm));
      const nextTasks = await getAdminTasks(selectedLessonId);

      setTasks(nextTasks);
      setTaskForm(taskDtoToForm(updated));
      setTaskState({ loading: false, error: "", success: `Task updated. ID: ${updated.id}` });
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
    const course = courses.find((item) => item.id === courseId);

    setSelectedCourseId(courseId);
    setSelectedModuleId(null);
    setSelectedLessonId(null);
    setSelectedTaskId(null);
    setCreatedTaskId(null);
    setCopyStatus("");
    setActiveStep("module");

    if (course) {
      setCourseForm(courseDtoToForm(course));
    }
  }

  // Выбор модуля сбрасывает уроки/задачи.
  function handleSelectModule(moduleId: number) {
    const moduleItem = modules.find((item) => item.id === moduleId);

    setSelectedModuleId(moduleId);
    setSelectedLessonId(null);
    setSelectedTaskId(null);
    setCreatedTaskId(null);
    setCopyStatus("");
    setActiveStep("lesson");

    if (moduleItem) {
      setModuleForm(moduleDtoToForm(moduleItem));
    }
  }

  // Выбор урока сбрасывает выбранную задачу.
  function handleSelectLesson(lessonId: number) {
    const lesson = lessons.find((item) => item.id === lessonId);

    setSelectedLessonId(lessonId);
    setSelectedTaskId(null);
    setCreatedTaskId(null);
    setCopyStatus("");
    setActiveStep("task");

    if (lesson) {
      setLessonForm(lessonDtoToForm(lesson));
    }
  }

  // Выбор задачи нужен для selected path и копирования уже существующего taskId.
  function handleSelectTask(taskId: number) {
    const task = tasks.find((item) => item.id === taskId);

    setSelectedTaskId(taskId);
    setCreatedTaskId(null);
    setCopyStatus("");

    if (task) {
      setTaskForm(taskDtoToForm(task));
    }
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

  const activeStepIndex = adminSteps.findIndex((step) => step.id === activeStep);
  const previousStep = activeStepIndex > 0 ? adminSteps[activeStepIndex - 1] : null;
  const nextStep = activeStepIndex < adminSteps.length - 1 ? adminSteps[activeStepIndex + 1] : null;

  return (
    <AdminGuard>
      <main className="kit-shell kit-admin">
      <SiteHeader compact />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
        <section className="relative mt-4 flex-1 border border-line bg-ink" id="main-content" tabIndex={-1}>
          <header className="grid gap-5 border-b border-line bg-surface p-5 text-paper sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-7">
            <div>
              <p className="qlc-eyebrow text-muted">QLC / Управление контентом</p>
              <h1 className="mt-4 font-display text-4xl font-medium leading-none tracking-[-0.02em] sm:text-5xl">Редактор обучения<span className="text-[#B3ACFF]">.</span></h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">Курс → модуль → урок → задача. Выберите материал слева, затем измените поля в форме.</p>
            </div>
            <div className="grid justify-items-start gap-4 sm:justify-items-end">
              <Link className="inline-flex min-h-10 items-center border-b border-line/30 text-xs font-semibold transition hover:border-paper" href="/">На сайт ↗</Link>
              <span className="border border-line/20 bg-surface-raised px-3 py-2 font-mono text-[10px] text-muted" role="status">
                {!workspaceStorageReady ? "Восстанавливаем черновик…" : lastSavedAt ? `Черновик сохранён · ${new Date(lastSavedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : "Черновик готов"}
              </span>
            </div>
          </header>

          <SelectedPath
            course={selectedCourse}
            moduleItem={selectedModule}
            lesson={selectedLesson}
            task={selectedTask}
            createdTaskId={createdTaskId}
          />

          <nav aria-label="Этапы редактирования" className="grid grid-cols-2 border-b border-line bg-panel sm:grid-cols-4">
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

        <section className="p-4 sm:p-6">
          {activeStep === "course" && (
            <WorkspacePanel
              state={courseState}
              subtitle="01 / Курс"
              title="Выберите или создайте курс"
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="grid content-start gap-4">
                  <SearchInput
                    label="Поиск по курсам"
                    value={courseSearch}
                    onChange={setCourseSearch}
                  />
                  <EntityList
                    emptyText={
                      courseSearch
                        ? "По вашему запросу ничего не найдено."
                        : "Курсов пока нет. Создайте первый курс."
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

                <form className="grid content-start gap-4 border border-white/20 bg-panel p-4 sm:p-5" onSubmit={handleCreateCourse}>
                  <FormTitle title="Данные курса" idLabel={selectedCourseId} />
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
                  <FormActions
                    busy={courseState.loading}
                    createLabel="Создать новый курс"
                    onUpdate={handleUpdateCourse}
                    updateDisabled={selectedCourseId === null}
                    updateLabel="Сохранить выбранный курс"
                  />
                </form>
              </div>
            </WorkspacePanel>
          )}

          {activeStep === "module" && (
            <WorkspacePanel state={moduleState} subtitle="02 / Модуль" title="Модули курса">
              {!selectedCourse ? (
                <BlockedMessage text="Сначала выберите курс" />
              ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
                  <div className="grid content-start gap-4">
                    <ContextNote
                      label="Курс"
                      title={selectedCourse.name}
                      id={selectedCourse.id}
                    />
                    <SearchInput
                      label="Поиск по модулям"
                      value={moduleSearch}
                      onChange={setModuleSearch}
                    />
                    <EntityList
                      emptyText={
                        moduleSearch
                          ? "По вашему запросу ничего не найдено."
                          : "В выбранном курсе пока нет модулей."
                      }
                      items={filteredModules.map((moduleItem) => ({
                        id: moduleItem.id,
                        meta: `moduleId: ${moduleItem.id} / courseId: ${moduleItem.courseId} / position: ${moduleItem.position}`,
                        title: moduleItem.name
                      }))}
                      loading={moduleState.loading && modules.length === 0}
                      selectedId={selectedModuleId}
                      onSelect={handleSelectModule}
                    />
                  </div>

                  <form className="grid content-start gap-4 border border-white/20 bg-panel p-4 sm:p-5" onSubmit={handleCreateModule}>
                    <FormTitle title="Данные модуля" idLabel={selectedModuleId} />
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
                    <TextInput
                      inputMode="numeric"
                      label="position"
                      value={moduleForm.position}
                      onChange={(value) =>
                        setModuleForm((current) => ({ ...current, position: value }))
                      }
                    />
                    <FormActions
                      busy={moduleState.loading}
                      createLabel="Создать новый модуль"
                      onUpdate={handleUpdateModule}
                      updateDisabled={selectedModuleId === null}
                      updateLabel="Сохранить выбранный модуль"
                    />
                  </form>
                </div>
              )}
            </WorkspacePanel>
          )}

          {activeStep === "lesson" && (
            <WorkspacePanel state={lessonState} subtitle="03 / Урок" title="Уроки модуля">
              {!selectedModule ? (
                <BlockedMessage text="Сначала выберите модуль" />
              ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
                  <div className="grid content-start gap-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedCourse && (
                        <ContextNote
                          label="Курс"
                          title={selectedCourse.name}
                          id={selectedCourse.id}
                        />
                      )}
                      <ContextNote
                        label="Модуль"
                        title={selectedModule.name}
                        id={selectedModule.id}
                      />
                    </div>
                    <SearchInput
                      label="Поиск по урокам"
                      value={lessonSearch}
                      onChange={setLessonSearch}
                    />
                    <EntityList
                      emptyText={
                        lessonSearch
                          ? "По вашему запросу ничего не найдено."
                          : "В выбранном модуле пока нет уроков."
                      }
                      items={filteredLessons.map((lesson) => ({
                        id: lesson.id,
                        meta: `lessonId: ${lesson.id} / moduleId: ${lesson.moduleId} / position: ${lesson.position} / ${lesson.published ? "published" : "draft"}`,
                        title: lesson.name
                      }))}
                      loading={lessonState.loading && lessons.length === 0}
                      selectedId={selectedLessonId}
                      onSelect={handleSelectLesson}
                    />
                  </div>

                  <form className="grid content-start gap-4 border border-white/20 bg-panel p-4 sm:p-5" onSubmit={handleCreateLesson}>
                    <FormTitle title="Данные урока" idLabel={selectedLessonId} />
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
                    <TextInput
                      inputMode="numeric"
                      label="position"
                      value={lessonForm.position}
                      onChange={(value) =>
                        setLessonForm((current) => ({ ...current, position: value }))
                      }
                    />
                    <TextArea
                      help="Материал урока в Markdown. Backend может скрывать его, пока published выключен."
                      label="contentMd"
                      rows={8}
                      value={lessonForm.contentMd}
                      onChange={(value) =>
                        setLessonForm((current) => ({ ...current, contentMd: value }))
                      }
                    />
                    <ToggleInput
                      checked={lessonForm.published}
                      label="published"
                      onChange={(published) =>
                        setLessonForm((current) => ({ ...current, published }))
                      }
                    />
                    <FormActions
                      busy={lessonState.loading}
                      createLabel="Создать новый урок"
                      onUpdate={handleUpdateLesson}
                      updateDisabled={selectedLessonId === null}
                      updateLabel="Сохранить выбранный урок"
                    />
                  </form>
                </div>
              )}
            </WorkspacePanel>
          )}

          {activeStep === "task" && (
            <WorkspacePanel state={taskState} subtitle="04 / Задача" title="Задачи урока">
              {!selectedLesson ? (
                <BlockedMessage text="Сначала выберите урок" />
              ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px]">
                  <div className="grid content-start gap-4">
                    <div className="grid gap-3 xl:grid-cols-3">
                      {selectedCourse && (
                        <ContextNote label="Курс" title={selectedCourse.name} id={selectedCourse.id} />
                      )}
                      {selectedModule && (
                        <ContextNote label="Модуль" title={selectedModule.name} id={selectedModule.id} />
                      )}
                      <ContextNote
                        label="Урок"
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
                      label="Поиск по задачам"
                      value={taskSearch}
                      onChange={setTaskSearch}
                    />
                    <EntityList
                      emptyText={
                        taskSearch
                          ? "По вашему запросу ничего не найдено."
                          : "В выбранном уроке пока нет задач."
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

                  <form className="grid content-start gap-4 border border-white/20 bg-panel p-4 sm:p-5" onSubmit={handleCreateTask}>
                    <FormTitle title={`Данные задачи · ${taskForm.taskType}`} idLabel={selectedTaskId} />
                    <TaskTypeSelector
                      value={taskForm.taskType}
                      onChange={(taskType) =>
                        setTaskForm((current) => ({ ...current, taskType }))
                      }
                    />
                    <div className="border border-acid/50 bg-acid/10 p-3">
                      <p className="font-mono text-[10px] font-medium text-acid">
                        statementMd / Markdown
                      </p>
                      <p className="mt-2 text-xs font-medium leading-snug text-white/62">
                        Условие хранится как Markdown. Заголовки, списки и fenced code blocks
                        отобразятся студенту через безопасный renderer.
                      </p>
                    </div>
                    <TextArea
                      help="Обязательное условие задачи в Markdown. Приватные ответы сюда не добавляйте."
                      label="statementMd (Markdown)"
                      rows={8}
                      value={taskForm.statementMd}
                      onChange={(value) =>
                        setTaskForm((current) => ({ ...current, statementMd: value }))
                      }
                    />

                    {taskForm.taskType === "CODE" && (
                      <div className="grid gap-3 border-t border-line pt-3">
                        <label className="grid gap-2">
                          <span className="font-mono text-[11px] text-white/65">language</span>
                          <select
                            className="min-h-12 border border-line bg-panel/70 px-3 text-sm font-bold text-white outline-none transition focus:border-acid focus:bg-ink"
                            onChange={(event) =>
                              setTaskForm((current) => ({ ...current, language: event.target.value as SubmissionLanguage }))
                            }
                            value={taskForm.language}
                          >
                            <option value="CPP23">C++23</option>
                            <option value="JAVA21">Java 21</option>
                          </select>
                        </label>
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
                        <p className="text-xs leading-relaxed text-white/55">
                          Ответ сохраняется в backend, но learner UI его не получает из интерфейса и
                          не отображает.
                        </p>
                      </div>
                    )}

                    {taskForm.taskType === "TEST" && (
                      <div className="grid gap-3 border-t border-line pt-3">
                        <TextArea
                          help="Один вариант на строку. Затем отметьте один или несколько правильных вариантов ниже."
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
                            <p className="font-mono text-[10px] font-medium text-white/48">
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
                                  className="mt-0.5 accent-[#c4ff00]"
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

                    <FormActions
                      busy={taskState.loading}
                      createLabel={`Создать задачу · ${taskForm.taskType}`}
                      onUpdate={handleUpdateTask}
                      updateDisabled={selectedTaskId === null}
                      updateLabel="Сохранить выбранную задачу"
                    />
                  </form>
                </div>
              )}
            </WorkspacePanel>
          )}

          <StepNavigation
            nextDisabled={nextStep !== null && !isStepReady(nextStep.id)}
            nextLabel={nextStep?.label ?? null}
            onNext={() => nextStep && setActiveStep(nextStep.id)}
            onPrevious={() => previousStep && setActiveStep(previousStep.id)}
            previousLabel={previousStep?.label ?? null}
          />
        </section>
      </section>
    </div>

    <div className="mx-auto w-full max-w-7xl">
      <SiteFooter />
    </div>
  </main>
    </AdminGuard>
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
    <section aria-label="Выбранные материалы" className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
      <PathCell label="Курс" title={course?.name ?? "Не выбран"} id={course?.id ?? null} />
      <PathCell
        label="Модуль"
        title={moduleItem?.name ?? "Не выбран"}
        id={moduleItem?.id ?? null}
      />
      <PathCell label="Урок" title={lesson?.name ?? "Не выбран"} id={lesson?.id ?? null} />
      <PathCell
        label="Задача"
        title={createdTaskId !== null ? "Созданная задача" : task?.statementMd ?? "Не выбран"}
        id={createdTaskId ?? task?.id ?? null}
      />
    </section>
  );
}

// Одна ячейка selected path.
function PathCell({ id, label, title }: { id: number | null; label: string; title: string }) {
  return (
    <div className="min-w-0 bg-ink px-4 py-3">
      <p className="font-mono text-[10px] font-medium text-white/50">{label}</p>
      <p className="mt-2 line-clamp-1 text-sm font-medium leading-snug text-white">
        {title}
      </p>
      <p className="mt-2 font-mono text-[10px] text-white/40">
        {id === null ? "—" : `ID: ${id}`}
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
      aria-pressed={active}
      className={`grid min-h-20 gap-2 border-b p-4 text-left transition focus-visible:outline-acid sm:border-b-0 sm:border-r ${active
        ? "border-[#3c32f5] bg-[#3c32f5] text-white"
        : "border-line bg-panel text-white/70 hover:bg-white/8 hover:text-white"
        }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {blocked && (
          <span className="border border-current px-2 py-1 font-mono text-[9px] font-medium opacity-70">
            нужен выбор
          </span>
        )}
      </span>
      <span className="font-mono text-[10px] font-medium opacity-60">{subtitle}</span>
    </button>
  );
}

// Нижняя навигация позволяет пройти Course -> Module -> Lesson -> Task без возврата к tabbar.
function StepNavigation({
  nextDisabled,
  nextLabel,
  onNext,
  onPrevious,
  previousLabel
}: {
  nextDisabled: boolean;
  nextLabel: string | null;
  onNext: () => void;
  onPrevious: () => void;
  previousLabel: string | null;
}) {
  return (
    <nav className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-2">
      {previousLabel ? (
        <Button className="justify-start" onClick={onPrevious} variant="secondary">
          {`<- Назад: ${previousLabel}`}
        </Button>
      ) : (
        <span className="hidden bg-panel sm:block" />
      )}

          {nextLabel ? (
            <Button
              className="justify-end"
              disabled={nextDisabled}
              onClick={onNext}
              variant={nextDisabled ? "secondary" : "primary"}
            >
              {nextDisabled ? `Сначала выберите ${nextLabel}` : `Далее: ${nextLabel} ->`}
            </Button>
          ) : (
        <span className="hidden bg-panel sm:block" />
      )}
    </nav>
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
    <Panel className="!border-0 !bg-transparent">
      <PanelHeader className="!px-0 !pt-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="qlc-eyebrow text-white/45">{subtitle}</p>
            <h2 className="mt-3 font-display text-3xl font-medium leading-none sm:text-4xl">{title}</h2>
          </div>
          {state.loading && <StatusBadge tone="info">Загрузка…</StatusBadge>}
        </div>
      </PanelHeader>
      <PanelBody className="grid gap-5 !px-0 !pb-0">
        {state.error && <StatusMessage tone="error" text={state.error} />}
        {state.success && <StatusMessage tone="success" text={state.success} />}

        {children}
      </PanelBody>
    </Panel>
  );
}

// Заголовок формы и ID выбранной сущности этого шага.
function FormTitle({ idLabel, title }: { idLabel: number | null; title: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
      <h3 className="text-base font-semibold">{title}</h3>
      <span className="font-mono text-[10px] font-medium text-white/50">
        {idLabel === null ? "Новый материал" : `ID: ${idLabel}`}
      </span>
    </div>
  );
}

// Небольшой блок контекста внутри зависимых шагов.
function ContextNote({ id, label, title }: { id: number; label: string; title: string }) {
  return (
    <div className="min-w-0 border-l-2 border-[#3c32f5] bg-panel p-3">
      <p className="font-mono text-[10px] font-medium text-white/48">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-white">
        {title}
      </p>
      <p className="mt-2 font-mono text-[10px] font-medium text-acid">ID: {id}</p>
    </div>
  );
}

// Сообщение о заблокированной вложенной форме.
function BlockedMessage({ text }: { text: string }) {
  return (
    <Alert className="p-5" title="Выберите родительский материал" tone="warning">
      <p className="text-2xl font-medium leading-tight text-white">{text}</p>
      <p className="mt-3 max-w-xl text-sm font-medium leading-snug text-white/58">
        Выберите родительскую сущность в предыдущей вкладке, и этот шаг станет доступен.
      </p>
    </Alert>
  );
}

// Универсальное сообщение success/error.
function StatusMessage({ text, tone }: { text: string; tone: "error" | "success" }) {
  return (
    <Alert className="p-4" title={tone === "error" ? "Не удалось сохранить" : "Сохранено"} tone={tone === "error" ? "danger" : "success"}>
      {text}
    </Alert>
  );
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
    <Panel className="border-acid bg-surface text-acid">
      <PanelHeader className="border-white/10">
        <div className="flex items-center justify-between gap-3">
          <StatusBadge tone="neutral">
            task ready
          </StatusBadge>
          <StatusBadge tone="neutral">
            id {taskId}
          </StatusBadge>
        </div>
      </PanelHeader>
      <PanelBody className="grid gap-3">
        <p className="text-sm font-medium">Task created. ID: {taskId}</p>
        <p className="text-xs font-medium">
          Use for POST /api/v1/tasks/{taskId}/submissions
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onCopy} variant="secondary">
            Copy taskId
          </Button>
          {copyStatus && <p className="text-xs font-bold">{copyStatus}</p>}
        </div>
      </PanelBody>
    </Panel>
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
    <Panel muted>
      <PanelHeader>
        <div className="flex items-center justify-between gap-3">
          <StatusBadge tone="neutral">selected task</StatusBadge>
          <StatusBadge tone="info">id {taskId}</StatusBadge>
        </div>
      </PanelHeader>
      <PanelBody className="grid gap-3">
        <p className="text-sm font-medium text-white">Selected task. ID: {taskId}</p>
        <p className="text-xs font-medium text-white/58">
          Use for POST /api/v1/tasks/{taskId}/submissions
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onCopy} variant="secondary">
            Copy taskId
          </Button>
          {copyStatus && <p className="text-xs font-bold text-acid">{copyStatus}</p>}
        </div>
      </PanelBody>
    </Panel>
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
      <div className="border border-line bg-panel/60 p-4 font-mono text-xs font-medium text-white/58">
        Загружаем список…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border border-line bg-panel/60 p-4 font-mono text-xs font-medium text-white/58">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid max-h-[520px] gap-px overflow-y-auto border border-white/20 bg-line">
      {items.map((item) => {
        const isSelected = item.id === selectedId;

        return (
          <button
            aria-pressed={isSelected}
            className={`grid min-h-20 gap-2 border border-transparent p-4 text-left transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-acid ${
              isSelected
                ? "border-acid bg-surface text-acid"
                : "bg-panel text-white hover:border-white/20 hover:bg-white/8"
            }`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            title={item.title}
            type="button"
          >
            <span className="line-clamp-2 text-sm font-semibold leading-snug">
              {item.title}
            </span>
            <span className="font-mono text-[10px] leading-relaxed opacity-60">
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
      <span className="font-mono text-[11px] text-white/65">{label}</span>
      <input
        className="min-h-12 rounded-none border border-white/25 bg-ink px-3 text-sm text-white outline-none transition placeholder:text-white/35 hover:border-white/40 focus:border-acid focus:ring-1 focus:ring-acid"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Начните вводить название…"
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
      <legend className="font-mono text-[11px] text-white/65">
        taskType
      </legend>
      <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
        {taskTypes.map((taskType) => (
          <button
            aria-pressed={value === taskType}
            className={`min-h-12 px-3 text-xs font-medium transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-acid ${
              value === taskType
                ? "bg-surface text-acid"
                : "bg-ink text-white/68 hover:bg-white/8 hover:text-acid"
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
      <span className="font-mono text-[11px] text-white/65">{label}</span>
      <input
        className="min-h-12 rounded-none border border-white/25 bg-ink px-3 text-sm text-white outline-none transition placeholder:text-white/35 hover:border-white/40 focus:border-acid focus:ring-1 focus:ring-acid"
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
      <span className="font-mono text-[11px] text-white/65">{label}</span>
      <textarea
        className="resize-y rounded-none border border-white/25 bg-ink px-3 py-3 font-mono text-sm leading-relaxed text-white outline-none transition placeholder:text-white/35 hover:border-white/40 focus:border-acid focus:ring-1 focus:ring-acid"
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
      {help && <span className="text-xs leading-relaxed text-white/55">{help}</span>}
    </label>
  );
}

// Бинарное DTO-поле отображается как явный checkbox, а не текстовое значение true/false.
function ToggleInput({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 border border-line bg-panel/70 px-3 transition hover:border-white/30">
      <span className="font-mono text-[11px] text-white/65">{label}</span>
      <span className="flex items-center gap-3 font-mono text-[10px] font-medium">
        <span className={checked ? "text-acid" : "text-white/42"}>{checked ? "true" : "false"}</span>
        <input
          checked={checked}
          className="h-5 w-5 accent-[#c4ff00]"
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
      </span>
    </label>
  );
}

// Create отправляет POST, Update selected отправляет PUT для выбранного ID.
function FormActions({
  busy,
  createLabel,
  onUpdate,
  updateDisabled,
  updateLabel
}: {
  busy: boolean;
  createLabel: string;
  onUpdate: () => void;
  updateDisabled: boolean;
  updateLabel: string;
}) {
  return (
    <div className="grid gap-2 border-t border-line pt-4">
      <Button loading={busy} type="submit">
        {createLabel}
      </Button>
      <Button
        disabled={busy || updateDisabled}
        loading={busy}
        onClick={onUpdate}
        variant="secondary"
      >
        {updateLabel}
      </Button>
    </div>
  );
}
