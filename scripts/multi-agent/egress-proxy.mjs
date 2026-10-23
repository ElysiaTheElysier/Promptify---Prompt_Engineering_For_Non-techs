// Controller-owned CONNECT proxy. Logs destinations only; never headers/body.
import http from 'node:http';
import net from 'node:net';
const allowed = new Set((process.env.ALLOWED_HOSTS || '').split(',').filter(Boolean));
const server = http.createServer((_req, res) => { res.writeHead(403); res.end(); });
server.on('connect', (req, client, head) => {
  const [host, port] = (req.url || '').split(':');
  const permit = port === '443' && allowed.has(host);
  console.log(JSON.stringify({host, port, permit}));
  if (!permit) { client.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
  const upstream = net.connect(443, host, () => {
    client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head.length) upstream.write(head);
    client.pipe(upstream); upstream.pipe(client);
  });
  upstream.setTimeout(30000, () => upstream.destroy());
  upstream.on('error', () => client.destroy());
  client.on('error', () => upstream.destroy());
  client.on('close', () => upstream.destroy());
});
server.listen(3128, '0.0.0.0');
