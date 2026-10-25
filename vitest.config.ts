import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // La simulation tourne sous Node : pas de DOM simulé.
    environment: 'node',
    include: ['tests/sim/**/*.test.ts'],
  },
});
