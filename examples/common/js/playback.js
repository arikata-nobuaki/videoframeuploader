export function playAllVideos(players) {
	const playAll = () =>
		Promise.all(players.map((p) => p.video.play())).catch((err) => {
			console.warn('Autoplay blocked, click to play:', err)
			document.body.addEventListener('click', () => playAll(), { once: true })
		})

	return playAll()
}
