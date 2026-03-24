import { ArrowLeftRight, Plus, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const LS_ACCOUNTS = 'fm_accounts_v1'
// [{ id, name }]

function uid() {
	return Math.random().toString(16).slice(2) + Date.now().toString(16)
}
function loadAccounts() {
	try {
		const raw = localStorage.getItem(LS_ACCOUNTS)
		const arr = raw ? JSON.parse(raw) : null
		if (Array.isArray(arr) && arr.length) return arr
	} catch {}
	return [
		{ id: 'cash', name: 'Cash' },
		{ id: 'card', name: 'Card' },
		{ id: 'savings', name: 'Savings' },
	]
}
function saveAccounts(arr) {
	localStorage.setItem(LS_ACCOUNTS, JSON.stringify(arr))
}
function money(n) {
	const v = Number(n || 0)
	return new Intl.NumberFormat('ro-RO', {
		style: 'currency',
		currency: 'MDL',
	}).format(v)
}

function tagAcc(desc, accName) {
	const tag = `#acc:${accName}`
	return desc ? `${desc} ${tag}` : tag
}
function extractAcc(desc) {
	const m = String(desc || '').match(/#acc:([A-Za-z0-9_-]+)/)
	return m ? m[1] : ''
}

export default function Accounts() {
	const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
	const [accounts, setAccounts] = useState(() => loadAccounts())
	const [items, setItems] = useState([])
	const [err, setErr] = useState('')

	const [newAcc, setNewAcc] = useState('')

	const [transfer, setTransfer] = useState({
		from: 'Cash',
		to: 'Savings',
		amount: '0',
		note: 'Transfer',
		date: new Date().toISOString().slice(0, 10),
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

	const balances = useMemo(() => {
		const map = new Map()
		for (const a of accounts) map.set(a.name, 0)

		for (const t of items) {
			const acc = extractAcc(t.description)
			if (!acc) continue
			if (!map.has(acc)) map.set(acc, 0)

			const amt = Number(t.amount || 0)
			if (t.type === 'income') map.set(acc, map.get(acc) + amt)
			if (t.type === 'expense') map.set(acc, map.get(acc) - amt)
		}

		return map
	}, [items, accounts])

	function addAccount() {
		setErr('')
		const name = newAcc.trim()
		if (!name) return
		const next = [...accounts, { id: uid(), name }]
		setAccounts(next)
		saveAccounts(next)
		setNewAcc('')
	}

	async function doTransfer() {
		setErr('')
		const amount = Number(transfer.amount)
		if (!Number.isFinite(amount) || amount <= 0)
			return setErr('Suma trebuie > 0.')
		if (!transfer.from || !transfer.to || transfer.from === transfer.to)
			return setErr('Alege conturi diferite.')

		const tag = `[TRANSFER:${uid()}]`

		try {
			// expense from
			await api.createTransaction({
				type: 'expense',
				date: new Date(transfer.date).toISOString(),
				amount,
				category: 'Transfer',
				description: tagAcc(
					`${transfer.note} ${tag} -> ${transfer.to}`,
					transfer.from,
				),
			})

			// income to
			await api.createTransaction({
				type: 'income',
				date: new Date(transfer.date).toISOString(),
				amount,
				category: 'Transfer',
				description: tagAcc(
					`${transfer.note} ${tag} <- ${transfer.from}`,
					transfer.to,
				),
			})

			await load()
			setTransfer(s => ({ ...s, amount: '0' }))
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
									fontSize: 22,
									fontWeight: 950,
									letterSpacing: '-0.5px',
								}}
							>
								Conturi
							</div>
							<div
								style={{
									marginTop: 4,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Sold calculat din tranzacții care au în descriere tag-ul{' '}
								<b>#acc:Nume</b>.
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

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
				<div className='panel cardPad'>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							gap: 12,
							flexWrap: 'wrap',
						}}
					>
						<div style={{ fontWeight: 950 }}>Sold pe cont (luna curentă)</div>
						<span className='badge'>{accounts.length} conturi</span>
					</div>

					<div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
						{accounts.map(a => (
							<div
								key={a.id}
								style={{
									borderRadius: 16,
									border: '1px solid var(--border)',
									background: '#fff',
									padding: 12,
									display: 'flex',
									justifyContent: 'space-between',
									gap: 12,
								}}
							>
								<div style={{ fontWeight: 950 }}>{a.name}</div>
								<div style={{ fontWeight: 950 }}>
									{money(balances.get(a.name) || 0)}
								</div>
							</div>
						))}
					</div>

					<div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
						<input
							className='input'
							placeholder='Nume cont (ex: Revolut)'
							value={newAcc}
							onChange={e => setNewAcc(e.target.value)}
						/>
						<button
							className='btn btnPrimary'
							type='button'
							onClick={addAccount}
						>
							<Plus size={16} /> Add
						</button>
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
							<ArrowLeftRight size={18} />
						</div>
						<div>
							<div style={{ fontWeight: 950 }}>Transfer între conturi</div>
							<div
								style={{
									marginTop: 4,
									color: 'var(--muted)',
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								Creează 2 tranzacții (expense + income) marcate cu tag.
							</div>
						</div>
					</div>

					<div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: 12,
							}}
						>
							<div>
								<div className='label'>Din</div>
								<select
									className='select'
									value={transfer.from}
									onChange={e =>
										setTransfer(s => ({ ...s, from: e.target.value }))
									}
								>
									{accounts.map(a => (
										<option key={a.id} value={a.name}>
											{a.name}
										</option>
									))}
								</select>
							</div>
							<div>
								<div className='label'>În</div>
								<select
									className='select'
									value={transfer.to}
									onChange={e =>
										setTransfer(s => ({ ...s, to: e.target.value }))
									}
								>
									{accounts.map(a => (
										<option key={a.id} value={a.name}>
											{a.name}
										</option>
									))}
								</select>
							</div>

							<div>
								<div className='label'>Sumă (MDL)</div>
								<input
									className='input'
									type='number'
									min='0'
									step='0.01'
									value={transfer.amount}
									onChange={e =>
										setTransfer(s => ({ ...s, amount: e.target.value }))
									}
								/>
							</div>
							<div>
								<div className='label'>Data</div>
								<input
									className='input'
									type='date'
									value={transfer.date}
									onChange={e =>
										setTransfer(s => ({ ...s, date: e.target.value }))
									}
								/>
							</div>
						</div>

						<div>
							<div className='label'>Notă</div>
							<input
								className='input'
								value={transfer.note}
								onChange={e =>
									setTransfer(s => ({ ...s, note: e.target.value }))
								}
							/>
						</div>

						<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
							<button
								className='btn btnPrimary'
								type='button'
								onClick={doTransfer}
							>
								Transfer
							</button>
						</div>

						<div className='badge'>
							Tip: adaugă manual în descrierile tranzacțiilor “#acc:Cash” ca să
							apară în sold.
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
