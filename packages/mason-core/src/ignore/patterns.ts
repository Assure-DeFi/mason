/**
 * Default ignore patterns for Mason analysis
 * These patterns are always applied to exclude non-essential files
 */
export const DEFAULT_IGNORE_PATTERNS: readonly string[] = [
  // Dependencies
  '**/node_modules/**',
  '**/vendor/**',
  '**/.pnpm/**',
  '**/bower_components/**',

  // Build outputs
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/out/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/.vercel/**',
  '**/.netlify/**',
  '**/.output/**',
  '**/storybook-static/**',

  // Version control
  '**/.git/**',
  '**/.svn/**',
  '**/.hg/**',

  // IDE/Editor
  '**/.idea/**',
  '**/.vscode/**',
  '**/*.swp',
  '**/*.swo',
  '**/*.swn',
  '**/.project',
  '**/.classpath',
  '**/.settings/**',
  '**/*.sublime-*',

  // Secrets and credentials (CRITICAL - never analyze)
  '**/.env',
  '**/.env.*',
  '**/.env.local',
  '**/.env.*.local',
  '**/credentials*',
  '**/secrets*',
  '**/*secret*',
  '**/*.pem',
  '**/*.key',
  '**/*.crt',
  '**/*.p12',
  '**/*.pfx',
  '**/service-account*.json',
  '**/*credentials*.json',

  // Large/binary files
  '**/*.min.js',
  '**/*.min.css',
  '**/*.map',
  '**/*.chunk.js',
  '**/*.bundle.js',

  // Lock files
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
  '**/composer.lock',
  '**/Gemfile.lock',
  '**/poetry.lock',

  // Generated files
  '**/*.generated.*',
  '**/generated/**',
  '**/__generated__/**',
  '**/.prisma/**',
  '**/prisma/migrations/**',
  '**/*.d.ts',
  '**/*.tsbuildinfo',

  // Test snapshots and fixtures (large, low value)
  '**/__snapshots__/**',
  '**/__fixtures__/**',
  '**/fixtures/**',
  '**/__mocks__/**',

  // Documentation (analyzed separately if needed)
  '**/docs/**',
  '**/documentation/**',

  // Assets (not code)
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.gif',
  '**/*.svg',
  '**/*.ico',
  '**/*.webp',
  '**/*.mp4',
  '**/*.webm',
  '**/*.mp3',
  '**/*.wav',
  '**/*.ogg',
  '**/*.pdf',
  '**/*.zip',
  '**/*.tar',
  '**/*.gz',
  '**/*.rar',
  '**/*.7z',
  '**/*.woff',
  '**/*.woff2',
  '**/*.ttf',
  '**/*.eot',
  '**/*.otf',

  // Cache directories
  '**/.cache/**',
  '**/cache/**',
  '**/.parcel-cache/**',
  '**/.eslintcache',
  '**/.stylelintcache',
  '**/.prettiercache',

  // OS files
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/desktop.ini',

  // Logs
  '**/*.log',
  '**/logs/**',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/pnpm-debug.log*',

  // Misc
  '**/.mason/**',
  '**/.husky/**',
  '**/.changeset/**',
] as const;

/**
 * File extensions that are typically source code
 */
export const SOURCE_CODE_EXTENSIONS: readonly string[] = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.svelte',
  '.astro',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.scala',
  '.php',
  '.cs',
  '.cpp',
  '.c',
  '.h',
  '.hpp',
  '.swift',
  '.m',
  '.mm',
] as const;

/**
 * File extensions for configuration files (lower priority)
 */
export const CONFIG_FILE_EXTENSIONS: readonly string[] = [
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.ini',
  '.cfg',
  '.conf',
] as const;

/**
 * Important configuration files to always analyze
 */
export const PRIORITY_CONFIG_FILES: readonly string[] = [
  'package.json',
  'tsconfig.json',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'vite.config.ts',
  'vite.config.js',
  'webpack.config.js',
  'tailwind.config.js',
  'tailwind.config.ts',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  'eslint.config.js',
  'eslint.config.mjs',
] as const;

/**
 * Patterns for files that should be analyzed with high priority
 */
export const HIGH_PRIORITY_PATTERNS: readonly string[] = [
  // Entry points
  '**/src/index.{ts,tsx,js,jsx}',
  '**/src/main.{ts,tsx,js,jsx}',
  '**/src/app.{ts,tsx,js,jsx}',
  '**/app/page.{ts,tsx,js,jsx}',
  '**/app/layout.{ts,tsx,js,jsx}',
  '**/pages/_app.{ts,tsx,js,jsx}',
  '**/pages/index.{ts,tsx,js,jsx}',

  // API routes
  '**/api/**/*.{ts,js}',
  '**/app/api/**/*.{ts,js}',
  '**/pages/api/**/*.{ts,js}',

  // Core business logic
  '**/lib/**/*.{ts,tsx,js,jsx}',
  '**/utils/**/*.{ts,tsx,js,jsx}',
  '**/services/**/*.{ts,tsx,js,jsx}',
  '**/hooks/**/*.{ts,tsx,js,jsx}',

  // Components
  '**/components/**/*.{ts,tsx,js,jsx}',

  // State management
  '**/store/**/*.{ts,tsx,js,jsx}',
  '**/redux/**/*.{ts,tsx,js,jsx}',
  '**/context/**/*.{ts,tsx,js,jsx}',
] as const;
