import '../common/style/style.css'
import * as THREE from 'three/webgpu'
import { assertWebGPU } from '../common/js/capabilities.js'
import { VIDEO_COUNT, getVideoUrl } from '../common/js/constants.js'
import { runDemo } from '../common/js/errors.js'
import { applyGridToMeshGeometry, setupGridLayout } from '../common/js/layout.js'
import { playAllVideos } from '../common/js/playback.js'
import { createOrthoScene, createWebGPURenderer, getCanvas } from '../common/js/scene.js'
import { createStats } from '../common/js/stats.js'
import { createVideoElement } from '../common/js/video.js'

const VIDEO_URL = getVideoUrl()

function createVideoPlayer(scene) {
	const video = createVideoElement(VIDEO_URL)

	const texture = new THREE.VideoTexture(video)
	texture.colorSpace = THREE.SRGBColorSpace
	texture.minFilter = THREE.LinearFilter
	texture.magFilter = THREE.LinearFilter

	const material = new THREE.MeshBasicMaterial({ map: texture })
	const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
	scene.add(mesh)

	return { video, texture, mesh }
}

async function main() {
	assertWebGPU()

	const stats = createStats()
	const renderer = await createWebGPURenderer(getCanvas())
	const { scene, camera } = createOrthoScene()

	const players = Array.from({ length: VIDEO_COUNT }, () => createVideoPlayer(scene))

	const fitLayout = setupGridLayout({
		renderer,
		camera,
		players,
		getVideo: (p) => p.video,
		applyCell: (player, layout) => applyGridToMeshGeometry(player.mesh, layout),
	})

	await playAllVideos(players)
	fitLayout()

	renderer.setAnimationLoop(() => {
		stats.begin()
		renderer.render(scene, camera)
		stats.end()
	})
}

runDemo(main, 'Safari 18.2+ / WebGPU が必要です。')
