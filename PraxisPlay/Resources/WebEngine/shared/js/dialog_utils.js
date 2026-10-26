/**
 * DialogUtils — accessible confirm / alert / prompt dialogs
 *
 * Usage:
 *   var ok = await DialogUtils.confirm('Delete?', 'This cannot be undone.', { danger: true });
 *   await DialogUtils.alert('Error', 'Something went wrong.');
 *   var name = await DialogUtils.prompt('Rename', 'Enter a new name:', { defaultValue: 'Untitled' });
 *
 * Options for confirm():
 *   confirmText  — label for the confirm button  (default: "OK" / "Delete" if danger)
 *   cancelText   — label for the cancel button   (default: "Cancel")
 *   danger       — red confirm button             (default: false)
 *
 * Options for prompt():
 *   confirmText, cancelText, placeholder, defaultValue
 *
 * Requires: shared/css/dialog.css, shared/js/focus_trap.js
 */

var DialogUtils = (function () {

  /* ── confirm ─────────────────────────────────────────────────── */
  function confirm(title, message, options) {
    options = options || {};
    return new Promise(function (resolve) {
      var els = _buildShell(title, message);

      var cancelBtn = _btn(options.cancelText || 'Cancel', 'dialog-btn dialog-btn-cancel');
      var confirmCls = options.danger ? 'dialog-btn dialog-btn-danger' : 'dialog-btn dialog-btn-confirm';
      var defaultConfirm = options.danger ? 'Delete' : 'OK';
      var confirmBtn = _btn(options.confirmText || defaultConfirm, confirmCls);

      els.footer.appendChild(cancelBtn);
      els.footer.appendChild(confirmBtn);

      function close(value) {
        _teardown(els.backdrop, function () { resolve(value); });
      }

      cancelBtn.onclick = function () { close(false); };
      confirmBtn.onclick = function () { close(true); };
      _mount(els, function () { close(false); }, confirmBtn);
    });
  }

  /* ── alert ───────────────────────────────────────────────────── */
  function alert(title, message, options) {
    options = options || {};
    return new Promise(function (resolve) {
      var els = _buildShell(title, message);

      var okBtn = _btn(options.confirmText || 'OK', 'dialog-btn dialog-btn-confirm');
      els.footer.appendChild(okBtn);

      function close() {
        _teardown(els.backdrop, function () { resolve(); });
      }

      okBtn.onclick = close;
      _mount(els, close, okBtn);
    });
  }

  /* ── prompt ──────────────────────────────────────────────────── */
  function prompt(title, message, options) {
    options = options || {};
    return new Promise(function (resolve) {
      var els = _buildShell(title, message);

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'dialog-prompt-input';
      if (options.placeholder) input.placeholder = options.placeholder;
      if (options.defaultValue) input.value = options.defaultValue;
      els.body.appendChild(input);

      var cancelBtn = _btn(options.cancelText || 'Cancel', 'dialog-btn dialog-btn-cancel');
      var confirmBtn = _btn(options.confirmText || 'OK', 'dialog-btn dialog-btn-confirm');
      els.footer.appendChild(cancelBtn);
      els.footer.appendChild(confirmBtn);

      function close(value) {
        _teardown(els.backdrop, function () { resolve(value); });
      }

      cancelBtn.onclick = function () { close(null); };
      confirmBtn.onclick = function () { close(input.value); };
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); close(input.value); }
      });
      _mount(els, function () { close(null); }, input);
    });
  }

  /* ── internal helpers ────────────────────────────────────────── */

  function _buildShell(title, message) {
    var backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';

    var panel = document.createElement('div');
    panel.className = 'dialog-panel';
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'true');

    var header = document.createElement('div');
    header.className = 'dialog-header';
    var h3 = document.createElement('h3');
    h3.id = 'dialog-title-' + (++_idCounter);
    h3.textContent = title;
    panel.setAttribute('aria-labelledby', h3.id);
    header.appendChild(h3);

    var body = document.createElement('div');
    body.className = 'dialog-body';
    body.id = 'dialog-body-' + _idCounter;
    panel.setAttribute('aria-describedby', body.id);
    var p = document.createElement('p');
    p.textContent = message;
    body.appendChild(p);

    var footer = document.createElement('div');
    footer.className = 'dialog-footer';

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    backdrop.appendChild(panel);

    return { backdrop: backdrop, panel: panel, header: header, body: body, footer: footer };
  }

  function _btn(label, className) {
    var b = document.createElement('button');
    b.className = className;
    b.textContent = label;
    b.type = 'button';
    return b;
  }

  function _mount(els, onCancel, focusTarget) {
    document.body.appendChild(els.backdrop);

    // Backdrop click = cancel
    els.backdrop.addEventListener('mousedown', function (e) {
      if (e.target === els.backdrop) onCancel();
    });

    // Activate focus trap (requires focus_trap.js)
    if (typeof FocusTrap !== 'undefined') {
      FocusTrap.activate(els.panel, { onEscape: onCancel });
    } else {
      // Fallback: basic ESC handling + focus
      // Store on the backdrop element so _teardown can find it
      document.addEventListener('keydown', els.backdrop._escHandler = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      });
    }

    // Focus preferred element
    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus();
    }
  }

  function _teardown(backdrop, callback) {
    if (typeof FocusTrap !== 'undefined') {
      FocusTrap.deactivate();
    } else if (backdrop._escHandler) {
      document.removeEventListener('keydown', backdrop._escHandler);
    }

    backdrop.classList.add('dialog-closing');
    setTimeout(function () {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      if (callback) callback();
    }, 170);
  }

  var _idCounter = 0;

  return {
    confirm: confirm,
    alert:   alert,
    prompt:  prompt
  };
})();
