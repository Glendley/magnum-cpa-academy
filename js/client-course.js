/* ============================================================
   Magnum CPA Academy — client course viewer
   ------------------------------------------------------------
   Simple and sequential: video + lesson content per part, freely
   navigable (no locking, no progress tracking, no knowledge check,
   no certificate). Reuses mountVideo/clearGate from videogate.js.
   ============================================================ */

(function () {
  var user = requireLogin();
  if (!user) return;

  applyWatermark(user.name);

  var shell = document.getElementById('player-shell');
  var courseId = qsParam('id');
  if (!courseId) { window.location.href = 'client.html#courses'; return; }

  var course = null; // { meta, tasks }
  var currentIndex = 0;

  load();

  async function load() {
    try {
      course = await api('clientGetCourse', { courseId: courseId });
    } catch (err) {
      shell.innerHTML = '<div style="margin:auto;max-width:460px">' +
        emptyState('&#128683;', 'Course unavailable', err.message) +
        '<div style="text-align:center;margin-top:16px"><a class="btn btn-ghost" href="client.html#courses">&larr; Back to courses</a></div></div>';
      return;
    }
    document.title = course.meta.title + ' — Magnum CPA Academy';
    renderPlayer();
  }

  function renderPlayer() {
    clearGate();
    shell.innerHTML =
      '<aside class="player-sidebar">' +
      '  <button class="player-back" id="player-back">&larr; Back to Courses</button>' +
      '  <div class="progress-panel">' +
      '    <div class="progress-text">' +
      '      <div class="pt-title">' + escapeHtml(course.meta.title) + '</div>' +
      '      <div class="pt-sub">' + course.tasks.length + ' part' + (course.tasks.length === 1 ? '' : 's') + '</div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="task-list">' +
      course.tasks.map(function (t, i) {
        return '<button class="task-item' + (currentIndex === i ? ' active' : '') + '" data-task="' + i + '">' +
          '<span class="task-num">' + (i + 1) + '</span>' +
          '<span class="task-title-text">' + escapeHtml(t.title) + '</span>' +
          '</button>';
      }).join('') +
      '  </div>' +
      '</aside>' +
      '<main class="player-main" id="player-main"></main>';

    document.getElementById('player-back').addEventListener('click', function () {
      window.location.href = 'client.html#courses';
    });
    shell.querySelectorAll('[data-task]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentIndex = Number(btn.dataset.task);
        renderTask();
      });
    });

    renderTask();
  }

  function renderTask() {
    var t = course.tasks[currentIndex];
    var pmain = document.getElementById('player-main');
    var isFirst = currentIndex === 0;
    var isLast = currentIndex === course.tasks.length - 1;

    shell.querySelectorAll('.task-item').forEach(function (btn, i) {
      btn.classList.toggle('active', i === currentIndex);
    });

    pmain.innerHTML =
      '<div class="muted small mb-8">Part ' + (currentIndex + 1) + ' of ' + course.tasks.length + '</div>' +
      '<h1 class="page-title mb-16">' + escapeHtml(t.title) + '</h1>' +
      '<div id="video-area"></div>' +
      '<div class="subtask-panel">' +
      '  <div class="subtask-head">Overview</div>' +
      '  <div class="card"><div class="rich-content">' +
      (t.contentHtml || '<p class="muted">No additional content for this part.</p>') +
      '  </div></div>' +
      '  <div class="row mt-16" style="justify-content:space-between">' +
      '    <button class="btn btn-ghost" id="btn-prev"' + (isFirst ? ' disabled' : '') + '>&larr; Previous</button>' +
      '    <button class="btn" id="btn-next"' + (isLast ? ' disabled' : '') + '>' + (isLast ? 'Last part' : 'Next &rarr;') + '</button>' +
      '  </div>' +
      '</div>';

    if (t.video && t.video.embed) {
      document.getElementById('video-area').innerHTML = '<div class="video-shell" id="video-shell"></div>';
      mountVideo(t.video, function () {}); // free navigation — no completion gate
    }

    var prevBtn = document.getElementById('btn-prev');
    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (currentIndex > 0) { currentIndex--; renderTask(); }
    });
    var nextBtn = document.getElementById('btn-next');
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (currentIndex < course.tasks.length - 1) { currentIndex++; renderTask(); }
    });
  }
})();
