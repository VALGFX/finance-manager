import { cn } from '../../lib/cn'

export default function Input({ className, ...props }) {
	return (
		<input
			className={cn(
				'h-11 w-full rounded-xl bg-white/5 px-3 text-sm text-white ring-1 ring-white/10 ' +
					'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60',
				className,
			)}
			{...props}
		/>
	)
}
