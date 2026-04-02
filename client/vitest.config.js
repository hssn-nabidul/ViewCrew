import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    dir: 'tests',
    reporters: ['verbose', 'json'],
    outputFile: './tests/results/test-results.json',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['core/**/*.js', 'players/**/*.js', 'ui/**/*.js', 'utils/**/*.js', 'media/**/*.js'],
    },
  },
});
