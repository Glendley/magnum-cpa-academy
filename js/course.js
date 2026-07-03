/* ============================================================
   Magnum CPA Academy — course player
   ------------------------------------------------------------
   Registration gate (Google Form + certificate name)
   → task player (video gate → Next → subtask content → complete)
   → knowledge check (10–15 questions, pass ≥ threshold)
   → certificate.
   ============================================================ */

(function () {
  var user = requireLogin();
  if (!user) return;

  var shell = document.getElementById('player-shell');
  var courseId = qsParam('id');
  if (!courseId) { window.location.href = 'app.html#courses'; return; }

  var course = null;        // { meta, tasks, quizMeta, myProgress }
  var completed = [];       // completed task ids
  var currentView = null;   // task index (number) or 'quiz'
  var gateTimer = null;     // countdown interval for Drive videos
  var ytPlayer = null;

  load();

  async function load() {
    try {
      course = await api('getCourse', { courseId: courseId });
    } catch (err) {
      shell.innerHTML = '<div style="margin:auto;max-width:460px">' +
        emptyState('&#128683;', 'Course unavailable', err.message) +
        '<div style="text-align:center;margin-top:16px"><a class="btn btn-ghost" href="app.html#courses">&larr; Back to courses</a></div></div>';
      return;
    }
    document.title = course.meta.title + ' — Magnum CPA Academy';

    if (!course.myProgress) {
      renderRegistrationGate();
      return;
    }
    completed = course.myProgress.completedTaskIds || [];
    currentView = firstOpenView();
    renderPlayer();
  }

  function firstOpenView() {
    for (var i = 0; i < course.tasks.length; i++) {
      if (completed.indexOf(course.tasks[i].taskId) === -1) return i;
    }
    return 'quiz';
  }

  function allTasksDone() {
    return course.tasks.every(function (t) { return completed.indexOf(t.taskId) !== -1; });
  }

  /* ════════════════════════════════════════════
     REGISTRATION GATE
     ════════════════════════════════════════════ */

  function renderRegistrationGate() {
    var hasForm = !!course.meta.registrationFormUrl;
    shell.innerHTML =
      '<div class="register-gate grow" style="padding:0 20px 60px">' +
      '  <a class="btn btn-ghost btn-sm mb-16" href="app.html#courses">&larr; Back to courses</a>' +
      '  <div class="card">' +
      '    <span class="badge badge-blue mb-8" style="margin-bottom:12px">Registration required</span>' +
      '    <h1 class="page-title">' + escapeHtml(course.meta.title) + '</h1>' +
      '    <p class="page-sub">' + escapeHtml(course.meta.description || '') + '</p>' +
      '    <hr class="divider">' +
      (hasForm
        ? '<div class="gate-step"><div class="gs-num">1</div><div class="grow">' +
          '  <h4>Register via Google Form</h4>' +
          '  <p>Open the registration form and submit it. It opens in a new tab — come back here afterwards.</p>' +
          '  <a class="btn btn-sm mt-8" href="' + escapeHtml(course.meta.registrationFormUrl) + '" target="_blank" rel="noopener noreferrer" id="reg-form-btn">Open registration form &#8599;</a>' +
          '</div></div>' +
          '<div class="gate-step"><div class="gs-num">2</div><div class="grow">' +
          '  <h4>Confirm your registration</h4>' +
          '  <label class="check-row mt-8"><input type="checkbox" id="reg-confirm"> I have submitted the registration form</label>' +
          '</div></div>' +
          '<div class="gate-step"><div class="gs-num">3</div><div class="grow">'
        : '<div class="gate-step"><div class="gs-num">1</div><div class="grow">') +
      '  <h4>Name on your certificate</h4>' +
      '  <p>Exactly as it should appear on your certificate after you pass the knowledge check.</p>' +
      '  <input class="input mt-8" id="reg-certname" maxlength="80" placeholder="e.g. Juan D. Cruz" value="' + escapeHtml(user.name || '') + '">' +
      '</div></div>' +
      '    <button class="btn btn-lg btn-block mt-16" id="reg-start">Start course</button>' +
      '  </div>' +
      '</div>';

    document.getElementById('reg-start').addEventListener('click', async function () {
      if (hasForm && !document.getElementById('reg-confirm').checked) {
        toast('Please submit the registration form first, then tick the confirmation box.', 'error');
        return;
      }
      var certName = document.getElementById('reg-certname').value.trim();
      if (!certName) { toast('Enter the name for your certificate.', 'error'); return; }
      setBusy(this, true, 'Registering…');
      try {
        await api('registerCourse', { courseId: courseId, certName: certName });
        invalidateCache();
        await load();
      } catch (err) {
        toast(err.message, 'error');
        setBusy(this, false);
      }
    });
  }

  /* ════════════════════════════════════════════
     PLAYER SHELL (sidebar + content)
     ════════════════════════════════════════════ */

  function renderPlayer() {
    clearGate();
    var doneCount = course.tasks.filter(function (t) { return completed.indexOf(t.taskId) !== -1; }).length;
    var total = course.tasks.length;
    var passed = course.myProgress.passed;
    var pct = total ? doneCount / total : 0;
    var R = 26, CIRC = 2 * Math.PI * R;

    shell.innerHTML =
      '<aside class="player-sidebar">' +
      '  <button class="player-back" id="player-back">&larr; Back to Academy</button>' +
      '  <div class="progress-panel">' +
      '    <div class="progress-ring' + (pct >= 1 ? ' complete' : '') + '">' +
      '      <svg width="62" height="62" viewBox="0 0 62 62">' +
      '        <circle class="ring-bg" cx="31" cy="31" r="' + R + '"></circle>' +
      '        <circle class="ring-val" cx="31" cy="31" r="' + R + '" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + (CIRC * (1 - pct)).toFixed(1) + '"></circle>' +
      '      </svg>' +
      '      <div class="ring-label">' + Math.round(pct * 100) + '%</div>' +
      '    </div>' +
      '    <div class="progress-text">' +
      '      <div class="pt-title">Progress</div>' +
      '      <div class="pt-sub">' + doneCount + ' of ' + total + ' done</div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="task-list">' +
      course.tasks.map(function (t, i) {
        var isDone = completed.indexOf(t.taskId) !== -1;
        var unlocked = isDone || i === 0 || completed.indexOf(course.tasks[i - 1].taskId) !== -1;
        var cls = 'task-item' + (currentView === i ? ' active' : '') + (isDone ? ' done' : '');
        return '<button class="' + cls + '" data-task="' + i + '"' + (unlocked ? '' : ' disabled') + '>' +
          '<span class="task-num">' + (isDone ? '&#10003;' : (i + 1)) + '</span>' +
          '<span class="task-title-text">' + escapeHtml(t.title) + '</span>' +
          '<span class="task-state-icon">' + (unlocked ? '' : '&#128274;') + '</span>' +
          '</button>';
      }).join('') +
      '  </div>' +
      '  <button class="kc-item' + (passed ? ' passed' : (allTasksDone() ? ' unlocked' : '')) + '" id="kc-btn"' +
      (allTasksDone() || passed ? '' : ' disabled') + '>' +
      '    <span class="kc-icon">' + (passed ? '&#10003;' : '&#10024;') + '</span>' +
      '    <span>Knowledge Check' + (passed ? ' — passed' : '') + '</span>' +
      '  </button>' +
      '</aside>' +
      '<main class="player-main" id="player-main"></main>';

    document.getElementById('player-back').addEventListener('click', function () {
      window.location.href = 'app.html#courses';
    });
    shell.querySelectorAll('[data-task]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentView = Number(btn.dataset.task);
        renderPlayer();
      });
    });
    document.getElementById('kc-btn').addEventListener('click', function () {
      currentView = 'quiz';
      renderPlayer();
    });

    if (currentView === 'quiz') renderQuizIntro();
    else renderTask(currentView);
  }

  /* ════════════════════════════════════════════
     TASK VIEW — video gate → Next → subtask
     ════════════════════════════════════════════ */

  function renderTask(i) {
    var t = course.tasks[i];
    var pmain = document.getElementById('player-main');
    var isDone = completed.indexOf(t.taskId) !== -1;
    var isLast = i === course.tasks.length - 1;

    pmain.innerHTML =
      '<div class="muted small mb-8">Task ' + (i + 1) + ' of ' + course.tasks.length + '</div>' +
      '<h1 class="page-title mb-16">' + escapeHtml(t.title) + '</h1>' +
      '<div id="video-area"></div>' +
      '<div id="subtask-area"></div>';

    var videoArea = document.getElementById('video-area');
    var subtaskArea = document.getElementById('subtask-area');

    if (!t.video || !t.video.embed) {
      // No video (shouldn't happen on published courses) — go straight to content.
      showSubtask();
      return;
    }

    videoArea.innerHTML =
      '<div class="video-shell" id="video-shell"></div>' +
      '<div class="gate-bar" id="gate-bar">' +
      '  <div class="gate-msg" id="gate-msg"></div>' +
      '  <button class="btn" id="btn-next" disabled>Next &rarr;</button>' +
      '</div>';

    var nextBtn = document.getElementById('btn-next');
    nextBtn.addEventListener('click', showSubtask);

    if (isDone) {
      // Already completed: video is rewatchable, gate open.
      mountVideo(t.video, function () {});
      unlockNext('You have completed this task — rewatch the video or continue.');
    } else {
      document.getElementById('gate-msg').innerHTML = '&#127916; Watch the video to unlock the next step.';
      mountVideo(t.video, function () {
        unlockNext('&#9989; Video finished — you can continue.');
      });
    }

    function unlockNext(message) {
      document.getElementById('gate-msg').innerHTML = message;
      nextBtn.disabled = false;
    }

    function showSubtask() {
      if (subtaskArea.innerHTML) { subtaskArea.scrollIntoView({ behavior: 'smooth' }); return; }
      subtaskArea.innerHTML =
        '<div class="subtask-panel">' +
        '  <div class="subtask-head">Subtask &middot; Presentation</div>' +
        '  <div class="card"><div class="rich-content">' +
        (t.contentHtml || '<p class="muted">No additional content for this task.</p>') +
        '  </div></div>' +
        '  <div class="row mt-16" style="justify-content:flex-end">' +
        (isDone
          ? (isLast
              ? '<button class="btn btn-green" id="btn-to-quiz">Go to Knowledge Check &rarr;</button>'
              : '<button class="btn" id="btn-continue">Continue to task ' + (i + 2) + ' &rarr;</button>')
          : '<button class="btn btn-green btn-lg" id="btn-complete">' +
            (isLast ? 'Complete final task' : 'Complete task &amp; continue &rarr;') + '</button>') +
        '  </div>' +
        '</div>';
      subtaskArea.scrollIntoView({ behavior: 'smooth' });

      var completeBtn = document.getElementById('btn-complete');
      if (completeBtn) completeBtn.addEventListener('click', async function () {
        setBusy(this, true, 'Saving…');
        try {
          var res = await api('saveProgress', { courseId: courseId, taskId: t.taskId });
          completed = res.completedTaskIds;
          course.myProgress.completedTaskIds = completed;
          invalidateCache();
          currentView = allTasksDone() ? 'quiz' : firstOpenView();
          renderPlayer();
          if (allTasksDone()) toast('All tasks complete — the Knowledge Check is unlocked! 🎉', 'success');
        } catch (err) {
          toast(err.message, 'error');
          setBusy(this, false);
        }
      });
      var contBtn = document.getElementById('btn-continue');
      if (contBtn) contBtn.addEventListener('click', function () {
        currentView = i + 1;
        renderPlayer();
      });
      var quizBtn = document.getElementById('btn-to-quiz');
      if (quizBtn) quizBtn.addEventListener('click', function () {
        currentView = 'quiz';
        renderPlayer();
      });
    }
  }

  /* ── Video mounting + finished-gates per type ── */

  function clearGate() {
    if (gateTimer) { clearInterval(gateTimer); gateTimer = null; }
    if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) {} ytPlayer = null; }
  }

  function mountVideo(video, onEnded) {
    clearGate();
    var host = document.getElementById('video-shell');

    if (video.type === 'mp4') {
      host.innerHTML = '<video controls preload="metadata" src="' + escapeHtml(video.embed) + '"></video>';
      host.querySelector('video').addEventListener('ended', onEnded);
      return;
    }

    if (video.type === 'youtube') {
      var holderId = 'yt-holder-' + Math.random().toString(36).slice(2);
      host.innerHTML = '<div id="' + holderId + '"></div>';
      loadYouTubeApi(function () {
        ytPlayer = new YT.Player(holderId, {
          videoId: video.videoId,
          playerVars: { rel: 0, modestbranding: 1 },
          events: {
            onStateChange: function (e) {
              if (e.data === YT.PlayerState.ENDED) onEnded();
            }
          }
        });
      });
      return;
    }

    // Google Drive preview iframe: no end event exists, so gate on time.
    host.innerHTML = '<iframe src="' + escapeHtml(video.embed) + '" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    var gateMsg = document.getElementById('gate-msg');
    var waitSec = Math.max(Math.round((video.durationSec || 0) * 0.85), 30);
    var left = waitSec;
    gateTimer = setInterval(function () {
      left -= 1;
      if (!document.getElementById('gate-msg')) { clearGate(); return; } // view changed
      if (left <= 0) {
        clearGate();
        onEnded();
        return;
      }
      gateMsg.innerHTML = '&#127916; Watch the video — “Next” unlocks in <span class="gate-timer">' + fmtClock(left) + '</span>';
    }, 1000);
    gateMsg.innerHTML = '&#127916; Watch the video — “Next” unlocks in <span class="gate-timer">' + fmtClock(left) + '</span>';
  }

  function fmtClock(totalSec) {
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  var ytApiLoading = false, ytApiQueue = [];
  function loadYouTubeApi(cb) {
    if (window.YT && window.YT.Player) { cb(); return; }
    ytApiQueue.push(cb);
    if (ytApiLoading) return;
    ytApiLoading = true;
    window.onYouTubeIframeAPIReady = function () {
      ytApiQueue.forEach(function (fn) { fn(); });
      ytApiQueue = [];
    };
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  /* ════════════════════════════════════════════
     KNOWLEDGE CHECK
     ════════════════════════════════════════════ */

  function renderQuizIntro() {
    var pmain = document.getElementById('player-main');
    var passed = course.myProgress.passed;
    var attempts = course.myProgress.quizAttempts || 0;
    var best = course.myProgress.bestScorePct;

    pmain.innerHTML =
      '<div class="muted small mb-8">Knowledge Check</div>' +
      '<h1 class="page-title mb-16">' + escapeHtml(course.meta.title) + '</h1>' +
      '<div class="card" style="max-width:640px">' +
      (passed
        ? '<div class="quiz-result-banner pass" style="margin-bottom:18px">' +
          '  <div class="qr-icon">&#127942;</div>' +
          '  <div class="qr-score">' + (best != null ? best + '%' : 'Passed') + '</div>' +
          '  <p>You have passed this knowledge check' + (attempts ? ' (' + attempts + ' attempt' + (attempts === 1 ? '' : 's') + ')' : '') + '.</p>' +
          '</div>' +
          '<a class="btn btn-green btn-block btn-lg" href="certificate.html?certId=' + encodeURIComponent(findMyCertLink()) + '" id="btn-view-cert">View my certificate</a>' +
          '<button class="btn btn-ghost btn-block mt-8" id="btn-start-quiz">Retake for practice</button>'
        : '<h3 class="mb-8">Ready for the Knowledge Check?</h3>' +
          '<p class="muted mb-16">' + course.quizMeta.questionCount + ' questions &middot; you need <b>' +
          course.quizMeta.passThresholdPct + '%</b> or higher to earn your certificate.' +
          (attempts ? '<br>Previous attempts: ' + attempts + (best != null ? ' &middot; best score ' + best + '%' : '') : '') + '</p>' +
          '<button class="btn btn-lg btn-block" id="btn-start-quiz">Start Knowledge Check</button>') +
      '</div>';

    var startBtn = document.getElementById('btn-start-quiz');
    if (startBtn) startBtn.addEventListener('click', startQuiz);
    // When passed but the certificate id isn't known locally, resolve on click.
    var certBtn = document.getElementById('btn-view-cert');
    if (certBtn && !findMyCertLink()) {
      certBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = 'app.html#certificates';
      });
    }
  }

  function findMyCertLink() {
    return course.myProgress && course.myProgress.certId ? course.myProgress.certId : (course._certId || '');
  }

  async function startQuiz() {
    var pmain = document.getElementById('player-main');
    pmain.innerHTML = loadingBlock('Preparing your knowledge check…');
    var quiz;
    try {
      quiz = await api('getQuiz', { courseId: courseId });
    } catch (err) {
      toast(err.message, 'error');
      renderQuizIntro();
      return;
    }

    pmain.innerHTML =
      '<div class="muted small mb-8">Knowledge Check &middot; ' + quiz.questions.length + ' questions &middot; pass ' + quiz.passThresholdPct + '%</div>' +
      '<h1 class="page-title mb-24">' + escapeHtml(course.meta.title) + '</h1>' +
      '<div id="quiz-questions">' +
      quiz.questions.map(function (q, qi) {
        return '<div class="card quiz-question" data-q="' + escapeHtml(q.qId) + '">' +
          '<div class="qq-text"><span class="qq-num">' + (qi + 1) + '.</span>' + escapeHtml(q.text) + '</div>' +
          q.choices.map(function (choice, ci) {
            return '<label class="quiz-choice"><input type="radio" name="q-' + qi + '" value="' + ci + '">' +
              '<span>' + escapeHtml(choice) + '</span></label>';
          }).join('') +
          '</div>';
      }).join('') +
      '</div>' +
      '<div class="row mt-24" style="justify-content:space-between;flex-wrap:wrap">' +
      '  <div class="muted small" id="quiz-progress">0 of ' + quiz.questions.length + ' answered</div>' +
      '  <button class="btn btn-lg" id="btn-submit-quiz" disabled>Submit answers</button>' +
      '</div>';

    var totalQ = quiz.questions.length;
    var submitBtn = document.getElementById('btn-submit-quiz');

    pmain.querySelectorAll('.quiz-choice input').forEach(function (input) {
      input.addEventListener('change', function () {
        var card = input.closest('.quiz-question');
        card.querySelectorAll('.quiz-choice').forEach(function (l) { l.classList.remove('selected'); });
        input.closest('.quiz-choice').classList.add('selected');
        var answered = countAnswered();
        document.getElementById('quiz-progress').textContent = answered + ' of ' + totalQ + ' answered';
        submitBtn.disabled = answered < totalQ;
      });
    });

    function countAnswered() {
      var n = 0;
      pmain.querySelectorAll('.quiz-question').forEach(function (card) {
        if (card.querySelector('input:checked')) n++;
      });
      return n;
    }

    submitBtn.addEventListener('click', async function () {
      var answers = [];
      pmain.querySelectorAll('.quiz-question').forEach(function (card) {
        var checkedInput = card.querySelector('input:checked');
        answers.push({ qId: card.dataset.q, choiceIndex: checkedInput ? Number(checkedInput.value) : -1 });
      });
      setBusy(this, true, 'Grading…');
      try {
        var result = await api('submitQuiz', { courseId: courseId, answers: answers });
        invalidateCache();
        course.myProgress.quizAttempts = result.attempts;
        course.myProgress.bestScorePct = Math.max(course.myProgress.bestScorePct || 0, result.scorePct);
        if (result.passed) {
          course.myProgress.passed = true;
          course._certId = result.certificateId;
        }
        showQuizResult(result, quiz);
      } catch (err) {
        toast(err.message, 'error');
        setBusy(this, false);
      }
    });
  }

  function showQuizResult(result, quiz) {
    var pmain = document.getElementById('player-main');
    var wrongById = {};
    (result.perQuestion || []).forEach(function (r) { wrongById[r.qId] = !r.correct; });
    var wrongCount = (result.perQuestion || []).filter(function (r) { return !r.correct; }).length;

    if (result.passed) {
      pmain.innerHTML =
        '<div class="quiz-result-banner pass mt-24" style="max-width:640px">' +
        '  <div class="qr-icon">&#127881;</div>' +
        '  <div class="qr-score">' + result.scorePct + '%</div>' +
        '  <p>Congratulations — you passed the knowledge check!<br>Your certificate is ready.</p>' +
        '</div>' +
        '<div style="max-width:640px">' +
        '  <a class="btn btn-green btn-lg btn-block" href="certificate.html?certId=' + encodeURIComponent(result.certificateId || '') + '">&#127942; View, print or download my certificate</a>' +
        '  <a class="btn btn-ghost btn-block mt-8" href="app.html#courses">Back to courses</a>' +
        '</div>';
      renderSidebarOnly();
      return;
    }

    pmain.innerHTML =
      '<div class="quiz-result-banner fail mt-24" style="max-width:640px">' +
      '  <div class="qr-icon">&#128218;</div>' +
      '  <div class="qr-score">' + result.scorePct + '%</div>' +
      '  <p>Not quite — you need ' + result.passThresholdPct + '% to pass.<br>' +
      wrongCount + ' question' + (wrongCount === 1 ? ' was' : 's were') + ' answered incorrectly (marked below). Review the material and try again.</p>' +
      '</div>' +
      '<div style="max-width:640px" id="review-list">' +
      quiz.questions.map(function (q, qi) {
        var wrong = wrongById[q.qId];
        return '<div class="card quiz-question" style="padding:14px 18px">' +
          '<div class="qq-text" style="margin:0"><span class="qq-num">' + (qi + 1) + '.</span>' +
          escapeHtml(q.text) + ' ' +
          (wrong ? '<span class="badge badge-red">&#10007; incorrect</span>' : '<span class="badge badge-green">&#10003; correct</span>') +
          '</div></div>';
      }).join('') +
      '</div>' +
      '<div style="max-width:640px" class="mt-16">' +
      '  <button class="btn btn-lg btn-block" id="btn-retake">Retake Knowledge Check</button>' +
      '  <a class="btn btn-ghost btn-block mt-8" href="app.html#courses">Back to courses</a>' +
      '</div>';

    document.getElementById('btn-retake').addEventListener('click', startQuiz);
  }

  /** Re-render just the sidebar states (after passing) without touching main. */
  function renderSidebarOnly() {
    var mainContent = document.getElementById('player-main').innerHTML;
    renderPlayer();
    document.getElementById('player-main').innerHTML = mainContent;
    // re-bind is unnecessary: result view only contains links
  }
})();
