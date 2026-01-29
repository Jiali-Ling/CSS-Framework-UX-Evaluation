/* shared/js/metrics.js
   Minimal task metrics logger for A/B comparisons.
   Usage:
     const m = window.Metrics; 
     m.startTask('login'); ... m.endTask('login', {success:true});
     m.click('submit_button');
     m.error('required_missing', {field:'email'});
     m.exportCSV(); // triggers download
   Auto-binding:
     - Add data-metric-click="name" to buttons/links to auto-log clicks.
     - Add data-metric-form="taskName" on <form> to auto start/end and log validity.
*/

(function(){
  class Metrics {
    constructor() {
      this.logs = [];
      this.session = this._uuid();
      this.activeTasks = new Map();
      this.activeTaskOrder = [];
      this.context = {
        variant: this._detectVariant(), // 'bootstrap' | 'bulma' | 'unknown'
        theme: this._getTheme(),
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      };
      window.addEventListener('storage', () => { this.context.theme = this._getTheme(); });
      document.addEventListener('DOMContentLoaded', () => {
        this.attachAutoBindings();
      });
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

    _push(type, payload) {
      const entry = Object.assign({
        ts: this._now(),
        type,
        session: this.session
      }, this.context, payload || {});
      this.logs.push(entry);
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
      // auto click tracking
      document.querySelectorAll('[data-metric-click]').forEach(el => {
        el.addEventListener('click', () => {
          const name = el.getAttribute('data-metric-click');
          this.click(name);
        }, { passive: true });
      });

      // form tracking
      document.querySelectorAll('form[data-metric-form]').forEach(form => {
        const taskName = form.getAttribute('data-metric-form') || 'form';
        let started = false;
        form.addEventListener('focusin', () => {
          if (!started) {
            this.startTask(taskName);
            started = true;
          }
        });
        form.addEventListener('submit', (e) => {
          const valid = form.checkValidity();
          this.endTask(taskName, { success: valid, submit: true });
          started = false;
        });
        form.addEventListener('invalid', (e) => {
          this.error('html5_invalid', {name: taskName, field: e.target && e.target.name}, true);
        }, true);
      });
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
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 0);
    }
  }

  window.Metrics = new Metrics();
})();