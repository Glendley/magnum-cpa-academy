/* ============================================================
   Magnum CPA Academy — auth helpers / page guards
   ============================================================ */

/**
 * Guards a page. Redirects to the login page when not logged in,
 * or to the right portal when the role doesn't match.
 * Returns the cached user (synchronously usable for the top bar).
 */
function requireLogin(requiredRole) {
  var user = getUserCached();
  if (!getToken() || !user) {
    window.location.href = 'index.html';
    return null;
  }
  if (requiredRole === 'admin' && user.role !== 'admin') {
    window.location.href = 'app.html';
    return null;
  }
  return user;
}

async function doLogout() {
  try { await api('logout'); } catch (e) { /* session may already be gone */ }
  clearAuth();
  window.location.href = 'index.html';
}

/** Renders the standard user chip + logout into a topbar container. */
function renderUserChip(container, user) {
  container.innerHTML =
    '<div class="user-chip">' +
    '  <div style="text-align:right">' +
    '    <span class="user-name">' + escapeHtml(user.name) + '</span>' +
    '    <span class="user-role">' + (user.role === 'admin' ? 'Administrator' : 'Employee') + '</span>' +
    '  </div>' +
    '  <span class="avatar">' + escapeHtml(initialsOf(user.name)) + '</span>' +
    '  <button class="btn btn-ghost btn-sm" id="btn-change-pw" title="Change password">&#128273;</button>' +
    '  <button class="btn btn-ghost btn-sm" id="btn-logout">Log out</button>' +
    '</div>';
  container.querySelector('#btn-logout').addEventListener('click', doLogout);
  container.querySelector('#btn-change-pw').addEventListener('click', function () {
    openChangePasswordModal(false);
  });
}

/**
 * Change-password dialog. When `forced` is true (first login with a
 * temporary password) the dialog cannot be dismissed.
 */
function openChangePasswordModal(forced) {
  var overlay = openModal(
    '<h3>' + (forced ? 'Set your new password' : 'Change password') + '</h3>' +
    '<p class="modal-sub">' + (forced
      ? 'You are using a temporary password. Please choose your own before continuing.'
      : 'Choose a new password (at least 8 characters).') + '</p>' +
    '<div class="field"><label>Current password</label>' +
    '<input type="password" class="input" id="pw-old" autocomplete="current-password"></div>' +
    '<div class="field"><label>New password</label>' +
    '<input type="password" class="input" id="pw-new" autocomplete="new-password"></div>' +
    '<div class="field"><label>Confirm new password</label>' +
    '<input type="password" class="input" id="pw-new2" autocomplete="new-password"></div>' +
    '<div class="modal-actions">' +
    (forced ? '' : '<button class="btn btn-ghost" id="pw-cancel">Cancel</button>') +
    '<button class="btn" id="pw-save">Save password</button>' +
    '</div>',
    { sticky: true }
  );

  var cancel = overlay.querySelector('#pw-cancel');
  if (cancel) cancel.addEventListener('click', function () { overlay.remove(); });

  overlay.querySelector('#pw-save').addEventListener('click', async function () {
    var oldPw = overlay.querySelector('#pw-old').value;
    var newPw = overlay.querySelector('#pw-new').value;
    var newPw2 = overlay.querySelector('#pw-new2').value;
    if (newPw.length < 8) { toast('New password must be at least 8 characters.', 'error'); return; }
    if (newPw !== newPw2) { toast('New passwords do not match.', 'error'); return; }
    setBusy(this, true, 'Saving…');
    try {
      await api('changePassword', { oldPassword: oldPw, newPassword: newPw });
      toast('Password updated.', 'success');
      overlay.remove();
    } catch (err) {
      toast(err.message, 'error');
      setBusy(this, false);
    }
  });
}
