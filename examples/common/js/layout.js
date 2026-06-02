import * as THREE from 'three/webgpu'
import { GRID_COLS, GRID_ROWS, GAP } from './constants.js'

export function computeGridCells(refVideo) {
	const viewAspect = window.innerWidth / window.innerHeight
	const videoAspect = refVideo.videoWidth / refVideo.videoHeight

	const availWidth = viewAspect * 2
	const availHeight = 2

	let cellWidth = (availWidth - GAP * (GRID_COLS - 1)) / GRID_COLS
	let cellHeight = cellWidth / videoAspect
	let gridHeight = cellHeight * GRID_ROWS + GAP * (GRID_ROWS - 1)

	if (gridHeight > availHeight) {
		cellHeight = (availHeight - GAP * (GRID_ROWS - 1)) / GRID_ROWS
		cellWidth = cellHeight * videoAspect
		gridHeight = cellHeight * GRID_ROWS + GAP * (GRID_ROWS - 1)
	}

	const gridWidth = cellWidth * GRID_COLS + GAP * (GRID_COLS - 1)
	const startX = -gridWidth / 2 + cellWidth / 2
	const startY = gridHeight / 2 - cellHeight / 2

	return { cellWidth, cellHeight, startX, startY }
}

export function updateOrthoCameraForGrid(renderer, camera, refVideo) {
	const width = window.innerWidth
	const height = window.innerHeight
	const viewAspect = width / height

	renderer.setSize(width, height)
	camera.left = -viewAspect
	camera.right = viewAspect
	camera.top = 1
	camera.bottom = -1
	camera.updateProjectionMatrix()

	return computeGridCells(refVideo)
}

export function setupGridLayout({ renderer, camera, players, getVideo, applyCell }) {
	const fit = () => {
		const refVideo = players.map(getVideo).find((v) => v.videoWidth > 0)
		if (!refVideo) return

		const { cellWidth, cellHeight, startX, startY } = updateOrthoCameraForGrid(
			renderer,
			camera,
			refVideo,
		)

		players.forEach((player, index) => {
			const col = index % GRID_COLS
			const row = Math.floor(index / GRID_COLS)
			const x = startX + col * (cellWidth + GAP)
			const y = startY - row * (cellHeight + GAP)
			applyCell(player, { col, row, cellWidth, cellHeight, startX: x, startY: y })
		})
	}

	players.forEach((player) => {
		getVideo(player).addEventListener('loadedmetadata', fit)
	})
	window.addEventListener('resize', fit)

	return fit
}

export function applyGridToMeshGeometry(mesh, layout) {
	mesh.geometry.dispose()
	mesh.geometry = new THREE.PlaneGeometry(layout.cellWidth, layout.cellHeight)
	mesh.position.x = layout.startX
	mesh.position.y = layout.startY
}

export function applyGridToMeshScale(mesh, layout) {
	mesh.position.x = layout.startX
	mesh.position.y = layout.startY
	mesh.scale.set(layout.cellWidth, layout.cellHeight, 1)
}
