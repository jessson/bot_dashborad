import { defineConfig } from '@umijs/max';

export default defineConfig({
  plugins: ['@umijs/plugins/dist/antd'],
  antd: {
    import: false,
  },
  routes: [
    {
      path: '/',
      component: '@/App',
    },
  ],
  npmClient: 'npm',
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
  mfsu: false,
  fastRefresh: true,
}); 