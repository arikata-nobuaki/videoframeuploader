import {
	SRGBColorSpace,
	LinearFilter,
	RenderTarget,
	Mesh,
	PlaneGeometry,
	MeshBasicNodeMaterial
} from 'three/webgpu'
import { texture, uv, colorSpaceToWorking } from 'three/tsl'

const createDefaultVideoColorNode = (videoTexture) => {
	return colorSpaceToWorking(texture(videoTexture, uv()), SRGBColorSpace)
}

const createVideoSurfaceMaterial = (videoTexture, buildColorNode = createDefaultVideoColorNode) => {
	const material = new MeshBasicNodeMaterial()
	material.colorNode = buildColorNode(videoTexture)
	material.transparent = false
	return material
}

const createVideoRenderTarget = (renderer, width, height) => {
	const w = Math.max(1, Math.floor(width))
	const h = Math.max(1, Math.floor(height))

	const renderTarget = new RenderTarget(w, h)
	renderTarget.texture.colorSpace = SRGBColorSpace
	renderTarget.texture.minFilter = LinearFilter
	renderTarget.texture.magFilter = LinearFilter

	renderer.setRenderTarget(renderTarget)
	renderer.clear()
	renderer.setRenderTarget(null)

	return renderTarget
}

const ensureVideoRenderTarget = (renderer, current, width, height) => {
	const w = Math.max(1, Math.floor(width))
	const h = Math.max(1, Math.floor(height))

	if (current && current.width === w && current.height === h) {
		return current
	}

	current?.dispose()
	return createVideoRenderTarget(renderer, w, h)
}

const getRenderTargetColorView = (renderer, renderTarget) => {
	const textureData = renderer.backend.get(renderTarget.texture)
	return textureData.texture.createView()
}

const getRenderTargetFormat = (renderer, renderTarget) => {
	const textureData = renderer.backend.get(renderTarget.texture)
	return textureData.texture.format
}

const createVideoSurface = (buildColorNode) => {
	const mesh = new Mesh(new PlaneGeometry(1, 1))
	mesh.visible = false

	return {
		mesh,
		material: null,
		renderTarget: null,
		buildColorNode: buildColorNode ?? createDefaultVideoColorNode,
	}
}

const resizeVideoSurface = (renderer, surface, pixelWidth, pixelHeight) => {
	surface.renderTarget = ensureVideoRenderTarget(
		renderer,
		surface.renderTarget,
		pixelWidth,
		pixelHeight,
	)

	if (!surface.material) {
		surface.material = createVideoSurfaceMaterial(
			surface.renderTarget.texture,
			surface.buildColorNode,
		)
		surface.mesh.material = surface.material
	} else {
		surface.material.colorNode = surface.buildColorNode(surface.renderTarget.texture)
		surface.material.needsUpdate = true
	}

	return surface.renderTarget
}

export {
	createVideoSurface,
	resizeVideoSurface,
	getRenderTargetColorView,
	getRenderTargetFormat,
	createDefaultVideoColorNode
}
