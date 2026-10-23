import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const RebuildApp = React.lazy(() => import('./components/rebuild/RebuildApp'));
const ProductionApp = React.lazy(() => import('./components/rebuild/ProductionApp'));
const App = React.lazy(() => import('./App'));
const isProduction = window.location.pathname === '/production' || import.meta.env.VITE_REBUILD_PRODUCTION === 'true';
const isRebuild = window.location.pathname === '/rebuild' || window.location.pathname.startsWith('/rebuild/');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <React.Suspense fallback={<p role="status" className="p-8">Loading Promptify…</p>}>{isProduction ? <ProductionApp /> : isRebuild ? <RebuildApp /> : <App />}</React.Suspense>
  </React.StrictMode>,
);
