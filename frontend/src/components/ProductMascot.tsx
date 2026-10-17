import type { MascotShape } from '../types'

interface Props {
  name: string
  color: string
  accent: string
  shape: MascotShape
  size?: number
}

const leaves = <path d="M25 11c-5-8-12-7-14-2 5 0 8 2 10 6m4-4c3-8 10-8 13-3-5 1-8 3-10 7" fill="#3d9b58" stroke="#267842" strokeWidth="1.5" strokeLinecap="round" />

export function ProductMascot({ name, color, accent, shape, size = 52 }: Props) {
  const body = (() => {
    switch (shape) {
      case 'strawberry':
        return <><path d="M11 18c1-7 27-7 29 0 1 8-8 25-15 28-7-3-15-20-14-28Z" fill={color} stroke="#c83232" strokeWidth="1.5" /><g fill="#ffd36a"><circle cx="16" cy="25" r="1"/><circle cx="34" cy="25" r="1"/><circle cx="20" cy="36" r="1"/><circle cx="30" cy="37" r="1"/></g>{leaves}</>
      case 'blueberry':
        return <><g fill={color} stroke={accent} strokeWidth=".8"><circle cx="19" cy="18" r="7"/><circle cx="29" cy="17" r="7"/><circle cx="35" cy="25" r="7"/><circle cx="31" cy="35" r="7"/><circle cx="21" cy="38" r="7"/><circle cx="14" cy="30" r="7"/><circle cx="24" cy="27" r="8"/></g>{leaves}</>
      case 'cucumber':
        return <><path d="M10 32c5-15 20-24 29-17 8 7-3 23-17 29-9 4-16-4-12-12Z" fill={color} stroke={accent} strokeWidth="2"/><g fill="#86d99a"><circle cx="17" cy="33" r="1.2"/><circle cx="28" cy="22" r="1.2"/><circle cx="35" cy="18" r="1.2"/></g></>
      case 'carrot':
        return <><path d="M17 17c5-3 15 0 17 5-2 10-8 20-15 27-3-10-5-23-2-32Z" fill={color} stroke="#d97706" strokeWidth="1.5"/>{leaves}</>
      case 'potato':
        return <><path d="M9 27c0-10 8-18 19-17 12 1 18 11 14 22-4 12-17 16-27 10-5-3-7-9-6-15Z" fill={color} stroke={accent} strokeWidth="1.5"/><g fill="#8b603a"><circle cx="15" cy="28" r="1"/><circle cx="34" cy="20" r="1"/><circle cx="32" cy="38" r="1"/></g></>
      case 'cabbage':
        return <><circle cx="25" cy="29" r="18" fill={color} stroke={accent} strokeWidth="1.5"/><path d="M25 13c-7 5-9 12-7 26m7-26c7 5 9 12 7 26M11 26c8-3 20-3 28 0M13 35c8-3 16-3 24 0" fill="none" stroke={accent} strokeWidth="1.4" strokeLinecap="round"/></>
      case 'generic':
        return <><path d="M15 18c3-8 17-9 22 0 5 10 0 25-12 28-12-3-16-19-10-28Z" fill={color} stroke={accent} strokeWidth="1.5"/>{leaves}</>
      default:
        return <><circle cx="25" cy="29" r="17" fill={color} stroke="#c7372f" strokeWidth="1.5"/>{leaves}</>
    }
  })()

  return (
    <svg className="product-mascot" width={size} height={size} viewBox="0 0 50 52" role="img" aria-label={`Персонаж продукта: ${name}`}>
      <g className="mascot-body">{body}</g>
      <g className="mascot-face">
        <g className="mascot-eyes" fill="#16221b">
          <ellipse cx="20.5" cy="28" rx="2.1" ry="2.7" />
          <ellipse cx="29.5" cy="28" rx="2.1" ry="2.7" />
          <circle cx="20" cy="27" r="0.65" fill="white" />
          <circle cx="29" cy="27" r="0.65" fill="white" />
        </g>
        <path d="M22 33c2 2 4 2 6 0" fill="none" stroke="#702f2f" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </svg>
  )
}
