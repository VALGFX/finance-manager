import { cn } from '../../lib/cn'

export default function Button({ className, variant = 'default', ...props }) {
	const base =
		'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ' +
		'focus:outline-none focus:ring-2 focus:ring-sky-400/60 disabled:opacity-50 disabled:pointer-events-none'

	const variants = {
		default: 'bg-sky-500 text-white hover:bg-sky-400',
		secondary: 'bg-white/10 text-white hover:bg-white/15 ring-1 ring-white/10',
		ghost: 'bg-transparent hover:bg-white/10',
		danger: 'bg-rose-500 text-white hover:bg-rose-400',
	}

	return (
		<button className={cn(base, variants[variant], className)} {...props} />
	)
}
