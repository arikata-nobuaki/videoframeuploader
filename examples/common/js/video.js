export function createVideoElement(videoUrl) {
	const video = document.createElement('video')
	video.src = videoUrl
	video.muted = true
	video.loop = true
	video.playsInline = true
	video.crossOrigin = 'anonymous'
	video.preload = 'auto'
	return video
}

export function isVideoReady(video) {
	return (
		video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
		video.videoWidth > 0 &&
		video.videoHeight > 0
	)
}
