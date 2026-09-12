import Link from "next/link";
import { CourseList } from "@/components/CourseList";
import { HomeContinueLearning } from "@/components/ContinueLearning";
import { LearningOverviewProvider } from "@/components/LearningOverviewProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SignedOutOnly } from "@/components/SignedOutOnly";
import { Alert, ButtonLink } from "@/components/ui";
import { getCourseCatalog } from "@/services/api";
import type { CourseDto } from "@/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let courses: CourseDto[] = [];
  let loadError = "";
  try { courses = await getCourseCatalog(); }
  catch { loadError = "Каталог временно недоступен. Попробуйте обновить страницу."; }
  const steps = [
    { title: "Разберите тему", text: "Прочитайте короткую теорию с примерами.", icon: "read" },
    { title: "Напишите код", text: "Решите задачу в редакторе рядом с условием.", icon: "code" },
    { title: "Проверьте решение", text: "Отправьте код и посмотрите результат проверки.", icon: "check" }
  ];
  return (
    <LearningOverviewProvider>
      <div className="kit-home">
        <SiteHeader />
        <main id="main-content" tabIndex={-1}>
          <section className="kit-hero">
            <div className="kit-hero-copy">
              <p className="qlc-eyebrow text-acid">Курсы программирования</p>
              <h1>Программирование<br />через практику</h1>
              <p>Короткая теория, задачи и проверка решений.<br />Всё для обучения — в одном пространстве.</p>
              <ButtonLink href="#courses">Выбрать курс <span aria-hidden="true">↗</span></ButtonLink>
              <a className="qlc-text-link" href="#how">Как устроено обучение ↓</a>
            </div>
            <img alt="" className="kit-hero-art" fetchPriority="high" height={622} src="/design/synthetic-art.png" width={898} />
          </section>
          <div className="kit-home-content">
            <div aria-hidden="true" className="kit-registration-line"><span>+</span><span>+</span><span>+</span></div>
            <HomeContinueLearning />
            <section className="kit-home-section" id="courses" aria-labelledby="courses-title">
              <p className="qlc-eyebrow text-acid kit-home-section-index">01 / Курсы</p>
              <div className="kit-section-heading"><h2 id="courses-title">Выберите курс</h2><Link className="qlc-text-link" href="/courses">Все курсы ↗</Link></div>
              {loadError ? <Alert title="Не удалось загрузить курсы" tone="warning">{loadError}</Alert> :
                courses.length ? <CourseList courses={courses.slice(0, 2)} home /> :
                <Alert title="Готовим новые курсы" tone="neutral">Курсы появятся здесь после публикации.</Alert>}
            </section>
            <section className="kit-method kit-home-section" id="how" aria-labelledby="how-title">
              <div><p className="qlc-eyebrow text-acid kit-home-section-index">02 / Обучение</p><h2 id="how-title">Как устроено<br />обучение</h2><img alt="" className="kit-method-art" src="/design/method-orbit.svg" width={310} height={258} loading="lazy" /></div>
              <ol>{steps.map((step, i) => <li key={step.title}><span className="font-mono text-xs text-acid">{String(i + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><img alt="" className="kit-method-icon" src={`/design/method-${step.icon}.svg`} width={100} height={100} loading="lazy" /></li>)}</ol>
            </section>
            <SignedOutOnly><section className="kit-join"><div><h2>Создайте аккаунт</h2><p>Сохраняйте прогресс и продолжайте обучение<br />с того места, где остановились.</p></div><div><ButtonLink href="/register">Зарегистрироваться ↗</ButtonLink><Link className="qlc-text-link" href="/login">Уже есть аккаунт? Войти</Link></div></section></SignedOutOnly>
            <SiteFooter />
          </div>
        </main>
      </div>
    </LearningOverviewProvider>
  );
}
