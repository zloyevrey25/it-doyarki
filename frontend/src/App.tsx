import { useState } from 'react'
import { LandingPage } from './pages/LandingPage'
import { AppHeader } from './components/AppHeader'
import { useApp } from './context/AppContext'
import { BuyersStep } from './pages/BuyersStep'
import { ComparisonStep } from './pages/ComparisonStep'
import { InputStep } from './pages/InputStep'

export default function App() {
  const { step, setStep } = useApp()
  const [started, setStarted] = useState(false)
  if (!started) return <LandingPage onStart={() => { setStep(1); setStarted(true); window.scrollTo(0, 0) }} />
  return <div className="app-shell"><AppHeader />{step === 1 ? <InputStep /> : step === 2 ? <BuyersStep /> : <ComparisonStep />}</div>
}
