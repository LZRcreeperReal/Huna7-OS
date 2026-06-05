/**
 * HUNA7-OS :: KERNEL API GATEWAY
 * Official OS.* interface for all processes
 */

const OSKernelAPI = (() => {

  const file = Object.freeze({
    read: (path) => {
      const r = window.__HUNA7_VFS__.read(path);
      window.__HUNA7_BUS__.emit({ type: 'file.read', payload: { path }, source: 'api' });
      return r;
    },
    write: (path, content) => {
      const r = window.__HUNA7_VFS__.write(path, content);
      window.__HUNA7_BUS__.emit({ type: 'file.created', payload: { path }, source: 'api' });
      return r;
    },
    list: (path) => window.__HUNA7_VFS__.list(path),
    remove: (path) => window.__HUNA7_VFS__.remove(path)
  });

  const window_ = Object.freeze({
    create: (opts) => {
      window.__HUNA7_BUS__.emit({ type: 'window.create', payload: opts, source: 'api' });
    },
    close: (winId) => {
      window.__HUNA7_BUS__.emit({ type: 'window.close', payload: { winId }, source: 'api' });
    }
  });

  const process_ = Object.freeze({
    spawn: (name, type, meta) => window.__HUNA7_PROCS__.spawn(name, type, meta),
    kill: (pid) => window.__HUNA7_PROCS__.kill(pid),
    list: () => window.__HUNA7_PROCS__.list()
  });

  const system = Object.freeze({
    log: (msg) => window.__HUNA7_VFS__.appendLog(String(msg)),
    uptime: () => Date.now() - (window.__HUNA7_BOOT_TIME__ || Date.now()),
    version: () => '1.0.0-huna7'
  });

  const event_ = Object.freeze({
    emit: (type, payload) => window.__HUNA7_BUS__.emit({ type, payload, source: 'app' }),
    listen: (type, handler) => window.__HUNA7_BUS__.on(type, handler)
  });

  const vox = Object.freeze({
    execute: (source, cb) => window.__HUNA7_VOX__.run(source, cb)
  });

  return Object.freeze({
    file,
    window: window_,
    process: process_,
    system,
    event: event_,
    vox
  });
})();

window.__HUNA7_BOOT_TIME__ = Date.now();
window.OS = OSKernelAPI;
