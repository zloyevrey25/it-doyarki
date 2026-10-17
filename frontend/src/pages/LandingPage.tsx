import { TruckIllustration } from '../components/TruckIllustration'
import './landing-page.css'

export function LandingPage({ onStart }: { onStart: () => void }) {
  return <div className="landing">
    <header className="landing-header"><a className="brand" href="#"><span className="brand-mark">🌱</span><strong>Спаси урожай</strong></a><span className="event-badge">СайХак 2026</span><button className="button landing-start" onClick={onStart}>Начать <span aria-hidden="true">→</span></button></header>
    <main>
      <section className="landing-hero">
        <div className="landing-copy"><span className="eyebrow">От урожая — к выгодной поставке</span><h1>Спаси<br />урожай<span>.</span></h1><h2>Оптимизация поставок<br />скоропортящейся продукции</h2><p>Помогаем фермерским хозяйствам принимать решения: кому, сколько и на какой машине отправить урожай.</p><button className="button landing-start hero-cta" onClick={onStart}>Начать оптимизацию <span aria-hidden="true">→</span></button><small>Запасы → покупатели → оптимальный план</small></div>
        <div className="harvest-scene" role="img" aria-label="Карта поставок, грузовик, весёлая клубника, удивлённый банан и голубика">
          <svg className="scene-map" viewBox="0 0 600 500" aria-hidden="true"><defs><linearGradient id="field" x2="1" y2="1"><stop stopColor="#f4f7f0"/><stop offset="1" stopColor="#e7f1e7"/></linearGradient></defs><rect x="15" y="25" width="570" height="450" rx="40" fill="url(#field)"/><path d="M35 150 205 65 315 185 565 95M65 380 275 295 510 405" fill="none" stroke="#fff" strokeWidth="22" strokeLinecap="round" opacity=".72"/><path d="M55 430Q285 230 555 410" fill="none" stroke="#d8e9eb" strokeWidth="18" strokeLinecap="round"/><path d="M125 170C205 275 345 135 445 275" fill="none" stroke="#9ac9aa" strokeWidth="4" strokeLinecap="round" opacity=".72"/><g fill="#78b58f" stroke="white" strokeWidth="5"><circle cx="125" cy="170" r="10"/><circle cx="445" cy="275" r="10"/></g></svg>
          <div className="scene-label scene-destination"><span className="scene-dot"/><span><b>Урожай в пути</b><small>От фермы к покупателю</small></span></div>
          <div className="scene-label scene-profit"><span>↗</span><span><small>Цель оптимизации</small><b>Больше прибыли</b></span></div>
          <div className="scene-truck"><TruckIllustration color="#fbfcf9" /></div>
          <img className="scene-fruit scene-strawberry" src="/mascots/strawberry.png" alt="" aria-hidden="true" />
          <img className="scene-fruit scene-banana" src="/mascots/banana.png" alt="" aria-hidden="true" />
          <img className="scene-fruit scene-blackberry" src="/mascots/blackberry.png" alt="" aria-hidden="true" />
          <div className="scene-label scene-stock"><span>✓</span><span><b>Каждый килограмм на счету</b><small>Запасы, спрос и транспорт — в одном плане</small></span></div>
        </div>
      </section>
      <section className="landing-benefits" aria-label="Преимущества">{[['↗', 'Максимальная прибыль', 'С учётом затрат на доставку'], ['♡', 'Меньше потерь', 'С учётом сроков продукции'], ['↦', 'Эффективный транспорт', 'Загрузка доступных машин'], ['ϟ', 'Быстрый пересчёт', 'При изменении условий']].map(([icon, title, text], index) => <article key={title}><span className={`benefit-icon benefit-${index}`} aria-hidden="true">{icon}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</section>
    </main>
  </div>
}
