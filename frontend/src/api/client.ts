import type { CompareRoutesResult, OptimizationResult, OptimizeRequest } from '../types'

const configuredUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
const API_URL = configuredUrl || '/api'

class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
  } catch {
    throw new ApiError('Не удалось связаться с сервером. Проверьте, запущен ли backend.')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null
    throw new ApiError(payload?.detail || 'Сервер не смог выполнить расчёт.', response.status)
  }
  return response.json() as Promise<T>
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
