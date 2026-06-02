import '../common/style/style.css'
import { VideoFrameUploader, checkCapabilities } from '../../dist/videoframeuploader.js'
import { assertWebGPU } from '../common/js/capabilities.js'
import { VIDEO_COUNT, getVideoUrl } from '../common/js/constants.js'
import { runDemo } from '../common/js/errors.js'
import { setupGridLayout, applyGridToMeshScale } from '../common/js/layout.js'
import { playAllVideos } from '../common/js/playback.js'
import { createOrthoScene, createWebGPURenderer, getCanvas } from '../common/js/scene.js'
import { createStats } from '../common/js/stats.js'
import { createVideoElement, isVideoReady } from '../common/js/video.js'

const VIDEO_URL = getVideoUrl()

async function main() {
	const caps = checkCapabilities()
	if (!caps.canRun) {
		throw new Error(
			`Required APIs missing: WebGPU=${caps.hasWebGPU}, VideoFrame=${caps.hasVideoFrame}`,
		)
	}

	assertWebGPU()

	const stats = createStats()
	const renderer = await createWebGPURenderer(getCanvas())
	const { scene, camera } = createOrthoScene()

	const uploader = await VideoFrameUploader.create(renderer)

	const players = Array.from({ length: VIDEO_COUNT }, () => {
		const video = createVideoElement(VIDEO_URL)
		const surface = uploader.createSurface()
		scene.add(surface.mesh)
		return { video, surface }
	})

	const fitLayout = setupGridLayout({
		renderer,
		camera,
		players,
		getVideo: (p) => p.video,
		applyCell: (player, layout) => applyGridToMeshScale(player.surface.mesh, layout),
	})

	await playAllVideos(players)
	fitLayout()

	renderer.setAnimationLoop(() => {
		stats.begin()

		for (const { video, surface } of players) {
			if (isVideoReady(video)) {
				surface.setFrame(new VideoFrame(video))
				surface.setRenderSize(video.videoWidth, video.videoHeight)
			}
		}

		uploader.update({ surfaces: players.map((p) => p.surface) })
		renderer.render(scene, camera)

		stats.end()
	})
}

runDemo(main, 'Safari 18.2+ / WebGPU + VideoFrame が必要です。')
