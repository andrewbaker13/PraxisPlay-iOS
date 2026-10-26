/**
 * ClipboardUtils — copy that either works or explains itself.
 *
 * The async Clipboard API silently rejects in situations instructors hit in a
 * live classroom: a page not served over https, a projector window that does not
 * have focus, a browser that denies the permission. Most call sites had no
 * .catch() at all, so clicking "Copy join link" did nothing whatsoever. This
 * falls back to the old execCommand path first, and only then says so.
 */
(function (global) {
    'use strict';

    function legacyCopy(text) {
        var area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        area.style.opacity = '0';
        document.body.appendChild(area);
        var ok = false;
        try {
            area.select();
            area.setSelectionRange(0, area.value.length);
            ok = document.execCommand('copy');
        } catch (e) {
            ok = false;
        }
        document.body.removeChild(area);
        return ok;
    }

    function notify(message, kind, silent) {
        if (silent || !message) return;
        if (global.ToastUtils && typeof global.ToastUtils[kind] === 'function') {
            global.ToastUtils[kind](message);
        } else if (typeof global.showToast === 'function') {
            global.showToast(message, kind);
        } else if (typeof global.toast === 'function') {
            global.toast(message);
        } else if (kind !== 'success') {
            global.alert(message);
        }
    }

    function flash(button, text, ms) {
        if (!button || button.dataset.clipboardFlash) return;
        var original = button.textContent;
        button.dataset.clipboardFlash = '1';
        button.textContent = text;
        setTimeout(function () {
            button.textContent = original;
            delete button.dataset.clipboardFlash;
        }, ms);
    }

    function failureMessage(label) {
        return 'Your browser blocked the copy' +
            (global.isSecureContext === false ? ' (this page is not on https)' : '') +
            '. Select ' + (label || 'the text') + ' on the page and press Ctrl+C (Cmd+C on a Mac).';
    }

    var ClipboardUtils = {
        /**
         * @param {string} text
         * @param {object} [options] success, label, button, buttonText, flashMs, silent
         * @returns {Promise<boolean>}
         */
        copy: function (text, options) {
            options = options || {};
            var value = text === null || text === undefined ? '' : String(text);

            var finish = function (ok) {
                if (ok) {
                    flash(options.button, options.buttonText || 'Copied!', options.flashMs || 2000);
                    notify(options.success, 'success', options.silent);
                } else {
                    notify(failureMessage(options.label), 'error', options.silent);
                }
                return ok;
            };

            if (!value) return Promise.resolve(finish(false));

            var nav = global.navigator;
            if (nav && nav.clipboard && nav.clipboard.writeText) {
                return nav.clipboard.writeText(value)
                    .then(function () { return finish(true); })
                    .catch(function () { return finish(legacyCopy(value)); });
            }
            return Promise.resolve(finish(legacyCopy(value)));
        }
    };

    global.ClipboardUtils = ClipboardUtils;
})(window);
