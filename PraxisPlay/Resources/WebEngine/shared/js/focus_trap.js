/**
 * FocusTrap — lightweight keyboard focus trap for modals
 *
 * Usage:
 *   FocusTrap.activate(modalElement, { onEscape: closeModal });
 *   FocusTrap.deactivate();
 *
 * - Traps Tab / Shift+Tab within the modal
 * - Calls onEscape callback when Escape is pressed
 * - Restores focus to the previously focused element on deactivate
 * - Handles dynamically added content via MutationObserver
 *
 * No dependencies.
 */

var FocusTrap = (function () {
  var FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), ' +
    'input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
    '[tabindex]:not([tabindex="-1"])';

  var _active = null;      // current trap state
  var _observer = null;
  var _previousFocus = null;

  function _getFocusable(container) {
    var els = Array.prototype.slice.call(container.querySelectorAll(FOCUSABLE));
    return els.filter(function (el) {
      return el.offsetParent !== null; // visible only
    });
  }

  function _handleKeydown(e) {
    if (!_active) return;

    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
      if (_active.onEscape) _active.onEscape();
      return;
    }

    if (e.key !== 'Tab' && e.keyCode !== 9) return;

    var focusable = _getFocusable(_active.container);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function activate(container, options) {
    if (_active) deactivate();
    options = options || {};
    _previousFocus = document.activeElement;

    _active = {
      container: container,
      onEscape: options.onEscape || null
    };

    document.addEventListener('keydown', _handleKeydown, true);

    // Focus the first focusable element (or the container itself)
    var focusable = _getFocusable(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    // Watch for dynamically added content
    if (typeof MutationObserver !== 'undefined') {
      _observer = new MutationObserver(function () {
        // Re-check focusable elements on DOM change (no action needed,
        // _getFocusable is called live in _handleKeydown)
      });
      _observer.observe(container, { childList: true, subtree: true });
    }
  }

  function deactivate() {
    if (!_active) return;
    document.removeEventListener('keydown', _handleKeydown, true);

    if (_observer) {
      _observer.disconnect();
      _observer = null;
    }

    _active = null;

    // Restore focus to the element that was focused before the trap
    if (_previousFocus && typeof _previousFocus.focus === 'function') {
      try { _previousFocus.focus(); } catch (e) { /* element may have been removed */ }
    }
    _previousFocus = null;
  }

  function isActive() {
    return _active !== null;
  }

  return {
    activate:   activate,
    deactivate: deactivate,
    isActive:   isActive
  };
})();
