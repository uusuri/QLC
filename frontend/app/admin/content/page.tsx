"use client";

import { CourseTree, taskTitle } from "@/components/admin/CourseTree";
import type { EditorSelection } from "@/components/admin/CourseTree";
import { useAdminTreeData } from "@/components/admin/useAdminTreeData";
import { LessonTheoryEditor } from "@/components/admin/LessonTheoryEditor";
import { COURSE_LANGUAGES } from "@/components/courseLanguages";

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
  getAdminLessonById,
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
  multilingual: boolean;
  availableLanguages: SubmissionLanguage[];
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
  contentByLanguage: Partial<Record<SubmissionLanguage, string>>;
  name: string;
  description: string;
  position: string;
  contentMd: string;
  published: boolean;
};

type TaskFormState = {
  hintsText: string;
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
  multilingual: false,
  availableLanguages: ["CPP23"],
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
  contentByLanguage: {},
  name: "",
  description: "",
  position: "0",
  contentMd: "",
  published: false
};

const initialTaskForm: TaskFormState = {
  hintsText: "",
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

const emptyModules: AdminModuleDto[] = [];
const emptyLessons: AdminLessonDto[] = [];
const emptyTasks: AdminTaskDto[] = [];

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
    hintsText: storedString(value.hintsText, ""),
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
    multilingual: form.multilingual,
    availableLanguages: form.availableLanguages,
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
    contentByLanguage: Object.fromEntries(Object.entries(form.contentByLanguage).filter(([, text]) => text.trim())),
    published: form.published
  };
}

// Собирает Task payload и валидирует поля конкретного discriminator-типа.
function buildTaskPayload(form: TaskFormState): AdminTaskCreatePayload {
  if (!form.statementMd.trim()) {
    throw new Error("Task statementMd is required.");
  }

  const hints = form.hintsText.trim() ? form.hintsText.split(/^\s*---\s*$/m).map(hint => hint.trim()) : [];
  if (hints.length > 5 || hints.some(hint => !hint || hint.length > 8000)) {
    throw new Error("Добавьте до 5 непустых подсказок, не более 8000 символов каждая.");
  }
  const payload: AdminTaskCreatePayload = {
    hints,
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
    multilingual: course.multilingual ?? false,
    availableLanguages: course.availableLanguages ?? ["CPP23"],
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
    contentByLanguage: lesson.contentByLanguage ?? {},
    published: lesson.published
  };
}

