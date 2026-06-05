/**
 * HUNA7-OS :: L6 APP RUNTIME
 * App Registry + Sandboxed Launchers
 *
 * FIXES:
 *  - AppRegistry.launchWith(id, opts) — passes initial data to any app
 *  - Editor: accepts opts.filePath to auto-load a specific file on open
 *  - File Manager: right-click context menu with Rename, Open in Editor, Open in Terminal
 *  - __fm_open_ now passes the file path through correctly
 *  - FM context menu cleans itself up on outside click
 */

const AppRegistry = (() => {
  const _apps = {};

  function register(id, def) {
    _apps[id] = def;
  }

  // Standard launch — no initial data
  function launch(id) {
    return launchWith(id, {});
  }

  // Launch with optional initial opts passed into render()
  function launchWith(id, opts = {}) {
    const def = _apps[id];
    if (!def) { console.warn('[AppRegistry] Unknown app:', id); return; }
    const pid = window.__HUNA7_PROCS__.spawn(def.name, 'app', { appId: id });
    window.__HUNA7_BUS__.emit({ type: 'app.launch', payload: { id, pid }, source: 'appruntime' });
    const winId = window.__HUNA7_WM__.create({
      title: def.name, width: def.width || 640, height: def.height || 460,
      pid, onReady: (body) => def.render(body, pid, opts)
    });
    return { pid, winId };
  }

  function list() { return Object.values(_apps); }

  return Object.freeze({ register, launch, launchWith, list });
})();

// ─── BUILT-IN APPS ─────────────────────────────────────────

// TEXT EDITOR
// FIX: render() now accepts opts.filePath — if provided, loads that file instead of the default.
//      The path dropdown is replaced with a plain text input so any path can be typed/set.
AppRegistry.register('editor', {
  name: 'Text Editor', width: 680, height: 500,
  render(body, pid, opts = {}) {
    const initialPath = opts.filePath || '/user/welcome.txt';
    body.innerHTML = `
      <div class="app-editor">
        <div class="editor-toolbar">
          <input type="text" id="ed-path-${pid}" class="ed-input" style="width:220px" value="${initialPath}" placeholder="/user/file.txt" />
          <button class="os-btn" id="ed-load-${pid}">Load</button>
          <button class="os-btn" id="ed-save-${pid}">Save</button>
          <span id="ed-status-${pid}" class="ed-status"></span>
        </div>
        <textarea id="ed-content-${pid}" class="ed-textarea" spellcheck="false" placeholder="Type a path above and click Load, or start typing..."></textarea>
      </div>`;

    const pathEl    = document.getElementById(`ed-path-${pid}`);
    const contentEl = document.getElementById(`ed-content-${pid}`);
    const statusEl  = document.getElementById(`ed-status-${pid}`);

    function loadFile(path) {
      const r = OS.file.read(path);
      if (r.ok) {
        contentEl.value = r.data.content;
        statusEl.textContent = '';
      } else {
        statusEl.style.color = 'var(--os-red)';
        statusEl.textContent = 'Not found';
      }
    }

    document.getElementById(`ed-load-${pid}`).addEventListener('click', () => {
      loadFile(pathEl.value.trim());
    });

    document.getElementById(`ed-save-${pid}`).addEventListener('click', () => {
      const p = pathEl.value.trim();
      const r = OS.file.write(p, contentEl.value);
      statusEl.style.color = r.ok ? 'var(--os-green)' : 'var(--os-red)';
      statusEl.textContent = r.ok ? 'Saved' : 'Error: ' + r.error;
    });

    // Auto-load the initial path
    loadFile(initialPath);
  }
});

