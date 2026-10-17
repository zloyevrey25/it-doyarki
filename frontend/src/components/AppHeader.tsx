import { useApp } from '../context/AppContext'
import { ModelAssumptions } from './ModelAssumptions'

const steps = ['Исходные данные', 'Покупатели и маршруты', 'Сравнение']

export function AppHeader({ onHome }: { onHome: () => void }) {
  const { step, setStep, status } = useApp()
  return (
    <header className="app-header">
      <button className="brand" onClick={onHome} aria-label="Перейти на стартовую страницу">
        <span className="brand-mark" aria-hidden="true">🌱</span>
        <span><strong>Спаси урожай</strong><small>Планировщик поставок</small></span>
      </button>
      <nav className="stepper" aria-label="Этапы планирования">
        {steps.map((label, index) => {
          const number = (index + 1) as 1 | 2 | 3
          return (
            <div className={`stepper-item ${number === step ? 'is-current' : ''} ${number < step ? 'is-complete' : ''}`} key={label} aria-current={number === step ? 'step' : undefined}>
              <span>{number}</span><b>{label}</b>
              {index < steps.length - 1 && <i aria-hidden="true">→</i>}
            </div>
          )
        })}
      </nav>
      <div className="header-actions">
        <ModelAssumptions />
        {step > 1 && <button className="button button-ghost header-back" disabled={status === 'loading'} onClick={() => setStep((step - 1) as 1 | 2)} aria-label="Вернуться на предыдущий этап">← Назад</button>}
      </div>
    </header>
  )
}
