import React, { useMemo, useState, useId } from 'react'

export type TaskProgressBarProps = {
  percent: number // 0..1 raw
  percentDisplay: number // 0..100
  estimateText?: string | null
  actualText?: string | null
  overrunPercent?: number
  status: 'todo' | 'in_progress' | 'blocked' | 'completed'
  breakdown?: Array<{ id: number | string; title: string; weight: number; progress: number; status: string }>
  className?: string
}

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(x, hi))

const statusColor: Record<TaskProgressBarProps['status'], string> = {
  completed: '#16a34a',
  in_progress: '#2563eb',
  blocked: '#f59e0b',
  todo: '#9ca3af',
}

export function TaskProgressBar({
  percent,
  percentDisplay,
  estimateText,
  actualText,
  overrunPercent = 0,
  status,
  breakdown,
  className,
}: TaskProgressBarProps) {
  const p = clamp(percent, 0, status === 'completed' ? 1 : 0.95)
  const color = statusColor[status]
  const ariaNow = Math.round(clamp(percentDisplay, 0, 100))

  const [open, setOpen] = useState(false)
  const hasBreakdown = Array.isArray(breakdown) && breakdown.length > 0
  const sectionId = useId()
  const panelId = `tpb-breakdown-${sectionId}`

  const totalWeight = useMemo(() => {
    if (!hasBreakdown) return 0
    return (breakdown as NonNullable<TaskProgressBarProps['breakdown']>).reduce((sum, b) => sum + (b?.weight ?? 0), 0)
  }, [hasBreakdown, breakdown])

  const childColor = (s: string) => (statusColor as any)[s] || '#9ca3af'

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ariaNow}
        aria-label="任务完成进度"
        style={{
          background: '#e5e7eb',
          borderRadius: 6,
          height: 12,
          position: 'relative',
          overflow: 'hidden',
        }}
        title={`已完成 ${ariaNow}%${estimateText ? ` | 预估 ${estimateText}` : ''}${actualText ? ` | 已登记 ${actualText}` : ''}`}
      >
        <div
          style={{
            width: `${p * 100}%`,
            background: color,
            height: '100%',
            transition: 'width 200ms ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#374151' }}>
        <span>已完成 {ariaNow}%</span>
        <span>
          {estimateText ? `预估 ${estimateText}` : '未设估算'}
          {typeof overrunPercent === 'number' && overrunPercent > 0 ? ` · 超出估算 +${overrunPercent}%` : ''}
          {actualText ? ` · 已登记 ${actualText}` : ''}
        </span>
      </div>

      {hasBreakdown && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#2563eb',
              cursor: 'pointer',
              padding: 0,
              fontSize: 12,
            }}
          >
            {open ? '收起进度明细 ▲' : '查看进度明细 ▼'}
          </button>

          {open && (
            <div
              id={panelId}
              role="region"
              aria-label="子任务进度明细"
              style={{
                marginTop: 8,
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                background: '#fafafa',
                padding: 8,
              }}
            >
              {(breakdown as NonNullable<TaskProgressBarProps['breakdown']>).map((b) => {
                const prog = clamp(b.progress ?? 0, 0, 1)
                const progPct = Math.round(prog * 100)
                const wPct = totalWeight > 0 ? Math.round(((b.weight ?? 0) / totalWeight) * 100) : 0
                return (
                  <div key={String(b.id)} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.title}>
                        {b.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {wPct}% 权重 · {progPct}% 完成 · {b.status}
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#e5e7eb',
                        borderRadius: 4,
                        height: 8,
                        overflow: 'hidden',
                        marginTop: 4,
                      }}
                      aria-label={`${b.title} 完成 ${progPct}%`}
                    >
                      <div
                        style={{
                          width: `${progPct}%`,
                          background: childColor(b.status),
                          height: '100%',
                          transition: 'width 200ms ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

