import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
	ArrowDownRight,
	ArrowUpRight,
	FileDown,
	Pencil,
	Plus,
	ReceiptText,
	Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

const START_DATE = '2026-03-23'
const CARRY_CATEGORY = 'Transfer sold'

const BASE_CATEGORIES = [
	'Salariu',
	'Freelance',
	'Mâncare',
	'Transport',
	'Utilități',
	'Chirie',
	'Sănătate',
	'Altele',
	CARRY_CATEGORY,
]

function fmtDate(iso) {
	return String(iso).slice(0, 10)
}
function money(n) {
	const v = Number(n || 0)
	return new Intl.NumberFormat('ro-RO', {
		style: 'currency',
		currency: 'MDL',
	}).format(v)
}

function monthStartYMD(yyyyMm) {
	return `${yyyyMm}-01`
}
function isMonthBeforeStart(yyyyMm) {
	// START_DATE is 2026-03-23; anything before March 2026 is before start.
	return `${yyyyMm}-01` < '2026-03-01'
}
function prevMonth(yyyyMm) {
	const [y, m] = yyyyMm.split('-').map(Number)
	const d = new Date(y, m - 2, 1)
	const yy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	return `${yy}-${mm}`
}

/* =========================
   PDF export (direct download)
   Requires:
     npm i jspdf jspdf-autotable
   ========================= */

function exportPDFDirect({ month, items, summary, q }) {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

	const today = new Date().toISOString().slice(0, 10)

	doc.setFont('helvetica', 'bold')
	doc.setFontSize(14)
	doc.text(`Raport tranzacții — ${month}`, 40, 48)

	doc.setFont('helvetica', 'normal')
	doc.setFontSize(10)
	doc.setTextColor(100)
	doc.text(`Generat: ${today}${q ? ` | Filtru: "${q}"` : ''}`, 40, 66)

	doc.setTextColor(15)

	// KPI line
	doc.setFont('helvetica', 'bold')
	doc.text('Venituri:', 40, 92)
	doc.text('Cheltuieli:', 220, 92)
	doc.text('Net:', 420, 92)

	doc.setFont('helvetica', 'normal')
	doc.text(money(summary.inc), 105, 92)
	doc.text(money(summary.exp), 300, 92)
	doc.text(money(summary.net), 455, 92)

	const body = items.map(t => [
		fmtDate(t.date),
		t.type === 'income' ? 'Venit' : 'Cheltuială',
		t.category || '',
		money(t.amount),
		t.description || '',
	])

	autoTable(doc, {
		startY: 110,
		head: [['Data', 'Tip', 'Categorie', 'Sumă', 'Descriere']],
		body,
		styles: { fontSize: 9, cellPadding: 6 },
		headStyles: { fillColor: [17, 24, 39], textColor: 255 },
		columnStyles: {
			3: { halign: 'right' }, // suma
		},
		margin: { left: 40, right: 40 },
	})

	doc.save(`transactions-${month}.pdf`)
}

/* =========================
   UI Components
   ========================= */

function Modal({ open, onClose, title, children }) {
	if (!open) return null
	return (
		<div className='modalWrap'>
			<div className='modalBg' onClick={onClose} />
			<div className='modal'>
				<div className='modalCard'>
					<div className='modalTop'>
						<div style={{ fontWeight: 950, letterSpacing: '-0.2px' }}>
							{title}
						</div>
						<button className='btn btnSoft' type='button' onClick={onClose}>
							Închide
						</button>
					</div>
					<div style={{ marginTop: 12 }}>{children}</div>
				</div>
			</div>
		</div>
	)
}

