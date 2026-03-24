import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { setToken } from '../lib/auth'

export default function Login() {
	const nav = useNavigate()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [show, setShow] = useState(false)
	const [err, setErr] = useState('')
	const [loading, setLoading] = useState(false)

	async function onSubmit(e) {
		e.preventDefault()
		setErr('')
		setLoading(true)

		try {
			const res = await api.login({ email, password })
			setToken(res.token)
			nav('/dashboard')
		} catch (e) {
			setErr(String(e?.message || e))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='authWrap'>
			<div className='panel authCard'>
				<div className='authHeader'>
					<div className='authIcon'>
						<LogIn size={18} />
					</div>
					<div>
						<div className='authTitle'>Login</div>
						<div className='authSub'>
							Autentifică-te ca să-ți vezi finanțele.
						</div>
					</div>
				</div>

				<form className='authForm' onSubmit={onSubmit}>
					<div>
						<div className='label'>Email</div>
						<input
							className='input'
							value={email}
							onChange={e => setEmail(e.target.value)}
							type='email'
							autoComplete='email'
							placeholder='ex: exemple@email.com'
							required
						/>
					</div>

					<div>
						<div className='label'>Parolă</div>
						<div className='inputWithBtn'>
							<input
								className='input inputGrow'
								value={password}
								onChange={e => setPassword(e.target.value)}
								type={show ? 'text' : 'password'}
								autoComplete='current-password'
								placeholder='••••••••'
								required
							/>
							<button
								className='iconBtn'
								type='button'
								onClick={() => setShow(s => !s)}
								title={show ? 'Ascunde parola' : 'Arată parola'}
							>
								{show ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						</div>
					</div>

					{err && <div className='error'>{err}</div>}

					<button className='btn btnPrimary' disabled={loading} type='submit'>
						{loading ? 'Se autentifică...' : 'Login'}
					</button>

					<div className='authFooter'>
						<div className='authHint'>Nu ai cont?</div>
						<Link className='btn authLinkBtn' to='/register'>
							Creează cont
						</Link>
					</div>
				</form>
			</div>
		</div>
	)
}
