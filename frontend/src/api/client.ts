import type { CompareRoutesResult, OptimizationResult, OptimizeRequest } from '../types'
import { fetchJson, NetworkError } from './network'

const configuredUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
const API_URL = configuredUrl || '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await fetchJson<T>(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
  } catch (error) {
    if (error instanceof NetworkError) throw new NetworkError(error.kind, `Расчёт: ${error.message}${error.kind === 'unavailable' ? ' Проверьте, запущен ли локальный сервер расчёта.' : ''}`)
    throw new Error('Не удалось выполнить расчёт. Повторите попытку.')
  }
}

export const apiClient = {
  health: () => request<{ status: string }>('/health'),
  optimize: (payload: OptimizeRequest) => request<OptimizationResult>('/optimize', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  compareRoutes: (payload: OptimizeRequest, selectedBuyers: string[], maxSolutions = 3) =>
    request<CompareRoutesResult>('/compare-routes', {
      method: 'POST',
      body: JSON.stringify({ ...payload, selected_buyers: selectedBuyers, max_solutions: maxSolutions }),
    }),
}
