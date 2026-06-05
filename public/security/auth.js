/**
 * HUNA7-OS :: SECURITY MODULE
 * Salted SHA-256 admin authentication
 * Password: Oliver0727Oliver0727!
 */

const HunaAuth = (() => {
  // Salt and hash for: Oliver0727Oliver0727!
  const SALT = 'huna7_os_admin_salt_2025';
  const STORED_HASH = 'f79a857ade022d1f1cdb3e8afceb8f93fc40e6acddad472a0da7a311646131ad';
  let _adminSession = false;

  async function _sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function authenticate(password) {
    const hash = await _sha256(SALT + password);
    if (hash === STORED_HASH) {
      _adminSession = true;
      window.__HUNA7_BUS__.emit({ type: 'auth.success', payload: { level: 'admin' }, source: 'security' });
      window.__HUNA7_VFS__.appendLog('Admin authentication successful');
      return { ok: true };
    }
    window.__HUNA7_VFS__.appendLog('Admin authentication FAILED');
    return { ok: false, error: 'Authentication failed' };
  }

  function isAdmin() { return _adminSession; }

  function revoke() {
    _adminSession = false;
    window.__HUNA7_BUS__.emit({ type: 'auth.revoked', payload: {}, source: 'security' });
  }

  return Object.freeze({ authenticate, isAdmin, revoke });
})();

window.__HUNA7_AUTH__ = HunaAuth;
