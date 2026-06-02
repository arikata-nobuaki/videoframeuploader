export function assertWebGPU() {
	if (!navigator.gpu) {
		throw new Error('WebGPU is not available')
	}
}

export function assertVideoFrame() {
	if (typeof VideoFrame === 'undefined') {
		throw new Error('VideoFrame is not available')
	}
}
