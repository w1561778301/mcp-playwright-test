import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['**/*.spec.ts', '**/*.test.ts'],
    }),
    nodeResolve(),
    typescript({
      tsconfig: './tsconfig.json',
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
          sourceMap: true,
        },
      },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MCPPlaywrightServer',
      fileName: (format) => `mcp-playwright-server.${format}.js`,
    },
    rollupOptions: {
      external: [
        '@modelcontextprotocol/sdk', 
        'playwright', 
        'simple-git', 
        '@anthropic-ai/sdk',
        'express',
        'fs',
        'path',
        'crypto',
        'os'
      ],
      output: {
        globals: {
          '@modelcontextprotocol/sdk': 'ModelContextProtocol',
          'playwright': 'Playwright',
          'simple-git': 'SimpleGit',
          '@anthropic-ai/sdk': 'Anthropic',
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
