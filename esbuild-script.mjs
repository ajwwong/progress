import botLayer from '@medplum/bot-layer/package.json' with { type: 'json' };
import esbuild from 'esbuild';
import fastGlob from 'fast-glob';

const entryPoints = fastGlob.sync('./src/bots/**/*.ts').filter((file) => !file.endsWith('test.ts'));

const botLayerDeps = Object.keys(botLayer.dependencies);

const esbuildOptions = {
  entryPoints: entryPoints,
  bundle: true,
  outdir: './dist/bots',
  platform: 'node',
  loader: {
    '.ts': 'ts',
  },
  resolveExtensions: ['.ts'],
  external: botLayerDeps,
  format: 'cjs',
  target: 'es2020',
  tsconfig: 'tsconfig.bot.json',
  footer: { js: 'Object.assign(exports, module.exports);' }
};

esbuild
  .build(esbuildOptions)
  .then(() => {
    console.log('Build completed successfully!');
  })
  .catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });