/* ============================================================
   Magnum CPA Academy — admin portal
   Tabs: Courses (builder) · Updates · Tracking · Employees ·
         Links · Settings
   ============================================================ */

(function () {
  var user = requireLogin('admin');
  if (!user) return;

  var main = document.getElementById('main');
  var settingsCache = null;

  renderUserChip(document.getElementById('topbar-user'), user);
  document.getElementById('rail-logout').addEventListener('click', doLogout);
  document.getElementById('rail-employee-view').addEventListener('click', function () {
    window.location.href = 'app.html';
  });
  if (sessionStorage.getItem('mca_force_pw')) {
    sessionStorage.removeItem('mca_force_pw');
    openChangePasswordModal(true);
  }

  var TAB_TITLES = {
    courses: 'Courses', updates: 'Updates', tracking: 'Tracking',
    employees: 'Employees', links: 'Links', settings: 'Settings'
  };

  document.querySelectorAll('.nav-item[data-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () { window.location.hash = btn.dataset.tab; });
  });
  window.addEventListener('hashchange', route);
  route();

  function route() {
    var parts = (window.location.hash || '#courses').slice(1).split('/');
    var tab = TAB_TITLES[parts[0]] ? parts[0] : 'courses';
    document.querySelectorAll('.nav-item[data-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.getElementById('tab-crumb').textContent = TAB_TITLES[tab];

    if (tab === 'courses') return renderCourseList();
    if (tab === 'updates') return renderUpdates();
    if (tab === 'tracking') return renderTracking();
    if (tab === 'employees') return renderEmployees();
    if (tab === 'links') return renderLinks();
    if (tab === 'settings') return renderSettings();
  }

  async function getSettings(force) {
    if (!settingsCache || force) settingsCache = await api('adminGetSettings');
    return settingsCache;
  }

  function siteUrl(page) {
    return window.location.href.replace(/admin\.html.*$/, '') + (page || '');
  }

  function statusBadge(status) {
    if (status === 'open') return '<span class="badge badge-green">Open</span>';
    if (status === 'closed') return '<span class="badge badge-red">Closed</span>';
    return '<span class="badge badge-grey">Draft</span>';
  }

  /* Convert plain text (no tags) into simple paragraphs for rich display. */
  function textToHtml(text) {
    text = String(text || '').trim();
    if (!text) return '';
    if (/<[a-z][^>]*>/i.test(text)) return text;
    return text.split(/\n{2,}/).map(function (para) {
      return '<p>' + escapeHtml(para).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  async function notifyPrompt(kind, title, summary, page) {
    var settings;
    try { settings = await getSettings(); } catch (e) { settings = {}; }
    if (!settings.teamEmail) {
      toast('No team email is configured yet — set it under Settings, or add a recipient below.', 'error');
    }
    openSendEmailModal({
      heading: '&#128227; Notify the team',
      to: settings.teamEmail || '',
      cc: settings.ccList || '',
      subject: '[Magnum CPA Academy] New ' + kind + ': ' + title,
      body: 'Hi team,\n\nA new ' + kind + ' is now available on Magnum CPA Academy:\n\n' +
            title + (summary ? '\n' + summary : '') +
            '\n\nOpen it here: ' + siteUrl(page) +
            '\n\nThank you!'
    });
  }

  /**
   * Sends email as your own Gmail/Workspace account via the backend
   * (Google Apps Script's GmailApp — no SMTP setup needed). Shows a
   * review step first so you can edit anything before it actually goes
   * out, and always offers a mailto fallback (e.g. if you'd rather send
   * it yourself, or Gmail's daily sending quota is hit).
   */
  function openSendEmailModal(opts) {
    var overlay = openModal(
      '<h3>' + (opts.heading || 'Send email') + '</h3>' +
      '<p class="modal-sub">Review before sending — sends from your own Google account.</p>' +
      '<div class="field"><label>To</label><input class="input" id="se-to" value="' + escapeHtml(opts.to || '') + '" placeholder="name@example.com"></div>' +
      '<div class="field"><label>Cc (optional)</label><input class="input" id="se-cc" value="' + escapeHtml(opts.cc || '') + '"></div>' +
      '<div class="field"><label>Subject</label><input class="input" id="se-subject" value="' + escapeHtml(opts.subject || '') + '"></div>' +
      '<div class="field" style="margin-bottom:0"><label>Message</label><textarea class="textarea" id="se-body" rows="9">' + escapeHtml(opts.body || '') + '</textarea></div>' +
      '<div class="modal-actions">' +
      '  <button class="btn btn-ghost" data-close>Cancel</button>' +
      '  <button class="btn btn-ghost" id="se-mailto">Open in mail app instead</button>' +
      '  <button class="btn" id="se-send">Send email</button>' +
      '</div>',
      { wide: true, sticky: true }
    );
    overlay.querySelector('[data-close]').addEventListener('click', function () { overlay.remove(); });
    overlay.querySelector('#se-mailto').addEventListener('click', function () {
      openMailto({
        to: overlay.querySelector('#se-to').value,
        cc: overlay.querySelector('#se-cc').value,
        subject: overlay.querySelector('#se-subject').value,
        body: overlay.querySelector('#se-body').value
      });
      overlay.remove();
    });
    overlay.querySelector('#se-send').addEventListener('click', async function () {
      var to = overlay.querySelector('#se-to').value.trim();
      if (!to) { toast('Enter at least one recipient.', 'error'); return; }
      setBusy(this, true, 'Sending…');
      try {
        await api('adminSendEmail', {
          to: to,
          cc: overlay.querySelector('#se-cc').value.trim(),
          subject: overlay.querySelector('#se-subject').value,
          body: overlay.querySelector('#se-body').value
        });
        toast('Email sent!', 'success');
        overlay.remove();
      } catch (err) {
        toast(err.message, 'error');
        setBusy(this, false);
      }
    });
  }

  /* ════════════════════════════════════════════
     COURSES — list
     ════════════════════════════════════════════ */

  async function renderCourseList() {
    main.innerHTML = loadingBlock('Loading courses…');
    var boot;
    try {
      boot = await api('getBootstrap');
    } catch (err) {
      main.innerHTML = emptyState('&#9888;&#65039;', 'Could not load courses', err.message);
      return;
    }
    var courses = boot.courses || [];

    var html =
      '<div class="row-between mb-24">' +
      '  <div><h1 class="page-title">Courses</h1>' +
      '  <p class="page-sub" style="margin-bottom:0">Courses are authored as files in the <code>Courses/</code> folder and pushed live. Publish, close and track them here.</p></div>' +
      '  <button class="btn" id="btn-new-course">+ New course</button>' +
      '</div>';

    if (!courses.length) {
      html += emptyState('&#127891;', 'No courses yet', 'Click “New course” for how to add your first training course.');
    } else {
      html += '<div class="table-wrap"><table class="table"><thead><tr>' +
        '<th>Course</th><th>Status</th><th>Tasks</th><th>Questions</th><th>Registration form</th><th style="width:410px">Actions</th>' +
        '</tr></thead><tbody>' +
        courses.map(function (c) {
          return '<tr>' +
            '<td><b>' + escapeHtml(c.title) + '</b><br><span class="muted small">' + escapeHtml((c.description || '').slice(0, 80)) + '</span></td>' +
            '<td>' + statusBadge(c.status) + '</td>' +
            '<td>' + c.taskCount + '</td>' +
            '<td>' + c.questionCount + '</td>' +
            '<td class="small">' + (c.registrationFormUrl ? '<a href="' + escapeHtml(c.registrationFormUrl) + '" target="_blank" rel="noopener">Google Form &#8599;</a>' : '<span class="muted">—</span>') + '</td>' +
            '<td>' +
            '  <button class="btn btn-ghost btn-sm" data-act="edit" data-id="' + escapeHtml(c.courseId) + '">Edit</button> ' +
            '  <a class="btn btn-ghost btn-sm" href="course.html?id=' + encodeURIComponent(c.courseId) + '&preview=1" target="_blank" rel="noopener" title="See it exactly as an employee would — nothing is saved">Preview</a> ' +
            (c.status !== 'open'
              ? '<button class="btn btn-green btn-sm" data-act="publish" data-id="' + escapeHtml(c.courseId) + '">' + (c.status === 'closed' ? 'Reopen' : 'Publish') + '</button> '
              : '<button class="btn btn-red btn-sm" data-act="close" data-id="' + escapeHtml(c.courseId) + '">Close</button> ') +
            '  <button class="btn btn-ghost btn-sm" data-act="notify" data-id="' + escapeHtml(c.courseId) + '">Notify</button> ' +
            '  <button class="icon-btn danger" title="Delete course" data-act="delete" data-id="' + escapeHtml(c.courseId) + '">&#128465;</button>' +
            '</td></tr>';
        }).join('') +
        '</tbody></table></div>';
    }
    main.innerHTML = html;

    document.getElementById('btn-new-course').addEventListener('click', openNewCourseHelp);

    main.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var id = btn.dataset.id;
        var course = courses.find(function (c) { return c.courseId === id; });
        var act = btn.dataset.act;

        if (act === 'edit') { openCourseDetail(course); return; }

        if (act === 'notify') { notifyPrompt('course', course.title, course.description, 'app.html#courses'); return; }

        if (act === 'publish') {
          setBusy(btn, true, '…');
          try {
            await api('adminSetCourseStatus', { courseId: id, status: 'open' });
            invalidateCache();
            toast('Course is now open to employees.', 'success');
            await notifyPrompt('course', course.title, course.description, 'app.html#courses');
            renderCourseList();
          } catch (err) { toast(err.message, 'error'); setBusy(btn, false); }
          return;
        }

        if (act === 'close') {
          if (!confirm('Close "' + course.title + '"? Employees will no longer see or take this course. Progress and certificates are kept.')) return;
          setBusy(btn, true, '…');
          try {
            await api('adminSetCourseStatus', { courseId: id, status: 'closed' });
            invalidateCache();
            toast('Course closed.', 'success');
            renderCourseList();
          } catch (err) { toast(err.message, 'error'); setBusy(btn, false); }
          return;
        }

        if (act === 'delete') {
          if (!confirm('Delete "' + course.title + '" permanently?\n\nThis also removes all employee progress for it. Earned certificates are kept. This cannot be undone.')) return;
          try {
            await api('adminDeleteCourse', { courseId: id });
            invalidateCache();
            toast('Course deleted.', 'success');
            renderCourseList();
          } catch (err) { toast(err.message, 'error'); }
        }
      });
    });
  }

  /* ════════════════════════════════════════════
     COURSES — file-based authoring (no in-browser builder)
     Course content lives in Courses/<slug>/ as course.js +
     knowledge-check.js; Claude reads those files and pushes them
     live via adminSaveCourse. These two helpers just explain that
     workflow and show what's currently live, read-only.
     ════════════════════════════════════════════ */

  function slugify(title) {
    return String(title || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function openNewCourseHelp() {
    var overlay = openModal(
      '<h3>Adding a new course</h3>' +
      '<p class="modal-sub">Courses are authored as files, not through a web form.</p>' +
      '<ol style="padding-left:20px;line-height:1.8">' +
      '  <li>Copy the <code>Courses/TEMPLATE</code> folder and rename it to a short slug (e.g. <code>payroll-basics</code>).</li>' +
      '  <li>Edit <code>course.js</code> (title, tasks, video links, lesson content) and <code>knowledge-check.js</code> (10–15 questions) in that folder.</li>' +
      '  <li>Ask Claude to push the course live — it appears below as a draft for you to review, then publish.</li>' +
      '</ol>' +
      '<div class="modal-actions"><button class="btn" data-close>Got it</button></div>'
    );
    overlay.querySelector('[data-close]').addEventListener('click', function () { overlay.remove(); });
  }

  async function openCourseDetail(course) {
    var overlay = openModal(
      '<h3>' + escapeHtml(course.title) + '</h3>' +
      '<p class="modal-sub">Authored from <code>Courses/' + escapeHtml(slugify(course.title)) + '/</code> — edit those files and ask Claude to push updates; this view is read-only.</p>' +
      '<div id="cd-body">' + loadingBlock('Loading course details…') + '</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" data-close>Close</button></div>',
      { wide: true }
    );
    overlay.querySelector('[data-close]').addEventListener('click', function () { overlay.remove(); });

    try {
      var full = await api('adminGetCourseFull', { courseId: course.courseId });
      var body = overlay.querySelector('#cd-body');
      body.innerHTML =
        '<div class="row-between mb-8"><h4 style="font-size:0.95rem">Tasks (' + full.tasks.length + ')</h4></div>' +
        (full.tasks.length ? '<div class="table-wrap mb-16"><table class="table"><thead><tr><th>#</th><th>Title</th><th>Video</th></tr></thead><tbody>' +
          full.tasks.map(function (t, i) {
            var kind = t.video ? t.video.type : 'none';
            return '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(t.title) + '</td><td>' +
              (kind === 'drive' ? '&#128193; Drive' : kind === 'youtube' ? '&#9654; YouTube' : kind === 'mp4' ? '&#127916; File' : '<span class="muted">missing</span>') +
              '</td></tr>';
          }).join('') + '</tbody></table></div>'
          : '<p class="muted small mb-16">No tasks yet.</p>') +
        '<div class="row-between mb-8"><h4 style="font-size:0.95rem">Knowledge check</h4>' + quizCountPillReadOnly(full.quiz.length) + '</div>';
    } catch (err) {
      overlay.querySelector('#cd-body').innerHTML = '<p style="color:#f2a49b">' + escapeHtml(err.message) + '</p>';
    }
  }

  function quizCountPillReadOnly(n) {
    var cls = n >= 10 && n <= 15 ? 'ok' : (n === 0 ? '' : 'bad');
    return '<span class="quiz-count-pill ' + cls + '">' + n + ' / 10–15 questions</span>';
  }

  /* ════════════════════════════════════════════
     UPDATES
     ════════════════════════════════════════════ */

  async function renderUpdates() {
    main.innerHTML = loadingBlock('Loading updates…');
    // Updates publish immediately on save, so the published list is complete.
    var boot;
    try {
      boot = await api('getBootstrap');
    } catch (err) {
      main.innerHTML = emptyState('&#9888;&#65039;', 'Could not load updates', err.message);
      return;
    }
    var updates = boot.updates || [];

    var html =
      '<div class="row-between mb-24">' +
      '  <div><h1 class="page-title">Updates</h1>' +
      '  <p class="page-sub" style="margin-bottom:0">Post announcements employees see on their home page.</p></div>' +
      '  <button class="btn" id="btn-new-update">+ New update</button>' +
      '</div>';

    if (!updates.length) {
      html += emptyState('&#128227;', 'No published updates', 'Click “New update” to post your first announcement.');
    } else {
      html += '<div class="table-wrap"><table class="table"><thead><tr>' +
        '<th>Update</th><th>Published</th><th style="width:300px">Actions</th></tr></thead><tbody>' +
        updates.map(function (u) {
          return '<tr>' +
            '<td><b>' + escapeHtml(u.title) + '</b><br><span class="muted small">' + escapeHtml((u.summary || '').slice(0, 90)) + '</span></td>' +
            '<td class="small">' + fmtDateShort(u.publishedAt) + '</td>' +
            '<td>' +
            '  <button class="btn btn-ghost btn-sm" data-uedit="' + escapeHtml(u.updateId) + '">Edit</button> ' +
            '  <button class="btn btn-ghost btn-sm" data-unotify="' + escapeHtml(u.updateId) + '">Notify</button> ' +
            '  <button class="icon-btn danger" title="Delete" data-udel="' + escapeHtml(u.updateId) + '">&#128465;</button>' +
            '</td></tr>';
        }).join('') +
        '</tbody></table></div>';
    }
    main.innerHTML = html;

    document.getElementById('btn-new-update').addEventListener('click', function () {
      openUpdateEditor(null);
    });
    main.querySelectorAll('[data-uedit]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        try {
          var u = await api('getUpdate', { updateId: btn.dataset.uedit });
          openUpdateEditor(u);
        } catch (err) { toast(err.message, 'error'); }
      });
    });
    main.querySelectorAll('[data-unotify]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var u = updates.find(function (x) { return x.updateId === btn.dataset.unotify; });
        notifyPrompt('update', u.title, u.summary, 'app.html#update/' + u.updateId);
      });
    });
    main.querySelectorAll('[data-udel]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!confirm('Delete this update permanently?')) return;
        try {
          await api('adminDeleteUpdate', { updateId: btn.dataset.udel });
          invalidateCache();
          toast('Update deleted.', 'success');
          renderUpdates();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  }

  function openUpdateEditor(u) {
    var overlay = openModal(
      '<h3>' + (u ? 'Edit update' : 'New update') + '</h3>' +
      '<p class="modal-sub">The title and summary appear in the employees’ feed; the full documentation opens when they click the update.</p>' +
      '<div class="field"><label>Title</label>' +
      '<input class="input" id="ue-title" maxlength="140" value="' + escapeHtml(u ? u.title : '') + '"></div>' +
      '<div class="field"><label>Summary (one or two lines)</label>' +
      '<input class="input" id="ue-summary" maxlength="200" value="' + escapeHtml(u ? u.summary : '') + '"></div>' +
      '<div class="field"><label>Full documentation</label>' +
      '<textarea class="textarea" id="ue-body" rows="10" placeholder="Write the full update. Plain text works; HTML (<h2>, <ul>, <img>, links…) is also supported.">' + escapeHtml(u ? u.bodyHtml : '') + '</textarea></div>' +
      '<div class="modal-actions">' +
      '  <button class="btn btn-ghost" data-close>Cancel</button>' +
      '  <button class="btn btn-green" id="ue-publish">' + (u ? 'Save changes' : 'Publish') + '</button>' +
      '</div>',
      { wide: true, sticky: true }
    );
    overlay.querySelector('[data-close]').addEventListener('click', function () { overlay.remove(); });
    overlay.querySelector('#ue-publish').addEventListener('click', async function () {
      var title = overlay.querySelector('#ue-title').value.trim();
      var summary = overlay.querySelector('#ue-summary').value.trim();
      var body = overlay.querySelector('#ue-body').value;
      if (!title) { toast('Enter a title.', 'error'); return; }
      setBusy(this, true, 'Publishing…');
      try {
        await api('adminSaveUpdate', {
          updateId: u ? u.updateId : undefined,
          title: title, summary: summary,
          bodyHtml: textToHtml(body), status: 'published'
        });
        invalidateCache();
        overlay.remove();
        toast(u ? 'Update saved.' : 'Update published!', 'success');
        if (!u) await notifyPrompt('update', title, summary, 'app.html');
        renderUpdates();
      } catch (err) {
        toast(err.message, 'error');
        setBusy(this, false);
      }
    });
  }

  /* ════════════════════════════════════════════
     TRACKING
     ════════════════════════════════════════════ */

  async function renderTracking() {
    main.innerHTML = loadingBlock('Loading tracking data…');
    var data;
    try {
      data = await api('adminGetTracking');
    } catch (err) {
      main.innerHTML = emptyState('&#9888;&#65039;', 'Could not load tracking', err.message);
      return;
    }

    var html = '<h1 class="page-title">Course Tracking</h1>' +
      '<p class="page-sub">See who has finished each course, and ping those who haven’t.</p>';

    if (!data.courses.length) {
      html += emptyState('&#128202;', 'Nothing to track yet', 'Publish a course first — every published course appears here.');
      main.innerHTML = html;
      return;
    }
    if (!data.employees.length) {
      html += emptyState('&#128101;', 'No employees yet', 'Add employees under the Employees tab; their progress will show up here.');
      main.innerHTML = html;
      return;
    }

    html += '<div class="row mb-16" style="flex-wrap:wrap">' +
      '<div class="field" style="margin:0;min-width:300px"><label>Course</label>' +
      '<select class="select" id="trk-course">' +
      data.courses.map(function (c, i) {
        return '<option value="' + escapeHtml(c.courseId) + '"' + (i === 0 ? ' selected' : '') + '>' +
          escapeHtml(c.title) + (c.status === 'closed' ? ' (closed)' : '') + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="grow"></div>' +
      '<button class="btn" id="trk-ping">&#128276; Ping everyone not done</button>' +
      '</div>' +
      '<div id="trk-table"></div>';

    main.innerHTML = html;

    var select = document.getElementById('trk-course');
    select.addEventListener('change', paintTable);
    document.getElementById('trk-ping').addEventListener('click', function () {
      var course = data.courses.find(function (c) { return c.courseId === select.value; });
      var notDone = data.employees.filter(function (emp) {
        var cell = data.cells[emp.userId + '|' + course.courseId];
        return !(cell && cell.passed);
      });
      if (!notDone.length) { toast('Everyone has completed this course. 🎉', 'success'); return; }
      openSendEmailModal({
        heading: '&#128276; Ping everyone not done',
        to: notDone.map(function (e) { return e.email; }).join(', '),
        subject: '[Magnum CPA Academy] Reminder: please complete "' + course.title + '"',
        body: 'Hi,\n\nFriendly reminder to complete the course "' + course.title +
              '" on Magnum CPA Academy, including its knowledge check.\n\n' +
              'Open the course here: ' + siteUrl('app.html#courses') + '\n\nThank you!'
      });
    });

    function paintTable() {
      var course = data.courses.find(function (c) { return c.courseId === select.value; });
      var doneCount = 0;
      var rows = data.employees.map(function (emp) {
        var cell = data.cells[emp.userId + '|' + course.courseId];
        var chip, detail = '';
        if (cell && cell.passed) {
          doneCount++;
          chip = '<span class="status-chip passed">&#10003; Completed</span>';
          detail = (cell.bestScorePct != null ? cell.bestScorePct + '%' : '') +
                   (cell.passedAt ? ' &middot; ' + fmtDateShort(cell.passedAt) : '');
        } else if (cell && cell.tasksDone > 0) {
          chip = '<span class="status-chip in-progress">In progress</span>';
          detail = cell.tasksDone + '/' + course.taskCount + ' tasks' +
                   (cell.quizAttempts ? ' &middot; ' + cell.quizAttempts + ' quiz attempt' + (cell.quizAttempts === 1 ? '' : 's') +
                     (cell.bestScorePct != null ? ' (best ' + cell.bestScorePct + '%)' : '') : '');
        } else if (cell) {
          chip = '<span class="status-chip registered">Registered</span>';
        } else {
          chip = '<span class="status-chip not-started">Not started</span>';
        }
        return '<tr><td><b>' + escapeHtml(emp.name) + '</b><br><span class="muted small">' + escapeHtml(emp.email) + '</span></td>' +
          '<td>' + chip + '</td><td class="tracking-cell muted">' + detail + '</td>' +
          '<td>' + (!(cell && cell.passed)
            ? '<button class="btn btn-ghost btn-sm" data-ping="' + escapeHtml(emp.email) + '">Ping</button>'
            : '') + '</td></tr>';
      }).join('');

      document.getElementById('trk-table').innerHTML =
        '<div class="mb-8 muted small">' + doneCount + ' of ' + data.employees.length + ' employees completed this course.</div>' +
        '<div class="table-wrap"><table class="table"><thead><tr>' +
        '<th>Employee</th><th>Status</th><th>Details</th><th style="width:90px"></th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';

      document.querySelectorAll('[data-ping]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openSendEmailModal({
            heading: '&#128276; Ping this employee',
            to: btn.dataset.ping,
            subject: '[Magnum CPA Academy] Reminder: please complete "' + course.title + '"',
            body: 'Hi,\n\nFriendly reminder to complete the course "' + course.title +
                  '" on Magnum CPA Academy, including its knowledge check.\n\n' +
                  'Open the course here: ' + siteUrl('app.html#courses') + '\n\nThank you!'
          });
        });
      });
    }
    paintTable();
  }

  /* ════════════════════════════════════════════
     EMPLOYEES
     ════════════════════════════════════════════ */

  async function renderEmployees() {
    main.innerHTML = loadingBlock('Loading employees…');
    var users;
    try {
      users = await api('adminListEmployees');
    } catch (err) {
      main.innerHTML = emptyState('&#9888;&#65039;', 'Could not load employees', err.message);
      return;
    }

    var html =
      '<div class="row-between mb-24">' +
      '  <div><h1 class="page-title">Employees</h1>' +
      '  <p class="page-sub" style="margin-bottom:0">Accounts you create here can sign in to the employee portal.</p></div>' +
      '  <button class="btn" id="btn-new-emp">+ Add employee</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>Name</th><th>Email</th><th>Role</th><th>Status</th><th style="width:320px">Actions</th>' +
      '</tr></thead><tbody>' +
      users.map(function (u) {
        return '<tr>' +
          '<td><b>' + escapeHtml(u.name) + '</b></td>' +
          '<td class="small">' + escapeHtml(u.email) + '</td>' +
          '<td>' + (u.role === 'admin' ? '<span class="badge badge-gold">Admin</span>' : '<span class="badge badge-grey">Employee</span>') + '</td>' +
          '<td>' + (u.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-red">Inactive</span>') + '</td>' +
          '<td>' +
          '  <button class="btn btn-ghost btn-sm" data-eedit="' + escapeHtml(u.userId) + '">Edit</button> ' +
          '  <button class="btn btn-ghost btn-sm" data-ereset="' + escapeHtml(u.userId) + '">Reset password</button> ' +
          '  <button class="btn btn-ghost btn-sm" data-eping="' + escapeHtml(u.userId) + '" title="Email their login details">Ping</button>' +
          '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
    main.innerHTML = html;

    document.getElementById('btn-new-emp').addEventListener('click', function () { openEmployeeEditor(null); });
    main.querySelectorAll('[data-eedit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openEmployeeEditor(users.find(function (u) { return u.userId === btn.dataset.eedit; }));
      });
    });
    main.querySelectorAll('[data-eping]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openNotifyEmployeeModal(users.find(function (u) { return u.userId === btn.dataset.eping; }), '');
      });
    });
    main.querySelectorAll('[data-ereset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var u = users.find(function (x) { return x.userId === btn.dataset.ereset; });
        var overlay = openModal(
          '<h3>Reset password</h3>' +
          '<p class="modal-sub">Set a new temporary password for <b>' + escapeHtml(u.name) + '</b>. They will be asked to change it on next login.</p>' +
          '<div class="field"><label>Temporary password</label>' +
          '<input class="input" id="rp-pw" type="text" placeholder="At least 8 characters"></div>' +
          '<div class="modal-actions">' +
          '  <button class="btn btn-ghost" data-close>Cancel</button>' +
          '  <button class="btn" id="rp-save">Reset</button></div>'
        );
        overlay.querySelector('[data-close]').addEventListener('click', function () { overlay.remove(); });
        overlay.querySelector('#rp-save').addEventListener('click', async function () {
          var newPw = overlay.querySelector('#rp-pw').value;
          setBusy(this, true, 'Resetting…');
          try {
            await api('adminResetPassword', { userId: u.userId, newPassword: newPw });
            overlay.remove();
            toast('Password reset.', 'success');
            openNotifyEmployeeModal(u, newPw);
          } catch (err) { toast(err.message, 'error'); setBusy(this, false); }
        });
      });
    });

    function openEmployeeEditor(u) {
      var overlay = openModal(
        '<h3>' + (u ? 'Edit employee' : 'Add employee') + '</h3>' +
        (u ? '' : '<p class="modal-sub">Share the temporary password with the employee — they will be asked to change it on first login.</p>') +
        '<div class="field"><label>Full name</label>' +
        '<input class="input" id="ee-name" value="' + escapeHtml(u ? u.name : '') + '"></div>' +
        '<div class="field"><label>Email</label>' +
        '<input class="input" id="ee-email" type="email" value="' + escapeHtml(u ? u.email : '') + '"></div>' +
        (u ? '' :
          '<div class="field"><label>Temporary password</label>' +
          '<input class="input" id="ee-pw" type="text" placeholder="At least 8 characters"></div>' +
          '<div class="field"><label>Role</label>' +
          '<select class="select" id="ee-role"><option value="employee" selected>Employee</option><option value="admin">Admin</option></select></div>') +
        (u ? '<label class="check-row mb-16"><input type="checkbox" id="ee-active"' + (u.active ? ' checked' : '') + '> Account is active (can sign in)</label>' : '') +
        '<div class="modal-actions">' +
        '  <button class="btn btn-ghost" data-close>Cancel</button>' +
        '  <button class="btn" id="ee-save">' + (u ? 'Save' : 'Create account') + '</button></div>'
      );
      overlay.querySelector('[data-close]').addEventListener('click', function () { overlay.remove(); });
      overlay.querySelector('#ee-save').addEventListener('click', async function () {
        var payload = {
          userId: u ? u.userId : undefined,
          name: overlay.querySelector('#ee-name').value,
          email: overlay.querySelector('#ee-email').value
        };
        if (!u) {
          payload.password = overlay.querySelector('#ee-pw').value;
          payload.role = overlay.querySelector('#ee-role').value;
        } else {
          payload.active = overlay.querySelector('#ee-active').checked;
        }
        setBusy(this, true, 'Saving…');
        try {
          await api('adminSaveEmployee', payload);
          invalidateCache();
          overlay.remove();
          toast(u ? 'Employee updated.' : 'Employee account created.', 'success');
          if (!u) {
            openNotifyEmployeeModal({ name: payload.name, email: payload.email }, payload.password);
          }
          renderEmployees();
        } catch (err) { toast(err.message, 'error'); setBusy(this, false); }
      });
    }
  }

  /**
   * Notifies an employee of their login details by email. Passwords are
   * never stored in plain text, so if one isn't already known (the
   * standalone Ping button) this asks for it first, then opens the
   * regular send/review modal with it filled in.
   */
  function openNotifyEmployeeModal(user, defaultPassword) {
    if (defaultPassword) { showCompose(defaultPassword); return; }

    var overlay = openModal(
      '<h3>Notify ' + escapeHtml(user.name) + '</h3>' +
      '<p class="modal-sub">Enter the temporary password to include, then review the email before sending.</p>' +
      '<div class="field"><label>Temporary password</label>' +
      '<input class="input" id="ne-pw" type="text" placeholder="Paste the temporary password"></div>' +
      '<div class="modal-actions">' +
      '  <button class="btn btn-ghost" data-close>Cancel</button>' +
      '  <button class="btn" id="ne-next">Continue</button>' +
      '</div>'
    );
    overlay.querySelector('[data-close]').addEventListener('click', function () { overlay.remove(); });
    overlay.querySelector('#ne-next').addEventListener('click', function () {
      var pw = overlay.querySelector('#ne-pw').value.trim();
      if (!pw) { toast('Enter the temporary password to include it in the email.', 'error'); return; }
      overlay.remove();
      showCompose(pw);
    });

    function showCompose(pw) {
      openSendEmailModal({
        heading: '&#128231; Notify ' + escapeHtml(user.name),
        to: user.email,
        subject: 'Your Magnum CPA Academy account',
        body: 'Hi ' + user.name + ',\n\n' +
              'An account has been created for you on Magnum CPA Academy.\n\n' +
              'Login page: ' + siteUrl('index.html') + '\n' +
              'Email: ' + user.email + '\n' +
              'Temporary password: ' + pw + '\n\n' +
              'You will be asked to set your own password the first time you sign in.\n\n' +
              'Thank you!'
      });
    }
  }

  /* ════════════════════════════════════════════
     LINKS
     ════════════════════════════════════════════ */

  var linksDraft = null;

  async function renderLinks() {
    main.innerHTML = loadingBlock('Loading links…');
    try {
      var boot = await api('getBootstrap');
      linksDraft = (boot.links || []).map(function (l) {
        return { linkId: l.linkId, label: l.label, url: l.url, description: l.description };
      });
      paintLinks();
    } catch (err) {
      main.innerHTML = emptyState('&#9888;&#65039;', 'Could not load links', err.message);
    }
  }

  function paintLinks() {
    main.innerHTML =
      '<div class="row-between mb-24">' +
      '  <div><h1 class="page-title">Links</h1>' +
      '  <p class="page-sub" style="margin-bottom:0">Shared resources shown in the employees’ Links tab.</p></div>' +
      '  <div class="row"><button class="btn btn-ghost" id="lk-add">+ Add link</button>' +
      '  <button class="btn" id="lk-save">Save all</button></div>' +
      '</div>' +
      '<div id="lk-list">' +
      (linksDraft.length ? linksDraft.map(function (l, i) {
        return '<div class="builder-item" data-link="' + i + '">' +
          '<div class="builder-item-head"><span class="num">' + (i + 1) + '</span><h4></h4>' +
          '<button class="icon-btn" data-lmove="up"' + (i === 0 ? ' disabled' : '') + ' title="Move up">&#9650;</button>' +
          '<button class="icon-btn" data-lmove="down" title="Move down">&#9660;</button>' +
          '<button class="icon-btn danger" data-ldel title="Remove">&#128465;</button></div>' +
          '<div class="row" style="flex-wrap:wrap;align-items:flex-start">' +
          '<div class="field grow" style="min-width:200px"><label>Label</label>' +
          '<input class="input" data-lfield="label" value="' + escapeHtml(l.label) + '"></div>' +
          '<div class="field grow" style="min-width:260px"><label>URL</label>' +
          '<input class="input" data-lfield="url" placeholder="https://…" value="' + escapeHtml(l.url) + '"></div>' +
          '</div>' +
          '<div class="field" style="margin:0"><label>Description (optional)</label>' +
          '<input class="input" data-lfield="description" value="' + escapeHtml(l.description || '') + '"></div>' +
          '</div>';
      }).join('') : emptyState('&#128279;', 'No links yet', 'Add links to the tools and resources your team uses daily.')) +
      '</div>';

    document.getElementById('lk-add').addEventListener('click', function () {
      collectLinks();
      linksDraft.push({ linkId: '', label: '', url: '', description: '' });
      paintLinks();
    });
    document.getElementById('lk-save').addEventListener('click', async function () {
      collectLinks();
      setBusy(this, true, 'Saving…');
      try {
        await api('adminSaveLinks', { links: linksDraft });
        invalidateCache();
        toast('Links saved.', 'success');
        renderLinks();
      } catch (err) { toast(err.message, 'error'); setBusy(this, false); }
    });
    main.querySelectorAll('[data-ldel]').forEach(function (btn, idx) {
      btn.addEventListener('click', function () {
        collectLinks();
        linksDraft.splice(idx, 1);
        paintLinks();
      });
    });
    main.querySelectorAll('.builder-item[data-link]').forEach(function (item, i) {
      item.querySelectorAll('[data-lmove]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          collectLinks();
          var j = btn.dataset.lmove === 'up' ? i - 1 : i + 1;
          if (j < 0 || j >= linksDraft.length) return;
          var tmp = linksDraft[i]; linksDraft[i] = linksDraft[j]; linksDraft[j] = tmp;
          paintLinks();
        });
      });
    });
  }

  function collectLinks() {
    main.querySelectorAll('.builder-item[data-link]').forEach(function (item, i) {
      var l = linksDraft[i];
      if (!l) return;
      l.label = item.querySelector('[data-lfield="label"]').value.trim();
      l.url = item.querySelector('[data-lfield="url"]').value.trim();
      l.description = item.querySelector('[data-lfield="description"]').value.trim();
    });
  }

  /* ════════════════════════════════════════════
     SETTINGS
     ════════════════════════════════════════════ */

  async function renderSettings() {
    main.innerHTML = loadingBlock('Loading settings…');
    var s;
    try {
      s = await getSettings(true);
    } catch (err) {
      main.innerHTML = emptyState('&#9888;&#65039;', 'Could not load settings', err.message);
      return;
    }

    main.innerHTML =
      '<h1 class="page-title">Settings</h1>' +
      '<p class="page-sub">Notification recipients and platform defaults.</p>' +

      '<div class="card mb-16">' +
      '  <h3 class="mb-16">&#128231; Email notifications</h3>' +
      '  <div class="field"><label>Team email (To)</label>' +
      '    <input class="input" id="st-team" type="text" placeholder="team@magnumcpa.com" value="' + escapeHtml(s.teamEmail || '') + '">' +
      '    <div class="hint">Used as the To: address when you notify the team about new courses and updates.</div></div>' +
      '  <div class="field"><label>CC list</label>' +
      '    <input class="input" id="st-cc" type="text" placeholder="manager@magnumcpa.com, hr@magnumcpa.com" value="' + escapeHtml(s.ccList || '') + '">' +
      '    <div class="hint">Optional. Separate multiple addresses with commas.</div></div>' +
      '</div>' +

      '<div class="card mb-16">' +
      '  <h3 class="mb-16">&#9989; Completion notifications (Google Form)</h3>' +
      '  <p class="small muted mb-16">When an employee passes a knowledge check, the platform automatically submits a response to your “Course Completion” Google Form — enable email notifications on that form to get alerted. ' +
      'Create a form with fields for name, email, course, score and date; open <b>&#8942; &rarr; Get pre-filled link</b>; fill the fields with the tokens ' +
      '<code>{{name}}</code> <code>{{email}}</code> <code>{{course}}</code> <code>{{score}}</code> <code>{{date}}</code>; click “Copy link” and paste it below.</p>' +
      '  <div class="field" style="margin:0"><label>Pre-filled completion form link</label>' +
      '    <input class="input" id="st-form" type="text" placeholder="https://docs.google.com/forms/d/e/…/viewform?usp=pp_url&entry.123={{name}}&…" value="' + escapeHtml(s.completionFormUrl || '') + '">' +
      '    <div class="hint">Leave empty to skip form notifications — the Tracking tab always shows completions either way.</div></div>' +
      '</div>' +

      '<div class="card mb-16">' +
      '  <h3 class="mb-16">&#9881;&#65039; Platform defaults</h3>' +
      '  <div class="row" style="flex-wrap:wrap;align-items:flex-start">' +
      '  <div class="field grow" style="min-width:220px"><label>Firm name</label>' +
      '    <input class="input" id="st-firm" value="' + escapeHtml(s.firmName || 'Magnum CPA Academy') + '"></div>' +
      '  <div class="field" style="width:200px"><label>Default pass score (%)</label>' +
      '    <input class="input" id="st-threshold" type="number" min="50" max="100" value="' + escapeHtml(s.defaultPassThreshold || '85') + '"></div>' +
      '  <div class="field" style="width:200px"><label>Login session (hours)</label>' +
      '    <input class="input" id="st-session" type="number" min="1" max="72" value="' + escapeHtml(s.sessionHours || '12') + '"></div>' +
      '  </div>' +
      '</div>' +

      '<div class="row" style="justify-content:flex-end">' +
      '  <button class="btn" id="st-save">Save settings</button>' +
      '</div>';

    document.getElementById('st-save').addEventListener('click', async function () {
      setBusy(this, true, 'Saving…');
      try {
        settingsCache = await api('adminSaveSettings', {
          teamEmail: document.getElementById('st-team').value.trim(),
          ccList: document.getElementById('st-cc').value.trim(),
          completionFormUrl: document.getElementById('st-form').value.trim(),
          firmName: document.getElementById('st-firm').value.trim(),
          defaultPassThreshold: document.getElementById('st-threshold').value,
          sessionHours: document.getElementById('st-session').value
        });
        toast('Settings saved.', 'success');
        setBusy(this, false);
      } catch (err) {
        toast(err.message, 'error');
        setBusy(this, false);
      }
    });
  }
})();
