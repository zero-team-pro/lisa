import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import { NodePackageImporter } from 'sass-embedded';

const pathSrc = path.resolve(__dirname, 'src');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_APP_');
  const apiHost = env.VITE_APP_API_HOST_LE || env.VITE_APP_API_HOST;
  const apiProtocol = env.VITE_APP_API_HOST_LE ? 'https' : 'http';

  return {
    base: '/',
    plugins: [
      react({
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: ['@emotion/babel-plugin'],
        },
      }),
      viteTsconfigPaths(),
      svgr({
        svgrOptions: {
          exportType: 'default',
          ref: true,
          svgo: true,
          titleProp: true,
          svgoConfig: { floatPrecision: 2 },
        },
        include: '**/*.svg?react',
      }),
    ],
    css: {
      modules: {},
      preprocessorOptions: {
        scss: {
          api: 'modern',
          importers: [new NodePackageImporter()],
          additionalData: `@use "${pathSrc}/styles/vars" as *;\n`,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        App: path.resolve(__dirname, 'src'),
      },
    },
    server: {
      open: true,
      port: 3000,
      proxy: apiHost
        ? {
            '/api': {
              target: `${apiProtocol}://${apiHost}`,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          }
        : undefined,
    },
  };
});