// TERMINAL
// FIX: render() now accepts opts.initialCmd — if provided, runs that command immediately after boot.
//      This lets the File Manager open a file directly in the terminal (e.g. `cat /user/file.txt`).
AppRegistry.register('terminal', {
  name: 'Terminal', width: 720, height: 480,
  render(body, pid, opts = {}) {
    body.innerHTML = `
      <div class="app-terminal" id="term-${pid}">
        <div class="term-output" id="term-out-${pid}"></div>
        <div class="term-input-row">
          <span class="term-prompt">huna7$</span>
          <input type="text" class="term-input" id="term-in-${pid}" placeholder="Enter command..." autocomplete="off" spellcheck="false"/>
        </div>
      </div>`;

    const out = document.getElementById(`term-out-${pid}`);
    const inp = document.getElementById(`term-in-${pid}`);
    const history = [];
    let histIdx = -1;

    function print(text, cls = '') {
      const line = document.createElement('div');
      line.className = 'term-line ' + cls;
      line.textContent = text;
      out.appendChild(line);
      out.scrollTop = out.scrollHeight;
    }

    print('HUNA7-OS Terminal v1.0', 'term-sys');
    print('Type "help" for available commands.', 'term-sys');

    function runCmd(raw) {
      const cmd = raw.trim();
      if (!cmd) return;
      history.unshift(cmd); histIdx = -1;
      print('huna7$ ' + cmd, 'term-cmd');

      const parts = cmd.split(' ');
      const base = parts[0].toLowerCase();

      if (base === 'help') {
        ['help                — Show commands',
         'ls [path]           — List files',
         'cat [path]          — Read file',
         'write [path] [text] — Write file',
         'ps                  — List processes',
         'vox [path]          — Execute VoxScript file',
         'run [voxcode]       — Run inline VoxScript',
         'clear               — Clear terminal',
         'log                 — Show kernel log',
         'uptime              — System uptime',
         'sysinfo             — System info',
         'admin               — Enter admin mode (requires password)'
        ].forEach(l => print(l, 'term-info'));
      }
      else if (base === 'ls') {
        const path = parts[1] || '/';
        const r = OS.file.list(path);
        if (r.ok) r.data.forEach(f => print(`  ${f.type === 'dir' ? 'd' : '-'} ${f.name}`, 'term-out'));
        else print('ls: ' + r.error, 'term-err');
      }
      else if (base === 'cat') {
        const r = OS.file.read(parts[1]);
        if (r.ok) r.data.content.split('\n').forEach(l => print(l, 'term-out'));
        else print('cat: ' + r.error, 'term-err');
      }
      else if (base === 'write') {
        const path = parts[1];
        const content = parts.slice(2).join(' ');
        const r = OS.file.write(path, content);
        print(r.ok ? 'Written to ' + path : 'write: ' + r.error, r.ok ? 'term-out' : 'term-err');
      }
      else if (base === 'ps') {
        OS.process.list().forEach(p => print(`  [${p.pid}] ${p.name} (${p.type})`, 'term-out'));
      }
      else if (base === 'vox') {
        const r = OS.file.read(parts[1]);
        if (!r.ok) { print('vox: File not found', 'term-err'); return; }
        const result = OS.vox.execute(r.data.content, ({ type, value }) => {});
        result.output.forEach(l => print(l, result.ok ? 'term-out' : 'term-err'));
      }
      else if (base === 'run') {
        const src = parts.slice(1).join(' ');
        const result = OS.vox.execute(src, () => {});
        result.output.forEach(l => print(l, result.ok ? 'term-out' : 'term-err'));
      }
      else if (base === 'clear') {
        out.innerHTML = '';
      }
      else if (base === 'log') {
        const r = OS.file.read('/system/kernel.log');
        if (r.ok) r.data.content.split('\n').filter(Boolean).slice(-30).forEach(l => print(l, 'term-sys'));
        else print('log: ' + r.error, 'term-err');
      }
      else if (base === 'uptime') {
        print('Uptime: ' + Math.floor(OS.system.uptime() / 1000) + 's', 'term-out');
      }
      else if (base === 'sysinfo') {
        print('HUNA7-OS v' + OS.system.version(), 'term-out');
        print('Processes: ' + OS.process.list().length, 'term-out');
      }
      else if (base === 'admin') {
        const pw = prompt('Enter admin password:');
        if (pw) {
          window.__HUNA7_AUTH__.authenticate(pw).then(r => {
            print(r.ok ? '[Admin] Access granted.' : '[Admin] Access denied.', r.ok ? 'term-sys' : 'term-err');
          });
        }
      }
      else {
        print('Command not found: ' + base + '. Type "help".', 'term-err');
      }
    }

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { runCmd(inp.value); inp.value = ''; }
      else if (e.key === 'ArrowUp') { histIdx = Math.min(histIdx + 1, history.length - 1); inp.value = history[histIdx] || ''; }
      else if (e.key === 'ArrowDown') { histIdx = Math.max(histIdx - 1, -1); inp.value = histIdx >= 0 ? history[histIdx] : ''; }
    });

    setTimeout(() => inp.focus(), 100);

    // FIX: run an initial command if passed in (e.g. from File Manager "Open in Terminal")
    if (opts.initialCmd) {
      setTimeout(() => runCmd(opts.initialCmd), 150);
    }
  }
});

