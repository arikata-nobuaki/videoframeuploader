import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const licenseBanner = readFileSync(resolve(__dirname, 'src/index.js'), 'utf8').match(
	/^\/\*![\s\S]*?\*\//,
)?.[0]

if (!licenseBanner) {
	throw new Error('MIT license block (/*! ... */) not found in src/index.js')
}

const threeExternal = (id) => /^three(\/.+)?$/.test(id)

function inlineWgsl() {
	return {
		name: 'inline-wgsl',
		enforce: 'pre',
		transform(code, id) {
			if (!id.endsWith('externalVideoPass.js')) return

			let next = code.replace(
				/\/\*\* WGSL[\s\S]*?\*\/\s*const wgsl = [\s\S]*?\n\}\n\n/,
				'',
			)
			next = next.replace(/wgsl`([\s\S]*?)`/g, (_, body) =>
				JSON.stringify(body.replace(/\s+/g, ' ').trim()),
			)

			return next !== code ? { code: next, map: null } : undefined
		},
	}
}

function preserveLicenseBanner() {
	return {
		name: 'preserve-license-banner',
		generateBundle(_options, bundle) {
			for (const file of Object.values(bundle)) {
				if (file.type !== 'chunk' || !file.fileName.endsWith('.js')) continue
				if (!file.code.startsWith('/*!')) {
					file.code = `${licenseBanner}\n${file.code}`
				}
			}
		},
	}
}

const libConfig = {
	plugins: [inlineWgsl(), preserveLicenseBanner()],
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		publicDir: false,
		lib: {
			entry: resolve(__dirname, 'src/index.js'),
			name: 'VideoFrameUploader',
			formats: ['es'],
			fileName: 'videoframeuploader',
		},
		rollupOptions: {
			external: threeExternal,
			output: {
				preserveModules: false,
			},
		},
		sourcemap: true,
		minify: 'terser',
		target: 'es2020',
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
			},
			format: {
				comments: /^!|@preserve|@license/i,
				max_line_len: 0,
				beautify: false,
				semicolons: true,
			},
		},
	},
	esbuild: {
		drop: ['console', 'debugger'],
		legalComments: 'none',
	},
}

export default defineConfig(() => {
	return libConfig
})
