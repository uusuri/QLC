import { BrandCrystal } from "@/components/BrandCrystal";
import { SignedOutOnly } from "@/components/SignedOutOnly";
import { TechBarcode } from "@/components/TechnicalMarks";
import { ButtonLink } from "@/components/ui";
import "./learning-hero.css";

export function LearningHero() {
  return (
    <section className="qlc-learning-hero" aria-labelledby="hero-title">
      <div className="qlc-learning-hero__copy">
        <p className="qlc-learning-hero__eyebrow"><span />Учитесь программировать на практике</p>
        <h1 id="hero-title">Понятная<br />теория.<br /><span>Живой код.</span></h1>
        <p className="qlc-learning-hero__description">Разберитесь в идее. Напишите решение.<br className="hidden sm:block" /> Превратите знания в навык — шаг за шагом.</p>
        <div className="qlc-learning-hero__actions">
          <ButtonLink href="#courses">Выбрать курс <span aria-hidden="true" className="ml-7">↗</span></ButtonLink>
          <SignedOutOnly><ButtonLink href="/login" variant="secondary">Войти в аккаунт</ButtonLink></SignedOutOnly>
        </div>
        <a className="qlc-text-link mt-5 text-white/60" href="#how">Как устроено обучение <span aria-hidden="true">↓</span></a>
      </div>
      <div className="qlc-core-stage" aria-hidden="true">
        <div className="qlc-core-stage__top"><span>QUANTUM LEARNING CORE</span><span>◇ / 01</span></div>
        <div className="qlc-core-stage__field">
          <span className="qlc-core-stage__word">QLC</span>
          <div className="qlc-core-stage__orbit" />
          <BrandCrystal className="qlc-core-stage__crystal" />
          <span className="qlc-core-stage__cross qlc-core-stage__cross--one">+</span>
          <span className="qlc-core-stage__cross qlc-core-stage__cross--two">+</span>
        </div>
        <div className="qlc-core-stage__bottom"><TechBarcode label="LEARN / BUILD / REPEAT" /><span>Идея становится<br /><strong>вашим решением.</strong></span></div>
      </div>
    </section>
  );
}
