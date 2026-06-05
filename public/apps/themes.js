/**
 * HUNA7-OS :: THEMES APP
 * Code-based theme customization with preset editor and shared theme marketplace.
 * Themes use a structured JSON format controlling colors, icons, and backgrounds.
 * Marketplace: themes need 5+ upvotes in 3h or are deleted; more downvotes than upvotes
 * at 3h mark also triggers deletion.
 *
 * Theme format (HUNA7 Theme Schema v1):
 * {
 *   "name": "My Theme",
 *   "author": "username",
 *   "version": "1",
 *   "colors": {
 *     "bg":       "#0a0c10",
 *     "surface":  "#12151c",
 *     "surface2": "#1a1f2b",
 *     "border":   "#252b38",
 *     "border2":  "#2e3547",
 *     "accent":   "#3b82f6",
 *     "accent2":  "#6366f1",
 *     "accent3":  "#0ea5e9",
 *     "green":    "#22c55e",
 *     "red":      "#ef4444",
 *     "amber":    "#f59e0b",
 *     "text":     "#e2e8f0",
 *     "text2":    "#94a3b8",
 *     "text3":    "#64748b"
 *   },
 *   "background": "grid",        // "grid" | "dots" | "noise" | "solid" | "gradient"
 *   "font": "mono",              // "mono" | "sans" | "serif"
 *   "icons": {
 *     "terminal": "svg:...",     // raw SVG string OR emoji e.g. "emoji:💻"
 *     "editor": "default",
 *     "files": "default",
 *     ...
 *   }
 * }
 */

