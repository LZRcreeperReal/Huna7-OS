/**
 * HUNA7-OS :: L5 VIRTUAL FILE SYSTEM
 * Persistent VFS backed by localStorage
 */

const VirtualFileSystem = (() => {
  const STORAGE_KEY = 'huna7_vfs_v1';
  const ALLOWED_TYPES = ['.vox', '.txt', '.log'];

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : _defaultFs();
    } catch { return _defaultFs(); }
  }

  function _save(fs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fs));
  }

  function _defaultFs() {
    const now = Date.now();
    return {
      '/': { id: 'root', name: '/', type: 'dir', children: ['system', 'user', 'apps'], permissions: 'rx', timestamps: { created: now, modified: now } },
      '/system': { id: 'sys', name: 'system', type: 'dir', children: ['kernel.log'], permissions: 'rx', timestamps: { created: now, modified: now } },
      '/system/kernel.log': { id: 'klog', name: 'kernel.log', type: '.log', content: 'HUNA7-OS Kernel initialized.\n', permissions: 'rx', timestamps: { created: now, modified: now } },
      '/user': { id: 'usr', name: 'user', type: 'dir', children: ['welcome.txt', 'hello.vox'], permissions: 'rwx', timestamps: { created: now, modified: now } },
      '/user/welcome.txt': { id: 'w1', name: 'welcome.txt', type: '.txt', content: 'Welcome to HUNA7-OS.\nThis is your personal workspace.\nUse the terminal to explore.\n', permissions: 'rwx', timestamps: { created: now, modified: now } },
      '/user/hello.vox': { id: 'hv1', name: 'hello.vox', type: '.vox', content: 'print "Hello from VoxScript!";\nlog "Process started";', permissions: 'rwx', timestamps: { created: now, modified: now } },
      '/apps': { id: 'appsdir', name: 'apps', type: 'dir', children: [], permissions: 'rx', timestamps: { created: now, modified: now } }
    };
  }

  function read(path) {
    const fs = _load();
    const node = fs[path];
    if (!node) return { ok: false, error: 'File not found: ' + path };
    return { ok: true, data: node };
  }

  function write(path, content) {
    const fs = _load();
    const now = Date.now();
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
    if (ext && !ALLOWED_TYPES.includes(ext)) return { ok: false, error: 'Unsupported file type: ' + ext };
    const parentPath = parts.slice(0, -1).join('/') || '/';
    if (!fs[parentPath]) return { ok: false, error: 'Parent directory not found' };

    if (fs[path]) {
      fs[path].content = content;
      fs[path].timestamps.modified = now;
    } else {
      fs[path] = { id: 'f_' + now, name, type: ext || '.txt', content, permissions: 'rwx', timestamps: { created: now, modified: now } };
      if (!fs[parentPath].children.includes(name)) fs[parentPath].children.push(name);
    }
    _save(fs);
    window.__HUNA7_BUS__.emit({ type: 'file.updated', payload: { path }, source: 'vfs' });
    return { ok: true };
  }

  function list(path) {
    const fs = _load();
    const node = fs[path];
    if (!node || node.type !== 'dir') return { ok: false, error: 'Not a directory' };
    return { ok: true, data: node.children.map(c => fs[path + (path === '/' ? '' : '/') + c]).filter(Boolean) };
  }

  function remove(path) {
    const fs = _load();
    if (!fs[path]) return { ok: false, error: 'File not found' };
    delete fs[path];
    _save(fs);
    window.__HUNA7_BUS__.emit({ type: 'file.deleted', payload: { path }, source: 'vfs' });
    return { ok: true };
  }

  function appendLog(msg) {
    const logPath = '/system/kernel.log';
    const r = read(logPath);
    const existing = r.ok ? r.data.content : '';
    write(logPath, existing + `[${new Date().toISOString()}] ${msg}\n`);
  }

  return Object.freeze({ read, write, list, remove, appendLog });
})();

window.__HUNA7_VFS__ = VirtualFileSystem;
