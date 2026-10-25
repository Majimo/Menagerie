import { defineConfig } from 'vite';

// `BASE_PATH` : '/' en domaine propre, '/<nom-du-repo>/' sur GitHub Pages (fixé par le workflow de déploiement).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        // Three.js dans un chunk dédié : il change rarement, il reste en cache.
        codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }] },
      },
    },
  },
});