// FILE MANAGER
// FIX: Right-click context menu on each file item with:
//   - Open in Editor   → launchWith('editor', { filePath })
//   - Open in Terminal → launchWith('terminal', { initialCmd: 'cat <path>' })
//   - Rename           → inline prompt → calls VFS rename (write new + delete old)
// FIX: __fm_open_ now calls launchWith and passes the filePath
AppRegistry.register('files', {
  name: 'File Manager', width: 600, height: 420,
  render(body, pid, opts = {}) {
    body.innerHTML = `<div class="app-files" id="fm-${pid}">
      <div class="fm-toolbar">
        <span class="fm-path" id="fm-path-${pid}">/</span>
        <button class="os-btn" id="fm-up-${pid}">Up</button>
      </div>
      <div class="fm-list" id="fm-list-${pid}"></div>
      <div class="fm-statusbar" id="fm-status-${pid}"></div>
    </div>
    <!-- per-instance context menu -->
    <div id="fm-ctx-${pid}" style="
      display:none; position:fixed; z-index:9000;
      background:var(--os-surface); border:1px solid var(--os-border2);
      border-radius:var(--os-radius); padding:4px;
      box-shadow:var(--os-shadow); min-width:170px;
    "></div>`;

    const ctxMenu = document.getElementById(`fm-ctx-${pid}`);

    // ── context menu helpers ───────────────────────────────
    function showCtx(x, y, items) {
      ctxMenu.innerHTML = '';
      items.forEach(item => {
        if (item === 'sep') {
          const s = document.createElement('div');
          s.style.cssText = 'height:1px;background:var(--os-border);margin:3px 0';
          ctxMenu.appendChild(s);
          return;
        }
        const el = document.createElement('div');
        el.className = 'ctx-item';
        el.textContent = item.label;
        el.addEventListener('click', () => { hideCtx(); item.action(); });
        ctxMenu.appendChild(el);
      });
      // keep menu on screen
      ctxMenu.style.display = 'block';
      const mw = ctxMenu.offsetWidth, mh = ctxMenu.offsetHeight;
      ctxMenu.style.left = Math.min(x, window.innerWidth  - mw - 8) + 'px';
      ctxMenu.style.top  = Math.min(y, window.innerHeight - mh - 8) + 'px';
    }

    function hideCtx() {
      ctxMenu.style.display = 'none';
    }

    document.addEventListener('click', hideCtx);
    document.addEventListener('contextmenu', e => {
      if (!ctxMenu.contains(e.target)) hideCtx();
    });

    // ── rename helper ──────────────────────────────────────
    function renameFile(oldPath) {
      const parts = oldPath.split('/');
      const oldName = parts[parts.length - 1];
      const newName = prompt('Rename "' + oldName + '" to:', oldName);
      if (!newName || newName === oldName) return;

      // validate extension stays the same (or is allowed)
      const ALLOWED = ['.vox', '.txt', '.log'];
      const ext = newName.includes('.') ? '.' + newName.split('.').pop() : '';
      if (ext && !ALLOWED.includes(ext)) {
        alert('Unsupported file type: ' + ext + '\nAllowed: ' + ALLOWED.join(', '));
        return;
      }

      // read old content
      const r = OS.file.read(oldPath);
      if (!r.ok) { alert('Cannot read file: ' + r.error); return; }

      // write to new path
      const parentPath = parts.slice(0, -1).join('/') || '/';
      const newPath = (parentPath === '/' ? '' : parentPath) + '/' + newName;
      const w = OS.file.write(newPath, r.data.content);
      if (!w.ok) { alert('Rename failed: ' + w.error); return; }

      // delete old
      OS.file.remove(oldPath);

      // refresh
      window[`__fm_nav_${pid}`](parentPath || '/');
      document.getElementById(`fm-status-${pid}`).textContent = `Renamed → ${newName}`;
    }

    // ── navigation ─────────────────────────────────────────
    window[`__fm_nav_${pid}`] = function(path) {
      document.getElementById(`fm-path-${pid}`).textContent = path;
      const list = document.getElementById(`fm-list-${pid}`);
      const r = OS.file.list(path);
      if (!r.ok) { list.innerHTML = `<div class="fm-err">${r.error}</div>`; return; }

      list.innerHTML = '';
      r.data.forEach(f => {
        const isDir = f.type === 'dir';
        const fullPath = (path === '/' ? '' : path) + '/' + f.name;

        const icon = isDir
          ? `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 3h5l2 2h7v9H1z" fill="#c0a060"/></svg>`
          : `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 1h7l3 3v11H3z" fill="#7090c0"/><path d="M10 1l3 3h-3z" fill="#5070a0"/></svg>`;

        const el = document.createElement('div');
        el.className = 'fm-item';
        el.innerHTML = `${icon}<span>${f.name}</span><span class="fm-type">${f.type}</span>`;

        // left-click: navigate into dir, or open file in editor
        el.addEventListener('click', () => {
          if (isDir) {
            window[`__fm_nav_${pid}`](fullPath);
          } else {
            window[`__fm_open_${pid}`](fullPath, 'editor');
          }
        });

        // FIX: right-click context menu on files and dirs
        el.addEventListener('contextmenu', e => {
          e.preventDefault();
          e.stopPropagation();

          const items = isDir ? [
            { label: '📂  Open Folder', action: () => window[`__fm_nav_${pid}`](fullPath) }
          ] : [
            { label: '📄  Open in Editor',   action: () => window[`__fm_open_${pid}`](fullPath, 'editor') },
            { label: '⬛  Open in Terminal', action: () => window[`__fm_open_${pid}`](fullPath, 'terminal') },
            'sep',
            { label: '✏️   Rename',           action: () => renameFile(fullPath) },
            { label: '🗑️   Delete',           action: () => {
                if (confirm('Delete "' + f.name + '"?')) {
                  OS.file.remove(fullPath);
                  window[`__fm_nav_${pid}`](path);
                }
              }
            }
          ];

          showCtx(e.clientX, e.clientY, items);
        });

        list.appendChild(el);
      });

      document.getElementById(`fm-status-${pid}`).textContent =
        r.data.length + ' item' + (r.data.length !== 1 ? 's' : '');
    };

    // FIX: open a specific file in the right app, passing the path through
    window[`__fm_open_${pid}`] = function(filePath, target = 'editor') {
      if (target === 'editor') {
        AppRegistry.launchWith('editor', { filePath });
      } else if (target === 'terminal') {
        // Open terminal and immediately cat the file
        AppRegistry.launchWith('terminal', { initialCmd: 'cat ' + filePath });
      } else if (target === 'voxpad' && filePath.endsWith('.vox')) {
        // For .vox files, could open in VoxPad in future
        AppRegistry.launchWith('editor', { filePath });
      }
    };

    // Up button
    document.getElementById(`fm-up-${pid}`).addEventListener('click', () => {
      const pp = document.getElementById(`fm-path-${pid}`).textContent;
      const parts = pp.split('/').filter(Boolean);
      parts.pop();
      window[`__fm_nav_${pid}`](parts.length ? '/' + parts.join('/') : '/');
    });

    window[`__fm_nav_${pid}`]('/');
  }
});

