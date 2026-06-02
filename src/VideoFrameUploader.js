import {
	createExternalVideoPipeline,
	blitVideoFramesToTargets,
} from './externalVideoPass.js'
import {
	createVideoSurface,
	resizeVideoSurface,
	getRenderTargetColorView,
	getRenderTargetFormat,
	createDefaultVideoColorNode,
} from './videoSurface.js'
import { checkCapabilities } from './capabilities.js'

class ExternalVideoSurface {
	constructor(uploader, options = {}) {
		this._uploader = uploader

		const internal = createVideoSurface(options.buildColorNode)
		this.mesh = internal.mesh
		this._internal = internal

		this.frame = null

		this._renderWidth = 0
		this._renderHeight = 0
	}

	setRenderSize(width, height) {
		const w = Math.max(1, Math.floor(width))
		const h = Math.max(1, Math.floor(height))
		if (w === this._renderWidth && h === this._renderHeight) return
		this._renderWidth = w
		this._renderHeight = h
		this._syncRenderTarget()
	}

	get renderTarget() {
		return this._internal.renderTarget
	}

	get texture() {
		return this._internal.renderTarget?.texture ?? null
	}

	setFrame(frame) {
		if (this.frame && this.frame !== frame) {
			this.frame.close()
		}
		this.frame = frame
	}

	_syncRenderTarget() {
		const { renderer } = this._uploader
		resizeVideoSurface(renderer, this._internal, this._renderWidth, this._renderHeight)
		this._uploader._ensureVideoPass(this._internal.renderTarget)
	}

	dispose() {
		this.setFrame(null)
		this._internal.renderTarget?.dispose()
		this._internal.material?.dispose()
		this.mesh.geometry.dispose()
		this._internal.renderTarget = null
		this._internal.material = null
	}
}

class VideoFrameUploader {
	constructor(renderer) {
		if (!renderer?.backend) {
			throw new Error('VideoFrameUploader: renderer must be a WebGPURenderer with an initialized backend')
		}

		this.renderer = renderer
		this.device = renderer.backend.device

		this._videoPass = null
		this._disposed = false
	}

	static async create(renderer) {
		const caps = checkCapabilities()
		if (!caps.canRun) {
			throw new Error(
				`Required APIs missing: WebGPU=${caps.hasWebGPU}, VideoFrame=${caps.hasVideoFrame}`,
			)
		}

		if (!renderer.backend.device) {
			await renderer.init()
		}

		return new VideoFrameUploader(renderer)
	}

	createSurface(options = {}) {
		this._assertAlive()
		const surface = new ExternalVideoSurface(this, options)
		surface.setRenderSize(1, 1)
		return surface
	}
	
	update({ surfaces }) {
		this._assertAlive()

		const blitItems = []

		for (const surface of surfaces) {
			if (!surface.frame || !surface.renderTarget) {
				surface.mesh.visible = false
				continue
			}

			surface.mesh.visible = true
			blitItems.push({
				frame: surface.frame,
				colorView: getRenderTargetColorView(this.renderer, surface.renderTarget),
				width: surface.renderTarget.width,
				height: surface.renderTarget.height,
			})
		}

		if (blitItems.length > 0 && this._videoPass) {
			blitVideoFramesToTargets({
				device: this.device,
				pipeline: this._videoPass.pipeline,
				sampler: this._videoPass.sampler,
				items: blitItems,
			})
		}
	}

	dispose() {
		if (this._disposed) return
		this._disposed = true
		this._videoPass = null
	}

	_ensureVideoPass(renderTarget) {
		if (!renderTarget || this._videoPass) return
		const format = getRenderTargetFormat(this.renderer, renderTarget)
		this._videoPass = createExternalVideoPipeline(this.device, format, {
			forRenderTarget: true,
		})
	}

	_assertAlive() {
		if (this._disposed) {
			throw new Error('VideoFrameUploader: instance has been disposed')
		}
	}
}

export {
	VideoFrameUploader,
	ExternalVideoSurface,
	createDefaultVideoColorNode,
	checkCapabilities,
}
