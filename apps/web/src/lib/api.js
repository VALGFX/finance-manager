import { clearToken, getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL

function buildHeaders(extra = {}) {
	const token = getToken()
	return {
		'Content-Type': 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...extra,
	}
}

async function request(path, options = {}) {
	if (!API_URL) throw new Error('VITE_API_URL nu este setat.')

	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: buildHeaders(options.headers),
	})

	const text = await res.text()
	const data = text ? JSON.parse(text) : null

	if (res.status === 401) {
		clearToken()
		throw new Error('Neautorizat. Te rugăm să te autentifici din nou.')
	}

	if (!res.ok) {
		throw new Error(data?.error || `Eroare API (${res.status})`)
	}

	return data
}

export const api = {
	register: body =>
		request('/api/auth/register', {
			method: 'POST',
			body: JSON.stringify(body),
		}),

	login: body =>
		request('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify(body),
		}),

	listTransactions: month =>
		request(
			`/api/transactions${month ? `?month=${encodeURIComponent(month)}` : ''}`,
		),

	createTransaction: body =>
		request('/api/transactions', {
			method: 'POST',
			body: JSON.stringify(body),
		}),

	updateTransaction: (id, body) =>
		request(`/api/transactions/${id}`, {
			method: 'PUT',
			body: JSON.stringify(body),
		}),

	deleteTransaction: id =>
		request(`/api/transactions/${id}`, { method: 'DELETE' }),

	insights: month =>
		request(
			`/api/insights${month ? `?month=${encodeURIComponent(month)}` : ''}`,
		),
}
