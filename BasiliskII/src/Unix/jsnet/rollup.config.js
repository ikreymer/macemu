//import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'index.js',
  output: [
    {
      file: 'jsnet.js',
      format: 'iife',
    }
  ],
}


