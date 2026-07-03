/* ============================================================
   Magnum CPA Academy — employee portal
   Tabs: Updates (home) · Courses · Certificates · Links · Org Chart
   ============================================================ */

(function () {
  var user = requireLogin();
  if (!user) return;

  var main = document.getElementById('main');
  var boot = null;   // getBootstrap payload

  renderUserChip(document.getElementById('topbar-user'), user);
  document.getElementById('rail-logout').addEventListener('click', doLogout);
  if (sessionStorage.getItem('mca_force_pw')) {
    sessionStorage.removeItem('mca_force_pw');
    openChangePasswordModal(true);
  }

  var TAB_TITLES = {
    updates: 'Updates', courses: 'Courses', certificates: 'Certificates',
    links: 'Links', orgchart: 'Organizational Chart'
  };

  document.querySelectorAll('.nav-item[data-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.location.hash = btn.dataset.tab;
    });
  });

  window.addEventListener('hashchange', route);

  init();

  async function init() {
    try {
      boot = await api('getBootstrap');
      setUserCached(boot.user);
      route();
    } catch (err) {
      main.innerHTML = emptyState('&#9888;&#65039;', 'Could not load the portal', err.message);
    }
  }

  async function refreshBoot() {
    boot = await api('getBootstrap');
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
    if (tab === 'certificates') return renderCertificates();
    if (tab === 'links') return renderLinks();
    if (tab === 'orgchart') return renderOrgChart();
  }

  /* ── Updates (home) ── */

  function renderUpdates() {
    var updates = boot.updates || [];
    var html = '<h1 class="page-title">Latest Updates</h1>' +
               '<p class="page-sub">Stay current — announcements, policy changes and firm news.</p>';
    if (!updates.length) {
      html += emptyState('&#128227;', 'No updates yet',
        'When your administrator posts an update, it will appear here.');
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

  function progressFor(courseId) {
    return (boot.myProgress || []).find(function (p) { return p.courseId === courseId; }) || null;
  }

  function renderCourses() {
    var courses = (boot.courses || []).filter(function (c) { return c.status === 'open'; });
    var html = '<h1 class="page-title">Courses</h1>' +
               '<p class="page-sub">Available training courses. Register, complete every task, then pass the knowledge check to earn your certificate.</p>';
    if (!courses.length) {
      html += emptyState('&#127891;', 'No courses available yet',
        'When your administrator publishes a course, it will appear here.');
    } else {
      html += '<div class="course-grid">' + courses.map(function (c) {
        var prog = progressFor(c.courseId);
        var doneCount = prog ? prog.completedTaskIds.length : 0;
        var pct = c.taskCount ? Math.round((doneCount / c.taskCount) * 100) : 0;
        var badge, action;
        if (prog && prog.passed) {
          badge = '<span class="badge badge-green">&#10003; Completed</span>';
          action = 'Review course';
        } else if (prog) {
          badge = '<span class="badge badge-gold">In progress</span>';
          action = 'Continue course';
        } else {
          badge = '<span class="badge badge-blue">New</span>';
          action = 'Register & start';
        }
        return '<div class="card course-card">' +
          '<div class="course-card-top"><h3>' + escapeHtml(c.title) + '</h3>' + badge + '</div>' +
          '<div class="desc">' + escapeHtml(c.description || '') + '</div>' +
          '<div class="course-meta">' +
          '  <span>&#127916; ' + c.taskCount + ' task' + (c.taskCount === 1 ? '' : 's') + '</span>' +
          '  <span>&#10067; ' + c.questionCount + ' questions</span>' +
          '  <span>&#127919; pass ' + c.passThresholdPct + '%</span>' +
          '</div>' +
          (prog ? '<div class="course-progress-bar' + (prog.passed ? ' done' : '') + '"><div style="width:' + pct + '%"></div></div>' : '') +
          '<a class="btn' + (prog && prog.passed ? ' btn-ghost' : '') + '" href="course.html?id=' + encodeURIComponent(c.courseId) + '">' + action + '</a>' +
          '</div>';
      }).join('') + '</div>';
    }
    main.innerHTML = html;
  }

  /* ── Certificates ── */

  function renderCertificates() {
    var certs = boot.myCertificates || [];
    var html = '<h1 class="page-title">My Certificates</h1>' +
               '<p class="page-sub">Certificates you have earned. Open one to print or save it as PDF.</p>';
    if (!certs.length) {
      html += emptyState('&#127942;', 'No certificates yet',
        'Complete a course and pass its knowledge check with the required score to earn your first certificate.');
    } else {
      html += '<div class="cert-grid">' + certs.map(function (c) {
        return '<div class="card cert-card">' +
          '<div class="cert-ribbon">&#127942;</div>' +
          '<h3>' + escapeHtml(c.courseTitle) + '</h3>' +
          '<div class="cert-holder">' + escapeHtml(c.certName) + '</div>' +
          '<div class="cert-meta">Score ' + c.scorePct + '% &middot; Issued ' + fmtDateShort(c.issuedAt) + '</div>' +
          '<a class="btn btn-sm" href="certificate.html?certId=' + encodeURIComponent(c.certId) + '">View / Print</a>' +
          '</div>';
      }).join('') + '</div>';
    }
    main.innerHTML = html;
  }

  /* ── Links ── */

  function renderLinks() {
    var links = boot.links || [];
    var html = '<h1 class="page-title">Links</h1>' +
               '<p class="page-sub">Quick access to the tools and resources the team uses.</p>';
    if (!links.length) {
      html += emptyState('&#128279;', 'No links yet',
        'Your administrator can add shared resources here — portals, tools, handbooks and more.');
    } else {
      html += links.map(function (l) {
        return '<a class="card card-hover link-row mb-16" style="display:flex;text-decoration:none;color:inherit" ' +
          'href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener noreferrer">' +
          '<div class="link-icon">&#128279;</div>' +
          '<div class="grow"><h3>' + escapeHtml(l.label) + '</h3>' +
          (l.description ? '<div class="link-desc">' + escapeHtml(l.description) + '</div>' : '') +
          '<div class="link-url">' + escapeHtml(l.url) + '</div></div>' +
          '<span class="muted">&#8599;</span></a>';
      }).join('');
    }
    main.innerHTML = html;
  }

  /* ── Org chart ── */

  function renderOrgChart() {
    main.innerHTML =
      '<h1 class="page-title">Organizational Chart</h1>' +
      '<p class="page-sub">Who’s who at Magnum CPA. Click the chart to zoom.</p>' +
      '<div class="orgchart-frame" id="org-frame" title="Click to zoom">' +
      '  <img src="images/org-chart.png" alt="Magnum CPA organizational chart">' +
      '</div>';
    document.getElementById('org-frame').addEventListener('click', function () {
      var zoom = document.createElement('div');
      zoom.className = 'orgchart-zoom';
      zoom.innerHTML = '<img src="images/org-chart.png" alt="Magnum CPA organizational chart (zoomed)">';
      zoom.addEventListener('click', function () { zoom.remove(); });
      document.body.appendChild(zoom);
    });
  }
})();
