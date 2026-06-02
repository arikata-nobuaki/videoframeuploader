import Stats from 'three/examples/jsm/libs/stats.module.js'

export function createStats() {
	const stats = new Stats()
	document.body.appendChild(stats.dom)
	return stats
}
