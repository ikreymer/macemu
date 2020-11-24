//import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [{
    input: 'index.js',
    output: [
      {
        file: 'jsnet.js',
        format: 'iife',
      },
    ],
    plugins: [nodeResolve()]
  },
  {
    input: 'ringbuffer.js',
    output: [
      {
        file: 'rb.js',
        format: 'iife',
        name: 'RingBuffer'
      }
    ]
  }
]


