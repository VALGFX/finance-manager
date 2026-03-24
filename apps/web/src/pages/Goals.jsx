import { CalendarDays, Plus, Target, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const START_DATE = '2026-03-23'
const LS_GOALS = 'fm_goals_v1'
// shape: [{ id, name, target, deadlineYYYYMM }]

function money(n) {
	const v = Number(n || 0)
	return new Intl.NumberFormat('ro-RO', {
		style: 'currency',
		currency: 'MDL',
		maximumFractionDigits: 0,
	}).format(v)
}

function uid() {
	return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

function loadGoals() {
	try {
		const raw = localStorage.getItem(LS_GOALS)
		const arr = raw ? JSON.parse(raw) : []
		return Array.isArray(arr) ? arr : []
	} catch {
		return []
	}
}
function saveGoals(arr) {
	localStorage.setItem(LS_GOALS, JSON.stringify(arr))
}

function monthDiff(fromYYYYMM, toYYYYMM) {
	const [fy, fm] = fromYYYYMM.split('-').map(Number)
	const [ty, tm] = toYYYYMM.split('-').map(Number)
	return (ty - fy) * 12 + (tm - fm)
}

export default function Goals() {
	const [goals, setGoals] = useState(() => loadGoals())
	const [err, setErr] = useState('')

	const [form, setForm] = useState({
		name: 'Fond de urgență',
		target: '30000',
		deadline: new Date().toISOString().slice(0, 7),
	})

	// We approximate savings by summing net for last 12 months
	// Better in future: backend range endpoint from START_DATE.
	const [series, setSeries] = useState([]) // [{month, income, expense}]
	const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))

	function addMonths(yyyyMm, delta) {
		const [y, m] = yyyyMm.split('-').map(Number)
		const d = new Date(y, m - 1 + delta, 1)
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
	}

	async function loadSeries() {
		setErr('')
		try {
			const months = Array.from({ length: 12 }, (_, i) =>
				addMonths(month, -11 + i),
			)
			const out = []

			for (const m of months) {
				const rows = await api.listTransactions(m)
				let inc = 0,
					exp = 0
				for (const t of Array.isArray(rows) ? rows : []) {
					const amt = Number(t.amount || 0)
					if (t.type === 'income') inc += amt
					if (t.type === 'expense') exp += amt
				}
				out.push({ month: m, income: inc, expense: exp })
			}

			setSeries(out)
		} catch (e) {
			setErr(String(e?.message || e))
		}
	}

	useEffect(() => {
		loadSeries()
	}, [month])

	const totalSavings = useMemo(() => {
		// approximate: net of series months that are >= March 2026
		let net = 0
		for (const s of series) {
			if (`${s.month}-01` >= '2026-03-01') {
				net += Number(s.income || 0) - Number(s.expense || 0)
			}
		}
		return net
	}, [series])

	function addGoal(e) {
		e.preventDefault()
		setErr('')

		const target = Number(form.target)
		if (!form.name.trim()) {
			setErr('Numele obiectivului este obligatoriu.')
			return
		}
		if (!Number.isFinite(target) || target <= 0) {
			setErr('Target trebuie să fie un număr > 0.')
			return
		}
		if (!/^\d{4}-\d{2}$/.test(form.deadline)) {
			setErr('Deadline invalid (YYYY-MM).')
			return
		}

		const next = [
			...goals,
			{
				id: uid(),
				name: form.name.trim(),
				target,
				deadlineYYYYMM: form.deadline,
			},
		]
		setGoals(next)
		saveGoals(next)
		setForm(s => ({ ...s, name: '', target: '', deadline: s.deadline }))
	}

	function removeGoal(id) {
		const next = goals.filter(g => g.id !== id)
		setGoals(next)
		saveGoals(next)
	}

	const nowYYYYMM = new Date().toISOString().slice(0, 7)

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
							<Target size={18} />
						</div>
						<div>
							<div
								style={{
									fontSize: 22,
									fontWeight: 950,
									letterSpacing: '-0.5px',
								}}
							>
								Obiective
							</div>
							<div
								style={{
									marginTop: 4,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Target + deadline + cât trebuie pe lună (estimare). Start:{' '}
								{START_DATE}
							</div>
						</div>
					</div>

					<div style={{ width: 'min(260px, 100%)' }}>
						<div className='label'>Bază calcul (ultimele 12 luni)</div>
						<input
							className='input'
							type='month'
							value={month}
							onChange={e => setMonth(e.target.value)}
						/>
					</div>
				</div>

				<div
					style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}
				>
					<span className='badge'>
						Economii estimate: {money(totalSavings)}
					</span>
				</div>

				{err && <div className='error'>{err}</div>}
			</div>

			<div className='panel cardPad'>
				<div style={{ fontWeight: 950 }}>Adaugă obiectiv</div>
				<form
					onSubmit={addGoal}
					style={{
						marginTop: 12,
						display: 'grid',
						gridTemplateColumns: '1.2fr .6fr .6fr auto',
						gap: 12,
						alignItems: 'end',
					}}
				>
					<div>
						<div className='label'>Nume</div>
						<input
							className='input'
							value={form.name}
							onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
							placeholder='ex: Vacanță'
						/>
					</div>

					<div>
						<div className='label'>Target (MDL)</div>
						<input
							className='input'
							type='number'
							min='0'
							step='1'
							value={form.target}
							onChange={e => setForm(s => ({ ...s, target: e.target.value }))}
						/>
					</div>

					<div>
						<div className='label'>Deadline</div>
						<input
							className='input'
							type='month'
							value={form.deadline}
							onChange={e => setForm(s => ({ ...s, deadline: e.target.value }))}
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
					<div style={{ fontWeight: 950 }}>Lista obiective</div>
					<span className='badge'>{goals.length} obiective</span>
				</div>

				<div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
					{!goals.length ? (
						<div
							style={{
								borderRadius: 'var(--r28)',
								border: '1px dashed rgba(15,23,42,.18)',
								background: 'rgba(15,23,42,.02)',
								padding: 16,
							}}
						>
							<div style={{ fontWeight: 950 }}>Nu ai obiective setate.</div>
							<div
								style={{
									marginTop: 6,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Adaugă un obiectiv (ex: Fond de urgență 30,000 MDL).
							</div>
						</div>
					) : (
						goals.map(g => {
							const remaining = Number(g.target || 0) - totalSavings
							const monthsLeft = Math.max(
								0,
								monthDiff(nowYYYYMM, g.deadlineYYYYMM),
							)
							const perMonth =
								monthsLeft > 0 ? remaining / monthsLeft : remaining

							const pct = g.target > 0 ? (totalSavings / g.target) * 100 : 0

							return (
								<div
									key={g.id}
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
											<div style={{ fontWeight: 950 }}>{g.name}</div>
											<span className='badge'>
												<CalendarDays size={14} style={{ marginRight: 6 }} />
												Deadline: {g.deadlineYYYYMM}
											</span>
										</div>

										<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
											<span className='badge'>Target: {money(g.target)}</span>
											<span className='badge'>
												Rămâne: {money(Math.max(0, remaining))}
											</span>
											<button
												className='btn btnSoft'
												type='button'
												onClick={() => removeGoal(g.id)}
												title='Șterge obiectiv'
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
												background:
													'linear-gradient(90deg, rgba(249,115,22,.95), rgba(249,115,22,.55))',
											}}
										/>
									</div>

									<div
										style={{
											marginTop: 8,
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
											Progres: {Math.round(pct)}%
										</div>
										<div
											style={{
												color: 'var(--muted)',
												fontWeight: 800,
												fontSize: 12,
											}}
										>
											Necesat/lună (estimare):{' '}
											{money(perMonth > 0 ? perMonth : 0)}
										</div>
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
