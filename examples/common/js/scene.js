import * as THREE from 'three/webgpu'

export function getCanvas() {
	const canvas = document.querySelector('#canvas')
	if (!canvas) throw new Error('Canvas element not found: #canvas')
	return canvas
}

export async function createWebGPURenderer(canvas) {
	const renderer = new THREE.WebGPURenderer({ canvas, antialias: true })
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(window.innerWidth, window.innerHeight)
	renderer.outputColorSpace = THREE.SRGBColorSpace
	await renderer.init()
	return renderer
}

export function createOrthoScene() {
	const scene = new THREE.Scene()
	scene.background = new THREE.Color(0x333333)

	const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
	camera.position.z = 1

	return { scene, camera }
}
