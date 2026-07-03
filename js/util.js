/* ============================================================
   Magnum CPA Academy — shared utilities
   ============================================================ */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(isoString) {
  if (!isoString) return '';
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtDateShort(isoString) {
  if (!isoString) return '';
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initialsOf(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2)
    .map(function (w) { return w.charAt(0).toUpperCase(); }).join('') || '?';
}

/**
 * Parses a pasted video URL into an embeddable form.
 * Supports Google Drive share links, YouTube (watch / youtu.be /
 * shorts / embed) and direct .mp4 URLs. Returns null when the
 * URL isn't recognized.
 */
function parseVideo(url) {
  url = String(url || '').trim();
  if (!url) return null;

  if (/drive\.google\.com/i.test(url)) {
    var dm = url.match(/(?:\/d\/|[?&]id=)([\w-]{20,})/);
    if (dm) {
      return { type: 'drive', src: url, embed: 'https://drive.google.com/file/d/' + dm[1] + '/preview' };
    }
    return null;
  }

  var ym = url.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
  if (ym && /(youtube\.com|youtu\.be)/i.test(url)) {
    return {
      type: 'youtube', src: url, videoId: ym[1],
      embed: 'https://www.youtube.com/embed/' + ym[1] + '?enablejsapi=1&rel=0&modestbranding=1'
    };
  }

  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) {
    return { type: 'mp4', src: url, embed: url };
  }
  return null;
}

/**
 * Builds a mailto: URL. Arrays are joined with commas.
 * Returns null when the result would exceed safe mail-client
 * limits (~1900 chars) — callers should then offer copy-to-clipboard.
 */
function buildMailto(opts) {
  var to = Array.isArray(opts.to) ? opts.to.join(',') : (opts.to || '');
  var params = [];
  if (opts.cc) params.push('cc=' + encodeURIComponent(Array.isArray(opts.cc) ? opts.cc.join(',') : opts.cc));
  if (opts.subject) params.push('subject=' + encodeURIComponent(opts.subject));
  if (opts.body) params.push('body=' + encodeURIComponent(opts.body));
  var url = 'mailto:' + encodeURIComponent(to).replace(/%2C/gi, ',').replace(/%40/gi, '@') +
            (params.length ? '?' + params.join('&') : '');
  return url.length <= 1900 ? url : null;
}

/** Opens a mailto, falling back to a copy-to-clipboard toast when it is too long. */
function openMailto(opts) {
  var url = buildMailto(opts);
  if (url) {
    window.location.href = url;
    return;
  }
  var text = 'To: ' + (Array.isArray(opts.to) ? opts.to.join(', ') : opts.to) + '\n' +
             (opts.cc ? 'Cc: ' + (Array.isArray(opts.cc) ? opts.cc.join(', ') : opts.cc) + '\n' : '') +
             'Subject: ' + (opts.subject || '') + '\n\n' + (opts.body || '');
  copyText(text);
  toast('The email was too long for your mail app — its content was copied to your clipboard instead.', 'error');
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    return;
  }
  var ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

/* ── Toasts ── */
function toast(message, kind) {
  var host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    document.body.appendChild(host);
  }
  var el = document.createElement('div');
  el.className = 'toast' + (kind ? ' toast-' + kind : '');
  el.textContent = message;
  host.appendChild(el);
  setTimeout(function () {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(function () { el.remove(); }, 320);
  }, kind === 'error' ? 6000 : 3600);
}

/* ── Modals ── */
function openModal(innerHtml, opts) {
  opts = opts || {};
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal ' + (opts.wide ? 'modal-wide' : '') + '">' + innerHtml + '</div>';
  overlay.addEventListener('mousedown', function (e) {
    if (e.target === overlay && !opts.sticky) overlay.remove();
  });
  document.body.appendChild(overlay);
  return overlay;
}

function closeModal(node) {
  var overlay = node.closest ? node.closest('.modal-overlay') : null;
  if (overlay) overlay.remove();
}

/* ── Misc DOM ── */
function qsParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setBusy(button, busy, busyLabel) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.disabled = true;
    button.textContent = busyLabel || 'Working…';
  } else {
    button.disabled = false;
    if (button.dataset.label) button.textContent = button.dataset.label;
  }
}

function loadingBlock(msg) {
  return '<div class="loading-block"><div class="spinner"></div>' + escapeHtml(msg || 'Loading…') + '</div>';
}

function emptyState(icon, title, body) {
  return '<div class="empty-state"><div class="empty-icon">' + icon + '</div>' +
         '<h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(body) + '</p></div>';
}
