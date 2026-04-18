# Project Setup for Jodytronics

## Overview
This is a Vite-powered React application using ECMAScript modules.

## Commands
```bash
npm run dev      # Start dev server at http://localhost:5173/
npm run build    # Build to dist/
npm run preview  # Preview production build locally
```

## Package and Scripts
- `package.json`
  - `name`: `jodytronics`
  - `private`: `true`
  - `version`: `0.0.0`
  - `type`: `module`

- Scripts:
  - `dev`: `vite`
  - `build`: `vite build`
  - `preview`: `vite preview`
  - `lint`: `eslint .`

## Dependencies
- `react` `^19.2.4`
- `react-dom` `^19.2.4`

## Dev Dependencies
- `vite` `^8.0.0`
- `@vitejs/plugin-react` `^6.0.0`
- `eslint` `^9.39.4`
- `@eslint/js` `^9.39.4`
- `eslint-plugin-react-hooks` `^7.0.1`
- `eslint-plugin-react-refresh` `^0.5.2`
- `globals` `^17.4.0`
- `@types/react` `^19.2.14`
- `@types/react-dom` `^19.2.3`

## Vite Configuration
- `vite.config.js` imports `defineConfig` from `vite`
- Uses `@vitejs/plugin-react`
- Exports default config with `plugins: [react()]`

## Key Notes
- The app is configured for modern React with Vite and ES modules.
- ESLint is available through `npm run lint`.
- Build, dev server, and preview are all handled by Vite.
