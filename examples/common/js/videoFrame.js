export function setPlayerVideoFrame(player, frame) {
	if (player.frame && player.frame !== frame) {
		player.frame.close()
	}
	player.frame = frame
	return frame
}
