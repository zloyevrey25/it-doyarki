export function LoadingState({ text = 'Выполняем расчёт…' }: { text?: string }) {
  return <div className="request-state" role="status"><span className="spinner" /><strong>{text}</strong><small>Оптимизатор проверяет ограничения и прибыль.</small></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="request-state is-error" role="alert"><span className="state-icon">!</span><strong>Расчёт не выполнен</strong><p>{message}</p><button className="button button-secondary" onClick={onRetry}>Повторить запрос</button></div>
}

export function EmptyState({ text }: { text: string }) {
  return <div className="request-state"><span className="state-icon">○</span><strong>Нет данных</strong><p>{text}</p></div>
}