AppRegistry.register('themes', {
  name: 'Themes', width: 820, height: 580,
  render(body, pid, opts = {}) {

    // ── Constants ───────────────────────────────────────────
    const THEME_STORAGE_KEY = 'huna7_active_theme_v1';
    const DB_KEY = 'huna7_theme_db_v1';
    const TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
    const UPVOTE_THRESHOLD = 5;

    // ── Marketplace DB helpers (shared via localStorage as poor-man DB) ──
    function dbLoad() {
      try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; } catch { return []; }
    }
    function dbSave(list) {
      localStorage.setItem(DB_KEY, JSON.stringify(list));
    }
    function dbPrune() {
      const now = Date.now();
      const list = dbLoad().filter(t => {
        const age = now - t.uploadedAt;
        if (age > TTL_MS) {
          // After 3h: needs 5+ upvotes AND more upvotes than downvotes
          if (t.upvotes < UPVOTE_THRESHOLD) return false;
          if (t.downvotes >= t.upvotes) return false;
        }
        return true;
      });
      dbSave(list);
      return list;
    }

    // ── Current theme ───────────────────────────────────────
    const DEFAULT_THEME = {
      name: 'Default Dark', author: 'system', version: '1',
      colors: {
        bg: '#0a0c10', surface: '#12151c', surface2: '#1a1f2b',
        border: '#252b38', border2: '#2e3547',
        accent: '#3b82f6', accent2: '#6366f1', accent3: '#0ea5e9',
        green: '#22c55e', red: '#ef4444', amber: '#f59e0b',
        text: '#e2e8f0', text2: '#94a3b8', text3: '#64748b'
      },
      background: 'grid', font: 'mono',
      icons: {}
    };

    function loadActiveTheme() {
      try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        return raw ? JSON.parse(raw) : DEFAULT_THEME;
      } catch { return DEFAULT_THEME; }
    }

    function saveActiveTheme(theme) {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    }

    function applyTheme(theme) {
      const r = document.documentElement.style;
      const c = theme.colors || {};
      const map = {
        '--os-bg': c.bg, '--os-surface': c.surface, '--os-surface2': c.surface2,
        '--os-border': c.border, '--os-border2': c.border2,
        '--os-accent': c.accent, '--os-accent2': c.accent2, '--os-accent3': c.accent3,
        '--os-green': c.green, '--os-red': c.red, '--os-amber': c.amber,
        '--os-text': c.text, '--os-text2': c.text2, '--os-text3': c.text3
      };
      Object.entries(map).forEach(([k, v]) => { if (v) r.setProperty(k, v); });

      // Font
      if (theme.font === 'sans') {
        r.setProperty('--os-font', "'SF Mono', 'Fira Code', monospace");
        r.setProperty('--os-font-ui', "'Inter', sans-serif");
      } else if (theme.font === 'serif') {
        r.setProperty('--os-font', "'Courier Prime', monospace");
        r.setProperty('--os-font-ui', "'Georgia', serif");
      } else {
        r.setProperty('--os-font', "'Courier Prime', 'Courier New', monospace");
        r.setProperty('--os-font-ui', "'Share Tech Mono', 'Courier New', monospace");
      }

      // Background pattern
      const desktop = document.getElementById('huna7-desktop');
      if (desktop) {
        const acc = c.accent || '#3b82f6';
        const acc2 = c.accent2 || '#6366f1';
        const patternMap = {
          grid: `radial-gradient(ellipse 60% 50% at 30% 20%, ${acc}08 0%, transparent 70%),
                 repeating-linear-gradient(0deg, transparent, transparent 39px, ${acc}10 39px, ${acc}10 40px),
                 repeating-linear-gradient(90deg, transparent, transparent 39px, ${acc}08 39px, ${acc}08 40px)`,
          dots: `radial-gradient(circle at 50% 50%, ${acc}06 0%, transparent 70%),
                 radial-gradient(${acc}15 1px, transparent 1px)`,
          noise: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          solid: 'none',
          gradient: `linear-gradient(135deg, ${acc}12 0%, ${acc2}08 50%, transparent 100%)`
        };
        const bg = theme.background || 'grid';
        desktop.style.backgroundImage = patternMap[bg] || patternMap.grid;
        if (bg === 'dots') {
          desktop.style.backgroundSize = 'auto, 24px 24px';
        } else {
          desktop.style.backgroundSize = '';
        }
      }

      // Icons
      if (theme.icons) {
        Object.entries(theme.icons).forEach(([appId, iconDef]) => {
          if (iconDef === 'default') return;
          const el = document.querySelector(`.desktop-icon[data-app-id="${appId}"] svg, .desktop-icon[data-app-id="${appId}"] .icon-img`);
          if (!el) return;
          const container = el.closest('.desktop-icon');
          if (!container) return;
          const label = container.querySelector('.desktop-icon-label');
          const labelHTML = label ? label.outerHTML : '';
          if (iconDef.startsWith('emoji:')) {
            const emoji = iconDef.slice(6);
            container.innerHTML = `<div style="font-size:32px;line-height:1;width:36px;height:36px;display:flex;align-items:center;justify-content:center">${emoji}</div>${labelHTML}`;
          } else if (iconDef.startsWith('svg:')) {
            const svgStr = iconDef.slice(4);
            container.innerHTML = svgStr + labelHTML;
          }
        });
      }

      saveActiveTheme(theme);
      window.__HUNA7_BUS__.emit({ type: 'theme.applied', payload: { name: theme.name }, source: 'themes' });
    }

    // ── Tab state ───────────────────────────────────────────
    let activeTab = 'preset';

    // ── Build UI ─────────────────────────────────────────────
    body.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';
    body.innerHTML = `
      <div style="display:flex;border-bottom:1px solid var(--os-border);background:var(--os-surface2);flex-shrink:0;">
        <button class="th-tab active" data-tab="preset">🎨 Preset Editor</button>
        <button class="th-tab" data-tab="code">📝 Code Editor</button>
        <button class="th-tab" data-tab="market">🌐 Theme Market</button>
      </div>
      <div id="th-content-${pid}" style="flex:1;overflow:hidden;"></div>

      <style>
        .th-tab {
          padding:9px 18px; border:none; background:transparent;
          color:var(--os-text3); font-family:var(--os-font-ui); font-size:11px;
          cursor:pointer; border-bottom:2px solid transparent;
          transition:all 0.15s; letter-spacing:0.05em;
        }
        .th-tab:hover { color:var(--os-text2); background:var(--os-border); }
        .th-tab.active { color:var(--os-accent); border-bottom-color:var(--os-accent); }

        .th-section { padding:16px; }
        .th-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; flex-wrap:wrap; }
        .th-label { font-size:11px; color:var(--os-text2); width:90px; flex-shrink:0; }
        .th-color { width:34px;height:24px;border:1px solid var(--os-border2);border-radius:4px;cursor:pointer;padding:0; }
        .th-select {
          background:var(--os-bg);border:1px solid var(--os-border2);color:var(--os-text);
          padding:4px 8px;border-radius:4px;font-family:var(--os-font-ui);font-size:11px;
        }
        .th-btn {
          padding:6px 14px;background:var(--os-accent);border:none;color:#fff;
          font-family:var(--os-font-ui);font-size:11px;border-radius:4px;cursor:pointer;
          transition:filter 0.15s;
        }
        .th-btn:hover { filter:brightness(1.15); }
        .th-btn.secondary {
          background:var(--os-surface2);border:1px solid var(--os-border2);color:var(--os-text2);
        }
        .th-btn.secondary:hover { background:var(--os-border); color:var(--os-text); filter:none; }
        .th-btn.danger { background:var(--os-red); }

        .th-code {
          width:100%;height:calc(100% - 48px);background:#05070c;border:none;outline:none;
          color:#e2e8f0;font-family:'Courier Prime','Courier New',monospace;font-size:12px;
          padding:14px;resize:none;line-height:1.7;border-top:1px solid var(--os-border);
        }

        .market-card {
          background:var(--os-surface2);border:1px solid var(--os-border);border-radius:6px;
          padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;
        }
        .market-card:hover { border-color:var(--os-border2); }
        .market-swatch { width:28px;height:28px;border-radius:50%;flex-shrink:0;border:2px solid var(--os-border2); }
        .market-name { font-size:12px;color:var(--os-text);font-weight:600; }
        .market-author { font-size:10px;color:var(--os-text3); }
        .market-votes { display:flex;align-items:center;gap:6px;margin-left:auto;flex-shrink:0; }
        .market-vote-btn {
          padding:3px 8px;border:1px solid var(--os-border2);background:var(--os-bg);
          color:var(--os-text2);font-family:var(--os-font-ui);font-size:10px;border-radius:4px;
          cursor:pointer;transition:all 0.12s;
        }
        .market-vote-btn:hover { background:var(--os-border); }
        .market-vote-btn.up:hover { border-color:var(--os-green);color:var(--os-green); }
        .market-vote-btn.down:hover { border-color:var(--os-red);color:var(--os-red); }
        .market-apply-btn {
          padding:4px 10px;background:var(--os-accent);border:none;color:#fff;
          font-family:var(--os-font-ui);font-size:10px;border-radius:4px;cursor:pointer;
        }
        .market-ttl { font-size:9px;color:var(--os-text3);margin-top:2px; }
        .market-empty { padding:32px;text-align:center;color:var(--os-text3);font-size:12px; }

        .th-preset-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px; }
        .th-preset-colors { padding:0 12px 12px; overflow-y:auto; max-height:calc(100% - 140px); }
        .th-group-title { font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:var(--os-text3);margin:12px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--os-border); }
        .color-grid { display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px; }
        .color-item { display:flex;flex-direction:column;gap:4px; }
        .color-item label { font-size:10px;color:var(--os-text3); }
        .th-preview { width:100%;height:48px;border-radius:6px;border:1px solid var(--os-border2);display:flex;gap:4px;align-items:center;padding:8px;margin-bottom:10px; }
        .th-preview-dot { width:12px;height:12px;border-radius:50%; }
        .th-preview-bar { flex:1;height:6px;border-radius:3px; }
        .th-actions { display:flex;gap:8px;padding:12px;border-top:1px solid var(--os-border);flex-shrink:0; }
      </style>
    `;

    const content = document.getElementById(`th-content-${pid}`);

    // ── Tab switching ────────────────────────────────────────
    body.querySelectorAll('.th-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        body.querySelectorAll('.th-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeTab = tab.dataset.tab;
        renderTab();
      });
    });

    // ── Working copy of theme ────────────────────────────────
    let workingTheme = JSON.parse(JSON.stringify(loadActiveTheme()));

    // ─────────────────────────────────────────────────────────
    // TAB: PRESET EDITOR
    // ─────────────────────────────────────────────────────────
    function renderPreset() {
      const t = workingTheme;
      const c = t.colors || {};

      const colorFields = [
        { group: 'Base', fields: [
          { key: 'bg',       label: 'Background' },
          { key: 'surface',  label: 'Surface' },
          { key: 'surface2', label: 'Surface 2' },
        ]},
        { group: 'Borders', fields: [
          { key: 'border',   label: 'Border' },
          { key: 'border2',  label: 'Border 2' },
        ]},
        { group: 'Accents', fields: [
          { key: 'accent',   label: 'Accent' },
          { key: 'accent2',  label: 'Accent 2' },
          { key: 'accent3',  label: 'Accent 3' },
        ]},
        { group: 'Status', fields: [
          { key: 'green',    label: 'Success' },
          { key: 'red',      label: 'Danger' },
          { key: 'amber',    label: 'Warning' },
        ]},
        { group: 'Text', fields: [
          { key: 'text',     label: 'Primary' },
          { key: 'text2',    label: 'Secondary' },
          { key: 'text3',    label: 'Muted' },
        ]},
      ];

      const builtInPresets = [
        { name: 'Default Dark', colors: { bg:'#0a0c10',surface:'#12151c',surface2:'#1a1f2b',border:'#252b38',border2:'#2e3547',accent:'#3b82f6',accent2:'#6366f1',accent3:'#0ea5e9',green:'#22c55e',red:'#ef4444',amber:'#f59e0b',text:'#e2e8f0',text2:'#94a3b8',text3:'#64748b'}, background:'grid', font:'mono' },
        { name: 'Terminal Green', colors: { bg:'#030d05',surface:'#071208',surface2:'#0e1f10',border:'#143018',border2:'#1a3d1d',accent:'#22c55e',accent2:'#4ade80',accent3:'#86efac',green:'#4ade80',red:'#f87171',amber:'#fbbf24',text:'#bbf7d0',text2:'#86efac',text3:'#4ade80'}, background:'grid', font:'mono' },
        { name: 'Midnight Purple', colors: { bg:'#0c0a1a',surface:'#12102a',surface2:'#1a1838',border:'#2a2646',border2:'#35305a',accent:'#a855f7',accent2:'#c084fc',accent3:'#e879f9',green:'#34d399',red:'#f87171',amber:'#fbbf24',text:'#ede9fe',text2:'#c4b5fd',text3:'#8b5cf6'}, background:'gradient', font:'mono' },
        { name: 'Solar Warm', colors: { bg:'#1a0e00',surface:'#261500',surface2:'#321c00',border:'#4a2c00',border2:'#5c3600',accent:'#f59e0b',accent2:'#fb923c',accent3:'#fbbf24',green:'#4ade80',red:'#f87171',amber:'#fcd34d',text:'#fef3c7',text2:'#fde68a',text3:'#d97706'}, background:'dots', font:'mono' },
        { name: 'Arctic Blue', colors: { bg:'#0a1020',surface:'#111828',surface2:'#182234',border:'#243048',border2:'#2d3d5c',accent:'#38bdf8',accent2:'#7dd3fc',accent3:'#bae6fd',green:'#34d399',red:'#f87171',amber:'#fbbf24',text:'#e0f2fe',text2:'#bae6fd',text3:'#7dd3fc'}, background:'dots', font:'mono' },
        { name: 'Light Mode', colors: { bg:'#f1f5f9',surface:'#ffffff',surface2:'#f8fafc',border:'#e2e8f0',border2:'#cbd5e1',accent:'#3b82f6',accent2:'#6366f1',accent3:'#0ea5e9',green:'#16a34a',red:'#dc2626',amber:'#d97706',text:'#0f172a',text2:'#334155',text3:'#64748b'}, background:'solid', font:'sans' },
      ];

      content.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';
      content.innerHTML = `
        <div style="display:flex;gap:0;border-bottom:1px solid var(--os-border);background:var(--os-surface2);padding:8px 12px;flex-shrink:0;flex-wrap:wrap;gap:6px;align-items:center;">
          <span style="font-size:10px;color:var(--os-text3);text-transform:uppercase;letter-spacing:0.1em;margin-right:6px;">Quick Presets:</span>
          ${builtInPresets.map((p,i) => `<button class="th-btn secondary" id="preset-quick-${pid}-${i}" style="font-size:10px;padding:4px 10px;">${p.name}</button>`).join('')}
        </div>
        <div style="flex:1;overflow-y:auto;padding:12px 12px 0;">
          ${colorFields.map(group => `
            <div class="th-group-title">${group.group}</div>
            <div class="color-grid">
              ${group.fields.map(f => `
                <div class="color-item">
                  <label>${f.label}</label>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <input type="color" class="th-color" id="cc-${pid}-${f.key}" value="${c[f.key] || '#000000'}" data-key="${f.key}"/>
                    <input type="text" style="background:var(--os-bg);border:1px solid var(--os-border2);color:var(--os-text);padding:2px 6px;border-radius:4px;font-family:var(--os-font-ui);font-size:10px;width:76px;" id="ct-${pid}-${f.key}" value="${c[f.key] || '#000000'}" data-key="${f.key}"/>
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
          <div class="th-group-title">Style</div>
          <div class="th-row">
            <span class="th-label">Background</span>
            <select class="th-select" id="th-bg-${pid}">
              <option value="grid" ${t.background==='grid'?'selected':''}>Grid</option>
              <option value="dots" ${t.background==='dots'?'selected':''}>Dots</option>
              <option value="gradient" ${t.background==='gradient'?'selected':''}>Gradient</option>
              <option value="noise" ${t.background==='noise'?'selected':''}>Noise</option>
              <option value="solid" ${t.background==='solid'?'selected':''}>Solid</option>
            </select>
          </div>
          <div class="th-row">
            <span class="th-label">Font</span>
            <select class="th-select" id="th-font-${pid}">
              <option value="mono" ${t.font==='mono'?'selected':''}>Monospace</option>
              <option value="sans" ${t.font==='sans'?'selected':''}>Sans-serif</option>
              <option value="serif" ${t.font==='serif'?'selected':''}>Serif</option>
            </select>
          </div>
          <div style="height:12px;"></div>
        </div>
        <div class="th-actions">
          <button class="th-btn" id="th-apply-${pid}">Apply Theme</button>
          <button class="th-btn secondary" id="th-reset-${pid}">Reset to Default</button>
          <button class="th-btn secondary" id="th-export-${pid}">Export as Code</button>
          <input type="text" id="th-name-${pid}" placeholder="Theme name..." style="background:var(--os-bg);border:1px solid var(--os-border2);color:var(--os-text);padding:5px 10px;border-radius:4px;font-size:11px;font-family:var(--os-font-ui);flex:1;"/>
          <button class="th-btn" id="th-upload-${pid}" style="background:var(--os-green);">Upload to Market</button>
        </div>
      `;

      // Quick preset buttons
      builtInPresets.forEach((p, i) => {
        document.getElementById(`preset-quick-${pid}-${i}`).addEventListener('click', () => {
          workingTheme = Object.assign({}, workingTheme, { colors: {...p.colors}, background: p.background, font: p.font, name: p.name });
          applyTheme(workingTheme);
          renderPreset();
        });
      });

      // Color pickers → sync hex input
      content.querySelectorAll(`input[type=color][id^="cc-${pid}-"]`).forEach(inp => {
        inp.addEventListener('input', () => {
          const key = inp.dataset.key;
          workingTheme.colors[key] = inp.value;
          const textEl = document.getElementById(`ct-${pid}-${key}`);
          if (textEl) textEl.value = inp.value;
        });
      });

      // Hex inputs → sync color picker
      content.querySelectorAll(`input[type=text][id^="ct-${pid}-"]`).forEach(inp => {
        inp.addEventListener('change', () => {
          const key = inp.dataset.key;
          const v = inp.value.trim();
          if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            workingTheme.colors[key] = v;
            const colEl = document.getElementById(`cc-${pid}-${key}`);
            if (colEl) colEl.value = v;
          }
        });
      });

      document.getElementById(`th-bg-${pid}`).addEventListener('change', e => { workingTheme.background = e.target.value; });
      document.getElementById(`th-font-${pid}`).addEventListener('change', e => { workingTheme.font = e.target.value; });

      document.getElementById(`th-apply-${pid}`).addEventListener('click', () => {
        applyTheme(workingTheme);
        if (window.__huna7_notify) window.__huna7_notify('Theme applied!', 'ok');
        else window.__HUNA7_BUS__.emit({type:'__notify', payload:{msg:'Theme applied!',type:'ok'}, source:'themes'});
      });

      document.getElementById(`th-reset-${pid}`).addEventListener('click', () => {
        workingTheme = JSON.parse(JSON.stringify(DEFAULT_THEME));
        applyTheme(workingTheme);
        renderPreset();
      });

      document.getElementById(`th-export-${pid}`).addEventListener('click', () => {
        // Switch to code tab with theme JSON
        activeTab = 'code';
        body.querySelectorAll('.th-tab').forEach(t2 => t2.classList.remove('active'));
        body.querySelector('[data-tab="code"]').classList.add('active');
        renderCode(JSON.stringify(workingTheme, null, 2));
      });

      document.getElementById(`th-upload-${pid}`).addEventListener('click', () => {
        const nameEl = document.getElementById(`th-name-${pid}`);
        const themeName = nameEl.value.trim() || workingTheme.name || 'Unnamed Theme';
        const account = (() => { try { return JSON.parse(localStorage.getItem('huna7_account_v1')); } catch { return null; } })();
        const author = account ? account.username : 'anonymous';

        const theme = { ...workingTheme, name: themeName, author };
        const db = dbLoad();
        db.push({
          id: 'th_' + Date.now(),
          ...theme,
          uploadedAt: Date.now(),
          upvotes: 0,
          downvotes: 0,
          userVotes: {}
        });
        dbSave(db);
        nameEl.value = '';
        alert(`"${themeName}" uploaded to the Theme Market!`);
      });
    }

    // ─────────────────────────────────────────────────────────
    // TAB: CODE EDITOR
    // ─────────────────────────────────────────────────────────
    function renderCode(initial) {
      const currentStr = initial || JSON.stringify(workingTheme, null, 2);
      content.style.cssText = 'display:flex;flex-direction:column;height:100%;';
      content.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--os-border);background:var(--os-surface2);flex-shrink:0;">
          <span style="font-size:11px;color:var(--os-text2);flex:1;">Edit HUNA7 Theme JSON — must follow schema v1 format</span>
          <button class="th-btn secondary" id="th-code-load-${pid}" style="font-size:10px;padding:4px 10px;">Load Current</button>
          <button class="th-btn" id="th-code-apply-${pid}" style="font-size:10px;padding:4px 10px;">Apply</button>
          <button class="th-btn" id="th-code-validate-${pid}" style="background:var(--os-text3);font-size:10px;padding:4px 10px;">Validate</button>
        </div>
        <div id="th-code-status-${pid}" style="padding:4px 12px;font-size:10px;min-height:22px;color:var(--os-text3);"></div>
        <textarea class="th-code" id="th-code-ta-${pid}" spellcheck="false">${currentStr}</textarea>
      `;

      const statusEl = document.getElementById(`th-code-status-${pid}`);

      document.getElementById(`th-code-load-${pid}`).addEventListener('click', () => {
        document.getElementById(`th-code-ta-${pid}`).value = JSON.stringify(workingTheme, null, 2);
        statusEl.style.color = 'var(--os-text3)';
        statusEl.textContent = 'Loaded current theme.';
      });

      document.getElementById(`th-code-validate-${pid}`).addEventListener('click', () => {
        const raw = document.getElementById(`th-code-ta-${pid}`).value;
        const result = validateThemeCode(raw);
        statusEl.style.color = result.ok ? 'var(--os-green)' : 'var(--os-red)';
        statusEl.textContent = result.ok ? '✓ Valid theme JSON.' : '✗ ' + result.error;
      });

      document.getElementById(`th-code-apply-${pid}`).addEventListener('click', () => {
        const raw = document.getElementById(`th-code-ta-${pid}`).value;
        const result = validateThemeCode(raw);
        if (!result.ok) {
          statusEl.style.color = 'var(--os-red)';
          statusEl.textContent = '✗ ' + result.error;
          return;
        }
        workingTheme = result.theme;
        applyTheme(workingTheme);
        statusEl.style.color = 'var(--os-green)';
        statusEl.textContent = '✓ Theme applied successfully.';
      });
    }

    function validateThemeCode(raw) {
      try {
        const t = JSON.parse(raw);
        if (!t.name) return { ok: false, error: 'Missing required field: name' };
        if (!t.colors) return { ok: false, error: 'Missing required field: colors' };
        const required = ['bg','surface','surface2','border','border2','accent','accent2','accent3','green','red','amber','text','text2','text3'];
        for (const k of required) {
          if (!t.colors[k]) return { ok: false, error: `Missing color: colors.${k}` };
          if (!/^#[0-9a-fA-F]{6}$/.test(t.colors[k])) return { ok: false, error: `Invalid hex color for colors.${k}: "${t.colors[k]}" — must be #RRGGBB` };
        }
        const validBgs = ['grid','dots','noise','solid','gradient'];
        if (t.background && !validBgs.includes(t.background)) return { ok: false, error: `Invalid background: "${t.background}". Allowed: ${validBgs.join(', ')}` };
        const validFonts = ['mono','sans','serif'];
        if (t.font && !validFonts.includes(t.font)) return { ok: false, error: `Invalid font: "${t.font}". Allowed: ${validFonts.join(', ')}` };
        return { ok: true, theme: t };
      } catch(e) {
        return { ok: false, error: 'JSON parse error: ' + e.message };
      }
    }

    // ─────────────────────────────────────────────────────────
    // TAB: THEME MARKET
    // ─────────────────────────────────────────────────────────
    function renderMarket() {
      content.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';
      content.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--os-border);background:var(--os-surface2);flex-shrink:0;">
          <span style="font-size:11px;color:var(--os-text2);flex:1;">Community themes — themes need 5+ upvotes in 3h to stay. More downvotes than upvotes removes them.</span>
          <button class="th-btn secondary" id="th-market-refresh-${pid}" style="font-size:10px;padding:4px 10px;">Refresh</button>
        </div>
        <div id="th-market-list-${pid}" style="flex:1;overflow-y:auto;padding:12px;"></div>
      `;

      document.getElementById(`th-market-refresh-${pid}`).addEventListener('click', refreshMarket);
      refreshMarket();

      function refreshMarket() {
        dbPrune();
        const themes = dbLoad();
        const listEl = document.getElementById(`th-market-list-${pid}`);
        if (!listEl) return;
        if (!themes.length) {
          listEl.innerHTML = `<div class="market-empty">
            <div style="font-size:32px;margin-bottom:12px;">🎨</div>
            <div>No themes in the market yet.</div>
            <div style="margin-top:6px;font-size:11px;">Create a theme in the Preset or Code editor and upload it!</div>
          </div>`;
          return;
        }

        const now = Date.now();
        listEl.innerHTML = themes.map((t, idx) => {
          const age = now - t.uploadedAt;
          const hoursLeft = Math.max(0, Math.ceil((TTL_MS - age) / 3600000));
          const pct = Math.min(100, Math.round((t.upvotes / UPVOTE_THRESHOLD) * 100));
          const progressColor = t.upvotes >= UPVOTE_THRESHOLD ? 'var(--os-green)' : 'var(--os-accent)';
          const accent = t.colors?.accent || '#3b82f6';
          const bg = t.colors?.bg || '#0a0c10';
          const surface = t.colors?.surface || '#12151c';
          return `
            <div class="market-card" id="mc-${pid}-${t.id}">
              <div class="market-swatch" style="background:linear-gradient(135deg,${accent},${surface});border-color:${accent}44;"></div>
              <div style="flex:1;min-width:0;">
                <div class="market-name">${t.name}</div>
                <div class="market-author">by ${t.author || 'anonymous'} &middot; ${t.background || 'grid'} bg &middot; ${t.font || 'mono'} font</div>
                <div class="market-ttl">${hoursLeft}h left &middot; ${pct}% to survival threshold &middot; ${t.upvotes}↑ ${t.downvotes}↓</div>
                <div style="margin-top:4px;height:3px;border-radius:2px;background:var(--os-border);width:120px;">
                  <div style="height:100%;width:${pct}%;background:${progressColor};border-radius:2px;transition:width 0.3s;"></div>
                </div>
              </div>
              <div class="market-votes">
                <button class="market-apply-btn" onclick="window.__th_apply_${pid}('${t.id}')">Apply</button>
                <button class="market-vote-btn up" onclick="window.__th_vote_${pid}('${t.id}','up')">▲ ${t.upvotes}</button>
                <button class="market-vote-btn down" onclick="window.__th_vote_${pid}('${t.id}','down')">▼ ${t.downvotes}</button>
              </div>
            </div>
          `;
        }).join('');
      }

      window[`__th_apply_${pid}`] = (id) => {
        const db = dbLoad();
        const t = db.find(x => x.id === id);
        if (!t) return;
        const { uploadedAt, upvotes, downvotes, userVotes, id: _id, ...theme } = t;
        workingTheme = theme;
        applyTheme(workingTheme);
        alert(`Applied: "${t.name}"`);
      };

      window[`__th_vote_${pid}`] = (id, direction) => {
        const db = dbLoad();
        const t = db.find(x => x.id === id);
        if (!t) return;
        const userKey = 'local';
        if (t.userVotes[userKey]) {
          alert('You already voted on this theme.');
          return;
        }
        t.userVotes[userKey] = direction;
        if (direction === 'up') t.upvotes++;
        else t.downvotes++;
        dbSave(db);
        refreshMarket();
      };
    }

    // ── Initial render ───────────────────────────────────────
    function renderTab() {
      if (activeTab === 'preset') renderPreset();
      else if (activeTab === 'code') renderCode();
      else if (activeTab === 'market') renderMarket();
    }

    renderTab();

    // Apply any saved theme on open
    const saved = loadActiveTheme();
    if (saved && saved.name !== 'Default Dark') applyTheme(saved);
  }
});

// ── Auto-apply saved theme at boot ──────────────────────────
(function autoApplyTheme() {
  try {
    const raw = localStorage.getItem('huna7_active_theme_v1');
    if (!raw) return;
    const theme = JSON.parse(raw);
    // Will be called after DOM is ready
    window.__HUNA7_BUS__.on('app.launch', () => {}); // ensure bus exists
    // Apply immediately
    const r = document.documentElement.style;
    const c = theme.colors || {};
    const map = {
      '--os-bg': c.bg, '--os-surface': c.surface, '--os-surface2': c.surface2,
      '--os-border': c.border, '--os-border2': c.border2,
      '--os-accent': c.accent, '--os-accent2': c.accent2, '--os-accent3': c.accent3,
      '--os-green': c.green, '--os-red': c.red, '--os-amber': c.amber,
      '--os-text': c.text, '--os-text2': c.text2, '--os-text3': c.text3
    };
    Object.entries(map).forEach(([k, v]) => { if (v) r.setProperty(k, v); });
  } catch(e) { /* silent */ }
})();
