/* ============================================================
   Magnum CPA Academy — client portal
   Tabs: Updates (home) · Courses — only what admin has explicitly
   opted into the client view. No progress, no quiz, no certificates.
   ============================================================ */

(function () {
  var user = requireLogin();
  if (!user) return;

  var main = document.getElementById('main');
  var boot = null; // clientGetBootstrap payload

  renderTopbar();
  document.getElementById('rail-logout').addEventListener('click', clientLogout);

  var TAB_TITLES = { updates: 'Updates', courses: 'Courses' };

  document.querySelectorAll('.nav-item[data-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () { window.location.hash = btn.dataset.tab; });
  });
  window.addEventListener('hashchange', route);

  init();

  async function init() {
    try {
      boot = await api('clientGetBootstrap');
      route();
    } catch (err) {
      main.innerHTML = emptyState('&#9888;&#65039;', 'Could not load the portal', err.message);
    }
  }

  function renderTopbar() {
    var container = document.getElementById('topbar-user');
    container.innerHTML =
      '<div class="user-chip">' +
      '  <div style="text-align:right">' +
      '    <span class="user-name">' + escapeHtml(user.name) + '</span>' +
      '    <span class="user-role">Client</span>' +
      '  </div>' +
      '  <span class="avatar">' + escapeHtml(initialsOf(user.name)) + '</span>' +
      '  <button class="btn btn-ghost btn-sm" id="btn-logout">Log out</button>' +
      '</div>';
    container.querySelector('#btn-logout').addEventListener('click', clientLogout);
  }

  async function clientLogout() {
    try { await api('logout'); } catch (e) { /* session may already be gone */ }
    clearAuth();
    window.location.href = 'client-login.html';
  }

  function route() {
    var hash = (window.location.hash || '#updates').slice(1);
    var parts = hash.split('/');
    var tab = parts[0] || 'updates';
    if (!TAB_TITLES[tab] && tab !== 'update') tab = 'updates';

    document.querySelectorAll('.nav-item[data-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab || (tab === 'update' && btn.dataset.tab === 'updates'));
    });
    document.getElementById('tab-crumb').textContent = TAB_TITLES[tab] || 'Updates';

    if (tab === 'update' && parts[1]) return renderUpdateDetail(parts[1]);
    if (tab === 'updates') return renderUpdates();
    if (tab === 'courses') return renderCourses();
  }

  /* ── Updates (home) ── */

  function renderUpdates() {
    var updates = boot.updates || [];
    var html = '<h1 class="page-title">Latest Updates</h1>' +
               '<p class="page-sub">News and announcements from Magnum CPA.</p>';
    if (!updates.length) {
      html += emptyState('&#128227;', 'No updates yet', 'Check back soon for news from Magnum CPA.');
    } else {
      html += updates.map(function (u) {
        var d = new Date(u.publishedAt);
        var day = isNaN(d.getTime()) ? '–' : d.getDate();
        var mon = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short' });
        return '<div class="card card-hover update-card mb-16" data-update="' + escapeHtml(u.updateId) + '">' +
          '<div class="update-date-chip"><div class="d">' + day + '</div><div class="m">' + mon + '</div></div>' +
          '<div class="grow">' +
          '  <h3>' + escapeHtml(u.title) + '</h3>' +
          '  <div class="summary">' + escapeHtml(u.summary || '') + '</div>' +
          '  <span class="read-more">Read full update &rarr;</span>' +
          '</div></div>';
      }).join('');
    }
    main.innerHTML = html;
    main.querySelectorAll('[data-update]').forEach(function (card) {
      card.addEventListener('click', function () {
        window.location.hash = 'update/' + card.dataset.update;
      });
    });
  }

  async function renderUpdateDetail(updateId) {
    main.innerHTML = loadingBlock('Loading update…');
    try {
      var u = await api('getUpdate', { updateId: updateId });
      main.innerHTML =
        '<button class="btn btn-ghost btn-sm mb-16" id="back-updates">&larr; All updates</button>' +
        '<div class="card">' +
        '  <div class="muted small mb-8">' + fmtDate(u.publishedAt) + '</div>' +
        '  <h1 class="page-title">' + escapeHtml(u.title) + '</h1>' +
        (u.summary ? '<p class="page-sub">' + escapeHtml(u.summary) + '</p>' : '') +
        '  <hr class="divider">' +
        '  <div class="rich-content">' + (u.bodyHtml || '<p class="muted">No additional documentation.</p>') + '</div>' +
        '</div>';
      document.getElementById('back-updates').addEventListener('click', function () {
        window.location.hash = 'updates';
      });
    } catch (err) {
      main.innerHTML = emptyState('&#9888;&#65039;', 'Update unavailable', err.message);
    }
  }

  /* ── Courses ── */

  function renderCourses() {
    var courses = boot.courses || [];
    var html = '<h1 class="page-title">Courses</h1>' +
               '<p class="page-sub">A quick look at how our process works.</p>';
    if (!courses.length) {
      html += emptyState('&#127891;', 'No courses available yet', 'Check back soon.');
    } else {
      html += '<div class="course-grid">' + courses.map(function (c) {
        return '<div class="card course-card">' +
          '<div class="course-card-top"><h3>' + escapeHtml(c.title) + '</h3></div>' +
          '<div class="desc">' + escapeHtml(c.description || '') + '</div>' +
          '<div class="course-meta">' +
          '  <span>&#127916; ' + c.taskCount + ' part' + (c.taskCount === 1 ? '' : 's') + '</span>' +
          '</div>' +
          '<a class="btn" href="client-course.html?id=' + encodeURIComponent(c.courseId) + '">Watch</a>' +
          '</div>';
      }).join('') + '</div>';
    }
    main.innerHTML = html;
  }
})();
