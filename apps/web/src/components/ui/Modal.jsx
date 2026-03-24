import { useEffect } from 'react'
import { cn } from '../../lib/cn'

export default function Modal({ open, onClose, title, children, className }) {
	useEffect(() => {
		function onKey(e) {
			if (e.key === 'Escape') onClose?.()
		}
		if (open) window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open, onClose])

	if (!open) return null

	return (
		<div className='fixed inset-0 z-50'>
			<div className='absolute inset-0 bg-black/60' onClick={onClose} />
			<div className='absolute inset-0 flex items-center justify-center p-4'>
				<div
					className={cn(
						'w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950 p-4',
						className,
					)}
				>
					<div className='flex items-center justify-between gap-3'>
						<div className='text-base font-bold'>{title}</div>
						<button
							className='rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10'
							onClick={onClose}
						>
							Închide
						</button>
					</div>
					<div className='mt-3'>{children}</div>
				</div>
			</div>
		</div>
	)
}
