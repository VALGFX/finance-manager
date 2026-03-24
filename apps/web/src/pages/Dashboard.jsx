import {
	AlertTriangle,
	ArrowDownRight,
	ArrowUpRight,
	BarChart3,
	CalendarDays,
	Hash,
	Pencil,
	PieChart as PieIcon,
	PiggyBank,
	Target,
	TrendingDown,
	TrendingUp,
	Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

const START_DATE = '2026-03-23'

// localStorage keys
const LS_GOAL_TOTAL = 'fm_goal_total_mdl' // economisire target total
const LS_BUDGET_BY_MONTH = 'fm_budget_by_month_mdl' // buget pe luna (object { "YYYY-MM": number })

function money(n) {
	const v = Number(n || 0)
	return new Intl.NumberFormat('ro-RO', {
		style: 'currency',
		currency: 'MDL',
		maximumFractionDigits: 0,
	}).format(v)
}
function pct(n) {
	if (n == null || Number.isNaN(n)) return '—'
	return `${Math.round(n * 100)}%`
}
function daysInMonth(yyyyMm) {
	const [y, m] = yyyyMm.split('-').map(Number)
	return new Date(y, m, 0).getDate()
}
function isMonthBeforeStart(yyyyMm) {
	// start date is mid-month; anything earlier than March 2026 still before start
	// for March 2026, we still allow calculations, but only from 23rd is a backend thing.
	// Frontend can't filter by day using listTransactions(month). We'll allow March 2026 as valid month.
	return `${yyyyMm}-01` < '2026-03-01'
}
function monthLabel(yyyyMm) {
	const [y, m] = yyyyMm.split('-').map(Number)
	const d = new Date(y, m - 1, 1)
	return d.toLocaleString('ro-RO', { month: 'short' }) + ' ' + y
}
function addMonths(yyyyMm, delta) {
	const [y, m] = yyyyMm.split('-').map(Number)
	const d = new Date(y, m - 1 + delta, 1)
	const yy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	return `${yy}-${mm}`
}

function StatCard({ title, value, subtitle, icon: Icon, accent = false }) {
	return (
		<div className={`kpiCard ${accent ? 'accentCard' : ''}`}>
			<div className='kpiTop'>
				<div className='kpiTitle'>{title}</div>
				<div className='kpiIcon'>
					<Icon size={18} />
				</div>
			</div>
			<div className='kpiMain'>{value}</div>
			<div className='kpiSub'>{subtitle}</div>
		</div>
	)
}

function MiniBarChart({ series }) {
	const max = Math.max(
		0,
		...series.map(s => Math.max(Number(s.income || 0), Number(s.expense || 0))),
	)

	return (
		<div style={{ display: 'grid', gap: 10 }}>
			{series.map(s => {
				const inc = Number(s.income || 0)
				const exp = Number(s.expense || 0)
				const incW = max ? Math.round((inc / max) * 100) : 0
				const expW = max ? Math.round((exp / max) * 100) : 0

				return (
					<div
						key={s.month}
						style={{
							borderRadius: 'var(--r28)',
							border: '1px solid var(--border)',
							background: '#fff',
							padding: 12,
							display: 'grid',
							gap: 10,
						}}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								gap: 12,
								flexWrap: 'wrap',
							}}
						>
							<div style={{ fontWeight: 950 }}>{monthLabel(s.month)}</div>
							<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
								<span className='badge'>Venit: {money(inc)}</span>
								<span className='badge'>Chelt.: {money(exp)}</span>
							</div>
						</div>

						<div style={{ display: 'grid', gap: 8 }}>
							<div style={{ display: 'grid', gap: 6 }}>
								<div
									style={{
										fontSize: 12,
										fontWeight: 900,
										color: 'var(--muted)',
									}}
								>
									Income
								</div>
								<div
									style={{
										height: 10,
										borderRadius: 999,
										border: '1px solid var(--border)',
										background: 'rgba(15,23,42,.04)',
										overflow: 'hidden',
									}}
								>
									<div
										style={{
											width: `${incW}%`,
											height: '100%',
											borderRadius: 999,
											background:
												'linear-gradient(90deg, rgba(22,163,74,.95), rgba(22,163,74,.55))',
										}}
									/>
								</div>
							</div>

							<div style={{ display: 'grid', gap: 6 }}>
								<div
									style={{
										fontSize: 12,
										fontWeight: 900,
										color: 'var(--muted)',
									}}
								>
									Expense
								</div>
								<div
									style={{
										height: 10,
										borderRadius: 999,
										border: '1px solid var(--border)',
										background: 'rgba(15,23,42,.04)',
										overflow: 'hidden',
									}}
								>
									<div
										style={{
											width: `${expW}%`,
											height: '100%',
											borderRadius: 999,
											background:
												'linear-gradient(90deg, rgba(239,68,68,.95), rgba(239,68,68,.55))',
										}}
									/>
								</div>
							</div>
						</div>
					</div>
				)
			})}
		</div>
	)
}

