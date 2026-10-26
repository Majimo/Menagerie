import { defineConfig } from '@playwright/test';

// Scénarios, accessibilité et captures (docs/09-verification-visuelle-et-accessibilite.md).
//
// Rendu WebGL en headless : pas de GPU, Chromium passe par le rendu logiciel SwiftShader (via ANGLE).
// `--enable-unsafe-swiftshader` est requis depuis que Chromium ne bascule plus seul sur SwiftShader pour WebGL.
// Les captures varient donc légèrement d'une machine à l'autre : ne pas les comparer pixel à pixel entre machines.

const PORT = 5199;

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  // Références de la régression visuelle (versionnées), propres à la plateforme qui les a produites.
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } } },
    { name: 'wide', use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } } },
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