function TxRow({ t, onDelete, onEdit }) {
	const income = t.type === 'income'
	const Icon = income ? ArrowUpRight : ArrowDownRight

	const toneBg = income ? 'rgba(22,163,74,.10)' : 'rgba(239,68,68,.10)'
	const toneBorder = income ? 'rgba(22,163,74,.20)' : 'rgba(239,68,68,.20)'
	const toneText = income ? 'rgba(22,163,74,1)' : 'rgba(239,68,68,1)'

	return (
		<div
			style={{
				borderRadius: 'var(--r28)',
				border: '1px solid var(--border)',
				background: '#fff',
				padding: 12,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 12,
			}}
		>
			<div
				style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}
			>
				<div
					style={{
						width: 44,
						height: 44,
						borderRadius: 16,
						display: 'grid',
						placeItems: 'center',
						border: `1px solid ${toneBorder}`,
						background: toneBg,
						color: toneText,
						flex: '0 0 auto',
					}}
				>
					<Icon size={18} />
				</div>

				<div style={{ minWidth: 0 }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							flexWrap: 'wrap',
						}}
					>
						<div style={{ fontWeight: 950, letterSpacing: '-0.2px' }}>
							{t.category || '—'}
						</div>
						<span className='badge'>{income ? 'Venit' : 'Cheltuială'}</span>
						<span className='badge'>{fmtDate(t.date)}</span>
					</div>

					<div
						style={{
							marginTop: 5,
							fontSize: 12,
							color: 'var(--muted)',
							fontWeight: 700,
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							maxWidth: 640,
						}}
						title={t.description || ''}
					>
						{t.description || '—'}
					</div>
				</div>
			</div>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 10,
					flex: '0 0 auto',
				}}
			>
				<div style={{ fontWeight: 950, color: toneText }}>
					{income ? '+' : '-'} {money(t.amount)}
				</div>

				<button
					className='btn btnSoft'
					onClick={() => onEdit(t)}
					title='Editează'
					type='button'
				>
					<Pencil size={16} />
				</button>
				<button
					className='btn btnSoft'
					onClick={() => onDelete(t._id)}
					title='Șterge'
					type='button'
				>
					<Trash2 size={16} />
				</button>
			</div>
		</div>
	)
}

function toFormFromTx(t) {
	return {
		id: t?._id || '',
		date: t?.date
			? String(t.date).slice(0, 10)
			: new Date().toISOString().slice(0, 10),
		type: t?.type || 'expense',
		category: t?.category || BASE_CATEGORIES[0],
		amount: t?.amount != null ? String(t.amount) : '',
		description: t?.description || '',
	}
}

