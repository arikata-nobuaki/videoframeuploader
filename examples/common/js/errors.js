export function showFatalError(err, footer) {
	console.error(err)
	document.body.insertAdjacentHTML(
		'beforeend',
		`<pre style="color:#f88;padding:16px;">${err.message}\n\n${footer}</pre>`,
	)
}

export function runDemo(main, footer) {
	main().catch((err) => showFatalError(err, footer))
}
