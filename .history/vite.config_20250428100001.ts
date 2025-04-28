import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PlaywrightMcpTest',
      fileName: (format) => `playwright-mcp-test.${format}.js`,
      formats: ['es', 'cjs', 'umd'],
    },
    rollupOptions: {
      external: [
        'playwright',
        '@modelcontextprotocol/sdk',
        'express',
        'simple-git',
        '@anthropic-ai/sdk',
        'fs',
        'path',
        'crypto',
        'os'
      ],
      output: {
        globals: {
          playwright: 'playwright',
          '@modelcontextprotocol/sdk': 'ModelContextProtocol',
          express: 'express',
          'simple-git': 'simpleGit',
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  plugins: [
    dts({
      include: ['src'],
      exclude: ['**/*.spec.ts', '**/*.test.ts'],
    }),
    nodeResolve(),
  ],
});
