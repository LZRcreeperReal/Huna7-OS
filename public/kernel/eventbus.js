/**
 * HUNA7-OS :: L2 KERNEL CORE
 * Event Bus — sole communication backbone for all system modules
 */

const KernelEventBus = (() => {
  const _listeners = {};
  const _log = [];

  function emit(event) {
    if (!event || !event.type) return;
    const entry = {
      type: event.type,
      payload: event.payload || {},
      source: event.source || 'kernel',
      target: event.target || null,
      timestamp: Date.now()
    };
    _log.push(entry);
    const handlers = _listeners[event.type] || [];
    handlers.forEach(h => {
      try { h(entry); } catch (e) { console.error('[Kernel] Event handler error:', e); }
    });
  }

  function on(type, handler) {
    if (!_listeners[type]) _listeners[type] = [];
    _listeners[type].push(handler);
  }

  function off(type, handler) {
    if (!_listeners[type]) return;
    _listeners[type] = _listeners[type].filter(h => h !== handler);
  }

  function getLog() {
    return [..._log];
  }

  return Object.freeze({ emit, on, off, getLog });
})();

window.__HUNA7_BUS__ = KernelEventBus;
