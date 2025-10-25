# Frontend - React + TypeScript + Vite

This is a base React application built with TypeScript and Vite, ready to deploy to Railway.

## Local Development

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Deploying to Railway

1. Push your code to a GitHub repository
2. Go to [Railway](https://railway.app)
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose this repository and the `frontend` folder
6. Railway will automatically detect the configuration from `railway.json`
7. Your app will be deployed!

Railway will:
- Install dependencies with `npm install`
- Build the project with `npm run build`
- Start the preview server with `npm run preview`

The app will be available at the URL provided by Railway.

## Technologies

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **ESLint** - Code linting
