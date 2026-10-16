import { AppHeader } from './components/AppHeader'
import { useApp } from './context/AppContext'
import { BuyersStep } from './pages/BuyersStep'
import { ComparisonStep } from './pages/ComparisonStep'
import { InputStep } from './pages/InputStep'

export default function App() {
  const { step } = useApp()
  return <div className="app-shell"><AppHeader />{step === 1 ? <InputStep /> : step === 2 ? <BuyersStep /> : <ComparisonStep />}</div>
}
