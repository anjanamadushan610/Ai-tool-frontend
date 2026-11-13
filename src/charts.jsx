import { useEffect, useMemo, useRef, useState } from 'react'
import { theme } from 'antd'
import { fmt } from './time'

// One single-hue series per chart (never two y-scales on one chart). Area + 2px line,
// recessive grid, crosshair + tooltip on hover. Text uses text tokens, not the series color.
const SERIES = { light: '#3a6ea5', dark: '#7aa7d9' }
// Same switch main.jsx uses for the Ant Design theme.
const DARK = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches

function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    if (!ref.current) return undefined
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.floor(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

export function AreaChart({ data, field, max, unit = '', height = 160, format = (v) => v }) {
  const { token } = theme.useToken()
  const color = DARK ? SERIES.dark : SERIES.light
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const pad = { l: 36, r: 8, t: 8, b: 22 }
  const pts = useMemo(() => data.filter((d) => d[field] != null), [data, field])
  const yMax = max ?? Math.max(1, ...pts.map((d) => d[field])) * 1.15
  const t0 = pts.length ? new Date(pts[0].at).getTime() : 0
  const t1 = pts.length ? new Date(pts[pts.length - 1].at).getTime() : 1
  const x = (d) => pad.l + ((new Date(d.at).getTime() - t0) / Math.max(1, t1 - t0)) * (width - pad.l - pad.r)
  const y = (v) => pad.t + (1 - v / yMax) * (height - pad.t - pad.b)

  if (pts.length < 2) {
    return <div ref={ref} style={{ height, display: 'grid', placeItems: 'center', color: token.colorTextTertiary }}>Collecting data… (one point a minute)</div>
  }
  const line = pts.map((d, i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)},${y(d[field]).toFixed(1)}`).join('')
  const area = `${line}L${x(pts[pts.length - 1]).toFixed(1)},${y(0)}L${x(pts[0]).toFixed(1)},${y(0)}Z`
  const ticks = [0, yMax / 2, yMax]
  const hours = []
  for (let i = 0; i <= 4; i++) {
    const t = t0 + ((t1 - t0) * i) / 4
    hours.push({ t, label: fmt(new Date(t).toISOString()).slice(11) })
  }

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    let best = 0
    for (let i = 1; i < pts.length; i++) if (Math.abs(x(pts[i]) - px) < Math.abs(x(pts[best]) - px)) best = i
    setHover(best)
  }
  const h = hover != null ? pts[hover] : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img"
           aria-label={`${field} over time`} style={{ display: 'block', touchAction: 'pan-y' }}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={token.colorBorderSecondary} strokeDasharray={i ? '3 3' : undefined} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={token.colorTextTertiary}>{format(t)}</text>
          </g>
        ))}
        {hours.map((hr, i) => (
          <text key={i} x={pad.l + (i / 4) * (width - pad.l - pad.r)} y={height - 6} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'} fontSize="11" fill={token.colorTextTertiary}>{hr.label}</text>
        ))}
        <path d={area} fill={color} opacity="0.16" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {h && (
          <g>
            <line x1={x(h)} x2={x(h)} y1={pad.t} y2={y(0)} stroke={token.colorTextTertiary} strokeWidth="1" />
            <circle cx={x(h)} cy={y(h[field])} r="4" fill={color} stroke={token.colorBgContainer} strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && (
        <div style={{
          position: 'absolute', top: 4, left: Math.min(Math.max(x(h) + 10, 0), width - 150), pointerEvents: 'none',
          background: token.colorBgElevated, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 6,
          padding: '4px 8px', fontSize: 12, boxShadow: token.boxShadowSecondary, color: token.colorText,
        }}>
          <div style={{ color: token.colorTextSecondary }}>{fmt(h.at)}</div>
          <b>{format(h[field])}{unit}</b>
        </div>
      )}
    </div>
  )
}

export function BarList({ rows, value, label, max, format = (v) => v, extra }) {
  const { token } = theme.useToken()
  const top = Math.max(1, max ?? Math.max(...rows.map(value)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((r) => (
        <div key={label(r)} title={`${label(r)}: ${format(value(r))}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label(r)}</span>
            <span style={{ color: token.colorTextSecondary, whiteSpace: 'nowrap' }}>{format(value(r))}{extra ? extra(r) : ''}</span>
          </div>
          <div style={{ height: 6, background: token.colorFillTertiary, borderRadius: 4 }}>
            <div style={{ width: `${(100 * value(r)) / top}%`, height: 6, background: DARK ? SERIES.dark : SERIES.light, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