function taskDtoToForm(task: AdminTaskDto): TaskFormState {
  return {
    hintsText: (task.hints ?? []).join("\n\n---\n\n"),
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
  const treeData = useAdminTreeData();
  const { load: loadModuleBranch } = treeData.modules;
  const { load: loadLessonBranch } = treeData.lessons;
  const { load: loadTaskBranch } = treeData.tasks;

  // ID выбранных сущностей задают текущий путь Course -> Module -> Lesson -> Task.
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Последняя созданная задача нужна для главного результата карточки.
  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  const modules = selectedCourseId === null ? emptyModules : treeData.modules.branches[selectedCourseId]?.items ?? emptyModules;
  const lessons = selectedModuleId === null ? emptyLessons : treeData.lessons.branches[selectedModuleId]?.items ?? emptyLessons;
  const tasks = selectedLessonId === null ? emptyTasks : treeData.tasks.branches[selectedLessonId]?.items ?? emptyTasks;
  const courseDrafts = useRef(new Map<number, CourseFormState>());
  const moduleDrafts = useRef(new Map<number, ModuleFormState>());
  const taskDrafts = useRef(new Map<number, TaskFormState>());

  // Формы создания сущностей.
  const [courseForm, setCourseForm] = useState<CourseFormState>(initialCourseForm);
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(initialModuleForm);
  const [theoryLanguage, setTheoryLanguage] = useState<SubmissionLanguage | "base">("base");
  const [lessonForm, setLessonForm] = useState<LessonFormState>(initialLessonForm);
  const [lessonBaseline, setLessonBaseline] = useState<LessonFormState>(initialLessonForm);
  const [lessonEditorId, setLessonEditorId] = useState<number | null>(null);
  const [lessonEditorLoading, setLessonEditorLoading] = useState(false);
  const [lessonEditorError, setLessonEditorError] = useState("");
  const [lessonLoadAttempt, setLessonLoadAttempt] = useState(0);
  const lessonFormRef = useRef<HTMLFormElement>(null);
  const editorPanelRef = useRef<HTMLDivElement>(null);
  const lessonDraftsRef = useRef(new Map<number, { form: LessonFormState; baseline: LessonFormState }>());
  const selectedLessonRef = useRef(selectedLessonId);
  const selectedModuleRef = useRef(selectedModuleId);
  selectedLessonRef.current = selectedLessonId;
  selectedModuleRef.current = selectedModuleId;
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

  const lessonDirty = JSON.stringify(lessonForm) !== JSON.stringify(lessonBaseline);

  useEffect(() => {
    setCourseForm(selectedCourse ? courseDrafts.current.get(selectedCourse.id) ?? courseDtoToForm(selectedCourse) : initialCourseForm);
  }, [selectedCourse]);

  useEffect(() => {
    setModuleForm(selectedModule ? moduleDrafts.current.get(selectedModule.id) ?? moduleDtoToForm(selectedModule) : initialModuleForm);
  }, [selectedModule]);

  useEffect(() => {
    if (selectedTask) setTaskForm(taskDrafts.current.get(selectedTask.id) ?? taskDtoToForm(selectedTask));
  }, [selectedTask]);

  // List responses deliberately omit private theory. Editing always loads the authenticated detail endpoint.
  useEffect(() => {
    let ignore = false;
    setLessonEditorError("");
    setLessonEditorId(null);
    if (selectedLessonId === null) {
      setLessonForm(initialLessonForm);
      setLessonBaseline(initialLessonForm);
      setLessonEditorLoading(false);
      return;
    }
    const draft = lessonDraftsRef.current.get(selectedLessonId);
    if (draft) {
      setLessonForm(draft.form);
      setLessonBaseline(draft.baseline);
      setLessonEditorId(selectedLessonId);
      setLessonEditorLoading(false);
      return;
    }
    setLessonEditorLoading(true);
    void getAdminLessonById(selectedLessonId).then(lesson => {
      if (ignore) return;
      const form = lessonDtoToForm(lesson);
      setLessonForm(form);
      setLessonBaseline(form);
      setLessonEditorId(lesson.id);
      setLessonEditorLoading(false);
    }).catch(error => {
      if (!ignore) { setLessonEditorError(getErrorMessage(error)); setLessonEditorLoading(false); }
    });
    return () => { ignore = true; };
  }, [selectedLessonId, lessonLoadAttempt]);

  // Keep each opened lesson's unsaved versions when navigating within this workspace.
  useEffect(() => {
    if (lessonEditorId !== null && lessonEditorId === selectedLessonId) lessonDraftsRef.current.set(lessonEditorId, { form: lessonForm, baseline: lessonBaseline });
  }, [lessonEditorId, selectedLessonId, lessonForm, lessonBaseline]);

  useEffect(() => {
    const languages = selectedCourse?.availableLanguages ?? [];
    const first = COURSE_LANGUAGES.find(item => languages.includes(item.id));
    setTheoryLanguage(selectedCourse?.multilingual && first ? first.id : "base");
  }, [selectedCourse?.id]);

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
    if (snapshot.selectedTaskId !== null) taskDrafts.current.set(snapshot.selectedTaskId, snapshot.taskForm);
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

  // Загружаем ветку курса. Путь меняется только при явном выборе или восстановлении.
  useEffect(() => {
    let ignore = false;

    if (selectedCourseId === null) {
      setModuleState(idlePanelState);
      return () => {
        ignore = true;
      };
    }

    async function loadModules(courseId: number) {
      setModuleState({ loading: true, error: "", success: "" });

      try {
        const nextModules = await loadModuleBranch(courseId);

        if (!ignore) {
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
  }, [selectedCourseId, loadModuleBranch]);

  // Загружаем уроки выбранного модуля, не сбрасывая выбранный в дереве урок.
  useEffect(() => {
    let ignore = false;

    if (selectedModuleId === null) {
      setLessonState(idlePanelState);
      return () => {
        ignore = true;
      };
    }

    async function loadLessons(moduleId: number) {
      setLessonState({ loading: true, error: "", success: "" });

      try {
        const nextLessons = await loadLessonBranch(moduleId);

        if (!ignore) {
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
  }, [selectedModuleId, loadLessonBranch]);

  // При смене урока загружаем только его задачи.
  useEffect(() => {
    let ignore = false;

    if (selectedLessonId === null) {
      setTaskState(idlePanelState);
      return () => {
        ignore = true;
      };
    }

    async function loadTasks(lessonId: number) {
      setTaskState({ loading: true, error: "", success: "" });

      try {
        const nextTasks = await loadTaskBranch(lessonId);

        if (!ignore) {
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
  }, [selectedLessonId, loadTaskBranch]);

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

      const nextCourses = [...courses, created];

      setCourses(nextCourses);
      setSelectedCourseId(created.id);
      setSelectedModuleId(null);
      setSelectedLessonId(null);
      setSelectedTaskId(null);
      setCourseForm(courseDtoToForm(created));

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

      const nextModules = [...modules, created];

      treeData.modules.put(selectedCourseId, nextModules);
      setSelectedModuleId(created.id);
      setSelectedLessonId(null);
      setSelectedTaskId(null);
      setModuleForm(moduleDtoToForm(created));

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

      const nextLessons = [...lessons, created];

      treeData.lessons.put(selectedModuleId, nextLessons);
      setSelectedLessonId(created.id);
      setSelectedTaskId(null);
      const form = lessonDtoToForm(created);
      lessonDraftsRef.current.set(created.id, { form, baseline: form });
      setLessonForm(form);
      setLessonBaseline(form);

      setLessonState({
        loading: false,
        error: "",
        success: "Урок создан. Можно продолжить редактирование."
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

      const nextTasks = [...tasks, created];

      treeData.tasks.put(selectedLessonId, nextTasks);
      setSelectedTaskId(created.id);
      setCreatedTaskId(created.id);
      setTaskForm(taskDtoToForm(created));

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
      const nextCourses = courses.map(course => course.id === updated.id ? updated : course);

      setCourses(nextCourses);
      courseDrafts.current.set(updated.id, courseDtoToForm(updated));
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
      const nextModules = modules.map(moduleItem => moduleItem.id === updated.id ? updated : moduleItem);

      treeData.modules.put(selectedCourseId, nextModules);
      moduleDrafts.current.set(updated.id, moduleDtoToForm(updated));
      setModuleForm(moduleDtoToForm(updated));
      setModuleState({ loading: false, error: "", success: `Module updated. ID: ${updated.id}` });
    } catch (error) {
      setModuleState({ loading: false, error: getErrorMessage(error), success: "" });
    }
  }

  // PUT обновляет выбранный Lesson всеми полями frontend DTO.
  async function handleUpdateLesson() {
    const lessonId = selectedLessonId;
    const moduleId = selectedModuleId;
    const submittedForm = lessonForm;
    try {
      if (moduleId === null || lessonId === null || lessonEditorId !== lessonId || lessonEditorLoading) {
        throw new Error("Дождитесь загрузки выбранного урока.");
      }
      setLessonState({ loading: true, error: "", success: "" });
      const updated = await updateAdminLesson(lessonId, buildLessonPayload(submittedForm));
      const form = lessonDtoToForm(updated);
      const latestDraft = lessonDraftsRef.current.get(lessonId);
      const nextForm = latestDraft && latestDraft.form !== submittedForm ? latestDraft.form : form;
      lessonDraftsRef.current.set(lessonId, { form: nextForm, baseline: form });
      if (selectedLessonRef.current === lessonId) {
        setLessonForm(nextForm);
        setLessonBaseline(form);
        setLessonState({ loading: false, error: "", success: "Урок и все языковые версии сохранены." });
      }
      if (selectedModuleRef.current === moduleId) {
        treeData.lessons.put(moduleId, lessons.map(lesson => lesson.id === updated.id ? updated : lesson));
      }
    } catch (error) {
      if (selectedLessonRef.current === lessonId) setLessonState({ loading: false, error: getErrorMessage(error), success: "" });
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
      const nextTasks = tasks.map(task => task.id === updated.id ? updated : task);

      treeData.tasks.put(selectedLessonId, nextTasks);
      taskDrafts.current.set(updated.id, taskDtoToForm(updated));
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

  const navigationBusy = courseState.loading || moduleState.loading || lessonState.loading || taskState.loading;
  const selection: EditorSelection = { step: activeStep, courseId: selectedCourseId, moduleId: selectedModuleId, lessonId: selectedLessonId, taskId: selectedTaskId };

  function navigateEditor(next: EditorSelection) {
    if (navigationBusy) return;
    if (selectedCourse) courseDrafts.current.set(selectedCourse.id, courseForm);
    if (selectedModule) moduleDrafts.current.set(selectedModule.id, moduleForm);
    if (selectedTask) taskDrafts.current.set(selectedTask.id, taskForm);
    pendingRestoreRef.current = null;
    setWorkspaceStorageReady(true);
    setSelectedCourseId(next.courseId);
    setSelectedModuleId(next.moduleId);
    setSelectedLessonId(next.lessonId);
    setSelectedTaskId(next.taskId);
    setActiveStep(next.step);
    setCreatedTaskId(null);
    setCopyStatus("");
    setCourseState(idlePanelState);
    setModuleState(idlePanelState);
    setLessonState(idlePanelState);
    setTaskState(idlePanelState);
    if (next.courseId === null) setCourseForm(initialCourseForm);
    if (next.moduleId === null) setModuleForm(initialModuleForm);
    if (next.lessonId === null) {
      setLessonForm(initialLessonForm);
      setLessonBaseline(initialLessonForm);
    }
    if (next.taskId === null) setTaskForm(initialTaskForm);
    requestAnimationFrame(() => editorPanelRef.current?.scrollIntoView({ block: "start" }));
  }

  return (
    <AdminGuard>
      <main className="kit-shell kit-admin">
      <SiteHeader compact />
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col">
        <section className="relative mt-4 flex-1 border border-line bg-ink" id="main-content" tabIndex={-1}>
          <header className="grid gap-4 border-b border-line bg-surface p-4 text-paper sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
            <div>
              <p className="qlc-eyebrow text-muted">QLC / Управление контентом</p>
              <h1 className="mt-2 font-display !text-2xl font-medium leading-tight">Редактор обучения<span className="text-[#B3ACFF]">.</span></h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">Выберите материал в дереве слева. Стрелка раскрывает содержимое, плюс добавляет новый материал.</p>
            </div>
            <div className="grid justify-items-start gap-4 sm:justify-items-end">
              <Link className="inline-flex min-h-10 items-center border-b border-line/30 text-xs font-semibold transition hover:border-paper" href="/">На сайт ↗</Link>
              <span className="border border-line/20 bg-surface-raised px-3 py-2 font-mono text-[10px] text-muted" role="status">
                {!workspaceStorageReady ? "Восстанавливаем черновик…" : lastSavedAt ? `Рабочее место сохранено · ${new Date(lastSavedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : "Черновик готов"}
              </span>
            </div>
          </header>

          <div className="grid min-w-0 items-start lg:grid-cols-[300px_minmax(0,1fr)]">
            <CourseTree courses={courses} selection={selection} data={treeData} busy={navigationBusy} loading={courseState.loading && courses.length === 0} onNavigate={navigateEditor} />
            <div ref={editorPanelRef} className="min-w-0 scroll-mt-24 lg:border-l lg:border-line">
              <SelectedPath course={selectedCourse} moduleItem={selectedModule} lesson={selectedLesson} task={selectedTask} selection={selection} onNavigate={navigateEditor} busy={navigationBusy} />
        <section className="p-4 sm:p-6">
          {activeStep === "course" && (
            <WorkspacePanel
              state={courseState}
              subtitle="01 / Курс"
              title={selectedCourse ? "Настройки курса" : "Новый курс"}
            >
              <div className="mx-auto w-full max-w-3xl">
                <form className="grid content-start gap-4 border border-white/20 bg-panel p-4 sm:p-5" onSubmit={handleCreateCourse}>
                  <FormTitle title="Данные курса" idLabel={selectedCourseId} />
                  <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={courseForm.multilingual} onChange={event => {
                    const multilingual = event.target.checked;
                    setCourseForm(current => ({ ...current, multilingual, availableLanguages: multilingual ? COURSE_LANGUAGES.map(item => item.id) : [current.availableLanguages[0] ?? "CPP23"] }));
                  }} />Мультиязычный курс</label>
                  <fieldset className="grid grid-cols-2 gap-2"><legend className="mb-3 text-sm text-muted">Доступные языки</legend>
                    {COURSE_LANGUAGES.map(item => <label key={item.id} className="flex items-center gap-2 text-sm"><input type={courseForm.multilingual ? "checkbox" : "radio"} name="available-course-languages" checked={courseForm.availableLanguages.includes(item.id)} onChange={event => {
                      const checked = event.target.checked;
                      setCourseForm(current => ({ ...current, availableLanguages: !current.multilingual ? [item.id] : checked ? [...current.availableLanguages, item.id] : current.availableLanguages.filter(language => language !== item.id) }));
                    }} />{item.label}</label>)}
                  </fieldset>
                  <TextInput
                    label="Название"
                    value={courseForm.name}
                    onChange={(value) =>
                      setCourseForm((current) => ({ ...current, name: value }))
                    }
                  />
                  <TextArea
                    label="Описание"
                    rows={4}
                    value={courseForm.description}
                    onChange={(value) =>
                      setCourseForm((current) => ({ ...current, description: value }))
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextInput
                      inputMode="decimal"
                      label="Цена, ₽"
                      value={courseForm.price}
                      onChange={(value) =>
                        setCourseForm((current) => ({ ...current, price: value }))
                      }
                    />
                    <TextInput
                      inputMode="decimal"
                      label="Цена, Stars"
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
            <WorkspacePanel state={moduleState} subtitle="02 / Модуль" title={selectedModule ? "Настройки модуля" : "Новый модуль"}>
              {!selectedCourse ? (
                <BlockedMessage text="Сначала выберите курс" />
              ) : (
                <div className="mx-auto w-full max-w-3xl">
                  <form className="grid content-start gap-4 border border-white/20 bg-panel p-4 sm:p-5" onSubmit={handleCreateModule}>
                    <FormTitle title="Данные модуля" idLabel={selectedModuleId} />
                    <TextInput
                      label="Название"
                      value={moduleForm.name}
                      onChange={(value) =>
                        setModuleForm((current) => ({ ...current, name: value }))
                      }
                    />
                    <TextArea
                      label="Описание"
                      rows={5}
                      value={moduleForm.description}
                      onChange={(value) =>
                        setModuleForm((current) => ({ ...current, description: value }))
                      }
                    />
                    <TextInput
                      inputMode="numeric"
                      label="Позиция"
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
            <WorkspacePanel state={lessonState} subtitle="03 / Урок" title={selectedLesson ? "Редактор урока" : "Новый урок"}>
              {!selectedModule ? <BlockedMessage text="Сначала выберите модуль" /> : (
                <div className="min-w-0">
                  {lessonEditorLoading || (selectedLessonId !== null && !lessonEditorError && lessonEditorId !== selectedLessonId) ? (
                    <p className="border border-line p-6 text-muted" role="status">Загружаем урок и все языковые версии…</p>
                  ) : lessonEditorError ? (
                    <div role="alert" className="border border-line p-6"><p>Не удалось загрузить материал урока. Изменения недоступны, чтобы не перезаписать текст пустыми полями.</p><Button className="mt-4" variant="secondary" onClick={() => setLessonLoadAttempt(attempt => attempt + 1)}>Повторить загрузку</Button></div>
                  ) : (
                    <form ref={lessonFormRef} className="grid min-w-0 content-start gap-4" onSubmit={event => {
                      if (selectedLessonId === null) void handleCreateLesson(event);
                      else { event.preventDefault(); void handleUpdateLesson(); }
                    }}>
                      <fieldset disabled={lessonState.loading} className="grid min-w-0 gap-4 border border-line bg-panel p-4 sm:p-5">
                        <FormTitle title={selectedLessonId === null ? "Новый урок" : "Настройки урока"} idLabel={selectedLessonId} />
                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
                          <TextInput label="Название урока" value={lessonForm.name} onChange={name => setLessonForm(current => ({ ...current, name }))} />
                          <TextInput inputMode="numeric" label="Позиция в модуле" value={lessonForm.position} onChange={position => setLessonForm(current => ({ ...current, position }))} />
                        </div>
                        <details><summary className="cursor-pointer py-2 text-sm text-muted">Краткое описание и публикация</summary>
                          <div className="mt-3 grid gap-4">
                            <TextArea label="Описание урока" rows={3} value={lessonForm.description} onChange={description => setLessonForm(current => ({ ...current, description }))} />
                            <label className="flex min-h-11 items-center gap-3 text-sm"><input className="h-4 w-4 accent-acid" type="checkbox" checked={lessonForm.published} onChange={event => setLessonForm(current => ({ ...current, published: event.target.checked }))} />Урок опубликован</label>
                          </div>
                        </details>
                      </fieldset>
                      <LessonTheoryEditor value={lessonForm} saved={lessonBaseline}
                        multilingual={Boolean(selectedCourse?.multilingual)} languages={selectedCourse?.availableLanguages ?? []}
                        version={theoryLanguage} onVersionChange={setTheoryLanguage}
                        onChange={value => { setLessonForm(current => ({ ...current, ...value })); setLessonState(current => ({ ...current, success: "" })); }}
                        onSave={() => lessonFormRef.current?.requestSubmit()} busy={lessonState.loading} />
                      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border border-line bg-panel p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
                        <p className={`text-sm ${lessonDirty ? "text-amber-300" : "text-muted"}`} role="status">{lessonState.loading ? "Сохраняем…" : lessonDirty ? "Есть несохранённые изменения" : selectedLessonId === null ? "Заполните новый урок" : "Все изменения сохранены"}</p>
                        <Button type="submit" loading={lessonState.loading} disabled={!lessonForm.name.trim()}>{selectedLessonId === null ? "Создать урок" : "Сохранить урок и все версии"}</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </WorkspacePanel>
          )}

          {activeStep === "task" && (
            <WorkspacePanel state={taskState} subtitle="04 / Задача" title={selectedTask ? "Редактор задачи" : "Новая задача"}>
              {!selectedLesson ? (
                <BlockedMessage text="Сначала выберите урок" />
              ) : (
                <div className="mx-auto grid w-full max-w-4xl gap-4">
                  {createdTaskId !== null && <TaskCreatedBlock copyStatus={copyStatus} taskId={createdTaskId} onCopy={() => handleCopyTaskId(createdTaskId)} />}
                  {selectedTaskId !== null && !selectedTask ? <p role="status" className="text-muted">Загружаем задачу…</p> :
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
                        Условие хранится как Markdown. Заголовки, списки, таблицы и блоки кода
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

                    <TextArea label="Подсказки по уровням" rows={8}
                      help="До 5 подсказок. Разделяйте уровни строкой ---. Расположите от общей идеи к плану решения; поддерживается Markdown."
                      value={taskForm.hintsText}
                      onChange={(value) => setTaskForm((current) => ({ ...current, hintsText: value }))} />
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
                  </form>}
                </div>
              )}
            </WorkspacePanel>
          )}

        </section>
            </div>
          </div>
      </section>
    </div>

    <div className="mx-auto w-full max-w-7xl">
      <SiteFooter />
    </div>
  </main>
    </AdminGuard>
  );
}

function SelectedPath({ course, moduleItem, lesson, task, selection, onNavigate, busy }: {
  course: AdminCourseDto | null; moduleItem: AdminModuleDto | null; lesson: AdminLessonDto | null; task: AdminTaskDto | null;
  selection: EditorSelection; onNavigate: (selection: EditorSelection) => void; busy: boolean;
}) {
  const crumbs: { label: string; path: EditorSelection }[] = [];
  if (course) crumbs.push({ label: course.name, path: { step: "course", courseId: course.id, moduleId: null, lessonId: null, taskId: null } });
  if (moduleItem) crumbs.push({ label: moduleItem.name, path: { ...selection, step: "module", lessonId: null, taskId: null } });
  if (lesson) crumbs.push({ label: lesson.name, path: { ...selection, step: "lesson", taskId: null } });
  if (task) crumbs.push({ label: taskTitle(task), path: { ...selection, step: "task" } });
  const isNew = selection.step === "course" ? !course : selection.step === "module" ? !moduleItem : selection.step === "lesson" ? !lesson : !task;
  return <nav aria-label="Путь к материалу" className="flex min-h-12 flex-wrap items-center gap-2 border-b border-line px-4 py-3 text-xs text-muted sm:px-6">
    {crumbs.map((crumb, index) => <span key={crumb.path.step} className="inline-flex min-w-0 items-center gap-2">
      {index > 0 && <span aria-hidden="true">/</span>}<button type="button" disabled={busy} onClick={() => onNavigate(crumb.path)} aria-current={selection.step === crumb.path.step ? "page" : undefined} className="max-w-[240px] truncate text-left hover:text-acid disabled:opacity-50" title={crumb.label}>{crumb.label}</button>
    </span>)}
    {isNew && <span className="text-paper">{crumbs.length > 0 ? "/ " : ""}{({ course: "Новый курс", module: "Новый модуль", lesson: "Новый урок", task: "Новая задача" })[selection.step]}</span>}
  </nav>;
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
function BlockedMessage({ text }: { text: string }) {
  return (
    <Alert className="p-5" title="Выберите родительский материал" tone="warning">
      <p className="text-2xl font-medium leading-tight text-white">{text}</p>
      <p className="mt-3 max-w-xl text-sm font-medium leading-snug text-white/58">
        Выберите родительский материал в дереве слева.
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
    <label className="grid min-w-0 gap-2">
      <span className="font-mono text-[11px] text-white/65">{label}</span>
      <input
        className="min-h-12 min-w-0 w-full rounded-none border border-white/25 bg-ink px-3 text-sm text-white outline-none transition placeholder:text-white/35 hover:border-white/40 focus:border-acid focus:ring-1 focus:ring-acid"
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
      <Button loading={busy} type={updateDisabled ? "submit" : "button"} onClick={updateDisabled ? undefined : onUpdate}>
        {updateDisabled ? createLabel : updateLabel}
      </Button>
      {!updateDisabled && <Button disabled={busy} type="submit" variant="secondary">Создать копию</Button>}
    </div>
  );
}
