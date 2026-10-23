import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {AppLoadBoundary} from './components/common/AppLoadBoundary';
const ProductionApp = React.lazy(() => import('./components/rebuild/ProductionApp'));
const RebuildApp = React.lazy(() => import('./components/rebuild/RebuildApp'));
const review = import.meta.env.VITE_REBUILD_PRODUCTION !== 'true' && (location.pathname === '/rebuild' || location.pathname.startsWith('/rebuild/'));
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppLoadBoundary><React.Suspense fallback={<p role="status" className="p-8">Loading Promptify…</p>}>{review ? <RebuildApp /> : <ProductionApp />}</React.Suspense></AppLoadBoundary></React.StrictMode>);
