/**
 * HUNA7-OS :: L2 KERNEL CORE
 * Permission System + Process Scheduler
 */

const KernelPermissions = (() => {
  const ALLOWED_API = [
    'OS.file.read', 'OS.file.write',
    'OS.window.create', 'OS.window.close',
    'OS.process.spawn', 'OS.system.log',
    'OS.event.emit', 'OS.event.listen'
  ];

  function check(processId, api) {
    return ALLOWED_API.includes(api);
  }

  return Object.freeze({ check, ALLOWED_API });
})();

const KernelProcessScheduler = (() => {
  const _processes = {};
  let _nextPid = 1000;

  function spawn(name, type, meta = {}) {
    const pid = _nextPid++;
    _processes[pid] = {
      pid, name, type,
      status: 'running',
      createdAt: Date.now(),
      meta
    };
    window.__HUNA7_BUS__.emit({ type: 'process.spawn', payload: { pid, name, type }, source: 'kernel' });
    return pid;
  }

  function kill(pid) {
    if (_processes[pid]) {
      _processes[pid].status = 'terminated';
      window.__HUNA7_BUS__.emit({ type: 'process.kill', payload: { pid }, source: 'kernel' });
    }
  }

  function list() {
    return Object.values(_processes).filter(p => p.status === 'running');
  }

  function get(pid) {
    return _processes[pid] || null;
  }

  return Object.freeze({ spawn, kill, list, get });
})();

window.__HUNA7_PERMS__ = KernelPermissions;
window.__HUNA7_PROCS__ = KernelProcessScheduler;
