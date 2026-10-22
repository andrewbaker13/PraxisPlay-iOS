/**
 * ErrorUtils — turns an API failure into a sentence an instructor can act on.
 *
 * Every admin page had rolled its own `body.error || 'Failed'`, but the backend
 * does not speak one shape: DRF serializers reject with {"field": ["..."]},
 * throttling with {"detail": "..."}, validators with {"non_field_errors": [...]},
 * and the roster/import endpoints with {"errors": [...]}. Reading only `error`
 * turned every one of those into "Request failed (400)" while the real,
 * already-written explanation sat unread in the response body.
 *
 * Load AFTER api-config.js and BEFORE the page's own script.
 */
(function (global) {
    'use strict';

    // Keys that carry a message, in the order we prefer them.
    var MESSAGE_KEYS = ['error', 'errors', 'detail', 'message', 'non_field_errors'];

    // Structural keys that are never an explanation of what went wrong.
    var SKIP_KEYS = {
        ok: 1, status: 1, status_code: 1, code: 1, success: 1, count: 1,
        headers: 1, rows: 1, results: 1, traceback: 1
    };

    var STATUS_HELP = {
        400: 'Something in that request was not accepted, but the server did not say what. ' +
             'Check the form for blank or out-of-range values, then try again.',
        401: 'Your sign-in has expired. Sign in again, then retry \u2014 nothing was saved.',
        403: 'You do not have permission to do that. If you should, ask the course owner to ' +
             'add you as an instructor on this course.',
        404: 'That item no longer exists. Refresh the page \u2014 it may have been deleted or renamed.',
        409: 'Someone else changed this at the same time. Refresh the page and redo your change.',
        413: 'That file is too large to upload.',
        415: 'That file could not be read. Save it as a CSV and try again.',
        429: 'Too many requests in a short time. Wait a minute or two, then try again.'
    };

    var MAX_LENGTH = 400;

    function humanize(key) {
        var words = String(key).replace(/_/g, ' ').trim();
        return words.charAt(0).toUpperCase() + words.slice(1);
    }

    // DRF nests errors arbitrarily deep; pull every string out in reading order.
    function flatten(value, depth) {
        depth = depth || 0;
        if (value === null || value === undefined || depth > 4) return '';
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'number' || typeof value === 'boolean') return '';
        if (Array.isArray(value)) {
            return value.map(function (v) { return flatten(v, depth + 1); })
                .filter(Boolean).join(' ');
        }
        if (typeof value === 'object') {
            return Object.keys(value).map(function (k) { return flatten(value[k], depth + 1); })
                .filter(Boolean).join(' ');
        }
        return '';
    }

    function statusFallback(status) {
        if (STATUS_HELP[status]) return STATUS_HELP[status];
        if (status >= 500) {
            return 'MktPraxis hit a problem on our end \u2014 this is not something you did wrong. ' +
                   'Nothing was saved. Wait a moment and try again.';
        }
        if (status) return 'The request failed (code ' + status + '). Nothing was saved.';
        return 'The request failed. Nothing was saved.';
    }

    var ErrorUtils = {
        /** Whatever the body actually says, or '' if it says nothing usable. */
        extract: function (body) {
            var parts = [];
            var add = function (text) {
                if (text && parts.indexOf(text) === -1) parts.push(text);
            };

            if (typeof body === 'string') {
                // An HTML error page is not a message; the caller should fall back.
                if (body.trim() && body.trim().charAt(0) !== '<') add(body.trim());
            } else if (body && typeof body === 'object') {
                MESSAGE_KEYS.forEach(function (key) { add(flatten(body[key])); });

                // Field-level rejections: {"start_date": ["Cannot be after the end date."]}
                if (!parts.length) {
                    Object.keys(body).forEach(function (key) {
                        if (SKIP_KEYS[key]) return;
                        var text = flatten(body[key]);
                        if (text) add(humanize(key) + ': ' + text);
                    });
                }

                // Refusals that explain themselves in a separate field (seat limits, quotas).
                add(flatten(body.reason));
                add(flatten(body.hint));
            }

            var message = parts.join(' ');
            if (message.length > MAX_LENGTH) {
                message = message.slice(0, MAX_LENGTH - 1).replace(/\s+\S*$/, '') + '\u2026';
            }
            return message;
        },

        /**
         * @param {*} body    Parsed response body (any shape), or null.
         * @param {number} [status]
         * @param {string} [fallback]  Page-specific wording naming the action that failed.
         */
        messageFrom: function (body, status, fallback) {
            var message = ErrorUtils.extract(body);
            // A page-specific fallback still says WHICH action failed, so keep it in front.
            if (!message) message = statusFallback(status);
            return fallback ? fallback + ' ' + message : message;
        },

        /** An Error carrying .status and .body, built from a failed Response. */
        toError: function (resp, fallback) {
            return resp.json().catch(function () { return null; }).then(function (body) {
                var err = new Error(ErrorUtils.messageFrom(body, resp.status, fallback));
                err.status = resp.status;
                err.body = body || {};
                return err;
            });
        },

        /** `if (!r.ok) return ErrorUtils.reject(r, 'Could not save the quiz.');` */
        reject: function (resp, fallback) {
            return ErrorUtils.toError(resp, fallback).then(function (err) {
                return Promise.reject(err);
            });
        },

        /** For a fetch() that never reached the server at all. */
        networkMessage: function (err) {
            if (err && err.name === 'AbortError') {
                return 'That took too long and was stopped. Nothing was saved \u2014 try again.';
            }
            return 'Could not reach MktPraxis. Check your internet connection and try again ' +
                   '\u2014 nothing was saved.';
        },

        /** True when the failure was the connection, not the request. */
        isNetworkError: function (err) {
            return !!(err && err.status === undefined && /fetch|network|load failed/i.test(err.message || ''));
        }
    };

    global.ErrorUtils = ErrorUtils;
})(window);