// VOXSCRIPT EDITOR / RUNNER
AppRegistry.register('voxpad', {
  name: 'VoxPad', width: 700, height: 500,
  render(body, pid, opts = {}) {
    body.innerHTML = `<div class="app-voxpad">
      <div class="vox-toolbar">
        <span class="vox-label">VoxScript Editor</span>
        <button class="os-btn vox-run-btn" id="vox-run-${pid}">Run</button>
        <button class="os-btn" onclick="document.getElementById('vox-out-${pid}').innerHTML=''">Clear</button>
      </div>
      <div class="vox-split">
        <textarea class="vox-editor" id="vox-src-${pid}" spellcheck="false" placeholder="# VoxScript&#10;print &quot;Hello, World!&quot;;&#10;set x = 42;&#10;log x;"></textarea>
        <div class="vox-output" id="vox-out-${pid}"></div>
      </div>
    </div>`;

    document.getElementById(`vox-run-${pid}`).addEventListener('click', () => {
      const src = document.getElementById(`vox-src-${pid}`).value;
      const out = document.getElementById(`vox-out-${pid}`);
      out.innerHTML = '<div class="vox-line vox-sys">Running...</div>';
      const result = OS.vox.execute(src, () => {});
      out.innerHTML = '';
      result.output.forEach(l => {
        const d = document.createElement('div');
        d.className = 'vox-line' + (l.startsWith('[VM]') || l.startsWith('[VoxScript Error]') ? ' vox-err' : '');
        d.textContent = l;
        out.appendChild(d);
      });
      if (!result.ok) {
        const e = document.createElement('div');
        e.className = 'vox-line vox-err';
        e.textContent = 'Error: ' + result.error;
        out.appendChild(e);
      }
    });
  }
});

