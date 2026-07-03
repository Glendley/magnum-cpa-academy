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

    if (tab === 'courses' && parts[1] === 'edit') return renderCourseBuilder(parts[2] === 'new' ? null : parts[2]);
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
    var overlay = openModal(
      '<h3>&#128227; Notify the team?</h3>' +
      '<p class="modal-sub">This opens your mail app with a pre-filled email' +
      (settings.teamEmail ? ' to <b>' + escapeHtml(settings.teamEmail) + '</b>' : '') +
      (settings.ccList ? ' (CC: ' + escapeHtml(settings.ccList) + ')' : '') +
      '. You press Send.</p>' +
      (!settings.teamEmail
        ? '<p class="modal-sub" style="color:#f0968c">No team email is configured yet — set it under Settings first, or type recipients in your mail app.</p>'
        : '') +
      '<div class="modal-actions">' +
      '  <button class="btn btn-ghost" data-close>Later</button>' +
      '  <button class="btn" id="notify-go">Open email</button>' +
      '</div>'
    );
    overlay.querySelector('[data-close]').addEventListener('click', function () { overlay.remove(); });
    overlay.querySelector('#notify-go').addEventListener('click', function () {
      openMailto({
        to: settings.teamEmail || '',
        cc: settings.ccList || '',
        subject: '[Magnum CPA Academy] New ' + kind + ': ' + title,
        body: 'Hi team,\n\nA new ' + kind + ' is now available on Magnum CPA Academy:\n\n' +
              title + (summary ? '\n' + summary : '') +
              '\n\nOpen it here: ' + siteUrl(page) +
              '\n\nThank you!'
      });
      overlay.remove();
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
      '  <p class="page-sub" style="margin-bottom:0">Create, publish, close and manage training courses.</p></div>' +
      '  <button class="btn" id="btn-new-course">+ New course</button>' +
      '</div>';

    if (!courses.length) {
      html += emptyState('&#127891;', 'No courses yet', 'Click “New course” to build your first training course.');
    } else {
      html += '<div class="table-wrap"><table class="table"><thead><tr>' +
        '<th>Course</th><th>Status</th><th>Tasks</th><th>Questions</th><th>Registration form</th><th style="width:340px">Actions</th>' +
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

    document.getElementById('btn-new-course').addEventListener('click', function () {
      window.location.hash = 'courses/edit/new';
    });

    main.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var id = btn.dataset.id;
        var course = courses.find(function (c) { return c.courseId === id; });
        var act = btn.dataset.act;

        if (act === 'edit') { window.location.hash = 'courses/edit/' + id; return; }

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
     COURSES — builder
     ════════════════════════════════════════════ */

  var builder = null; // { courseId, title, description, registrationFormUrl, passThresholdPct, status, tasks[], quiz[] }

  async function renderCourseBuilder(courseId) {
    main.innerHTML = loadingBlock('Loading course builder…');
    try {
      if (courseId) {
        var full = await api('adminGetCourseFull', { courseId: courseId });
        builder = {
          courseId: courseId,
          title: full.meta.title, description: full.meta.description,
          registrationFormUrl: full.meta.registrationFormUrl,
          passThresholdPct: full.meta.passThresholdPct, status: full.meta.status,
          tasks: full.tasks.map(function (t) {
            return { taskId: t.taskId, title: t.title, videoUrl: t.video ? t.video.src : '',
                     durationSec: t.video && t.video.durationSec ? t.video.durationSec : 0,
                     contentHtml: t.contentHtml };
          }),
          quiz: full.quiz
        };
      } else {
        var settings = await getSettings();
        builder = {
          courseId: null, title: '', description: '', registrationFormUrl: '',
          passThresholdPct: Number(settings.defaultPassThreshold) || 85,
          status: 'draft', tasks: [], quiz: []
        };
      }
      paintBuilder();
    } catch (err) {
      main.innerHTML = emptyState('&#9888;&#65039;', 'Could not open the builder', err.message);
    }
  }

  function quizCountPill() {
    var n = builder.quiz.length;
    var cls = n >= 10 && n <= 15 ? 'ok' : (n === 0 ? '' : 'bad');
    return '<span class="quiz-count-pill ' + cls + '">' + n + ' / 10–15 questions</span>';
  }

  function paintBuilder() {
    var b = builder;
    main.innerHTML =
      '<button class="btn btn-ghost btn-sm mb-16" id="builder-back">&larr; All courses</button>' +
      '<div class="row-between mb-16">' +
      '  <h1 class="page-title" style="margin:0">' + (b.courseId ? 'Edit course' : 'New course') + '</h1>' +
      '  <div>' + statusBadge(b.status) + '</div>' +
      '</div>' +

      '<div class="card mb-16">' +
      '  <div class="field"><label>Course title</label>' +
      '    <input class="input" id="cb-title" maxlength="120" placeholder="e.g. Professional Communication Skills" value="' + escapeHtml(b.title) + '"></div>' +
      '  <div class="field"><label>Description</label>' +
      '    <textarea class="textarea" id="cb-desc" rows="2" placeholder="Short description employees see in the catalog">' + escapeHtml(b.description) + '</textarea></div>' +
      '  <div class="row" style="align-items:flex-start;flex-wrap:wrap">' +
      '    <div class="field grow" style="min-width:280px"><label>Registration Google Form URL</label>' +
      '      <input class="input" id="cb-form" placeholder="https://docs.google.com/forms/…" value="' + escapeHtml(b.registrationFormUrl) + '">' +
      '      <div class="hint">Employees must submit this form before starting the course.</div></div>' +
      '    <div class="field" style="width:170px"><label>Pass score (%)</label>' +
      '      <input class="input" id="cb-threshold" type="number" min="50" max="100" value="' + escapeHtml(b.passThresholdPct) + '">' +
      '      <div class="hint">Default 85%</div></div>' +
      '  </div>' +
      '</div>' +

      '<div class="row-between mb-8"><h2 style="font-size:1.1rem">Tasks</h2>' +
      '<button class="btn btn-sm" id="cb-add-task">+ Add task</button></div>' +
      '<p class="muted small mb-16">Each task starts with a short video; after watching, the employee clicks “Next” and reads the subtask presentation. Tasks unlock in order.</p>' +
      '<div id="cb-tasks">' + (b.tasks.length ? b.tasks.map(taskEditorHtml).join('') :
        '<div class="empty-state" style="padding:26px"><p>No tasks yet — add the first one.</p></div>') + '</div>' +

      '<div class="row-between mb-8 mt-24"><h2 style="font-size:1.1rem">Knowledge check</h2>' +
      '<div class="row">' + quizCountPill() +
      '<button class="btn btn-sm" id="cb-add-q">+ Add question</button></div></div>' +
      '<p class="muted small mb-16">10–15 multiple-choice questions. Select the radio button next to the correct answer. Employees must score at least the pass score to earn their certificate. Correct answers are never sent to the employee’s browser.</p>' +
      '<div id="cb-quiz">' + (b.quiz.length ? b.quiz.map(questionEditorHtml).join('') :
        '<div class="empty-state" style="padding:26px"><p>No questions yet.</p></div>') + '</div>' +

      '<div class="row mt-24" style="justify-content:flex-end;gap:10px">' +
      '  <button class="btn btn-ghost" id="cb-save">' + (b.status === 'open' ? 'Save changes' : 'Save draft') + '</button>' +
      (b.status !== 'open' ? '<button class="btn btn-green" id="cb-publish">Save &amp; publish</button>' : '') +
      '</div>';

    document.getElementById('builder-back').addEventListener('click', function () {
      window.location.hash = 'courses';
    });
    document.getElementById('cb-add-task').addEventListener('click', function () {
      collectBuilderInputs();
      builder.tasks.push({ taskId: '', title: '', videoUrl: '', durationSec: 0, contentHtml: '' });
      paintBuilder();
      var items = main.querySelectorAll('#cb-tasks .builder-item');
      if (items.length) items[items.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.getElementById('cb-add-q').addEventListener('click', function () {
      collectBuilderInputs();
      builder.quiz.push({ qId: '', text: '', choices: ['', '', '', ''], correctIndex: -1 });
      paintBuilder();
      var items = main.querySelectorAll('#cb-quiz .builder-item');
      if (items.length) items[items.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.getElementById('cb-save').addEventListener('click', function () { saveCourse(this, null); });
    var pub = document.getElementById('cb-publish');
    if (pub) pub.addEventListener('click', function () { saveCourse(this, 'open'); });

    wireBuilderEvents();
  }

  function taskEditorHtml(t, i) {
    var video = parseVideo(t.videoUrl);
    var videoHint = !t.videoUrl ? 'Paste a Google Drive share link, YouTube link, or direct .mp4 URL.'
      : video ? (video.type === 'drive'
          ? '&#9989; Google Drive video detected — make sure sharing is “Anyone with the link”. Enter the video length below.'
          : video.type === 'youtube' ? '&#9989; YouTube video detected.' : '&#9989; Direct video file detected.')
      : '&#10060; This link is not recognized as a video. Use Google Drive, YouTube or a direct .mp4 URL.';
    return '<div class="builder-item" data-task="' + i + '">' +
      '<div class="builder-item-head"><span class="num">' + (i + 1) + '</span>' +
      '<h4>Task ' + (i + 1) + '</h4>' +
      '<button class="icon-btn" data-tmove="up" title="Move up"' + (i === 0 ? ' disabled' : '') + '>&#9650;</button>' +
      '<button class="icon-btn" data-tmove="down" title="Move down">&#9660;</button>' +
      '<button class="icon-btn danger" data-tdel title="Remove task">&#128465;</button></div>' +
      '<div class="field"><label>Task title</label>' +
      '<input class="input" data-tfield="title" maxlength="120" placeholder="e.g. Professional Email" value="' + escapeHtml(t.title) + '"></div>' +
      '<div class="row" style="align-items:flex-start;flex-wrap:wrap">' +
      '  <div class="field grow" style="min-width:280px"><label>Video link</label>' +
      '    <input class="input" data-tfield="videoUrl" placeholder="https://drive.google.com/file/d/… or https://youtu.be/…" value="' + escapeHtml(t.videoUrl) + '">' +
      '    <div class="hint">' + videoHint + '</div></div>' +
      '  <div class="field" style="width:190px"><label>Video length (minutes)</label>' +
      '    <input class="input" data-tfield="durationMin" type="number" min="0" step="0.5" value="' + (t.durationSec ? (Math.round(t.durationSec / 6) / 10) : '') + '">' +
      '    <div class="hint">Required for Google Drive videos</div></div>' +
      '</div>' +
      '<div class="field" style="margin-bottom:0"><label>Subtask — presentation / context (shown after the video)</label>' +
      '<textarea class="textarea" data-tfield="contentHtml" rows="5" placeholder="Write the lesson content. Plain text works; HTML (<h2>, <ul>, <img>, …) is also supported.">' + escapeHtml(t.contentHtml) + '</textarea></div>' +
      '</div>';
  }

  function questionEditorHtml(q, i) {
    return '<div class="builder-item" data-q="' + i + '">' +
      '<div class="builder-item-head"><span class="num">' + (i + 1) + '</span>' +
      '<h4>Question ' + (i + 1) + '</h4>' +
      '<button class="icon-btn danger" data-qdel title="Remove question">&#128465;</button></div>' +
      '<div class="field"><label>Question</label>' +
      '<input class="input" data-qfield="text" placeholder="Type the question" value="' + escapeHtml(q.text) + '"></div>' +
      '<label class="small muted" style="display:block;margin-bottom:8px">Choices — select the correct one:</label>' +
      q.choices.map(function (choice, ci) {
        return '<div class="choice-row">' +
          '<input type="radio" name="correct-' + i + '" data-qcorrect="' + ci + '"' + (Number(q.correctIndex) === ci ? ' checked' : '') + ' title="Mark as correct answer">' +
          '<input class="input" data-qchoice="' + ci + '" placeholder="Choice ' + (ci + 1) + '" value="' + escapeHtml(choice) + '">' +
          (q.choices.length > 2 ? '<button class="icon-btn danger" data-qchoicedel="' + ci + '" title="Remove choice">&times;</button>' : '') +
          '</div>';
      }).join('') +
      (q.choices.length < 6 ? '<button class="btn btn-ghost btn-sm mt-8" data-qaddchoice>+ Add choice</button>' : '') +
      '</div>';
  }

  /** Reads all builder inputs back into the state object. */
  function collectBuilderInputs() {
    var b = builder;
    var get = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
    b.title = get('cb-title').trim();
    b.description = get('cb-desc').trim();
    b.registrationFormUrl = get('cb-form').trim();
    b.passThresholdPct = Number(get('cb-threshold')) || 85;

    main.querySelectorAll('#cb-tasks .builder-item').forEach(function (item, i) {
      var t = b.tasks[i];
      if (!t) return;
      t.title = item.querySelector('[data-tfield="title"]').value.trim();
      t.videoUrl = item.querySelector('[data-tfield="videoUrl"]').value.trim();
      var min = parseFloat(item.querySelector('[data-tfield="durationMin"]').value);
      t.durationSec = isNaN(min) ? 0 : Math.round(min * 60);
      t.contentHtml = item.querySelector('[data-tfield="contentHtml"]').value;
    });
    main.querySelectorAll('#cb-quiz .builder-item').forEach(function (item, i) {
      var q = b.quiz[i];
      if (!q) return;
      q.text = item.querySelector('[data-qfield="text"]').value.trim();
      q.choices = Array.prototype.map.call(item.querySelectorAll('[data-qchoice]'), function (inp) {
        return inp.value;
      });
      var checked = item.querySelector('[data-qcorrect]:checked');
      q.correctIndex = checked ? Number(checked.dataset.qcorrect) : -1;
    });
  }

  function wireBuilderEvents() {
    main.querySelectorAll('#cb-tasks .builder-item').forEach(function (item, i) {
      item.querySelector('[data-tdel]').addEventListener('click', function () {
        if (!confirm('Remove task ' + (i + 1) + '?')) return;
        collectBuilderInputs();
        builder.tasks.splice(i, 1);
        paintBuilder();
      });
      item.querySelectorAll('[data-tmove]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          collectBuilderInputs();
          var j = btn.dataset.tmove === 'up' ? i - 1 : i + 1;
          if (j < 0 || j >= builder.tasks.length) return;
          var tmp = builder.tasks[i];
          builder.tasks[i] = builder.tasks[j];
          builder.tasks[j] = tmp;
          paintBuilder();
        });
      });
      // refresh the video hint when the link changes
      item.querySelector('[data-tfield="videoUrl"]').addEventListener('change', function () {
        collectBuilderInputs();
        paintBuilder();
      });
    });

    main.querySelectorAll('#cb-quiz .builder-item').forEach(function (item, i) {
      item.querySelector('[data-qdel]').addEventListener('click', function () {
        if (!confirm('Remove question ' + (i + 1) + '?')) return;
        collectBuilderInputs();
        builder.quiz.splice(i, 1);
        paintBuilder();
      });
      var addChoice = item.querySelector('[data-qaddchoice]');
      if (addChoice) addChoice.addEventListener('click', function () {
        collectBuilderInputs();
        builder.quiz[i].choices.push('');
        paintBuilder();
      });
      item.querySelectorAll('[data-qchoicedel]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          collectBuilderInputs();
          var ci = Number(btn.dataset.qchoicedel);
          var q = builder.quiz[i];
          q.choices.splice(ci, 1);
          if (q.correctIndex === ci) q.correctIndex = -1;
          else if (q.correctIndex > ci) q.correctIndex -= 1;
          paintBuilder();
        });
      });
    });
  }

  async function saveCourse(btn, publishStatus) {
    collectBuilderInputs();
    var b = builder;
    if (!b.title) { toast('Enter a course title.', 'error'); return; }

    // client-side validation mirrors the server so errors are friendly
    for (var i = 0; i < b.tasks.length; i++) {
      var t = b.tasks[i];
      if (t.videoUrl && !parseVideo(t.videoUrl)) {
        toast('Task ' + (i + 1) + ': the video link is not recognized.', 'error');
        return;
      }
      var v = parseVideo(t.videoUrl);
      if (v && v.type === 'drive' && !t.durationSec && (publishStatus === 'open' || b.status === 'open')) {
        toast('Task ' + (i + 1) + ': enter the video length (needed for Google Drive videos).', 'error');
        return;
      }
    }

    var status = publishStatus || b.status || 'draft';
    var payload = {
      course: {
        courseId: b.courseId, title: b.title, description: b.description,
        registrationFormUrl: b.registrationFormUrl, passThresholdPct: b.passThresholdPct,
        status: status,
        tasks: b.tasks.map(function (t) {
          var video = parseVideo(t.videoUrl);
          if (video) video.durationSec = t.durationSec || 0;
          return { taskId: t.taskId || undefined, title: t.title, video: video,
                   contentHtml: textToHtml(t.contentHtml) };
        }),
        quiz: b.quiz.map(function (q) {
          return { qId: q.qId || undefined, text: q.text,
                   choices: q.choices.filter(function (c) { return String(c).trim() !== ''; }),
                   correctIndex: q.correctIndex };
        })
      }
    };

    setBusy(btn, true, 'Saving…');
    try {
      var res = await api('adminSaveCourse', payload);
      builder.courseId = res.courseId;
      builder.status = status;
      invalidateCache();
      toast(publishStatus === 'open' ? 'Course published!' : 'Course saved.', 'success');
      if (publishStatus === 'open') {
        await notifyPrompt('course', b.title, b.description, 'app.html#courses');
      }
      window.location.hash = 'courses';
    } catch (err) {
      toast(err.message, 'error');
      setBusy(btn, false);
    }
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
      openMailto({
        to: notDone.map(function (e) { return e.email; }),
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
          openMailto({
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
      '<th>Name</th><th>Email</th><th>Role</th><th>Status</th><th style="width:250px">Actions</th>' +
      '</tr></thead><tbody>' +
      users.map(function (u) {
        return '<tr>' +
          '<td><b>' + escapeHtml(u.name) + '</b></td>' +
          '<td class="small">' + escapeHtml(u.email) + '</td>' +
          '<td>' + (u.role === 'admin' ? '<span class="badge badge-gold">Admin</span>' : '<span class="badge badge-grey">Employee</span>') + '</td>' +
          '<td>' + (u.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-red">Inactive</span>') + '</td>' +
          '<td>' +
          '  <button class="btn btn-ghost btn-sm" data-eedit="' + escapeHtml(u.userId) + '">Edit</button> ' +
          '  <button class="btn btn-ghost btn-sm" data-ereset="' + escapeHtml(u.userId) + '">Reset password</button>' +
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
          setBusy(this, true, 'Resetting…');
          try {
            await api('adminResetPassword', { userId: u.userId, newPassword: overlay.querySelector('#rp-pw').value });
            overlay.remove();
            toast('Password reset. Share the temporary password with ' + u.name + '.', 'success');
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
          renderEmployees();
        } catch (err) { toast(err.message, 'error'); setBusy(this, false); }
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
