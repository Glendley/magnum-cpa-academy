/* ============================================================
   Magnum CPA Academy — API client
   ------------------------------------------------------------
   Talks to the Google Apps Script Web App declared in config.js.
   The request body is sent WITHOUT a Content-Type header so the
   browser treats it as a "simple request" (text/plain) and never
   issues a CORS preflight — which Apps Script cannot answer.

   When CONFIG.API_URL is empty the site runs against MockApi
   (js/mockapi.js): a full in-browser backend kept in localStorage,
   used for demos and for previewing before the Google setup.
   ============================================================ */

var TOKEN_KEY = 'mca_token';
var USER_KEY = 'mca_user';

function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function getUserCached() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; }
}
function setUserCached(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.clear();
}

function isMockMode() {
  return !CONFIG.API_URL && typeof MockApi !== 'undefined';
}

/**
 * Calls a backend action. Resolves with the `data` payload or
 * throws Error(message). AUTH_EXPIRED redirects to the login page.
 */
async function api(action, payload) {
  var result;
  if (isMockMode()) {
    result = await MockApi.handle(action, getToken(), payload || {});
  } else {
    if (!CONFIG.API_URL) throw new Error('The site is not connected to its backend yet. See SETUP.md.');
    var res;
    try {
      res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: action, token: getToken(), payload: payload || {} })
      });
    } catch (networkErr) {
      throw new Error('Could not reach the server. Check your internet connection and try again.');
    }
    result = await res.json();
  }

  if (!result.ok) {
    if (result.error === 'AUTH_EXPIRED') {
      clearAuth();
      if (!/index\.html$|\/$/.test(window.location.pathname)) {
        window.location.href = 'index.html';
      }
      throw new Error('Your session has expired. Please log in again.');
    }
    throw new Error(result.error || 'Something went wrong.');
  }
  return result.data;
}

/**
 * Cached wrapper for read-only calls (60s TTL in sessionStorage).
 * Use invalidateCache() after any mutation.
 */
async function apiCached(action, payload, ttlMs) {
  var key = 'mca_cache:' + action + ':' + JSON.stringify(payload || {});
  try {
    var hit = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (hit && Date.now() - hit.t < (ttlMs || 60000)) return hit.d;
  } catch (e) { /* ignore parse issues */ }
  var data = await api(action, payload);
  try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch (e) { /* quota */ }
  return data;
}

function invalidateCache() {
  Object.keys(sessionStorage).forEach(function (k) {
    if (k.indexOf('mca_cache:') === 0) sessionStorage.removeItem(k);
  });
}
