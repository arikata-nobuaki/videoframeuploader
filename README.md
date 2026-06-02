# VideoFrameUploader

Zero-copy video textures for **Three.js WebGPU** using `importExternalTexture`.

Feed decoded `VideoFrame` objects into a render target, display them with standard TSL materials—no Three.js fork required. Decoding (HTML `<video>`, WebCodecs, etc.) stays on your side.

## Why

On Safari WebGPU, uploading video every frame via `VideoTexture` or `VideoFrameTexture` (`copyExternalImageToTexture`) is often a bottleneck. This library blits `VideoFrame` into a render target with `importExternalTexture`, then samples that RT from Three.js—matching the zero-copy path used in raw WebGPU demos.

## Requirements

- **WebGPU** (`navigator.gpu`)
- **`VideoFrame`** API
- **[Three.js](https://threejs.org/)** `>=0.184.0` with `WebGPURenderer` (`three/webgpu`)
- Safari 18.2+ (or another browser with WebGPU + `VideoFrame` from video)

No MediaBunny or other decoder is bundled. You supply frames via `ExternalVideoSurface.setFrame()`.

## Install

```bash
npm install @arikata-nobuaki/videoframeuploader
```

Or clone this repo, build the library, and import from `dist/`:

```bash
npm install
npm run build
```

## Quick start

```js
import * as THREE from 'three/webgpu'
import { VideoFrameUploader, checkCapabilities } from '@arikata-nobuaki/videoframeuploader'

const caps = checkCapabilities()
if (!caps.canRun) throw new Error('WebGPU or VideoFrame not available')

const canvas = document.querySelector('#canvas')
const renderer = new THREE.WebGPURenderer({ canvas, antialias: true })
renderer.outputColorSpace = THREE.SRGBColorSpace
await renderer.init()

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.z = 2

const uploader = await VideoFrameUploader.create(renderer)
const surface = uploader.createSurface()
scene.add(surface.mesh)

const video = document.createElement('video')
video.src = '/path/to/video.mp4'
video.muted = true
video.loop = true
await video.play()

renderer.setAnimationLoop(() => {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    surface.setFrame(new VideoFrame(video))
    surface.setRenderSize(video.videoWidth, video.videoHeight)
  }

  uploader.update({ surfaces: [surface] })
  renderer.render(scene, camera) // or composer.render()
})
```

## API

### `VideoFrameUploader.create(renderer)`

Creates an uploader from **your** `WebGPURenderer`. Calls `renderer.init()` if needed.

### `uploader.createSurface({ buildColorNode? })`

Returns an `ExternalVideoSurface` with:

| Member | Description |
|--------|-------------|
| `mesh` | `THREE.Mesh` — add to your scene and position/scale |
| `setFrame(frame)` | Set a `VideoFrame` (previous frame is closed) |
| `setRenderSize(w, h)` | RT size in pixels |
| `texture` / `renderTarget` | Read-only access to the blit target |
| `dispose()` | Release surface resources |

Optional `buildColorNode` customizes the TSL color node (default applies `colorSpaceToWorking` for correct sRGB).

### `uploader.update({ surfaces })`

Blits each surface’s `VideoFrame` into its render target. **Does not call `renderer.render()`**—you control the final draw (plain render, `EffectComposer`, etc.).

### `uploader.dispose()`

Releases internal blit pipeline only. You dispose the renderer and surfaces.

### `checkCapabilities()`

Returns `{ hasWebGPU, hasVideoFrame, canRun }`.

## Build

```bash
npm run build
```

Output: `dist/videoframeuploader.js` (minified ESM, `three` externalized as peer dependency).

## Examples

Place a sample MP4 at `examples/common/video/seaside.mp4` (or change `VIDEO_FILE` in `examples/common/js/constants.js`).

| Demo | Path | Description |
|------|------|-------------|
| Zero-copy (this library) | `examples/minimal` | `VideoFrame` → `VideoFrameUploader` |
| Copy baseline | `examples/videotexture` | `<video>` → `VideoTexture` |
| Copy baseline | `examples/videoframetexture` | `VideoFrame` → `VideoFrameTexture` |

All demos use a 2×2 grid with four independent `<video>` elements for fair FPS comparison.

```bash
npm run build
npm run preview:demo:minimal
npm run preview:demo:videotexture
npm run preview:demo:videoframetexture
```

See [examples/README.md](./examples/README.md) for details.

## Project layout

```
src/                 Library source
dist/                Built bundle (after npm run build)
examples/            Comparison demos + shared common/
LICENSE              MIT
```

## License

MIT © [Nobuaki Arikata](./LICENSE)
