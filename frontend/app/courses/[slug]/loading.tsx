import { PageState } from "@/components/PageState";

// Loading UI для /courses/[slug].
export default function CourseLoading() {
  return <PageState eyebrow="Курс / загрузка" showPrimaryAction={false} title="Загружаем курс" text="Собираем программу, модули и доступные задания." />;
}
