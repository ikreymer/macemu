//import commonjs from '@rollup/plugin-commonjs';

export default [{
    input: 'index.js',
    output: [
      {
        file: 'jsnet.js',
        format: 'iife',
      }
    ],
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


