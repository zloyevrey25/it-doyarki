import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { DEFAULT_VEHICLES, PRODUCT_CATALOG } from '../data/catalog'
import { DEFAULT_BUYERS } from '../data/nearbyBuyers'
import type { Buyer, CompareRoutesResult, OptimizationResult, Product, RequestStatus, Vehicle } from '../types'

interface AppContextValue {
  step: 1 | 2 | 3
  setStep: (step: 1 | 2 | 3) => void
  farmLocation: string
  setFarmLocation: (value: string) => void
  farmCoordinates: [number, number]
  setFarmCoordinates: (value: [number, number]) => void
  buyers: Buyer[]
  setBuyers: (buyers: Buyer[]) => void
  products: Product[]
  setProducts: Dispatch<SetStateAction<Product[]>>
  vehicles: Vehicle[]
  setVehicles: Dispatch<SetStateAction<Vehicle[]>>
  selectedBuyers: string[]
  setSelectedBuyers: Dispatch<SetStateAction<string[]>>
  optimization: OptimizationResult | null
  setOptimization: (result: OptimizationResult | null) => void
  comparison: CompareRoutesResult | null
  setComparison: (result: CompareRoutesResult | null) => void
  status: RequestStatus
  setStatus: (status: RequestStatus) => void
  error: string
  setError: (error: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [farmLocation, setFarmLocation] = useState('село Большие Кабаны, Республика Татарстан')
  const [farmCoordinates, setFarmCoordinates] = useState<[number, number]>([55.6493585, 49.3054794])
  const [buyers, setBuyers] = useState<Buyer[]>(DEFAULT_BUYERS)
  const [products, setProducts] = useState<Product[]>(PRODUCT_CATALOG)
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEFAULT_VEHICLES)
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([])
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null)
  const [comparison, setComparison] = useState<CompareRoutesResult | null>(null)
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [error, setError] = useState('')

  const value = useMemo(() => ({
    step, setStep, farmLocation, setFarmLocation, farmCoordinates, setFarmCoordinates, buyers, setBuyers,
    products, setProducts, vehicles, setVehicles,
    selectedBuyers, setSelectedBuyers, optimization, setOptimization, comparison, setComparison,
    status, setStatus, error, setError,
  }), [step, farmLocation, farmCoordinates, buyers, products, vehicles, selectedBuyers, optimization, comparison, status, error])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp должен использоваться внутри AppProvider')
  return context
}
