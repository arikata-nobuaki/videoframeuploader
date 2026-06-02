export const VIDEO_COUNT = 4
export const GRID_COLS = 2
export const GRID_ROWS = 2
export const GAP = 0.01

const VIDEO_FILE = 'seaside.mp4'

export function getVideoUrl() {
	return new URL(`../video/${VIDEO_FILE}`, import.meta.url).href
}
