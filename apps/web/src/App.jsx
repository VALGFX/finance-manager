import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import { getToken } from './lib/auth.js'

import Accounts from './pages/Accounts.jsx'
import Budgets from './pages/Budgets.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Goals from './pages/Goals.jsx'
import Login from './pages/Login.jsx'
import Planner from './pages/Planner.jsx'
import Recurring from './pages/Recurring.jsx'
import Register from './pages/Register.jsx'
import Transactions from './pages/Transactions.jsx'

function ProtectedRoute({ children }) {
	return getToken() ? children : <Navigate to='/login' replace />
}

export default function App() {
	return (
		<Routes>
			<Route element={<AppShell />}>
				<Route index element={<Navigate to='/dashboard' replace />} />

				{/* Public */}
				<Route path='/login' element={<Login />} />
				<Route path='/register' element={<Register />} />

				{/* Protected */}
				<Route
					path='/dashboard'
					element={
						<ProtectedRoute>
							<Dashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/transactions'
					element={
						<ProtectedRoute>
							<Transactions />
						</ProtectedRoute>
					}
				/>

				<Route
					path='/budgets'
					element={
						<ProtectedRoute>
							<Budgets />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/goals'
					element={
						<ProtectedRoute>
							<Goals />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/recurring'
					element={
						<ProtectedRoute>
							<Recurring />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/accounts'
					element={
						<ProtectedRoute>
							<Accounts />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/planner'
					element={
						<ProtectedRoute>
							<Planner />
						</ProtectedRoute>
					}
				/>

				<Route path='*' element={<div className='panel cardPad'>404</div>} />
			</Route>
		</Routes>
	)
}
