(function(){
  const STORAGE_KEY = 'metrics_logs_v1';
  
  class Metrics {
    constructor() {
      this.storageKey = STORAGE_KEY;
      this.logs = [];
      this.logsLoaded = false;
      this.session = this._uuid();
      this.activeTasks = new Map();
      this.activeTaskOrder = [];
      this.context = {
        variant: null,
        theme: null,
        userAgent: null,
        viewport: null
      };
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => this._init(), { timeout: 2000 });
      } else {
        setTimeout(() => this._init(), 100);
      }
    }

    _init() {
      this.logs = this._loadLogs();
      this.logsLoaded = true;
      this.context.variant = this._detectVariant();
      this.context.theme = this._getTheme();
      this.context.userAgent = navigator.userAgent;
      this.context.viewport = `${window.innerWidth}x${window.innerHeight}`;
      
      window.addEventListener('storage', () => { this.context.theme = this._getTheme(); }, { passive: true });
      
      // Flush any pending debounced save immediately on page unload
      window.addEventListener('beforeunload', () => {
        if (this._saveTimeout) {
          clearTimeout(this._saveTimeout);
          this._saveLogs();
        }
      });
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.attachAutoBindings(), { once: true });
      } else {
        this.attachAutoBindings();
      }
    }

    _uuid() {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    }

    _now() { return Date.now(); }

    _detectVariant() {
      if (document.querySelector('[class*="btn"]') && document.querySelector('.container')) return 'bootstrap';
      if (document.querySelector('.button') && document.querySelector('.section')) return 'bulma';
      return 'unknown';
    }

    _getTheme() {
      const el = document.documentElement || document.body;
      return el.getAttribute('data-theme') || 'light';
    }

    _loadLogs() {
      try {
        const raw = localStorage.getItem(this.storageKey || STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch(e) {
        return [];
      }
    }

    _saveLogs() {
      try {
        localStorage.setItem(this.storageKey || STORAGE_KEY, JSON.stringify(this.logs));
      } catch(e) {
        console.warn('Failed to save metrics:', e);
      }
    }

    _push(type, payload) {
      // Ensure logs are loaded
      if (!this.logsLoaded) {
        this.logs = this._loadLogs();
        this.logsLoaded = true;
      }
      
      const entry = Object.assign({
        ts: this._now(),
        type,
        session: this.session
      }, this.context, payload || {});
      this.logs.push(entry);
      
      // Save synchronously on every push to prevent data loss on page navigation
      this._saveLogs();
      
      return entry;
    }

    setContext(next) { Object.assign(this.context, next); }

    click(name, extra={}) {
      return this._push('click', { name, extra });
    }

    error(code, extra={}) {
      return this._push('error', { code, extra });
    }

    startTask(name, extra={}) {
      const id = this._uuid();
      const startedAt = this._now();
      const entry = this._push('task_start', { id, name, extra });
      this.activeTasks.set(id, { name, startedAt });
      this.activeTaskOrder.push(id);
      return id;
    }

    endTask(nameOrId, extraOrSuccess={}, maybeExtra={}) {
      let extra;
      if (typeof extraOrSuccess === 'boolean') {
        extra = Object.assign({}, maybeExtra, { success: extraOrSuccess });
      } else {
        extra = extraOrSuccess || {};
      }

      let id = this._resolveTaskId(nameOrId);
      let name = nameOrId;
      let duration;
      if (id && this.activeTasks.has(id)) {
        const meta = this.activeTasks.get(id);
        name = meta.name;
        duration = this._now() - meta.startedAt;
        this._clearActiveTask(id);
      }
      if (!id) {
        id = this._uuid();
      }
      const success = typeof extra.success === 'boolean' ? extra.success : undefined;
      return this._push('task_end', {
        id,
        name,
        duration_ms: typeof duration === 'number' ? duration : undefined,
        success,
        extra
      });
    }

    start(name, extra={}) { return this.startTask(name, extra); }
    end(nameOrId, successOrExtra, extra) { return this.endTask(nameOrId, successOrExtra, extra); }
    mark(name, extra={}) { return this._push('mark', { name, extra }); }

    _resolveTaskId(nameOrId) {
      if (!nameOrId) return null;
      if (this.activeTasks.has(nameOrId)) return nameOrId;
      for (let i = this.activeTaskOrder.length - 1; i >= 0; i--) {
        const id = this.activeTaskOrder[i];
        const meta = this.activeTasks.get(id);
        if (meta && meta.name === nameOrId) return id;
      }
      return null;
    }

    _clearActiveTask(id) {
      this.activeTasks.delete(id);
      const idx = this.activeTaskOrder.indexOf(id);
      if (idx !== -1) this.activeTaskOrder.splice(idx, 1);
    }

    attachAutoBindings() {
      // Track clicks: explicit data-metric-click first, then auto-detect all buttons/links
      document.addEventListener('click', (e) => {
        const explicit = e.target.closest('[data-metric-click]');
        if (explicit) {
          this.click(explicit.getAttribute('data-metric-click'));
          return;
        }
        // Auto-track any button or anchor click
        const el = e.target.closest('button,a,[role="button"]');
        if (el) {
          const name = el.id || el.getAttribute('aria-label') || el.textContent.trim().slice(0,40) || el.tagName.toLowerCase();
          this.click('auto:' + name);
        }
      }, { passive: true, capture: true });

      // Track all forms: explicit data-metric-form, or auto-detect
      const formStates = new WeakMap();
      const bindForm = (form) => {
        const taskName = form.getAttribute('data-metric-form') || form.id || 'form';
        formStates.set(form, { started: false });

        form.addEventListener('focusin', () => {
          const state = formStates.get(form);
          if (state && !state.started) {
            this.startTask(taskName);
            state.started = true;
          }
        }, { passive: true });

        form.addEventListener('submit', () => {
          const valid = form.checkValidity();
          this.endTask(taskName, { success: valid, submit: true });
          const state = formStates.get(form);
          if (state) state.started = false;
        });

        form.addEventListener('invalid', (ev) => {
          this.error('html5_invalid', { name: taskName, field: ev.target?.name });
        }, true);
      };

      document.querySelectorAll('form').forEach(bindForm);

      // Also catch forms added after DOMContentLoaded via MutationObserver
      new MutationObserver(mutations => {
        mutations.forEach(m => m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.tagName === 'FORM') bindForm(node);
          node.querySelectorAll && node.querySelectorAll('form').forEach(bindForm);
        }));
      }).observe(document.body, { childList: true, subtree: true });
    }

    exportCSV(filename=`metrics_${this.context.variant}_${new Date().toISOString().slice(0,10)}.csv`) {
      if (!this.logs.length) {
        alert('No metrics collected yet.');
        return;
      }
      const headers = [
        'ts','type','session','variant','theme','userAgent','viewport',
        'id','name','code','extra'
      ];
      const rows = [headers.join(',')];
      for (const l of this.logs) {
        const row = [
          l.ts, l.type, l.session, l.variant, l.theme,
          JSON.stringify(l.userAgent).replace(/"/g,'""'),
          JSON.stringify(l.viewport).replace(/"/g,'""'),
          l.id || '', l.name || '', l.code || '',
          JSON.stringify(l.extra || {}).replace(/"/g,'""')
        ].map(x => `"${String(x)}"`).join(',');
        rows.push(row);
      }
      const blob = new Blob([rows.join('\n')], {type: 'text/csv'});
      const url = URL.createObjectURL(blob);
      
      // Use requestAnimationFrame to prevent forced reflow
      const scheduleDownload = 'requestAnimationFrame' in window 
        ? requestAnimationFrame 
        : (cb) => setTimeout(cb, 0);
      
      scheduleDownload(() => {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        scheduleDownload(() => {
          URL.revokeObjectURL(url);
          a.remove();
        });
      });
    }
  }

  window.Metrics = new Metrics();
})();