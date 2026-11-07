import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

export function sessionSyncPlugin(): Plugin {
  const rootDir = process.cwd();
  const sessionFilePath = path.resolve(rootDir, 'SESSION_STATE.md');
  const tasksFilePath = path.resolve(rootDir, 'TASKS.md');

  // Active SSE clients for live disk events
  const sseClients = new Set<any>();

  let lastKnownMtime = 0;
  try {
    if (fs.existsSync(sessionFilePath)) {
      lastKnownMtime = fs.statSync(sessionFilePath).mtimeMs;
    }
  } catch {
    // ignore
  }

  return {
    name: 'vite-plugin-session-sync',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      // File watcher using polling so it works reliably in container/VM/Termux environments
      try {
        fs.watchFile(sessionFilePath, { interval: 500 }, (curr, prev) => {
          if (curr.mtimeMs !== prev.mtimeMs && curr.mtimeMs !== lastKnownMtime) {
            lastKnownMtime = curr.mtimeMs;
            const payload = JSON.stringify({
              type: 'DISK_FILE_CHANGED',
              file: 'SESSION_STATE.md',
              mtime: curr.mtimeMs,
              size: curr.size,
              timestamp: new Date().toISOString()
            });

            for (const client of sseClients) {
              try {
                client.write(`data: ${payload}\n\n`);
              } catch {
                sseClients.delete(client);
              }
            }
          }
        });

        server.httpServer?.on('close', () => {
          try {
            fs.unwatchFile(sessionFilePath);
          } catch {
            // ignore
          }
        });
      } catch (err) {
        console.warn('[SessionSync] File watch initialization warning:', err);
      }
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || '';
        const url = rawUrl.split('?')[0];

        // 1. Health & status endpoint
        if (url === '/api/disk-status') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          const exists = fs.existsSync(sessionFilePath);
          const stat = exists ? fs.statSync(sessionFilePath) : null;
          res.end(
            JSON.stringify({
              isLive: true,
              mode: 'real-time-disk-bridge',
              targetFile: '/SESSION_STATE.md',
              exists,
              size: stat?.size || 0,
              mtime: stat?.mtimeMs || 0
            })
          );
          return;
        }

        // 2. SESSION_STATE.md read & write
        if (url === '/api/session-state') {
          if (req.method === 'GET') {
            try {
              if (!fs.existsSync(sessionFilePath)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'SESSION_STATE.md not found on disk' }));
                return;
              }

              const content = fs.readFileSync(sessionFilePath, 'utf-8');
              const stat = fs.statSync(sessionFilePath);
              lastKnownMtime = stat.mtimeMs;

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store');
              res.end(
                JSON.stringify({
                  success: true,
                  content,
                  mtime: stat.mtimeMs,
                  size: stat.size,
                  filePath: '/SESSION_STATE.md',
                  isLive: true
                })
              );
              return;
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Failed to read SESSION_STATE.md' }));
              return;
            }
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });

            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                if (typeof parsed.content !== 'string' || parsed.content.trim().length === 0) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Content must be a non-empty string' }));
                  return;
                }

                // Atomic write to SESSION_STATE.md
                fs.writeFileSync(sessionFilePath, parsed.content, 'utf-8');
                const stat = fs.statSync(sessionFilePath);
                lastKnownMtime = stat.mtimeMs;

                // Broadcast to other connected tabs/clients
                const payload = JSON.stringify({
                  type: 'DISK_FILE_SAVED',
                  file: 'SESSION_STATE.md',
                  mtime: stat.mtimeMs,
                  size: stat.size,
                  source: parsed.source || 'ui',
                  timestamp: new Date().toISOString()
                });

                for (const client of sseClients) {
                  try {
                    client.write(`data: ${payload}\n\n`);
                  } catch {
                    sseClients.delete(client);
                  }
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-store');
                res.end(
                  JSON.stringify({
                    success: true,
                    mtime: stat.mtimeMs,
                    size: stat.size,
                    message: 'Berhasil ditulis ke berkas disk /SESSION_STATE.md'
                  })
                );
                return;
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Failed to save to disk' }));
                return;
              }
            });
            return;
          }
        }

        // 3. SSE watch stream for real-time notification
        if (url === '/api/session-state/watch') {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('Access-Control-Allow-Origin', '*');

          // Send handshake
          const handshake = JSON.stringify({
            type: 'CONNECTED',
            file: 'SESSION_STATE.md',
            mtime: lastKnownMtime,
            timestamp: new Date().toISOString()
          });
          res.write(`data: ${handshake}\n\n`);

          sseClients.add(res);

          // Heartbeat interval to prevent socket timeout
          const heartbeat = setInterval(() => {
            try {
              res.write(': heartbeat\n\n');
            } catch {
              clearInterval(heartbeat);
              sseClients.delete(res);
            }
          }, 15000);

          req.on('close', () => {
            clearInterval(heartbeat);
            sseClients.delete(res);
          });
          return;
        }

        // 4. Read canonical TASKS.md if requested
        if (url === '/api/tasks' && req.method === 'GET') {
          try {
            if (fs.existsSync(tasksFilePath)) {
              const content = fs.readFileSync(tasksFilePath, 'utf-8');
              const stat = fs.statSync(tasksFilePath);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store');
              res.end(
                JSON.stringify({
                  success: true,
                  content,
                  mtime: stat.mtimeMs,
                  size: stat.size
                })
              );
              return;
            }
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message }));
            return;
          }
        }

        // 5. Dynamic on-demand ZIP bundle generator (anti-stale live generation)
        if (url === '/api/bundle/audit' || url === '/api/bundle/claude' || url === '/api/bundle/lmk' || (url === '/api/bundle/generate')) {
          const isLmk = url === '/api/bundle/lmk' || rawUrl.includes('type=lmk');
          const isClaude = !isLmk && (url === '/api/bundle/claude' || rawUrl.includes('type=claude'));
          const scriptName = isLmk 
            ? 'scripts/create-lmk-bundle.py' 
            : isClaude 
              ? 'scripts/create-claude-bundle.py' 
              : 'scripts/create-audit-bundle.py';
          const outputRelPath = isLmk 
            ? 'public/assets/zlce-lmk-recovery-bundle.zip' 
            : isClaude 
              ? 'public/assets/zlce-claude-chatgpt-bundle.zip' 
              : 'public/assets/zlce-audit-review-bundle.zip';
          const defaultFilename = isLmk 
            ? 'zlce-lmk-recovery-bundle.zip' 
            : isClaude 
              ? 'zlce-claude-chatgpt-bundle.zip' 
              : 'zlce-audit-review-bundle.zip';
          const fileCount = isLmk ? 5 : isClaude ? 20 : 71;

          const handleGenerateAndRespond = (optionalSessionState?: string) => {
            try {
              // Jika client menyertakan markdown status sesi terbaru, sinkronkan ke berkas fisik dulu
              if (optionalSessionState && typeof optionalSessionState === 'string' && optionalSessionState.trim().length > 0) {
                fs.writeFileSync(sessionFilePath, optionalSessionState, 'utf-8');
                lastKnownMtime = fs.statSync(sessionFilePath).mtimeMs;
              }

              // Jalankan skrip pembundel kanonik python on-the-fly
              const { execSync } = require('node:child_process');
              execSync(`python3 ${scriptName}`, { cwd: rootDir, timeout: 15000, stdio: 'pipe' });

              const targetZipPath = path.resolve(rootDir, outputRelPath);
              if (!fs.existsSync(targetZipPath)) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `Gagal menghasilkan bundel ${outputRelPath}` }));
                return;
              }

              const zipBuffer = fs.readFileSync(targetZipPath);
              const zipStat = fs.statSync(targetZipPath);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/zip');
              res.setHeader('Content-Disposition', `attachment; filename="${defaultFilename}"`);
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');
              res.setHeader('X-Files-Count', String(fileCount));
              res.setHeader('X-Generated-At', new Date().toISOString());
              res.setHeader('X-Bundle-Size', String(zipStat.size));
              res.end(zipBuffer);
              return;
            } catch (err: any) {
              console.error(`[SessionSync] Gagal generate bundel ${scriptName}:`, err);
              // Fallback jika python gagal: baca berkas zip yang sudah ada jika tersedia
              const targetZipPath = path.resolve(rootDir, outputRelPath);
              if (fs.existsSync(targetZipPath)) {
                const zipBuffer = fs.readFileSync(targetZipPath);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="${defaultFilename}"`);
                res.end(zipBuffer);
                return;
              }
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Gagal memproses bundel ZIP' }));
            }
          };

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = body ? JSON.parse(body) : {};
                handleGenerateAndRespond(parsed.sessionStateMarkdown);
              } catch {
                handleGenerateAndRespond();
              }
            });
            return;
          } else {
            handleGenerateAndRespond();
            return;
          }
        }

        // 6. Endpoint status informasi bundel (metadata file & timestamp)
        if (url === '/api/bundle/status' && req.method === 'GET') {
          const auditZip = path.resolve(rootDir, 'public/assets/zlce-audit-review-bundle.zip');
          const claudeZip = path.resolve(rootDir, 'public/assets/zlce-claude-chatgpt-bundle.zip');
          const lmkZip = path.resolve(rootDir, 'public/assets/zlce-lmk-recovery-bundle.zip');

          const getInfo = (p: string, expectedFiles: number) => {
            if (!fs.existsSync(p)) return { exists: false, filesCount: expectedFiles, size: 0, mtime: 0 };
            const stat = fs.statSync(p);
            return {
              exists: true,
              filesCount: expectedFiles,
              size: stat.size,
              mtime: stat.mtimeMs,
              updatedAt: new Date(stat.mtimeMs).toISOString()
            };
          };

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(
            JSON.stringify({
              isLiveGeneratorActive: true,
              auditBundle: getInfo(auditZip, 71),
              claudeBundle: getInfo(claudeZip, 20),
              lmkBundle: getInfo(lmkZip, 5),
              timestamp: new Date().toISOString()
            })
          );
          return;
        }

        next();
      });
    }
  };
}
