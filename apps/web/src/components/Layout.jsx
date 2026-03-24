import { Link, Outlet, useNavigate } from 'react-router-dom'
import { clearToken, getToken } from '../lib/auth'

export default function Layout() {
	const nav = useNavigate()
	const token = getToken()

	function logout() {
		clearToken()
		nav('/login')
	}

	return (
		<div className='app'>
			<header className='header'>
				<div className='container headerRow'>
					<div className='brand'>
						<div className='brandTitle'>Finance Manager</div>
						<div className='brandSub'>MDL • Analiză • Recomandări</div>
					</div>

					<nav className='nav'>
						{token ? (
							<>
								<Link to='/dashboard'>Dashboard</Link>
								<Link to='/transactions'>Tranzacții</Link>
								<button className='btn secondary' onClick={logout}>
									Logout
								</button>
							</>
						) : (
							<>
								<Link to='/login'>Login</Link>
								<Link to='/register'>Register</Link>
							</>
						)}
					</nav>
				</div>
			</header>

			<main className='container'>
				<Outlet />
			</main>

			<footer className='footer container'>
				<span>© {new Date().getFullYear()} Finance Manager</span>
			</footer>
		</div>
	)
}
