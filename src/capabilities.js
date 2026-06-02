export const checkCapabilities = () => {
	const hasWebGPU = !!navigator.gpu
	const hasVideoFrame = typeof VideoFrame !== 'undefined'

	return {
		hasWebGPU,
		hasVideoFrame,
		canRun: hasWebGPU && hasVideoFrame,
	}
}
