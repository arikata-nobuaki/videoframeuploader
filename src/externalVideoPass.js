const EXTERNAL_VIDEO_SHADER = /* wgsl */ `
struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
	var pos = array<vec2f, 6>(
		vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
		vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
	);
	var uv = array<vec2f, 6>(
		vec2f(0.0, 1.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0),
		vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(1.0, 0.0),
	);
	var out: VertexOutput;
	out.position = vec4f(pos[vertexIndex], 0.0, 1.0);
	out.uv = uv[vertexIndex];
	return out;
}

@group(0) @binding(0) var videoSampler: sampler;
@group(0) @binding(1) var videoTexture: texture_external;

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
	return textureSampleBaseClampToEdge(videoTexture, videoSampler, input.uv);
}
`

const EXTERNAL_VIDEO_SHADER_RT = /* wgsl */ `
struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
	var pos = array<vec2f, 6>(
		vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
		vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
	);
	var uv = array<vec2f, 6>(
		vec2f(0.0, 1.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0),
		vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(1.0, 0.0),
	);
	var out: VertexOutput;
	out.position = vec4f(pos[vertexIndex], 0.0, 1.0);
	out.uv = uv[vertexIndex];
	return out;
}

@group(0) @binding(0) var videoSampler: sampler;
@group(0) @binding(1) var videoTexture: texture_external;

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
	let sampleUv = vec2f(input.uv.x, 1.0 - input.uv.y);
	return textureSampleBaseClampToEdge(videoTexture, videoSampler, sampleUv);
}
`

const createExternalVideoPipeline = (device, format, options = {}) => {
	const { forRenderTarget = false } = options
	const shaderCode = forRenderTarget ? EXTERNAL_VIDEO_SHADER_RT : EXTERNAL_VIDEO_SHADER
	const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' })
	const shaderModule = device.createShaderModule({ code: shaderCode })
	const pipeline = device.createRenderPipeline({
		layout: 'auto',
		vertex: { module: shaderModule, entryPoint: 'vs_main' },
		fragment: {
			module: shaderModule,
			entryPoint: 'fs_main',
			targets: [{ format }],
		},
		primitive: { topology: 'triangle-list' },
	})

	return { sampler, pipeline }
}

const drawExternalVideoFrame = (pass, device, pipeline, sampler, frame) => {
	const externalTexture = device.importExternalTexture({ source: frame })
	const bindGroup = device.createBindGroup({
		layout: pipeline.getBindGroupLayout(0),
		entries: [
			{ binding: 0, resource: sampler },
			{ binding: 1, resource: externalTexture },
		],
	})
	pass.setBindGroup(0, bindGroup)
	pass.draw(6)
}

const blitVideoFrameToTarget = ({
	device,
	pipeline,
	sampler,
	frame,
	colorView,
	width,
	height,
}) => {
	const encoder = device.createCommandEncoder()
	const pass = encoder.beginRenderPass({
		colorAttachments: [
			{
				view: colorView,
				loadOp: 'clear',
				clearValue: { r: 0, g: 0, b: 0, a: 1 },
				storeOp: 'store',
			},
		],
	})

	pass.setPipeline(pipeline)
	pass.setViewport(0, 0, width, height, 0, 1)
	pass.setScissorRect(0, 0, width, height)
	drawExternalVideoFrame(pass, device, pipeline, sampler, frame)
	pass.end()
	device.queue.submit([encoder.finish()])
}

const blitVideoFramesToTargets = ({ device, pipeline, sampler, items }) => {
	if (items.length === 0) return

	const encoder = device.createCommandEncoder()

	for (const { frame, colorView, width, height } of items) {
		const pass = encoder.beginRenderPass({
			colorAttachments: [
				{
					view: colorView,
					loadOp: 'clear',
					clearValue: { r: 0, g: 0, b: 0, a: 1 },
					storeOp: 'store',
				},
			],
		})
		pass.setPipeline(pipeline)
		pass.setViewport(0, 0, width, height, 0, 1)
		pass.setScissorRect(0, 0, width, height)
		drawExternalVideoFrame(pass, device, pipeline, sampler, frame)
		pass.end()
	}

	device.queue.submit([encoder.finish()])
}

const computeViewportsFromAnchors = (camera, players, canvasWidth, canvasHeight) => {
	const worldW = camera.right - camera.left
	const worldH = camera.top - camera.bottom

	return players.map((player) => {
		const { cellWidth, cellHeight } = player
		const x = player.anchor.position.x - cellWidth / 2
		const yTop = player.anchor.position.y + cellHeight / 2

		const px = ((x - camera.left) / worldW) * canvasWidth
		const pw = (cellWidth / worldW) * canvasWidth
		const ph = (cellHeight / worldH) * canvasHeight
		const pyTop = ((camera.top - yTop) / worldH) * canvasHeight
		const py = canvasHeight - pyTop - ph

		return { x: px, y: py, w: pw, h: ph }
	})
}

const renderExternalVideoPass = ({
	device,
	context,
	pipeline,
	sampler,
	players,
	viewports,
	loadOp = 'load',
}) => {
	const colorAttachment = {
		view: context.getCurrentTexture().createView(),
		loadOp,
		storeOp: 'store',
	}

	if (loadOp === 'clear') {
		colorAttachment.clearValue = { r: 0.1, g: 0.1, b: 0.1, a: 1 }
	}

	const encoder = device.createCommandEncoder()
	const pass = encoder.beginRenderPass({
		colorAttachments: [colorAttachment],
	})

	pass.setPipeline(pipeline)

	for (let i = 0; i < players.length; i++) {
		const player = players[i]
		const cell = viewports[i]
		if (!player?.frame || !cell) continue

		pass.setViewport(cell.x, cell.y, cell.w, cell.h, 0, 1)
		pass.setScissorRect(cell.x, cell.y, cell.w, cell.h)
		drawExternalVideoFrame(pass, device, pipeline, sampler, player.frame)
	}

	pass.end()
	device.queue.submit([encoder.finish()])
}

export {
	createExternalVideoPipeline,
	blitVideoFramesToTargets,
}
