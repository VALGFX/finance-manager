export function Card({ className = '', ...props }) {
	return (
		<div
			className={
				'rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_70px_-60px_rgba(0,0,0,.9)] backdrop-blur ' +
				className
			}
			{...props}
		/>
	)
}

export function CardTitle({ className = '', ...props }) {
	return (
		<div
			className={'text-base font-black tracking-tight ' + className}
			{...props}
		/>
	)
}

export function CardDesc({ className = '', ...props }) {
	return <div className={'text-sm text-slate-300 ' + className} {...props} />
}
