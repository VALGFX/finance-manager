import { AlertTriangle, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const LS_BUDGETS = 'fm_budgets_v1'
// shape: { "YYYY-MM": [{ id, category, limit }] }

const CATEGORIES = [
	'Mâncare',
	'Transport',
	'Utilități',
	'Chirie',
	'Sănătate',
	'Salariu',
	'Freelance',
	'Altele',
	'Transfer sold',
]

function money(n) {
	const v = Number(n || 0)
	return new Intl.NumberFormat('ro-RO', {
		style: 'currency',
		currency: 'MDL',
		maximumFractionDigits: 0,
	}).format(v)
}

function loadBudgets() {
	try {
		const raw = localStorage.getItem(LS_BUDGETS)
		const obj = raw ? JSON.parse(raw) : {}
		return obj && typeof obj === 'object' ? obj : {}
	} catch {
		return {}
	}
}
function saveBudgets(obj) {
	localStorage.setItem(LS_BUDGETS, JSON.stringify(obj))
}
function uid() {
	return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

export default function Budgets() {
	const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
	const [items, setItems] = useState([])
	const [err, setErr] = useState('')

	const [budgets, setBudgets] = useState(() => loadBudgets())
	const monthBudgets = budgets[month] || []

	const [form, setForm] = useState({
		category: CATEGORIES[0],
		limit: '',
	})

	async function loadTx() {
		setErr('')
		try {
			const data = await api.listTransactions(month)
			setItems(Array.isArray(data) ? data : [])
		} catch (e) {
			setErr(String(e?.message || e))
		}
	}

	useEffect(() => {
		loadTx()
	}, [month])

	// calculate spending by category (expenses only)
	const spentByCategory = useMemo(() => {
		const map = new Map()
		for (const t of items) {
			if (t.type !== 'expense') continue
			const cat = String(t.category || 'Altele')
			const amt = Number(t.amount || 0)
			map.set(cat, (map.get(cat) || 0) + amt)
		}
		return map
	}, [items])

	function addBudget(e) {
		e.preventDefault()
		setErr('')

		const limit = Number(form.limit)
		if (!Number.isFinite(limit) || limit <= 0) {
			setErr('Limita trebuie să fie un număr > 0.')
			return
		}

		const next = { ...budgets }
		const list = Array.isArray(next[month]) ? [...next[month]] : []
		list.push({ id: uid(), category: form.category, limit })
		next[month] = list

		setBudgets(next)
		saveBudgets(next)
		setForm(s => ({ ...s, limit: '' }))
	}

	function removeBudget(id) {
		const next = { ...budgets }
		next[month] = (next[month] || []).filter(b => b.id !== id)
		setBudgets(next)
		saveBudgets(next)
	}

	return (
		<div style={{ display: 'grid', gap: 14 }}>
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
							<PiggyBank size={18} />
						</div>
						<div>
							<div
								style={{
									fontSize: 22,
									fontWeight: 950,
									letterSpacing: '-0.5px',
								}}
							>
								Bugete pe categorii
							</div>
							<div
								style={{
									marginTop: 4,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Setezi limite. Progresul se calculează automat din cheltuieli.
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
				<div style={{ fontWeight: 950 }}>Adaugă buget</div>
				<form
					onSubmit={addBudget}
					style={{
						marginTop: 12,
						display: 'grid',
						gridTemplateColumns: '1.2fr .8fr auto',
						gap: 12,
						alignItems: 'end',
					}}
				>
					<div>
						<div className='label'>Categorie</div>
						<select
							className='select'
							value={form.category}
							onChange={e => setForm(s => ({ ...s, category: e.target.value }))}
						>
							{CATEGORIES.map(c => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</select>
					</div>

					<div>
						<div className='label'>Limită (MDL)</div>
						<input
							className='input'
							type='number'
							min='0'
							step='1'
							value={form.limit}
							onChange={e => setForm(s => ({ ...s, limit: e.target.value }))}
						/>
					</div>

					<button className='btn btnPrimary' type='submit'>
						<Plus size={16} /> Adaugă
					</button>
				</form>
			</div>

			<div className='panel cardPad'>
				<div
					style={{
						display: 'flex',
						alignItems: 'baseline',
						justifyContent: 'space-between',
						gap: 12,
						flexWrap: 'wrap',
					}}
				>
					<div style={{ fontWeight: 950 }}>Bugete pentru {month}</div>
					<span className='badge'>{monthBudgets.length} bugete</span>
				</div>

				<div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
					{!monthBudgets.length ? (
						<div
							style={{
								borderRadius: 'var(--r28)',
								border: '1px dashed rgba(15,23,42,.18)',
								background: 'rgba(15,23,42,.02)',
								padding: 16,
							}}
						>
							<div style={{ fontWeight: 950 }}>
								Nu ai bugete setate pentru luna asta.
							</div>
							<div
								style={{
									marginTop: 6,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Adaugă cel puțin un buget (ex: Mâncare 3000 MDL).
							</div>
						</div>
					) : (
						monthBudgets.map(b => {
							const spent = Number(spentByCategory.get(b.category) || 0)
							const limit = Number(b.limit || 0)
							const left = limit - spent
							const pct = limit > 0 ? (spent / limit) * 100 : 0
							const warn = pct >= 90

							return (
								<div
									key={b.id}
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
											alignItems: 'center',
											justifyContent: 'space-between',
											gap: 12,
											flexWrap: 'wrap',
										}}
									>
										<div
											style={{ display: 'flex', alignItems: 'center', gap: 10 }}
										>
											<div style={{ fontWeight: 950 }}>{b.category}</div>
											{warn && (
												<span
													className='badge'
													style={{
														borderColor: 'rgba(251,191,36,.28)',
														background: 'rgba(251,191,36,.10)',
													}}
												>
													<AlertTriangle size={14} style={{ marginRight: 6 }} />
													Alert
												</span>
											)}
										</div>

										<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
											<span className='badge'>Cheltuit: {money(spent)}</span>
											<span className='badge'>Limită: {money(limit)}</span>
											<span className='badge'>
												{left >= 0
													? `Rămâne: ${money(left)}`
													: `Depășit: ${money(Math.abs(left))}`}
											</span>
											<button
												className='btn btnSoft'
												type='button'
												onClick={() => removeBudget(b.id)}
												title='Șterge buget'
											>
												<Trash2 size={16} />
											</button>
										</div>
									</div>

									<div
										style={{
											marginTop: 10,
											height: 12,
											borderRadius: 999,
											border: '1px solid var(--border)',
											background: 'rgba(15,23,42,.04)',
											overflow: 'hidden',
										}}
									>
										<div
											style={{
												width: `${Math.min(100, Math.max(0, Math.round(pct)))}%`,
												height: '100%',
												borderRadius: 999,
												background: warn
													? 'linear-gradient(90deg, rgba(251,191,36,.95), rgba(239,68,68,.75))'
													: 'linear-gradient(90deg, rgba(249,115,22,.95), rgba(249,115,22,.55))',
											}}
										/>
									</div>

									<div
										style={{
											marginTop: 8,
											color: 'var(--muted)',
											fontWeight: 800,
											fontSize: 12,
										}}
									>
										Progres: {Math.round(pct)}%
									</div>
								</div>
							)
						})
					)}
				</div>
			</div>
		</div>
	)
}
