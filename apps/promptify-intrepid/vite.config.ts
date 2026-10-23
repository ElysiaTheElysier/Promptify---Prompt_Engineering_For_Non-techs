import { generateSavedRun, evaluateSavedRun } from './src/services/rebuildRunService';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { AiServerError, handleGenerateRequest, handleEvaluateRequest } from './src/services/apiServerService';
import { ApiAccessError, assertAiLessonAccess } from './src/services/apiAuthorizationService';
import productHandler from './api/product';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] === '/api/product') {
          let body = '';
          let oversized = false;
          req.on('data', chunk => {
            if (oversized) return;
            body += chunk;
            if (Buffer.byteLength(body, 'utf8') > 3000000) { oversized = true; body = ''; }
          });
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            if (oversized) { res.statusCode = 413; res.end(JSON.stringify({ error: 'Request is too large.' })); return; }
            const response = {
              setHeader: (name: string, value: string) => res.setHeader(name, value),
              status: (code: number) => { res.statusCode = code; return response; },
              json: (value: unknown) => res.end(JSON.stringify(value)),
            };
            await productHandler({ method: req.method, headers: req.headers, body }, response);
          });
          return;
        }
        if (req.url?.startsWith('/api/generate') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const parsed = body ? JSON.parse(body) : {};
              await assertAiLessonAccess({
                authorization: req.headers.authorization,
                classId: parsed.classId,
                lessonId: parsed.lessonId,
              });
              const result = await generateSavedRun(req.headers.authorization || '', parsed);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = err instanceof ApiAccessError || err instanceof AiServerError ? err.statusCode : 500;
              res.end(JSON.stringify({ error: err.message || 'Lỗi server sinh AI' }));
            }
          });
          return;
        }

        if (req.url?.startsWith('/api/evaluate') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const parsed = body ? JSON.parse(body) : {};
              await assertAiLessonAccess({
                authorization: req.headers.authorization,
                classId: parsed.classId,
                lessonId: parsed.lessonId,
              });
              const result = await evaluateSavedRun(req.headers.authorization || '', parsed);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = err instanceof ApiAccessError || err instanceof AiServerError ? err.statusCode : 500;
              res.end(JSON.stringify({ error: err.message || 'Lỗi server chấm điểm AI' }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Đưa các biến môi trường vào process.env cho server middleware
  Object.assign(process.env, env);

  return {
    // Expose only explicit browser configuration; never legacy VITE_* AI secrets.
    envPrefix: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_REBUILD_PRODUCTION',
      'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID',
      'VITE_FIREBASE_AUTH_EMULATOR', 'VITE_FIRESTORE_EMULATOR', 'VITE_STREAM_API_URL'],
    plugins: [react(), apiDevServerPlugin()],
    build: {rollupOptions:{input:mode==='staging'?{app:'index.html',stagingAccessQa:'staging-access-qa.html',stagingWorkspaceQa:'staging-workspace-qa.html'}:'index.html'}},
    server: {
      port: 5174,
      host: true,
    },
  };
});
