import { ThemeToggle } from '../components/ThemeToggle'
import './landing-page.css'

export function LandingPage({ onStart }: { onStart: () => void }) {
  return <div className="landing">
    <header className="landing-header"><a className="brand" href="#"><span className="brand-mark" aria-hidden="true"><img src="/favicon-strawberry.png" alt="" /></span><strong>Спаси урожай</strong></a><span className="event-badge">СайХак 2026</span><div className="landing-actions"><ThemeToggle /><button className="button landing-start" onClick={onStart}>Начать <span aria-hidden="true">→</span></button></div></header>
    <main>
      <section className="landing-hero">
        <div className="landing-copy"><span className="eyebrow">От урожая — к выгодной поставке</span><h1>Спаси<br />урожай<span>.</span></h1><h2>Оптимизация поставок<br />скоропортящейся продукции</h2><p>Помогаем фермерским хозяйствам принимать решения: кому, сколько и на какой машине отправить урожай.</p><button className="button landing-start hero-cta" onClick={onStart}>Начать оптимизацию <span aria-hidden="true">→</span></button><small>Запасы → покупатели → оптимальный план</small></div>
        <div className="harvest-scene">
          <div className="hero-art-frame"><img className="landing-hero-art" src="/mascots/warehouse-map-hero-v5.png" alt="Карта перевозок по Обнинску, склад урожая, две клубники и банан" /></div>
          <div className="hero-facts" aria-label="Ключевые показатели">
            <article className="hero-fact hero-fact-progress"><span className="hero-fact-icon" aria-hidden="true">●</span><div><b>Урожай в пути</b><small>От фермы к покупателю</small></div></article>
            <article className="hero-fact hero-fact-profit"><span className="hero-fact-icon" aria-hidden="true">↗</span><div><small>Цель оптимизации</small><b>Больше прибыли</b></div></article>
            <article className="hero-fact hero-fact-ready"><span className="hero-fact-icon" aria-hidden="true">✓</span><div><b>План готов</b><small>Маршруты рассчитаны</small></div></article>
          </div>
        </div>
      </section>
      <section className="landing-benefits" aria-label="Преимущества">{[['↗', 'Максимальная прибыль', 'С учётом затрат на доставку'], ['♡', 'Меньше потерь', 'С учётом сроков продукции'], ['↦', 'Эффективный транспорт', 'Загрузка доступных машин'], ['ϟ', 'Быстрый пересчёт', 'При изменении условий']].map(([icon, title, text], index) => <article key={title}><span className={`benefit-icon benefit-${index}`} aria-hidden="true">{icon}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</section>
    </main>
  </div>
}
