import { ProductMascot } from '../components/ProductMascot'
import { TruckIllustration } from '../components/TruckIllustration'
import './landing-page.css'

export function LandingPage({ onStart }: { onStart: () => void }) {
  return <div className="landing">
    <header className="landing-header"><a className="brand" href="#"><span className="brand-mark">🌱</span><strong>Спаси урожай</strong></a><span className="event-badge">СайХак 2026</span><button className="button landing-start" onClick={onStart}>Начать <span aria-hidden="true">→</span></button></header>
    <main>
      <section className="landing-hero">
        <div className="landing-copy"><span className="eyebrow">От урожая — к выгодной поставке</span><h1>Спаси<br />урожай<span>.</span></h1><h2>Оптимизация поставок<br />скоропортящейся продукции</h2><p>Помогаем фермерским хозяйствам принимать решения: кому, сколько и на какой машине отправить урожай.</p><button className="button landing-start hero-cta" onClick={onStart}>Начать оптимизацию <span aria-hidden="true">→</span></button><small>Запасы → покупатели → оптимальный план</small></div>
        <div className="harvest-scene" role="img" aria-label="Карта поставок, грузовик с овощами, весёлая клубника и удивлённый банан">
          <svg className="scene-map" viewBox="0 0 600 500" aria-hidden="true"><defs><linearGradient id="field" x2="1" y2="1"><stop stopColor="#e6efda"/><stop offset="1" stopColor="#cfe3cf"/></linearGradient></defs><rect x="15" y="25" width="570" height="450" rx="40" fill="url(#field)"/><path d="M20 140 200 50 300 180 570 80M40 350 270 290 420 450M200 50 180 420M400 30 350 260 580 320" fill="none" stroke="#f5f7ed" strokeWidth="23"/><path d="M40 430Q280 200 560 420" fill="none" stroke="#b4dce0" strokeWidth="25"/><path d="M120 160C120 320 350 100 430 270" fill="none" stroke="#33875b" strokeWidth="5" strokeDasharray="10 9"/><g fill="#268657" stroke="white" strokeWidth="5"><circle cx="120" cy="160" r="12"/><circle cx="290" cy="220" r="10"/><circle cx="430" cy="270" r="12"/></g></svg>
          <div className="scene-label scene-destination"><span className="scene-dot"/><span><b>Урожай в пути</b><small>От фермы к покупателю</small></span></div>
          <div className="scene-label scene-profit"><span>↗</span><span><small>Цель оптимизации</small><b>Больше прибыли</b></span></div>
          <div className="scene-truck"><TruckIllustration color="#fbfcf9" /></div>
          <div className="scene-crate"><ProductMascot name="Томат" color="#ed6650" accent="#27824b" shape="round" size={70}/><ProductMascot name="Огурец" color="#67b970" accent="#27824b" shape="cucumber" size={76}/><span>СВЕЖИЙ УРОЖАЙ</span></div>
          <div className="scene-strawberry"><ProductMascot name="Клубника" color="#ef655b" accent="#27824b" shape="strawberry" size={155}/></div>
          <svg className="scene-banana" viewBox="0 0 130 180" aria-hidden="true"><path d="M86 20C117 85 90 141 29 155 4 161 4 141 24 132 72 109 91 73 76 27Z" fill="#f5d567" stroke="#d3ad40" strokeWidth="3"/><path d="M82 33C98 92 67 134 23 144" fill="none" stroke="#ffeaa0" strokeWidth="8" strokeLinecap="round"/><path d="m76 28-4-16 12-4 5 15" fill="#84965a"/><ellipse cx="70" cy="89" rx="7" ry="10" fill="white"/><ellipse cx="91" cy="83" rx="7" ry="10" fill="white"/><ellipse cx="72" cy="89" rx="3" ry="5" fill="#263d30"/><ellipse cx="92" cy="83" rx="3" ry="5" fill="#263d30"/><ellipse cx="80" cy="108" rx="5" ry="7" fill="#805637"/><path d="m62 70 11-4m12-5 12 2M45 115 26 99m68 12 19-16" fill="none" stroke="#805637" strokeWidth="3" strokeLinecap="round"/></svg>
          <div className="scene-label scene-stock"><span>✓</span><span><b>Каждый килограмм на счету</b><small>Запасы, спрос и транспорт — в одном плане</small></span></div>
        </div>
      </section>
      <section className="landing-benefits" aria-label="Преимущества">{[['↗', 'Максимальная прибыль', 'С учётом затрат на доставку'], ['♡', 'Меньше потерь', 'С учётом сроков продукции'], ['↦', 'Эффективный транспорт', 'Загрузка доступных машин'], ['ϟ', 'Быстрый пересчёт', 'При изменении условий']].map(([icon, title, text], index) => <article key={title}><span className={`benefit-icon benefit-${index}`} aria-hidden="true">{icon}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</section>
    </main>
  </div>
}