function TxForm({
	form,
	setForm,
	allCategories,
	onCancel,
	onSubmit,
	submitLabel,
}) {
	return (
		<form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
				<div>
					<div className='label'>Data</div>
					<input
						className='input'
						type='date'
						value={form.date}
						onChange={e => setForm({ date: e.target.value })}
						required
					/>
				</div>

				<div>
					<div className='label'>Tip</div>
					<select
						className='select'
						value={form.type}
						onChange={e => setForm({ type: e.target.value })}
					>
						<option value='income'>Venit</option>
						<option value='expense'>Cheltuială</option>
					</select>
				</div>

				<div>
					<div className='label'>Categorie</div>
					<select
						className='select'
						value={form.category}
						onChange={e => setForm({ category: e.target.value })}
					>
						{allCategories.map(c => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</select>
				</div>

				<div>
					<div className='label'>Sumă (MDL)</div>
					<input
						className='input'
						value={form.amount}
						onChange={e => setForm({ amount: e.target.value })}
						type='number'
						step='0.01'
						min='0'
						required
					/>
				</div>
			</div>

			<div>
				<div className='label'>Descriere</div>
				<input
					className='input'
					value={form.description}
					onChange={e => setForm({ description: e.target.value })}
					placeholder='ex: Linella, salariu...'
				/>
			</div>

			<div
				style={{
					display: 'flex',
					justifyContent: 'flex-end',
					gap: 10,
					marginTop: 4,
				}}
			>
				<button className='btn btnSoft' type='button' onClick={onCancel}>
					Anulează
				</button>
				<button className='btn btnPrimary' type='submit'>
					{submitLabel}
				</button>
			</div>
		</form>
	)
}

export default function Transactions() {
	const [sp] = useSearchParams()
	const q = (sp.get('q') || '').toLowerCase().trim()

	const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
	const [items, setItems] = useState([])
	const [err, setErr] = useState('')

	const [openCreate, setOpenCreate] = useState(false)
	const [openEdit, setOpenEdit] = useState(false)

	const [createForm, setCreateForm] = useState({
		date: new Date().toISOString().slice(0, 10),
		type: 'expense',
		category: BASE_CATEGORIES[0],
		amount: '',
		description: '',
	})

	const [editForm, setEditForm] = useState(null)

	const [carryInfo, setCarryInfo] = useState({
		needed: false,
		prev: '',
		prevNet: 0,
		reason: '',
	})

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

	useEffect(() => {
		let alive = true

		async function checkCarry() {
			if (isMonthBeforeStart(month)) {
				if (alive)
					setCarryInfo({ needed: false, prev: '', prevNet: 0, reason: '' })
				return
			}

			const pm = prevMonth(month)
			if (isMonthBeforeStart(pm)) {
				if (alive)
					setCarryInfo({ needed: false, prev: '', prevNet: 0, reason: '' })
				return
			}

			const hasCarry = items.some(t => {
				const cat = String(t.category || '').toLowerCase()
				const desc = String(t.description || '').toLowerCase()
				return (
					cat === CARRY_CATEGORY.toLowerCase() && desc.includes('carry-over')
				)
			})

			if (hasCarry) {
				if (alive)
					setCarryInfo({ needed: false, prev: '', prevNet: 0, reason: '' })
				return
			}

			try {
				const prevItems = await api.listTransactions(pm)
				let inc = 0
				let exp = 0

				for (const t of Array.isArray(prevItems) ? prevItems : []) {
					const amt = Number(t.amount || 0)
					if (t.type === 'income') inc += amt
					if (t.type === 'expense') exp += amt
				}
				const prevNet = inc - exp

				if (Math.abs(prevNet) < 0.0001) {
					if (alive)
						setCarryInfo({ needed: false, prev: pm, prevNet: 0, reason: '' })
					return
				}

				if (alive) {
					setCarryInfo({
						needed: true,
						prev: pm,
						prevNet,
						reason:
							'Nu există încă tranzacție de Transfer sold pentru luna curentă.',
					})
				}
			} catch {
				if (alive) {
					setCarryInfo({
						needed: false,
						prev: '',
						prevNet: 0,
						reason: 'Nu am putut calcula soldul lunii anterioare.',
					})
				}
			}
		}

		checkCarry()
		return () => {
			alive = false
		}
	}, [month, items])

	const filtered = useMemo(() => {
		if (!q) return items
		return items.filter(t => {
			const s =
				`${t.category || ''} ${t.description || ''} ${t.type || ''} ${String(t.amount || '')}`.toLowerCase()
			return s.includes(q)
		})
	}, [items, q])

	const summary = useMemo(() => {
		let inc = 0
		let exp = 0
		for (const t of filtered) {
			if (t.type === 'income') inc += Number(t.amount || 0)
			if (t.type === 'expense') exp += Number(t.amount || 0)
		}
		return { inc, exp, net: inc - exp }
	}, [filtered])

	async function createCarryOver() {
		setErr('')
		if (!carryInfo.needed) return

		const amountAbs = Math.abs(Number(carryInfo.prevNet || 0))
		if (!amountAbs) return

		const type = carryInfo.prevNet >= 0 ? 'income' : 'expense'

		try {
			await api.createTransaction({
				type,
				date: new Date(monthStartYMD(month)).toISOString(),
				amount: amountAbs,
				category: CARRY_CATEGORY,
				description: `Carry-over din ${carryInfo.prev}`,
			})

			await load()
		} catch (e) {
			setErr(String(e?.message || e))
		}
	}

	async function addTx(e) {
		e.preventDefault()
		setErr('')
		try {
			await api.createTransaction({
				type: createForm.type,
				date: new Date(createForm.date).toISOString(),
				amount: Number(createForm.amount),
				category: String(createForm.category).trim(),
				description: String(createForm.description || '').trim(),
			})

			setOpenCreate(false)
			setCreateForm(s => ({ ...s, amount: '', description: '' }))
			await load()
		} catch (e) {
			setErr(String(e?.message || e))
		}
	}

	async function updateTx(e) {
		e.preventDefault()
		setErr('')
		if (!editForm?.id) return

		try {
			await api.updateTransaction(editForm.id, {
				type: editForm.type,
				date: new Date(editForm.date).toISOString(),
				amount: Number(editForm.amount),
				category: String(editForm.category).trim(),
				description: String(editForm.description || '').trim(),
			})

			setOpenEdit(false)
			setEditForm(null)
			await load()
		} catch (e) {
			setErr(String(e?.message || e))
		}
	}

	async function delTx(id) {
		if (!confirm('Ștergi tranzacția?')) return
		try {
			await api.deleteTransaction(id)
			await load()
		} catch (e) {
			setErr(String(e?.message || e))
		}
	}

	return (
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
							<ReceiptText size={18} />
						</div>
						<div>
							<div
								style={{
									fontSize: 22,
									fontWeight: 950,
									letterSpacing: '-0.5px',
								}}
							>
								Tranzacții
							</div>
							<div
								style={{
									marginTop: 4,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Start calcul: <b>{START_DATE}</b>. Export PDF direct (fără
								popups) + Transfer sold.
							</div>
						</div>
					</div>

					<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
						<button
							className='btn btnSoft'
							type='button'
							onClick={() =>
								exportPDFDirect({ month, items: filtered, summary, q })
							}
							title='Descarcă PDF'
						>
							<FileDown size={16} /> Export PDF
						</button>

						<button
							className='btn btnPrimary'
							type='button'
							onClick={() => setOpenCreate(true)}
						>
							<Plus size={16} /> Adaugă
						</button>
					</div>
				</div>

				<div
					style={{
						marginTop: 12,
						display: 'flex',
						alignItems: 'flex-end',
						justifyContent: 'space-between',
						gap: 14,
						flexWrap: 'wrap',
					}}
				>
					<div style={{ width: 'min(260px, 100%)' }}>
						<div className='label'>Lună (filtru)</div>
						<input
							className='input'
							type='month'
							value={month}
							onChange={e => setMonth(e.target.value)}
						/>
					</div>

					<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
						<span className='badge'>Rezultate: {filtered.length}</span>
						{q && <span className='badge'>Search: “{q}”</span>}
						<span className='badge'>Venituri: {money(summary.inc)}</span>
						<span className='badge'>Cheltuieli: {money(summary.exp)}</span>
						<span className='badge'>Net: {money(summary.net)}</span>
					</div>
				</div>

				{carryInfo.needed && (
					<div
						style={{
							marginTop: 12,
							borderRadius: 'var(--r28)',
							border: '1px solid rgba(249,115,22,.22)',
							background: 'rgba(249,115,22,.08)',
							padding: 12,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: 12,
							flexWrap: 'wrap',
						}}
					>
						<div>
							<div style={{ fontWeight: 950 }}>
								Transfer sold lipsă pentru {month}
							</div>
							<div
								style={{
									marginTop: 4,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Sold luna {carryInfo.prev}: <b>{money(carryInfo.prevNet)}</b>.
								Apasă ca să îl transferi automat.
							</div>
						</div>

						<button
							className='btn btnPrimary'
							type='button'
							onClick={createCarryOver}
						>
							Transferă soldul
						</button>
					</div>
				)}

				{err && <div className='error'>{err}</div>}
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
					<div>
						<div style={{ fontWeight: 950, letterSpacing: '-0.2px' }}>
							Recent activities
						</div>
						<div
							style={{
								marginTop: 3,
								fontSize: 12,
								color: 'var(--muted)',
								fontWeight: 700,
							}}
						>
							Tranzacțiile din luna selectată (filtrate după Search).
						</div>
					</div>
					<span className='badge'>{filtered.length} items</span>
				</div>

				<div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
					{!filtered.length ? (
						<div
							style={{
								borderRadius: 'var(--r28)',
								border: '1px dashed rgba(15,23,42,.18)',
								background: 'rgba(15,23,42,.02)',
								padding: 16,
							}}
						>
							<div style={{ fontWeight: 950 }}>
								Nu există tranzacții pentru filtrul curent.
							</div>
							<div
								style={{
									marginTop: 6,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Încearcă altă lună sau șterge textul din Search.
							</div>
						</div>
					) : (
						filtered.map(t => (
							<TxRow
								key={t._id}
								t={t}
								onDelete={delTx}
								onEdit={tx => {
									setEditForm(toFormFromTx(tx))
									setOpenEdit(true)
								}}
							/>
						))
					)}
				</div>
			</div>

			<Modal
				open={openCreate}
				onClose={() => setOpenCreate(false)}
				title='Adaugă tranzacție'
			>
				<TxForm
					form={createForm}
					setForm={patch => setCreateForm(s => ({ ...s, ...patch }))}
					allCategories={BASE_CATEGORIES}
					onCancel={() => setOpenCreate(false)}
					onSubmit={addTx}
					submitLabel='Salvează'
				/>
			</Modal>

			<Modal
				open={openEdit}
				onClose={() => {
					setOpenEdit(false)
					setEditForm(null)
				}}
				title='Editează tranzacție'
			>
				{editForm && (
					<TxForm
						form={editForm}
						setForm={patch => setEditForm(s => ({ ...s, ...patch }))}
						allCategories={BASE_CATEGORIES}
						onCancel={() => {
							setOpenEdit(false)
							setEditForm(null)
						}}
						onSubmit={updateTx}
						submitLabel='Actualizează'
					/>
				)}
			</Modal>
		</div>
	)
}
