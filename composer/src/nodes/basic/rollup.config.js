import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default [
	{
		input: 'src/Element.svelte',
		output: {
			sourcemap: true,
			format: 'esm',
			name: 'basic',
			file: 'element.mjs'
		},
		plugins: [
			svelte({
				dev: !production,
				/*css: css => {
					css.write('public/build/bundle.css');
				}*/
			}),
			resolve({
				browser: true,
				dedupe: ['svelte']
			}),
			commonjs(),
			//production && terser()
		],
		watch: {
			clearScreen: false
		},
	},
	{
		input: 'src/UserInterface.svelte',
		output: {
			sourcemap: true,
			format: 'esm',
			name: 'basic',
			file: 'ui.mjs'
		},
		plugins: [
			svelte({
				dev: !production,
				/*css: css => {
					css.write('public/build/bundle.css');
				}*/
			}),
			resolve({
				browser: true,
				dedupe: ['svelte']
			}),
			commonjs(),
		],
	}];
