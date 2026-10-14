
import { TechBarcode, TechCrosshair, TechRuler } from "@/components/TechnicalMarks";
import { ButtonLink } from "@/components/ui";

export function ChromePoster() {
  return (
    <section aria-labelledby="hero-title" className="qlc-chrome-poster qlc-grain">
      <div className="qlc-chrome-poster__masthead">
        <div className="flex items-center gap-4"><span aria-hidden="true" className="qlc-registration-target" /><span>Quantum<br />Learning Core</span></div>
        <span className="hidden font-mono text-[10px] uppercase leading-relaxed sm:block">Программирование<br />через практику</span>
        <span aria-hidden="true" className="qlc-poster-issue">QL / 01</span>
      </div>
      <div className="qlc-chrome-poster__field">
        <h1 className="qlc-chrome-poster__title" id="hero-title"><span>ТЕОРИЯ.</span><span>КОД.</span><span>ПРАКТИКА.</span></h1>
        <span aria-hidden="true" className="qlc-chrome-poster__year">LEARN<br />WRITE<br />REPEAT</span>
        <div className="qlc-chrome-poster__coordinates" aria-hidden="true"><span>01 / РАЗОБРАТЬСЯ</span><span>02 / НАПИСАТЬ</span><span>03 / ПРОВЕРИТЬ</span></div>
        <TechCrosshair className="left-[47%] top-10 text-ink/70" />
        <TechBarcode className="absolute bottom-8 left-8 hidden text-ink/80 md:inline-flex" label="QLC / BUILD YOUR KNOWLEDGE" />
      </div>
      <div className="qlc-chrome-poster__band">
        <div className="qlc-chrome-poster__intro"><p>Меньше смотреть.<br /><strong>Больше писать код.</strong></p><p className="qlc-chrome-poster__description">Короткая теория, задачи и проверка решения — в одном рабочем пространстве.</p></div>
        <div className="qlc-chrome-poster__actions"><ButtonLink className="!border-ink !bg-ink !text-white hover:!bg-white hover:!text-ink" href="#courses">Выбрать курс <span aria-hidden="true" className="ml-8">↗</span></ButtonLink><a className="qlc-text-link hover:!text-ink hover:underline" href="#how">Как устроено обучение <span aria-hidden="true">↓</span></a></div>
        <span aria-hidden="true" className="qlc-chrome-poster__seal">&lt;/&gt;</span>
      </div>
      
      <TechRuler className="absolute bottom-0 left-0 right-0 text-ink/50" />
    </section>
  );
}
