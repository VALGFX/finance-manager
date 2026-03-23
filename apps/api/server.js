require('dotenv').config()

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { z } = require('zod')

const app = express()

app.use(
	cors({
		origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || '*',
	}),
)
app.use(express.json())

// ====== Mongo connect ======
async function connectDB() {
	if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI lipsește din .env')
	await mongoose.connect(process.env.MONGODB_URI)
	console.log('✅ MongoDB connected')
}

// ====== Models (simple, in one file for start) ======
const userSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		passwordHash: { type: String, required: true },
	},
	{ timestamps: true },
)

const User = mongoose.model('User', userSchema)

const txSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		type: {
			type: String,
			enum: ['income', 'expense', 'transfer'],
			required: true,
			index: true,
		},
		date: { type: Date, required: true, index: true },
		amount: { type: Number, required: true, min: 0 },
		currency: { type: String, default: 'MDL' },
		category: { type: String, required: true, index: true },
		description: { type: String, default: '' },
	},
	{ timestamps: true },
)

const Transaction = mongoose.model('Transaction', txSchema)

// ====== Middleware auth ======
function authRequired(req, res, next) {
	const header = req.headers.authorization || ''
	const token = header.startsWith('Bearer ') ? header.slice(7) : null
	if (!token)
		return res.status(401).json({ error: 'Neautorizat (lipsește token).' })

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET)
		req.user = { id: payload.sub, email: payload.email }
		return next()
	} catch {
		return res.status(401).json({ error: 'Token invalid sau expirat.' })
	}
}

// ====== Routes ======
app.get('/health', (req, res) => res.json({ ok: true }))

app.post('/api/auth/register', async (req, res) => {
	const schema = z.object({
		email: z.string().email(),
		password: z.string().min(8),
	})

	const parsed = schema.safeParse(req.body)
	if (!parsed.success) return res.status(400).json({ error: 'Date invalide.' })

	const { email, password } = parsed.data

	const existing = await User.findOne({ email })
	if (existing) return res.status(409).json({ error: 'Email deja folosit.' })

	const passwordHash = await bcrypt.hash(password, 12)
	const user = await User.create({ email, passwordHash })

	res.status(201).json({ id: user._id, email: user.email })
})

app.post('/api/auth/login', async (req, res) => {
	const schema = z.object({
		email: z.string().email(),
		password: z.string().min(1),
	})

	const parsed = schema.safeParse(req.body)
	if (!parsed.success) return res.status(400).json({ error: 'Date invalide.' })

	const { email, password } = parsed.data

	const user = await User.findOne({ email })
	if (!user) return res.status(401).json({ error: 'Email sau parolă greșită.' })

	const ok = await bcrypt.compare(password, user.passwordHash)
	if (!ok) return res.status(401).json({ error: 'Email sau parolă greșită.' })

	const token = jwt.sign(
		{ sub: String(user._id), email: user.email },
		process.env.JWT_SECRET,
		{ expiresIn: '7d' },
	)

	res.json({ token })
})

app.get('/api/transactions', authRequired, async (req, res) => {
	const { month } = req.query // YYYY-MM
	const filter = { userId: req.user.id }

	if (month && typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
		const start = new Date(`${month}-01T00:00:00.000Z`)
		const end = new Date(start)
		end.setUTCMonth(end.getUTCMonth() + 1)
		filter.date = { $gte: start, $lt: end }
	}

	const txs = await Transaction.find(filter)
		.sort({ date: -1, createdAt: -1 })
		.limit(2000)
	res.json(txs)
})

app.post('/api/transactions', authRequired, async (req, res) => {
	const schema = z.object({
		type: z.enum(['income', 'expense', 'transfer']),
		date: z.string(),
		amount: z.number().positive(),
		category: z.string().min(1),
		description: z.string().optional(),
	})

	const parsed = schema.safeParse(req.body)
	if (!parsed.success)
		return res.status(400).json({ error: 'Tranzacție invalidă.' })

	const data = parsed.data
	const tx = await Transaction.create({
		userId: req.user.id,
		type: data.type,
		date: new Date(data.date),
		amount: data.amount,
		currency: 'MDL',
		category: data.category,
		description: data.description || '',
	})

	res.status(201).json(tx)
})

app.get('/api/insights', authRequired, async (req, res) => {
	const now = new Date()
	const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

	const month =
		typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
			? req.query.month
			: ym

	const start = new Date(`${month}-01T00:00:00.000Z`)
	const end = new Date(start)
	end.setUTCMonth(end.getUTCMonth() + 1)

	const txs = await Transaction.find({
		userId: req.user.id,
		date: { $gte: start, $lt: end },
		type: { $in: ['income', 'expense'] },
	})

	const income = txs
		.filter(t => t.type === 'income')
		.reduce((s, t) => s + t.amount, 0)
	const expense = txs
		.filter(t => t.type === 'expense')
		.reduce((s, t) => s + t.amount, 0)
	const savings = income - expense
	const savingRate = income > 0 ? savings / income : null

	const byCat = new Map()
	for (const t of txs.filter(t => t.type === 'expense')) {
		byCat.set(t.category, (byCat.get(t.category) || 0) + t.amount)
	}
	const topCategories = [...byCat.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([category, total]) => ({ category, total }))

	const recommendations = []
	if (income > 0 && savingRate !== null) {
		const pct = Math.round(savingRate * 100)
		if (pct < 10)
			recommendations.push(
				`Rata ta de economisire este ~${pct}%. Țintă recomandată: 10–20%. Încearcă să reduci cheltuielile din categoriile de top cu 5–10%.`,
			)
	}
	if (topCategories.length) {
		const top = topCategories[0]
		recommendations.push(
			`Cea mai mare categorie de cheltuieli este „${top.category}”. Dacă reduci această categorie cu 10%, economisești aproximativ ${(top.total * 0.1).toFixed(0)} MDL luna aceasta.`,
		)
	}

	res.json({
		month,
		currency: 'MDL',
		totals: { income, expense, savings, savingRate },
		topCategories,
		recommendations,
	})
})

// ====== Start ======
const port = Number(process.env.PORT || 4000)

connectDB()
	.then(() =>
		app.listen(port, () =>
			console.log(`✅ API running on http://localhost:${port}`),
		),
	)
	.catch(e => {
		console.error('❌ DB connect failed:', e)
		process.exit(1)
	})
