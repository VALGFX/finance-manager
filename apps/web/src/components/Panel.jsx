export default function Panel({ className = '', children }) {
	return (
		<div
			className={
				'rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_30px_90px_-70px_rgba(0,0,0,.9)] backdrop-blur ' +
				className
			}
		>
			{children}
		</div>
	)
}
