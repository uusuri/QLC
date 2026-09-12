import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { FooterAuthLinks } from "@/components/FooterAuthLinks";
export function SiteFooter() {
  return <footer className="kit-footer">
    <div><Link className="kit-logo" href="/"><BrandMark />QLC</Link><p>Программирование через практику</p></div>
    <nav aria-label="Ссылки в подвале"><Link href="/courses">Курсы</Link><Link href="/#how">Как устроено</Link><Link href="/profile">Моё обучение</Link><FooterAuthLinks /></nav>
    <div className="kit-footer-bottom"><span>© {new Date().getFullYear()} QLC</span><a href="#main-content">Наверх ↑</a></div>
  </footer>;
}
