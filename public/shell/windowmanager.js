/**
 * HUNA7-OS :: L1 UI SHELL
 * Window Manager — create, drag, resize, minimize, close
 */

const WindowManager = (() => {
  const _windows = {};
  let _zTop = 100;
  let _nextWinId = 1;

  function _makeDraggable(el, handleEl) {
    let ox = 0, oy = 0, startX = 0, startY = 0;
    handleEl.addEventListener('mousedown', e => {
      if (e.target.classList.contains('win-btn')) return;
      e.preventDefault();
      startX = e.clientX; startY = e.clientY;
      ox = el.offsetLeft; oy = el.offsetTop;
      const onMove = (e2) => {
        el.style.left = (ox + e2.clientX - startX) + 'px';
        el.style.top = (oy + e2.clientY - startY) + 'px';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function create(opts = {}) {
    const winId = 'win_' + (_nextWinId++);
    const desktop = document.getElementById('huna7-desktop');
    if (!desktop) return null;

    const w = opts.width || 600;
    const h = opts.height || 420;
    const x = opts.x || Math.floor(Math.random() * 200) + 80;
    const y = opts.y || Math.floor(Math.random() * 100) + 60;

    const el = document.createElement('div');
    el.className = 'huna7-window';
    el.id = winId;
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${++_zTop}`;

    el.innerHTML = `
      <div class="win-titlebar" data-winid="${winId}">
        <span class="win-title">${opts.title || 'Window'}</span>
        <div class="win-controls">
          <button class="win-btn win-minimize" title="Minimize">&#8212;</button>
          <button class="win-btn win-close" title="Close">&#x2715;</button>
        </div>
      </div>
      <div class="win-body" id="${winId}-body"></div>
    `;

    desktop.appendChild(el);
    const body = document.getElementById(winId + '-body');
    if (opts.content) body.innerHTML = opts.content;
    if (opts.onReady) opts.onReady(body);

    _makeDraggable(el, el.querySelector('.win-titlebar'));

    el.querySelector('.win-close').addEventListener('click', () => close(winId));
    el.querySelector('.win-minimize').addEventListener('click', () => minimize(winId));
    el.addEventListener('mousedown', () => {
      el.style.zIndex = ++_zTop;
    });

    _windows[winId] = { el, opts, minimized: false, pid: opts.pid || null };

    // Taskbar entry
    const tb = document.getElementById('huna7-taskbar-apps');
    if (tb) {
      const btn = document.createElement('button');
      btn.className = 'taskbar-app-btn';
      btn.id = 'tbr_' + winId;
      btn.textContent = opts.title || 'App';
      btn.addEventListener('click', () => {
        if (_windows[winId]) {
          if (_windows[winId].minimized) restore(winId); else el.style.zIndex = ++_zTop;
        }
      });
      tb.appendChild(btn);
    }

    window.__HUNA7_BUS__.emit({ type: 'window.opened', payload: { winId, title: opts.title }, source: 'shell' });
    return winId;
  }

  function close(winId) {
    const w = _windows[winId];
    if (!w) return;
    w.el.classList.add('win-closing');
    setTimeout(() => {
      w.el.remove();
      const tbr = document.getElementById('tbr_' + winId);
      if (tbr) tbr.remove();
      delete _windows[winId];
      window.__HUNA7_BUS__.emit({ type: 'window.close', payload: { winId }, source: 'shell' });
    }, 200);
  }

  function minimize(winId) {
    const w = _windows[winId];
    if (!w) return;
    w.el.style.display = 'none';
    w.minimized = true;
    const tbr = document.getElementById('tbr_' + winId);
    if (tbr) tbr.classList.add('minimized');
  }

  function restore(winId) {
    const w = _windows[winId];
    if (!w) return;
    w.el.style.display = '';
    w.el.style.zIndex = ++_zTop;
    w.minimized = false;
    const tbr = document.getElementById('tbr_' + winId);
    if (tbr) tbr.classList.remove('minimized');
  }

  function list() { return Object.keys(_windows).map(id => ({ id, ...(_windows[id].opts || {}) })); }

  return Object.freeze({ create, close, minimize, restore, list });
})();

window.__HUNA7_WM__ = WindowManager;

// Hook kernel bus → window manager
window.__HUNA7_BUS__.on('window.create', (e) => {
  WindowManager.create(e.payload);
});
window.__HUNA7_BUS__.on('window.close', (e) => {
  if (e.source !== 'shell' && e.payload && e.payload.winId) {
    WindowManager.close(e.payload.winId);
  }
});
