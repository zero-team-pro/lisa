import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import { NodePackageImporter } from 'sass-embedded';

export default defineConfig({
  base: '/',
  // TODO: svgr-svgo
  plugins: [
    react(),
    viteTsconfigPaths(),
    svgr({
      svgrOptions: { exportType: 'default', ref: true, svgo: false, titleProp: true },
      include: '**/*.svg?react',
    }),
  ],
  css: {
    modules: {},
    preprocessorOptions: {
      scss: {
        api: 'modern',
        importers: [new NodePackageImporter()],
        // TODO
        // additionalData: `@import "./src/path-to-scss-variables";`,
      },
    },
  },
  resolve: {
    alias: {
      App: path.resolve(__dirname, 'src'),
    },
  },
  server: {
    open: true,
    port: 3000,
  },
});
