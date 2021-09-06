const typescript = require('@rollup/plugin-typescript');

module.exports = {
  input: 'src/main.ts',
  output: [
    {
      file: 'dist/worker.js',
      format: 'iife',
    },
  ],
  plugins: [typescript()],
};
