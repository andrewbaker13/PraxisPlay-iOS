/**
 * ToastUtils — shared toast notification system
 *
 * Usage:
 *   ToastUtils.show('Saved!');                       // default = success
 *   ToastUtils.show('Something went wrong', 'error');
 *   ToastUtils.success('Done!');
 *   ToastUtils.error('Upload failed');
 *   ToastUtils.warning('Large file');
 *   ToastUtils.info('Tip: drag and drop works too');
 *
 * Requires: shared/css/toast.css
 */

var ToastUtils = (function () {
  var ICONS = {
    success: '\u2713',   // ✓
    error:   '\u2717',   // ✗
    warning: '\u26A0',   // ⚠
    info:    '\u2139'    // ℹ
  };

  var DURATIONS = {
    success: 4000,
    error:   6000,
    warning: 6000,
    info:    4000
  };

  var _stack = null;
  var _counter = 0;

  function _ensureStack() {
    if (_stack && document.body.contains(_stack)) return;
    _stack = document.createElement('div');
    _stack.className = 'toast-stack';
    _stack.setAttribute('aria-live', 'assertive');
    _stack.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(_stack);
  }

  var _SUCCESS_SUBTEXTS = [
    'That was efficient.',
    'Nailed it.',
    'Smooth.',
    'Like a well-fitted model.',
    'Saved faster than you can say R-squared.',
    'Consider it done.',
    'Textbook execution.',
    'Clean data, clean save.',
    'Faster than a pivot table.',
    'No missing values here.',
    'That\u2019s going in the model.',
    'Perfectly specified.',
    'Zero residuals on that one.',
    'Like pressing Ctrl+S on greatness.',
    'Statistically flawless.',
    'Another data point collected.',
    'R\u00b2 = 1.0 on that save.',
    'Chef\u2019s kiss. But for data.',
    '',  // Sometimes no subtext \u2014 keeps it from feeling forced
    ''   // Second blank ups the odds of quiet saves to ~10%
  ];

  function show(message, type) {
    type = type || 'success';
    _ensureStack();
    _counter++;
    var id = 'toast-' + _counter;

    var el = document.createElement('div');
    el.id = id;
    el.className = 'toast-item ' + type;
    el.setAttribute('role', 'alert');

    var icon = document.createElement('span');
    icon.className = 'toast-item-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = ICONS[type] || ICONS.info;

    var msg = document.createElement('span');
    msg.className = 'toast-item-msg';
    var displayMsg = message;
    if (type === 'success') {
      var sub = _SUCCESS_SUBTEXTS[Math.floor(Math.random() * _SUCCESS_SUBTEXTS.length)];
      if (sub) displayMsg = message + ' ' + sub;
    }
    msg.textContent = displayMsg;

    var close = document.createElement('button');
    close.className = 'toast-item-close';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.innerHTML = '&times;';
    close.onclick = function () { _dismiss(id); };

    el.appendChild(icon);
    el.appendChild(msg);
    el.appendChild(close);
    _stack.appendChild(el);

    var duration = DURATIONS[type] || 4000;
    el._tid = setTimeout(function () { _dismiss(id); }, duration);

    return id;
  }

  function _dismiss(id) {
    var el = document.getElementById(id);
    if (!el) return;
    clearTimeout(el._tid);
    el.classList.add('toast-dismiss');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
  }

  return {
    show:    show,
    dismiss: _dismiss,
    success: function (m) { return show(m, 'success'); },
    error:   function (m) { return show(m, 'error'); },
    warning: function (m) { return show(m, 'warning'); },
    info:    function (m) { return show(m, 'info'); }
  };
})();
