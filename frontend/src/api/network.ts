export class NetworkError extends Error {
  constructor(public kind: 'timeout' | 'unavailable' | 'address' | 'coverage' | 'request', message: string) { super(message) }
}

export async function fetchJson<T>(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timer = setTimeout(abort, timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) throw new NetworkError(response.status >= 500 ? 'unavailable' : 'request', response.status >= 500 ? 'Сервис временно недоступен. Повторите попытку.' : 'Сервис отклонил запрос. Проверьте введённые данные.')
    return await response.json() as T
  } catch (error) {
    if (controller.signal.aborted) throw new NetworkError('timeout', 'Превышено время ожидания. Повторите попытку.')
    if (error instanceof NetworkError) throw error
    throw new NetworkError('unavailable', 'Не удалось связаться с сервисом. Проверьте подключение и повторите попытку.')
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}
