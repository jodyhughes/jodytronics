# Jodytronics

A small Vite-powered React app for audio and synth experimentation.

## Overview
This project uses modern React with Vite and ES module support.

## Commands
```bash
npm install
npm run dev      # Start dev server at http://localhost:5173/
npm run build    # Build production output
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

## Project setup
- `package.json` uses `type: module`
- `vite.config.js` includes `@vitejs/plugin-react`
- Entry point is `src/main.jsx`
- `index.html` mounts the app into `<div id="root"></div>`

## Dependencies
- `react`
- `react-dom`

## Dev dependencies
- `vite`
- `@vitejs/plugin-react`
- `eslint`
- `@eslint/js`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `globals`
- `@types/react`
- `@types/react-dom`

## Notes
- `node_modules/` and `dist/` are ignored by Git.
- This repo is safe to publish publicly as long as private credentials are not added.
