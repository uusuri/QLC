import { PageState } from "@/components/PageState";

// Loading UI для /lessons/[id].
export default function LessonLoading() {
  return <PageState eyebrow="Урок / загрузка" showPrimaryAction={false} title="Загружаем урок" text="Подготавливаем материал, условие задачи и редактор." />;
}
