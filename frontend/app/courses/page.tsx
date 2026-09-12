import { CourseList } from "@/components/CourseList";
import { LearningOverviewProvider } from "@/components/LearningOverviewProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Alert } from "@/components/ui";
import { getCourseCatalog } from "@/services/api";
export const dynamic = "force-dynamic";
export default async function CoursesPage() {
  const courses = await getCourseCatalog().catch(() => null);
  return <LearningOverviewProvider><div className="kit-shell"><SiteHeader /><main id="main-content" className="kit-page" tabIndex={-1}><p className="qlc-eyebrow text-acid">Обучение / Каталог</p><h1>Курсы программирования</h1><p className="kit-lead">Выберите направление и изучите программу курса.</p>{courses ? <CourseList courses={courses} /> : <Alert title="Каталог недоступен" tone="warning">Не удалось загрузить курсы. Попробуйте обновить страницу.</Alert>}</main><SiteFooter /></div></LearningOverviewProvider>;
}
