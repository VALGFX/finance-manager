import {
	Calculator,
	CalendarClock,
	LayoutGrid,
	LogOut,
	PiggyBank,
	ReceiptText,
	Search,
	Target,
	Wallet,
} from 'lucide-react'
import {
	Link,
	Outlet,
	useLocation,
	useNavigate,
	useSearchParams,
} from 'react-router-dom'
import { clearToken, getToken } from '../lib/auth'

function IconNav({ to, icon: Icon, label }) {
	const { pathname } = useLocation()
	const active = pathname === to

	return (
		<Link
			to={to}
			className={`iconNavBtn ${active ? 'iconNavBtnActive' : ''}`}
			title={label}
			aria-label={label}
		>
			<Icon size={20} />
		</Link>
	)
}

function Tab({ to, label }) {
	const { pathname } = useLocation()
	const active = pathname === to

	return (
		<Link to={to} className={`tab ${active ? 'tabActive' : ''}`}>
			{label}
		</Link>
	)
}

export default function AppShell() {
	const token = getToken()
	const nav = useNavigate()

	const [sp, setSp] = useSearchParams()
	const q = sp.get('q') || ''

	return (
		<div className='container'>
			<div className='shell'>
				{/* Sidebar */}
				<aside className='panel sidebar'>
					<div className='brandDot' title='Finance Manager'>
						FM
					</div>

					<div className='sideNav'>
						<IconNav to='/dashboard' icon={LayoutGrid} label='Dashboard' />
						<IconNav to='/transactions' icon={ReceiptText} label='Tranzacții' />
						<IconNav to='/budgets' icon={PiggyBank} label='Bugete' />
						<IconNav to='/goals' icon={Target} label='Obiective' />
						<IconNav to='/recurring' icon={CalendarClock} label='Recurente' />
						<IconNav to='/accounts' icon={Wallet} label='Conturi' />
						<IconNav to='/planner' icon={Calculator} label='Planner' />
					</div>

					{token && (
						<button
							className='iconNavBtn'
							title='Logout'
							aria-label='Logout'
							onClick={() => {
								clearToken()
								nav('/login')
							}}
							style={{ marginTop: 'auto' }}
						>
							<LogOut size={20} />
						</button>
					)}
				</aside>

				{/* Main */}
				<div className='main'>
					{/* Topbar */}
					<header className='panel topbarPro'>
						<div className='topbarLeft'>
							<div className='tabsPro'>
								<Tab to='/dashboard' label='Overview' />
								<Tab to='/transactions' label='Activity' />
								<span className='pill'>MDL</span>
							</div>
						</div>

						<div className='topbarRight'>
							<div className='searchPro'>
								<Search size={16} className='searchIcon' />
								<input
									value={q}
									onChange={e => {
										const next = e.target.value
										const nsp = new URLSearchParams(sp)
										if (next) nsp.set('q', next)
										else nsp.delete('q')
										setSp(nsp, { replace: true })
									}}
									placeholder='Search transactions...'
								/>
							</div>
						</div>
					</header>

					<Outlet />
				</div>
			</div>
		</div>
	)
}
