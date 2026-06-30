import { useEffect, useState } from 'react'
import { Flame, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react'
import { transactionService } from '../../services/transactionService'
import { useBalanceVisibility } from '../../context/BalanceVisibilityContext'
import styles from './LifestyleInflationWidget.module.css'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}

function formatPct(value) {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  return `${num > 0 ? '+' : ''}${num.toFixed(1).replace('.', ',')}%`
}

const statusConfig = {
  HEALTHY: {
    border: 'border-emerald-500', iconBg: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Saudável',
  },
  ATTENTION: {
    border: 'border-amber-400', iconBg: 'bg-amber-400',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Atenção',
  },
  INFLATED: {
    border: 'border-red-500', iconBg: 'bg-red-500',
    chip: 'bg-red-50 text-red-700 border-red-200',
    label: 'Inflando',
  },
  INSUFFICIENT_DATA: {
    border: 'border-gray-300', iconBg: 'bg-gray-400',
    chip: 'bg-gray-50 text-gray-600 border-gray-200',
    label: 'Poucos dados',
  },
}

function TrendChart({ history }) {
  const width = 560, height = 140, padX = 10, padY = 14

  const maxValue = Math.max(
    ...history.map(m => Math.max(Number(m.income), Number(m.expenses))),
    1,
  )

  const xAt = (i) => padX + i * ((width - 2 * padX) / Math.max(history.length - 1, 1))
  const yAt = (v) => height - padY - (Number(v) / maxValue) * (height - 2 * padY)

  const linePoints = (getValue) =>
    history.map((m, i) => `${xAt(i).toFixed(1)},${yAt(getValue(m)).toFixed(1)}`).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height + 18}`} className="w-full">
        <polyline points={linePoints(m => m.income)} fill="none"
          stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
        <polyline points={linePoints(m => m.expenses)} fill="none"
          stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
        {history.map((m, i) => (
          <g key={`${m.year}-${m.month}`}>
            <circle cx={xAt(i)} cy={yAt(m.income)} r="2.5" fill="#10b981" />
            <circle cx={xAt(i)} cy={yAt(m.expenses)} r="2.5" fill="#ef4444" />
            {(history.length <= 7 || i % 2 === 0) && (
              <text x={xAt(i)} y={height + 12} textAnchor="middle"
                style={{ fontSize: '9px', fill: '#9ca3af', fontFamily: 'inherit' }}>
                {m.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className={styles.legendRow}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotIncome}`} /> Renda
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotExpense}`} /> Despesas
        </span>
      </div>
    </div>
  )
}

function GrowthRow({ label, growthPct, average, positiveIsGood }) {
  const { hideBalance } = useBalanceVisibility()
  const num = Number(growthPct ?? 0)
  const isGood = positiveIsGood ? num >= 0 : num <= 0
  const Icon = num >= 0 ? TrendingUp : TrendingDown

  return (
    <div className={styles.growthRow}>
      <span className={styles.growthRowLabel}>{label}</span>
      <div className={styles.growthRowRight}>
        {average !== undefined && (
          <span className={styles.growthRowAverage}>
            média {hideBalance ? '***' : formatCurrency(average)}/mês
          </span>
        )}
        <span className={isGood ? styles.growthValuePositive : styles.growthValueNegative}>
          <Icon size={14} /> {formatPct(growthPct)}
        </span>
      </div>
    </div>
  )
}

export default function LifestyleInflationWidget() {
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    transactionService.lifestyleInflation()
      .then(setData)
      .catch(err => { console.error('lifestyle-inflation error:', err); setError(true) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className={styles.widgetCardSkeleton}>
        <div className={styles.widgetSkeletonContent}>
          <div className={styles.widgetSkeletonIcon} />
          <div className={styles.widgetSkeletonTextGroup}>
            <div className={styles.widgetSkeletonLine1} />
            <div className={styles.widgetSkeletonLine2} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.widgetCardWarning}>
        <div className={styles.widgetWarningContent}>
          <div className={styles.widgetWarningIcon}>
            <Flame size={18} className="text-white" />
          </div>
          <div>
            <p className={styles.widgetWarningTitle}>Inflação de Estilo de Vida</p>
            <p className={styles.widgetWarningSubtitle}>
              Reinicie o backend para carregar este dado (endpoint <code className={styles.endpointCode}>/api/transactions/lifestyle-inflation</code>).
            </p>
          </div>
        </div>
      </div>
    )
  }

  const config = statusConfig[data.status] ?? statusConfig.INSUFFICIENT_DATA
  const hasAnalysis = data.status !== 'INSUFFICIENT_DATA'
  const history = data.history ?? []

  const recentMonths = history.slice(-3)
  const avgOf = (getValue) => recentMonths.length > 0
    ? recentMonths.reduce((sum, m) => sum + Number(getValue(m)), 0) / recentMonths.length
    : 0

  return (
    <div className={`${styles.widgetCard} ${config.border}`}>
      <button onClick={() => setOpen(o => !o)} className={styles.toggleButton}>
        <div className={styles.toggleButtonLeft}>
          <div className={`${styles.iconContainer} ${config.iconBg}`}>
            <Flame size={18} className="text-white" />
          </div>
          <div className={styles.textGroup}>
            <div className={styles.statusRow}>
              <p className={styles.widgetLabel}>Inflação de Estilo de Vida</p>
              <span className={`${styles.statusChip} ${config.chip}`}>{config.label}</span>
            </div>
            {hasAnalysis ? (
              <p className={styles.widgetSummaryValue}>
                Gastos {formatPct(data.expenseGrowthPct)} · Renda {formatPct(data.incomeGrowthPct)}
              </p>
            ) : (
              <p className={styles.widgetInsufficientDataText}>Histórico ainda curto para detectar tendência</p>
            )}
          </div>
        </div>
        <div className={styles.chevronWrapper}>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className={styles.expandedBody}>
          {history.length >= 2 && <TrendChart history={history} />}

          {hasAnalysis && (
            <div className="space-y-2">
              <GrowthRow label="Renda (últimos 3 meses vs. anteriores)"
                growthPct={data.incomeGrowthPct} average={avgOf(m => m.income)} positiveIsGood />
              <GrowthRow label="Despesas (últimos 3 meses vs. anteriores)"
                growthPct={data.expenseGrowthPct} average={avgOf(m => m.expenses)} positiveIsGood={false} />
              <div className={styles.savingsRateRow}>
                <span className={styles.savingsRateLabel}>Taxa de poupança</span>
                <span className={styles.savingsRateValue}>
                  {formatPct(data.baselineSavingsRate)} <span className={styles.savingsRateMuted}>antes</span>
                  {' → '}
                  {formatPct(data.recentSavingsRate)} <span className={styles.savingsRateMuted}>agora</span>
                </span>
              </div>
            </div>
          )}

          <p className={styles.insightBox}>{data.insight}</p>
        </div>
      )}
    </div>
  )
}
