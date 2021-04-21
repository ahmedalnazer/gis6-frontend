import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

export default [ {
  input: 'src/data/charting/chart-worker.js',
  output: {
    file: 'public/workers/chart-worker.js',
    format: 'iife',
    sourcemap: 'inline'
  }
},
{
  input: 'src/data/realtime/ws-worker.js',
  output: {
    file: 'public/workers/ws-worker.js',
    format: 'iife',
    sourcemap: 'inline'
  },
  plugins: [ nodeResolve(), commonjs({ include: 'node_modules/**' }) ]
} ]