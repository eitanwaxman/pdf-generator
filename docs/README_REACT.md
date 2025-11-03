# React Frontend with Vite

This project has been converted to use React with Vite for the frontend, with shadcn/ui components styled in a light theme.

## Development

### Running the Frontend (Development Mode)

Run the Vite dev server:
```bash
npm run dev:frontend
```

This will start the Vite dev server on `http://localhost:5173` with hot module replacement.

### Running the Backend (Development Mode)

In a separate terminal, run:
```bash
npm run dev
```

This starts the Express server on `http://localhost:3000`.

The Vite dev server is configured to proxy API requests to the backend, so you can access the React app at `http://localhost:5173` and all API calls will be forwarded to `http://localhost:3000`.

## Production Build

### Build the React App

```bash
npm run build
```

This will create an optimized production build in the `dist/` directory.

### Run in Production Mode

Set `NODE_ENV=production` and start the server:

```bash
NODE_ENV=production npm start
```

In production mode, the Express server will serve the built React app from the `dist/` directory.

## Configuration

### Environment Variables

Add these to your `.env` file for the frontend:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The frontend can also fall back to `window.SUPABASE_URL` and `window.SUPABASE_ANON_KEY` if the environment variables aren't set (useful for development).

## Project Structure

```
src/
├── components/
│   ├── ui/          # shadcn/ui components
│   ├── AuthView.jsx
│   ├── DashboardView.jsx
│   ├── ApiKeyCard.jsx
│   ├── JobCreator.jsx
│   └── JobResult.jsx
├── lib/
│   ├── utils.js     # Utility functions (cn helper)
│   └── supabase.js  # Supabase client
├── App.jsx          # Main app component
├── main.jsx         # React entry point
└── index.css       # Global styles with Tailwind

dist/                # Production build output (generated)
public/              # Old static files (still used for docs.html in dev)
```

## Features

- ✅ React with Vite for fast development
- ✅ shadcn/ui components with light theme
- ✅ Tailwind CSS for styling
- ✅ Supabase authentication
- ✅ API key management
- ✅ PDF/Screenshot job creation and polling
- ✅ Responsive design

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library
- **Supabase** - Authentication and backend
- **Lucide React** - Icons