// NAVIGATOR (iframe sandbox)
AppRegistry.register('navigator', {
  name: 'Navigator', width: 800, height: 560,
  render(body, pid, opts = {}) {
    body.innerHTML = `<div class="app-nav">
      <div class="nav-toolbar">
        <input type="text" class="nav-url" id="nav-url-${pid}" value="https://example.com" />
        <button class="os-btn" id="nav-go-${pid}">Go</button>
        <button class="os-btn" onclick="document.getElementById('nav-frame-${pid}').src='about:blank'">Stop</button>
      </div>
      <iframe id="nav-frame-${pid}" class="nav-frame" sandbox="allow-scripts allow-same-origin allow-forms" src="about:blank"></iframe>
    </div>`;
    document.getElementById(`nav-go-${pid}`).addEventListener('click', () => {
      let url = document.getElementById(`nav-url-${pid}`).value.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      document.getElementById(`nav-frame-${pid}`).src = url;
    });
  }
});

// SYSTEM MONITOR
AppRegistry.register('sysmon', {
  name: 'System Monitor', width: 560, height: 400,
  render(body, pid, opts = {}) {
    body.innerHTML = `<div class="app-sysmon" id="sm-${pid}">
      <div class="sm-section"><h3>Processes</h3><div class="sm-list" id="sm-procs-${pid}"></div></div>
      <div class="sm-section"><h3>Event Log (last 20)</h3><div class="sm-list sm-evts" id="sm-evts-${pid}"></div></div>
      <div class="sm-footer"><button class="os-btn" onclick="window.__sm_refresh_${pid}()">Refresh</button>
        <span class="sm-stat" id="sm-stat-${pid}"></span></div>
    </div>`;

    window[`__sm_refresh_${pid}`] = function() {
      const procs = OS.process.list();
      document.getElementById(`sm-procs-${pid}`).innerHTML =
        procs.map(p => `<div class="sm-row"><span class="sm-pid">${p.pid}</span><span>${p.name}</span><span class="sm-type">${p.type}</span></div>`).join('') || '<div class="sm-empty">No processes</div>';

      const log = window.__HUNA7_BUS__.getLog().slice(-20).reverse();
      document.getElementById(`sm-evts-${pid}`).innerHTML =
        log.map(e => `<div class="sm-row sm-evt"><span class="sm-evttype">${e.type}</span><span class="sm-src">[${e.source}]</span></div>`).join('');

      document.getElementById(`sm-stat-${pid}`).textContent = `Uptime: ${Math.floor(OS.system.uptime()/1000)}s | Procs: ${procs.length}`;
    };

    window[`__sm_refresh_${pid}`]();
    const iv = setInterval(window[`__sm_refresh_${pid}`], 2000);
    window.__HUNA7_BUS__.on('app.close', () => clearInterval(iv));
  }
});

// LIBRARY (placeholder)
AppRegistry.register('library', {
  name: 'Library', width: 640, height: 440,
  render(body, pid, opts = {}) {
    body.innerHTML = `<div class="app-library">
      <div class="lib-header"><svg width="32" height="32" viewBox="0 0 32 32"><rect x="2" y="6" width="28" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg><span>Library</span></div>
      <div class="lib-empty"><svg width="48" height="48" viewBox="0 0 48 48" opacity="0.3"><rect x="4" y="8" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 30l8-10 6 8 4-5 6 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        <p>No content installed.</p>
        <p class="lib-sub">This module is reserved for future extensions.</p>
      </div>
    </div>`;
  }
});

window.__HUNA7_APPS__ = AppRegistry;