function ProgressBar({ pctValue, warn }) {
	const p = Math.max(0, Math.min(100, Math.round(pctValue || 0)))
	return (
		<div
			style={{
				marginTop: 12,
				height: 12,
				borderRadius: 999,
				border: '1px solid var(--border)',
				background: 'rgba(15,23,42,.04)',
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					width: `${p}%`,
					height: '100%',
					borderRadius: 999,
					background: warn
						? 'linear-gradient(90deg, rgba(251,191,36,.95), rgba(239,68,68,.75))'
						: 'linear-gradient(90deg, rgba(249,115,22,.95), rgba(249,115,22,.55))',
				}}
			/>
		</div>
	)
}

function loadNumber(key, fallback) {
	try {
		const raw = localStorage.getItem(key)
		if (raw == null) return fallback
		const n = Number(raw)
		return Number.isFinite(n) ? n : fallback
	} catch {
		return fallback
	}
}
function saveNumber(key, n) {
	localStorage.setItem(key, String(Number(n || 0)))
}
function loadBudgetMap() {
	try {
		const raw = localStorage.getItem(LS_BUDGET_BY_MONTH)
		const obj = raw ? JSON.parse(raw) : {}
		return obj && typeof obj === 'object' ? obj : {}
	} catch {
		return {}
	}
}
function saveBudgetMap(obj) {
	localStorage.setItem(LS_BUDGET_BY_MONTH, JSON.stringify(obj))
}

