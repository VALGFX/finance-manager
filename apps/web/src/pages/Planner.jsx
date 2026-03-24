import { Calculator, CalendarDays, Lightbulb } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const LS_RECURRING = 'fm_recurring_v1'
const LS_BUDGETS = 'fm_budgets_v1'
const LS_PLANNER = 'fm_planner_v1'
// planner by month: { "YYYY-MM": { expectedIncome: number } }

function money(n) {
	const v = Number(n || 0)
	return new Intl.NumberFormat('ro-RO', {
		style: 'currency',
		currency: 'MDL',
	}).format(v)
}
function loadJSON(key, fallback) {
	try {
		const raw = localStorage.getItem(key)
		return raw ? JSON.parse(raw) : fallback
	} catch {
		return fallback
	}
}
function saveJSON(key, val) {
	localStorage.setItem(key, JSON.stringify(val))
}

export default function Planner() {
	const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
	const [items, setItems] = useState([])
	const [err, setErr] = useState('')

	const [planner, setPlanner] = useState(() => loadJSON(LS_PLANNER, {}))
	const expectedIncome = Number(planner[month]?.expectedIncome || 0)

	const recurring = useMemo(
		() => loadJSON(LS_RECURRING, []).filter(r => r.active !== false),
		[month],
	)
	const budgets = useMemo(() => loadJSON(LS_BUDGETS, {})[month] || [], [month])

	async function load() {
		setErr('')
		try {
			const data = await api.listTransactions(month)
			setItems(Array.isArray(data) ? data : [])
		} catch (e) {
			setErr(String(e?.message || e))
		}
	}

	useEffect(() => {
		load()
	}, [month])

	const actual = useMemo(() => {
		let inc = 0,
			exp = 0
		for (const t of items) {
			const amt = Number(t.amount || 0)
			if (t.type === 'income') inc += amt
			if (t.type === 'expense') exp += amt
		}
		return { inc, exp, net: inc - exp }
	}, [items])

	const fixedExpenses = useMemo(() => {
		// approximate fixed: sum of expense recurring rules amounts
		let total = 0
		for (const r of recurring)
			if (r.type === 'expense') total += Number(r.amount || 0)
		return total
	}, [recurring])

	const budgetTotal = useMemo(() => {
		let total = 0
		for (const b of budgets) total += Number(b.limit || 0)
		return total
	}, [budgets])

	const plan = useMemo(() => {
		const expectedLeft = expectedIncome - fixedExpenses - budgetTotal
		return {
			expectedLeft,
			recommendedSavings: expectedIncome > 0 ? expectedIncome * 0.1 : 0,
		}
	}, [expectedIncome, fixedExpenses, budgetTotal])

	const tips = useMemo(() => {
		const out = []
		if (expectedIncome > 0) {
			out.push(
				`Recomandare: pune deoparte ~10% (${money(expectedIncome * 0.1)}).`,
			)
		}
		if (fixedExpenses > expectedIncome && expectedIncome > 0) {
			out.push(
				'Cheltuielile fixe depășesc venitul estimat. Încearcă să reduci recurentele.',
			)
		}
		if (budgetTotal > 0 && actual.exp > budgetTotal) {
			out.push(
				'Ai depășit bugetele totale ale lunii. Verifică categoria cu cheltuieli mari.',
			)
		}
		if (plan.expectedLeft < 0) {
			out.push(
				'Planul indică deficit (minus). Ajustează bugete sau crește venitul estimat.',
			)
		} else {
			out.push(
				'Planul indică surplus. Poți crește economisirea sau investițiile.',
			)
		}
		return out
	}, [
		expectedIncome,
		fixedExpenses,
		budgetTotal,
		actual.exp,
		plan.expectedLeft,
	])

	return (
		<div style={{ display: 'grid', gap: 14 }}>
			<div className='panel cardPad'>
				<div
					style={{
						display: 'flex',
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
							<Calculator size={18} />
						</div>
						<div>
							<div
								style={{
									fontSize: 22,
									fontWeight: 950,
									letterSpacing: '-0.5px',
								}}
							>
								Planner
							</div>
							<div
								style={{
									marginTop: 4,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Planul lunii: venit estimat + cheltuieli fixe + bugete +
								recomandări.
							</div>
						</div>
					</div>

					<div style={{ width: 'min(260px, 100%)' }}>
						<div className='label'>Lună</div>
						<input
							className='input'
							type='month'
							value={month}
							onChange={e => setMonth(e.target.value)}
						/>
					</div>
				</div>

				{err && <div className='error'>{err}</div>}
			</div>

			<div className='panel cardPad'>
				<div
					style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
				>
					<div>
						<div className='label'>Venit estimat (MDL)</div>
						<input
							className='input'
							type='number'
							min='0'
							step='1'
							value={expectedIncome}
							onChange={e => {
								const next = Number(e.target.value || 0)
								const copy = {
									...planner,
									[month]: { ...(planner[month] || {}), expectedIncome: next },
								}
								setPlanner(copy)
								saveJSON(LS_PLANNER, copy)
							}}
						/>
						<div
							style={{
								marginTop: 10,
								display: 'flex',
								gap: 10,
								flexWrap: 'wrap',
							}}
						>
							<span className='badge'>
								Cheltuieli fixe (recurente): {money(fixedExpenses)}
							</span>
							<span className='badge'>Total bugete: {money(budgetTotal)}</span>
							<span className='badge'>
								Surplus planificat: {money(plan.expectedLeft)}
							</span>
						</div>
					</div>

					<div>
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
								<CalendarDays size={18} />
							</div>
							<div>
								<div style={{ fontWeight: 950 }}>
									Realitatea (din tranzacții)
								</div>
								<div
									style={{
										marginTop: 4,
										color: 'var(--muted)',
										fontWeight: 700,
										fontSize: 13,
									}}
								>
									Income/Expense/Net din luna selectată
								</div>
							</div>
						</div>

						<div
							style={{
								marginTop: 10,
								display: 'flex',
								gap: 10,
								flexWrap: 'wrap',
							}}
						>
							<span className='badge'>Venituri: {money(actual.inc)}</span>
							<span className='badge'>Cheltuieli: {money(actual.exp)}</span>
							<span className='badge'>Net: {money(actual.net)}</span>
						</div>

						<div style={{ marginTop: 10 }} className='badge'>
							Economisire recomandată: {money(plan.recommendedSavings)}
						</div>
					</div>
				</div>
			</div>

			<div className='panel cardPad'>
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
						<Lightbulb size={18} />
					</div>
					<div>
						<div style={{ fontWeight: 950 }}>Recomandări</div>
						<div
							style={{
								marginTop: 4,
								color: 'var(--muted)',
								fontWeight: 700,
								fontSize: 13,
							}}
						>
							Sfaturi simple bazate pe plan și cheltuieli.
						</div>
					</div>
				</div>

				<div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
					{tips.map((t, i) => (
						<div
							key={i}
							style={{
								borderRadius: 16,
								border: '1px solid var(--border)',
								background: '#fff',
								padding: 12,
								fontWeight: 800,
								color: 'var(--muted)',
							}}
						>
							{t}
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
