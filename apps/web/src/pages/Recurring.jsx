import { CalendarClock, Plus, Trash2, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { api } from '../lib/api'

const LS_RECURRING = 'fm_recurring_v1'
/**
 * Rule shape:
 * { id, name, type: "expense"|"income", amount, category, dayOfMonth: 1-28, active: true }
 */

const CATEGORIES = [
	'Chirie',
	'Utilități',
	'Abonamente',
	'Transport',
	'Mâncare',
	'Sănătate',
	'Altele',
]

function money(n) {
	const v = Number(n || 0)
	return new Intl.NumberFormat('ro-RO', {
		style: 'currency',
		currency: 'MDL',
	}).format(v)
}
function uid() {
	return Math.random().toString(16).slice(2) + Date.now().toString(16)
}
function loadRules() {
	try {
		const raw = localStorage.getItem(LS_RECURRING)
		const arr = raw ? JSON.parse(raw) : []
		return Array.isArray(arr) ? arr : []
	} catch {
		return []
	}
}
function saveRules(arr) {
	localStorage.setItem(LS_RECURRING, JSON.stringify(arr))
}
function ymdFromMonthDay(month, day) {
	const [y, m] = month.split('-').map(Number)
	const dd = String(day).padStart(2, '0')
	const mm = String(m).padStart(2, '0')
	return `${y}-${mm}-${dd}`
}
function clampDay(d) {
	const n = Number(d)
	if (!Number.isFinite(n)) return 1
	return Math.min(28, Math.max(1, Math.round(n)))
}

export default function Recurring() {
	const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
	const [rules, setRules] = useState(() => loadRules())
	const [err, setErr] = useState('')
	const [loading, setLoading] = useState(false)

	const [form, setForm] = useState({
		name: 'Chirie',
		type: 'expense',
		amount: '0',
		category: 'Chirie',
		dayOfMonth: '1',
	})

	const upcoming = useMemo(() => {
		const now = new Date()
		const in7 = new Date(now)
		in7.setDate(now.getDate() + 7)

		// show upcoming occurrences based on dayOfMonth in current month
		const out = []
		for (const r of rules.filter(x => x.active !== false)) {
			const day = clampDay(r.dayOfMonth)
			const date = new Date()
			date.setHours(12, 0, 0, 0)
			date.setDate(day)
			// If day already passed this month, show next month’s occurrence
			if (date < now) {
				date.setMonth(date.getMonth() + 1)
				date.setDate(day)
			}
			if (date <= in7) {
				out.push({ rule: r, date })
			}
		}
		out.sort((a, b) => a.date - b.date)
		return out
	}, [rules])

	function addRule(e) {
		e.preventDefault()
		setErr('')

		const amount = Number(form.amount)
		const day = clampDay(form.dayOfMonth)

		if (!form.name.trim()) return setErr('Numele e obligatoriu.')
		if (form.type !== 'income' && form.type !== 'expense')
			return setErr('Tip invalid.')
		if (!Number.isFinite(amount) || amount <= 0)
			return setErr('Suma trebuie > 0.')
		if (!form.category.trim()) return setErr('Categoria e obligatorie.')

		const next = [
			...rules,
			{
				id: uid(),
				name: form.name.trim(),
				type: form.type,
				amount,
				category: form.category.trim(),
				dayOfMonth: day,
				active: true,
			},
		]
		setRules(next)
		saveRules(next)
	}

	function removeRule(id) {
		const next = rules.filter(r => r.id !== id)
		setRules(next)
		saveRules(next)
	}

	async function generateForMonth() {
		setErr('')
		setLoading(true)

		try {
			const existing = await api.listTransactions(month)
			const exists = Array.isArray(existing) ? existing : []

			for (const r of rules.filter(x => x.active !== false)) {
				const day = clampDay(r.dayOfMonth)
				const ymd = ymdFromMonthDay(month, day)

				// prevent duplicates: if a transaction exists on same date with same amount & category & description tag
				const tag = `[RECURRING:${r.id}]`
				const already = exists.some(t => {
					const d = String(t.date).slice(0, 10)
					return (
						d === ymd &&
						String(t.category || '') === r.category &&
						Number(t.amount || 0) === Number(r.amount) &&
						String(t.description || '').includes(tag)
					)
				})

				if (already) continue

				await api.createTransaction({
					type: r.type,
					date: new Date(ymd).toISOString(),
					amount: Number(r.amount),
					category: r.category,
					description: `${r.name} ${tag}`,
				})
			}
		} catch (e) {
			setErr(String(e?.message || e))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div style={{ display: 'grid', gap: 14 }}>
			<div className='panel cardPad'>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
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
							<CalendarClock size={18} />
						</div>
						<div>
							<div
								style={{
									fontSize: 22,
									fontWeight: 950,
									letterSpacing: '-0.5px',
								}}
							>
								Recurente
							</div>
							<div
								style={{
									marginTop: 4,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Reguli pentru chirie/utilități/abonamente. Generează automat
								tranzacții.
							</div>
						</div>
					</div>

					<div
						style={{
							display: 'flex',
							gap: 10,
							flexWrap: 'wrap',
							alignItems: 'end',
						}}
					>
						<div style={{ width: 'min(220px, 100%)' }}>
							<div className='label'>Lună</div>
							<input
								className='input'
								type='month'
								value={month}
								onChange={e => setMonth(e.target.value)}
							/>
						</div>

						<button
							className='btn btnPrimary'
							type='button'
							onClick={generateForMonth}
							disabled={loading}
						>
							<Wand2 size={16} /> {loading ? 'Generate...' : 'Generate luna'}
						</button>
					</div>
				</div>

				{err && <div className='error'>{err}</div>}
			</div>

			<div className='panel cardPad'>
				<div style={{ fontWeight: 950 }}>Adaugă regulă</div>

				<form
					onSubmit={addRule}
					style={{
						marginTop: 12,
						display: 'grid',
						gridTemplateColumns: '1.2fr .6fr .6fr .6fr auto',
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
						/>
					</div>

					<div>
						<div className='label'>Tip</div>
						<select
							className='select'
							value={form.type}
							onChange={e => setForm(s => ({ ...s, type: e.target.value }))}
						>
							<option value='expense'>Cheltuială</option>
							<option value='income'>Venit</option>
						</select>
					</div>

					<div>
						<div className='label'>Sumă (MDL)</div>
						<input
							className='input'
							type='number'
							min='0'
							step='0.01'
							value={form.amount}
							onChange={e => setForm(s => ({ ...s, amount: e.target.value }))}
						/>
					</div>

					<div>
						<div className='label'>Zi (1-28)</div>
						<input
							className='input'
							type='number'
							min='1'
							max='28'
							value={form.dayOfMonth}
							onChange={e =>
								setForm(s => ({ ...s, dayOfMonth: e.target.value }))
							}
						/>
					</div>

					<button className='btn btnPrimary' type='submit'>
						<Plus size={16} /> Add
					</button>
				</form>

				<div style={{ marginTop: 12 }}>
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
			</div>

			<div
				style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 14 }}
			>
				<div className='panel cardPad'>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							gap: 12,
							flexWrap: 'wrap',
						}}
					>
						<div style={{ fontWeight: 950 }}>Reguli</div>
						<span className='badge'>{rules.length} reguli</span>
					</div>

					<div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
						{!rules.length ? (
							<div
								style={{
									borderRadius: 'var(--r28)',
									border: '1px dashed rgba(15,23,42,.18)',
									background: 'rgba(15,23,42,.02)',
									padding: 16,
								}}
							>
								<div style={{ fontWeight: 950 }}>Nu ai reguli recurente.</div>
								<div
									style={{
										marginTop: 6,
										color: 'var(--muted)',
										fontWeight: 700,
										fontSize: 13,
									}}
								>
									Exemplu: Chirie 8000 MDL pe ziua 1.
								</div>
							</div>
						) : (
							rules.map(r => (
								<div
									key={r.id}
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
											flexWrap: 'wrap',
										}}
									>
										<div>
											<div style={{ fontWeight: 950 }}>{r.name}</div>
											<div
												style={{
													marginTop: 4,
													color: 'var(--muted)',
													fontWeight: 700,
													fontSize: 13,
												}}
											>
												{r.type} • {r.category} • ziua {r.dayOfMonth}
											</div>
										</div>
										<div
											style={{
												display: 'flex',
												gap: 10,
												flexWrap: 'wrap',
												alignItems: 'center',
											}}
										>
											<span className='badge'>{money(r.amount)}</span>
											<button
												className='btn btnSoft'
												type='button'
												onClick={() => removeRule(r.id)}
												title='Șterge'
											>
												<Trash2 size={16} />
											</button>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>

				<div className='panel cardPad'>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							gap: 12,
							flexWrap: 'wrap',
						}}
					>
						<div style={{ fontWeight: 950 }}>Upcoming (7 zile)</div>
						<span className='badge'>{upcoming.length}</span>
					</div>

					<div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
						{!upcoming.length ? (
							<div className='badge'>Nimic în următoarele 7 zile</div>
						) : (
							upcoming.map(u => (
								<div
									key={`${u.rule.id}-${u.date.toISOString()}`}
									style={{
										borderRadius: 16,
										border: '1px solid var(--border)',
										padding: 10,
										background: '#fff',
									}}
								>
									<div style={{ fontWeight: 950 }}>{u.rule.name}</div>
									<div
										style={{
											marginTop: 4,
											color: 'var(--muted)',
											fontWeight: 700,
											fontSize: 13,
										}}
									>
										{u.date.toISOString().slice(0, 10)} • {u.rule.category} •{' '}
										{money(u.rule.amount)}
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