export default function Dashboard() {
	const [sp] = useSearchParams()
	const q = (sp.get('q') || '').toLowerCase().trim()

	const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
	const [items, setItems] = useState([])
	const [err, setErr] = useState('')

	const [series, setSeries] = useState([])
	const [loadingChart, setLoadingChart] = useState(false)

	const [goalTotal, setGoalTotal] = useState(() =>
		loadNumber(LS_GOAL_TOTAL, 50000),
	)
	const [editingGoal, setEditingGoal] = useState(false)

	const [budgetMap, setBudgetMap] = useState(() => loadBudgetMap())
	const budgetForMonth = Number(budgetMap[month] || 0)
	const [editingBudget, setEditingBudget] = useState(false)

	const monthIsBeforeStart = useMemo(() => isMonthBeforeStart(month), [month])

	async function loadMonth() {
		setErr('')
		setItems([])
		try {
			const data = await api.listTransactions(month)
			setItems(Array.isArray(data) ? data : [])
		} catch (e) {
			setErr(String(e?.message || e))
		}
	}

	async function loadChart() {
		setLoadingChart(true)
		try {
			const months = Array.from({ length: 6 }, (_, i) =>
				addMonths(month, -5 + i),
			)
			const results = []

			for (const m of months) {
				if (isMonthBeforeStart(m)) {
					results.push({ month: m, income: 0, expense: 0 })
					continue
				}
				const rows = await api.listTransactions(m)
				let inc = 0,
					exp = 0
				for (const t of Array.isArray(rows) ? rows : []) {
					const amt = Number(t.amount || 0)
					if (t.type === 'income') inc += amt
					if (t.type === 'expense') exp += amt
				}
				results.push({ month: m, income: inc, expense: exp })
			}

			setSeries(results)
		} catch (e) {
			setErr(String(e?.message || e))
		} finally {
			setLoadingChart(false)
		}
	}

	useEffect(() => {
		loadMonth()
		loadChart()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [month])

	const filtered = useMemo(() => {
		if (!q) return items
		return items.filter(t => {
			const s =
				`${t.category || ''} ${t.description || ''} ${t.type || ''} ${String(t.amount || '')}`.toLowerCase()
			return s.includes(q)
		})
	}, [items, q])

	const metrics = useMemo(() => {
		const base = {
			income: 0,
			expense: 0,
			net: 0,
			savingRate: null,
			avgPerDay: 0,
			countTotal: 0,
			incomeCount: 0,
			expenseCount: 0,
			maxIncome: null,
			maxExpense: null,
			topCategory: null,
			topCats: [],
		}

		if (monthIsBeforeStart) return base

		let income = 0
		let expense = 0
		let incomeCount = 0
		let expenseCount = 0

		let maxIncome = null
		let maxExpense = null

		const catTotals = new Map()

		for (const t of filtered) {
			const amt = Number(t.amount || 0)

			if (t.type === 'income') {
				income += amt
				incomeCount++
				if (!maxIncome || amt > Number(maxIncome.amount || 0)) maxIncome = t
			} else if (t.type === 'expense') {
				expense += amt
				expenseCount++
				if (!maxExpense || amt > Number(maxExpense.amount || 0)) maxExpense = t

				const c = String(t.category || 'Altele')
				catTotals.set(c, (catTotals.get(c) || 0) + amt)
			}
		}

		const net = income - expense
		const savingRate = income > 0 ? net / income : null
		const days = daysInMonth(month)
		const avgPerDay = days ? expense / days : 0

		let topCategory = null
		for (const [category, total] of catTotals.entries()) {
			if (!topCategory || total > topCategory.total)
				topCategory = { category, total }
		}
		const topCats = Array.from(catTotals.entries())
			.map(([category, total]) => ({ category, total }))
			.sort((a, b) => b.total - a.total)
			.slice(0, 5)

		return {
			income,
			expense,
			net,
			savingRate,
			avgPerDay,
			countTotal: filtered.length,
			incomeCount,
			expenseCount,
			maxIncome,
			maxExpense,
			topCategory,
			topCats,
		}
	}, [filtered, month, monthIsBeforeStart])

	// Savings for goal: using series (last 6 months) after START_DATE (approx)
	const savingsForGoal = useMemo(() => {
		let total = 0
		for (const s of series) {
			// For March 2026: start is 23rd, but series is monthly => approximate.
			// If you want exact day precision, we need a backend range endpoint.
			if (`${s.month}-01` >= '2026-03-01') {
				total += Number(s.income || 0) - Number(s.expense || 0)
			}
		}
		return total
	}, [series])

	const goalPct = goalTotal > 0 ? (savingsForGoal / goalTotal) * 100 : 0

	const budgetSpent = monthIsBeforeStart ? 0 : metrics.expense
	const budgetPct =
		budgetForMonth > 0 ? (budgetSpent / budgetForMonth) * 100 : 0
	const budgetWarn = budgetForMonth > 0 && (budgetPct >= 90 || budgetPct > 100)

	const greeting = useMemo(() => {
		const h = new Date().getHours()
		if (h < 12) return 'Bună dimineața'
		if (h < 18) return 'Bună ziua'
		return 'Bună seara'
	}, [])

	return (
		<div style={{ display: 'grid', gap: 14 }}>
			<div className='panel hero'>
				<div>
					<div className='heroTitle'>
						{greeting}
						<span style={{ color: 'var(--accent)' }}>.</span>
					</div>
					<div className='heroSub'>
						Calculul începe de la <b>{START_DATE}</b>. Lunile sunt vizibile
						toate.
						{q ? (
							<>
								{' '}
								Filtru: <b>“{q}”</b>
							</>
						) : null}
					</div>

					{monthIsBeforeStart && (
						<div style={{ marginTop: 10 }} className='badge'>
							Luna selectată este înainte de start — indicatorii sunt 0.
						</div>
					)}
				</div>

				<div style={{ width: 'min(260px, 100%)' }}>
					<div className='label'>Perioadă</div>
					<input
						className='input'
						type='month'
						value={month}
						onChange={e => setMonth(e.target.value)}
					/>
				</div>
			</div>

			{err && <div className='error'>{err}</div>}

			<div className='kpiGrid'>
				<StatCard
					title='Venituri'
					value={money(metrics.income)}
					subtitle={`${metrics.incomeCount} tranzacții venit`}
					icon={TrendingUp}
					accent
				/>
				<StatCard
					title='Cheltuieli'
					value={money(metrics.expense)}
					subtitle={`${metrics.expenseCount} tranzacții cheltuială`}
					icon={TrendingDown}
				/>
				<StatCard
					title='Net'
					value={money(metrics.net)}
					subtitle='Venituri - cheltuieli'
					icon={Wallet}
				/>
				<StatCard
					title='Rata economisire'
					value={pct(metrics.savingRate)}
					subtitle='Net / venituri'
					icon={PiggyBank}
				/>
				<StatCard
					title='Cheltuială / zi'
					value={money(metrics.avgPerDay)}
					subtitle={`(aprox.) în ${daysInMonth(month)} zile`}
					icon={CalendarDays}
				/>
				<StatCard
					title='Nr. tranzacții'
					value={`${metrics.countTotal}`}
					subtitle='Total (după filtrare)'
					icon={Hash}
				/>
				<StatCard
					title='Cea mai mare încasare'
					value={money(metrics.maxIncome?.amount || 0)}
					subtitle={metrics.maxIncome ? metrics.maxIncome.category || '—' : '—'}
					icon={ArrowUpRight}
				/>
				<StatCard
					title='Cea mai mare cheltuială'
					value={money(metrics.maxExpense?.amount || 0)}
					subtitle={
						metrics.maxExpense ? metrics.maxExpense.category || '—' : '—'
					}
					icon={ArrowDownRight}
				/>
			</div>

			<div
				style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 14 }}
			>
				<div className='panel cardPad'>
					<div
						style={{
							display: 'flex',
							alignItems: 'flex-start',
							justifyContent: 'space-between',
							gap: 12,
							flexWrap: 'wrap',
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
							<div
								style={{
									width: 44,
									height: 44,
									borderRadius: 16,
									display: 'grid',
									placeItems: 'center',
									border: '1px solid var(--border)',
									background: 'rgba(15,23,42,.03)',
									color: 'var(--muted)',
								}}
							>
								<BarChart3 size={18} />
							</div>
							<div>
								<div
									style={{
										fontSize: 18,
										fontWeight: 950,
										letterSpacing: '-0.3px',
									}}
								>
									Grafice (ultimele 6 luni)
								</div>
								<div
									style={{
										marginTop: 4,
										color: 'var(--muted)',
										fontWeight: 700,
										fontSize: 13,
									}}
								>
									Venituri vs Cheltuieli {loadingChart ? '(loading...)' : ''}
								</div>
							</div>
						</div>
						<span className='badge'>6 luni</span>
					</div>

					<div style={{ marginTop: 12 }}>
						<MiniBarChart series={series} />
					</div>
				</div>

				<div style={{ display: 'grid', gap: 14 }}>
					<div className='panel cardPad'>
						<div
							style={{
								display: 'flex',
								alignItems: 'flex-start',
								justifyContent: 'space-between',
								gap: 12,
								flexWrap: 'wrap',
							}}
						>
							<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
								<div
									style={{
										width: 44,
										height: 44,
										borderRadius: 16,
										display: 'grid',
										placeItems: 'center',
										border: '1px solid var(--border)',
										background: 'rgba(15,23,42,.03)',
										color: 'var(--muted)',
									}}
								>
									<Target size={18} />
								</div>
								<div>
									<div
										style={{
											fontSize: 18,
											fontWeight: 950,
											letterSpacing: '-0.3px',
										}}
									>
										Obiectiv economisire
									</div>
									<div
										style={{
											marginTop: 4,
											color: 'var(--muted)',
											fontWeight: 700,
											fontSize: 13,
										}}
									>
										Target total (MDL)
									</div>
								</div>
							</div>

							<button
								className='btn btnSoft'
								type='button'
								onClick={() => setEditingGoal(s => !s)}
							>
								<Pencil size={16} /> Edit
							</button>
						</div>

						{editingGoal && (
							<div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
								<div>
									<div className='label'>Target total (MDL)</div>
									<input
										className='input'
										type='number'
										min='0'
										step='1'
										value={goalTotal}
										onChange={e => setGoalTotal(Number(e.target.value))}
									/>
								</div>
								<div
									style={{
										display: 'flex',
										justifyContent: 'flex-end',
										gap: 10,
									}}
								>
									<button
										className='btn btnSoft'
										type='button'
										onClick={() => setEditingGoal(false)}
									>
										Close
									</button>
									<button
										className='btn btnPrimary'
										type='button'
										onClick={() => {
											saveNumber(LS_GOAL_TOTAL, goalTotal)
											setEditingGoal(false)
										}}
									>
										Save
									</button>
								</div>
							</div>
						)}

						<div style={{ marginTop: 12 }}>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									gap: 12,
									flexWrap: 'wrap',
								}}
							>
								<span className='badge'>Economii: {money(savingsForGoal)}</span>
								<span className='badge'>Target: {money(goalTotal)}</span>
							</div>
							<ProgressBar pctValue={goalPct} warn={false} />
							<div
								style={{
									marginTop: 10,
									color: 'var(--muted)',
									fontWeight: 800,
									fontSize: 12,
								}}
							>
								Progres: {Math.max(0, Math.min(100, Math.round(goalPct)))}%
							</div>
						</div>
					</div>

					<div className='panel cardPad'>
						<div
							style={{
								display: 'flex',
								alignItems: 'flex-start',
								justifyContent: 'space-between',
								gap: 12,
								flexWrap: 'wrap',
							}}
						>
							<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
								<div
									style={{
										width: 44,
										height: 44,
										borderRadius: 16,
										display: 'grid',
										placeItems: 'center',
										border: '1px solid var(--border)',
										background: 'rgba(15,23,42,.03)',
										color: 'var(--muted)',
									}}
								>
									<Wallet size={18} />
								</div>
								<div>
									<div
										style={{
											fontSize: 18,
											fontWeight: 950,
											letterSpacing: '-0.3px',
										}}
									>
										Buget lunar (setabil)
									</div>
									<div
										style={{
											marginTop: 4,
											color: 'var(--muted)',
											fontWeight: 700,
											fontSize: 13,
										}}
									>
										Setezi limita pentru luna {month}
									</div>
								</div>
							</div>

							<button
								className='btn btnSoft'
								type='button'
								onClick={() => setEditingBudget(s => !s)}
							>
								<Pencil size={16} /> Edit
							</button>
						</div>

						{editingBudget && (
							<div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
								<div>
									<div className='label'>Limită cheltuieli ({month}) (MDL)</div>
									<input
										className='input'
										type='number'
										min='0'
										step='1'
										value={budgetForMonth}
										onChange={e => {
											const next = Number(e.target.value || 0)
											const nm = { ...budgetMap, [month]: next }
											setBudgetMap(nm)
										}}
									/>
								</div>
								<div
									style={{
										display: 'flex',
										justifyContent: 'flex-end',
										gap: 10,
									}}
								>
									<button
										className='btn btnSoft'
										type='button'
										onClick={() => setEditingBudget(false)}
									>
										Close
									</button>
									<button
										className='btn btnPrimary'
										type='button'
										onClick={() => {
											saveBudgetMap(budgetMap)
											setEditingBudget(false)
										}}
									>
										Save
									</button>
								</div>
							</div>
						)}

						<div style={{ marginTop: 12 }}>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									gap: 12,
									flexWrap: 'wrap',
								}}
							>
								<span className='badge'>Cheltuit: {money(budgetSpent)}</span>
								<span className='badge'>Buget: {money(budgetForMonth)}</span>
							</div>
							<ProgressBar
								pctValue={budgetForMonth > 0 ? budgetPct : 0}
								warn={budgetWarn}
							/>

							<div
								style={{
									marginTop: 10,
									display: 'flex',
									justifyContent: 'space-between',
									gap: 12,
									flexWrap: 'wrap',
								}}
							>
								<div
									style={{
										color: 'var(--muted)',
										fontWeight: 800,
										fontSize: 12,
									}}
								>
									Progres:{' '}
									{Math.max(0, Math.min(100, Math.round(budgetPct || 0)))}%
								</div>
								{budgetWarn && (
									<span
										className='badge'
										style={{
											borderColor: 'rgba(251,191,36,.28)',
											background: 'rgba(251,191,36,.10)',
										}}
									>
										<AlertTriangle size={14} style={{ marginRight: 6 }} />
										Atenție buget
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className='panel cardPad'>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
						flexWrap: 'wrap',
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
						<div
							style={{
								width: 44,
								height: 44,
								borderRadius: 16,
								display: 'grid',
								placeItems: 'center',
								border: '1px solid var(--border)',
								background: 'rgba(15,23,42,.03)',
								color: 'var(--muted)',
							}}
						>
							<PieIcon size={18} />
						</div>
						<div>
							<div
								style={{
									fontSize: 18,
									fontWeight: 950,
									letterSpacing: '-0.3px',
								}}
							>
								Top categorii (cheltuieli)
							</div>
							<div
								style={{
									marginTop: 4,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Top 5 (după filtrare)
							</div>
						</div>
					</div>

					<span className='badge'>
						{metrics.topCategory
							? `Top: ${metrics.topCategory.category} (${money(metrics.topCategory.total)})`
							: '—'}
					</span>
				</div>

				<div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
					{!metrics.topCats.length ? (
						<div
							style={{
								borderRadius: 'var(--r28)',
								border: '1px dashed rgba(15,23,42,.18)',
								background: 'rgba(15,23,42,.02)',
								padding: 16,
							}}
						>
							<div style={{ fontWeight: 950 }}>
								Nu există cheltuieli pentru luna selectată.
							</div>
							<div
								style={{
									marginTop: 6,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Adaugă cheltuieli în Transactions ca să vezi topul.
							</div>
						</div>
					) : (
						(() => {
							const max = Math.max(...metrics.topCats.map(x => x.total))
							return metrics.topCats.map(c => {
								const w = max ? Math.round((c.total / max) * 100) : 0
								return (
									<div
										key={c.category}
										style={{
											borderRadius: 'var(--r28)',
											border: '1px solid var(--border)',
											background: '#fff',
											padding: 12,
										}}
									>
										<div
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												gap: 12,
											}}
										>
											<div style={{ fontWeight: 950 }}>{c.category}</div>
											<div
												style={{
													color: 'var(--muted)',
													fontWeight: 900,
													fontSize: 12,
												}}
											>
												{money(c.total)}
											</div>
										</div>
										<div
											style={{
												marginTop: 10,
												height: 10,
												borderRadius: 999,
												border: '1px solid var(--border)',
												background: 'rgba(15,23,42,.04)',
												overflow: 'hidden',
											}}
										>
											<div
												style={{
													width: `${w}%`,
													height: '100%',
													borderRadius: 999,
													background:
														'linear-gradient(90deg, rgba(249,115,22,.95), rgba(249,115,22,.55))',
												}}
											/>
										</div>
									</div>
								)
							})
						})()
					)}
				</div>
			</div>
		</div>
	)
}
