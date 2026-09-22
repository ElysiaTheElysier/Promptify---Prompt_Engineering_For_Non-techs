import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { AiServerError, handleGenerateRequest, handleEvaluateRequest } from './src/services/apiServerService';
import { ApiAccessError, assertAiLessonAccess } from './src/services/apiAuthorizationService';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
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
              const result = await handleGenerateRequest(parsed);
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
              const result = await handleEvaluateRequest(parsed);
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
    plugins: [react(), apiDevServerPlugin()],
    server: {
      port: 5173,
      host: true,
    },
  };
});
