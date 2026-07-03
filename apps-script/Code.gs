/**
 * ============================================================
 *  MAGNUM CPA ACADEMY — Backend (Google Apps Script Web App)
 * ============================================================
 *  This script turns a Google Sheet into the database + API for
 *  the Magnum CPA Academy e-learning site (hosted on GitHub Pages).
 *
 *  SETUP (see SETUP.md in the repo for the full walkthrough):
 *   1. Create a Google Sheet, open Extensions → Apps Script,
 *      and paste this entire file into Code.gs.
 *   2. In the editor toolbar select the function `setup` and Run it
 *      once. Approve the permissions Google asks for.
 *   3. Deploy → New deployment → type "Web app"
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      Copy the /exec URL into js/config.js on the website.
 *   4. Log in with the default admin below and change the password.
 *
 *  DEFAULT ADMIN:  glenn@magnumcpa.com  /  ChangeMe123!
 *
 *  IMPORTANT — when you edit this script later, redeploy with
 *  Manage deployments → (pencil) → Version: New version → Deploy.
 *  Never create a brand-new deployment or the URL changes.
 * ============================================================
 */

var DEFAULT_ADMIN = { name: 'Glenn Matias', email: 'glenn@magnumcpa.com', password: 'ChangeMe123!' };

var SCHEMA = {
  Users:        ['userId', 'name', 'email', 'passwordHash', 'salt', 'role', 'active', 'mustChangePassword', 'createdAt'],
  Sessions:     ['token', 'userId', 'role', 'createdAt', 'expiresAt'],
  Courses:      ['courseId', 'title', 'description', 'status', 'registrationFormUrl', 'passThresholdPct', 'taskCount', 'questionCount', 'createdAt', 'updatedAt', 'publishedAt'],
  CourseData:   ['courseId', 'chunkIndex', 'chunk'],
  Updates:      ['updateId', 'title', 'summary', 'status', 'createdAt', 'publishedAt'],
  UpdateData:   ['updateId', 'chunkIndex', 'chunk'],
  Progress:     ['progressId', 'userId', 'courseId', 'certName', 'registeredAt', 'completedTaskIds', 'quizAttempts', 'bestScorePct', 'passed', 'passedAt', 'updatedAt'],
  Certificates: ['certId', 'userId', 'certName', 'courseId', 'courseTitle', 'scorePct', 'taskCount', 'issuedAt'],
  Links:        ['linkId', 'label', 'url', 'description', 'sortOrder'],
  Settings:     ['key', 'value']
};

var DEFAULT_SETTINGS = {
  teamEmail: '',
  ccList: '',
  completionFormUrl: '',
  defaultPassThreshold: '85',
  sessionHours: '12',
  firmName: 'Magnum CPA Academy'
};

var CHUNK_SIZE = 45000;          // stay under the 50,000-char/cell Sheets limit
var MAX_COURSE_JSON = 900000;    // sanity cap (~20 chunks)

/* ============================================================
 *  ONE-TIME SETUP
 * ============================================================ */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    var headers = SCHEMA[name];
    var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (String(firstRow[0]) !== headers[0]) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });

  // Seed settings that don't exist yet
  var existing = {};
  readRows('Settings').forEach(function (r) { existing[r.key] = true; });
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
    if (!existing[k]) appendRow('Settings', { key: k, value: DEFAULT_SETTINGS[k] });
  });

  // Default admin account
  var hasAdmin = readRows('Users').some(function (u) { return u.role === 'admin'; });
  if (!hasAdmin) {
    var salt = Utilities.getUuid();
    appendRow('Users', {
      userId: 'usr-' + Utilities.getUuid(),
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email.toLowerCase(),
      passwordHash: hashPassword(DEFAULT_ADMIN.password, salt),
      salt: salt,
      role: 'admin',
      active: 'TRUE',
      mustChangePassword: 'TRUE',
      createdAt: nowIso()
    });
  }
  Logger.log('Setup complete. Default admin: ' + DEFAULT_ADMIN.email + ' / ' + DEFAULT_ADMIN.password);
}

/* ============================================================
 *  HTTP ENTRY POINTS
 * ============================================================ */

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: 'Magnum CPA Academy API is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var out;
  var lock = null;
  try {
    var req = JSON.parse(e.postData.contents);
    var route = ROUTES[req.action];
    if (!route) throw new Error('Unknown action: ' + req.action);

    var session = null;
    if (!route.pub) session = requireSession(req.token, route.role);

    if (route.mutates) {
      lock = LockService.getScriptLock();
      lock.waitLock(15000);
    }
    out = { ok: true, data: route.fn(req.payload || {}, session) };
  } catch (err) {
    out = { ok: false, error: String(err.message || err) };
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (ignored) {} }
  }
  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

var ROUTES = {
  // public
  login:                { pub: true, mutates: true,  fn: apiLogin },
  // any authenticated user
  logout:               { role: 'any', mutates: true,  fn: apiLogout },
  changePassword:       { role: 'any', mutates: true,  fn: apiChangePassword },
  getBootstrap:         { role: 'any', mutates: false, fn: apiGetBootstrap },
  getUpdate:            { role: 'any', mutates: false, fn: apiGetUpdate },
  getCourse:            { role: 'any', mutates: false, fn: apiGetCourse },
  registerCourse:       { role: 'any', mutates: true,  fn: apiRegisterCourse },
  saveProgress:         { role: 'any', mutates: true,  fn: apiSaveProgress },
  getQuiz:              { role: 'any', mutates: false, fn: apiGetQuiz },
  submitQuiz:           { role: 'any', mutates: true,  fn: apiSubmitQuiz },
  getCertificate:       { role: 'any', mutates: false, fn: apiGetCertificate },
  // admin only
  adminSaveCourse:      { role: 'admin', mutates: true,  fn: apiAdminSaveCourse },
  adminGetCourseFull:   { role: 'admin', mutates: false, fn: apiAdminGetCourseFull },
  adminSetCourseStatus: { role: 'admin', mutates: true,  fn: apiAdminSetCourseStatus },
  adminDeleteCourse:    { role: 'admin', mutates: true,  fn: apiAdminDeleteCourse },
  adminSaveUpdate:      { role: 'admin', mutates: true,  fn: apiAdminSaveUpdate },
  adminSetUpdateStatus: { role: 'admin', mutates: true,  fn: apiAdminSetUpdateStatus },
  adminDeleteUpdate:    { role: 'admin', mutates: true,  fn: apiAdminDeleteUpdate },
  adminGetTracking:     { role: 'admin', mutates: false, fn: apiAdminGetTracking },
  adminListEmployees:   { role: 'admin', mutates: false, fn: apiAdminListEmployees },
  adminSaveEmployee:    { role: 'admin', mutates: true,  fn: apiAdminSaveEmployee },
  adminResetPassword:   { role: 'admin', mutates: true,  fn: apiAdminResetPassword },
  adminSaveLinks:       { role: 'admin', mutates: true,  fn: apiAdminSaveLinks },
  adminGetSettings:     { role: 'admin', mutates: false, fn: apiAdminGetSettings },
  adminSaveSettings:    { role: 'admin', mutates: true,  fn: apiAdminSaveSettings }
};

/* ============================================================
 *  AUTH
 * ============================================================ */

function hashPassword(password, salt) {
  var h = salt + password;
  for (var i = 0; i < 1000; i++) {
    h = bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8));
  }
  return h;
}

function bytesToHex(bytes) {
  return bytes.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function apiLogin(p) {
  var email = String(p.email || '').trim().toLowerCase();
  var password = String(p.password || '');
  if (!email || !password) throw new Error('Email and password are required.');

  var user = readRows('Users').filter(function (u) {
    return String(u.email).toLowerCase() === email && isTrue(u.active);
  })[0];
  if (!user || hashPassword(password, user.salt) !== user.passwordHash) {
    throw new Error('Invalid email or password.');
  }

  purgeExpiredSessions();
  var hours = Number(getSetting('sessionHours')) || 12;
  var token = 'tok-' + Utilities.getUuid() + Utilities.getUuid();
  var expires = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  appendRow('Sessions', { token: token, userId: user.userId, role: user.role, createdAt: nowIso(), expiresAt: expires });
  cacheSession(token, { userId: user.userId, role: user.role, expiresAt: expires });

  return {
    token: token,
    user: { userId: user.userId, name: user.name, email: user.email, role: user.role },
    mustChangePassword: isTrue(user.mustChangePassword)
  };
}

function apiLogout(p, session) {
  deleteRowsWhere('Sessions', function (r) { return r.token === session.token; });
  CacheService.getScriptCache().remove('sess:' + session.token);
  return {};
}

function apiChangePassword(p, session) {
  var oldPw = String(p.oldPassword || '');
  var newPw = String(p.newPassword || '');
  if (newPw.length < 8) throw new Error('New password must be at least 8 characters.');

  var users = readRows('Users');
  var user = users.filter(function (u) { return u.userId === session.userId; })[0];
  if (!user) throw new Error('User not found.');
  if (hashPassword(oldPw, user.salt) !== user.passwordHash) throw new Error('Current password is incorrect.');

  var salt = Utilities.getUuid();
  updateRowsWhere('Users', function (r) { return r.userId === session.userId; }, {
    passwordHash: hashPassword(newPw, salt), salt: salt, mustChangePassword: 'FALSE'
  });
  return {};
}

function requireSession(token, requiredRole) {
  if (!token) throw new Error('AUTH_EXPIRED');
  var cache = CacheService.getScriptCache();
  var sess = null;
  var cached = cache.get('sess:' + token);
  if (cached) {
    sess = JSON.parse(cached);
  } else {
    var row = readRows('Sessions').filter(function (r) { return r.token === token; })[0];
    if (row) {
      sess = { userId: row.userId, role: row.role, expiresAt: iso(row.expiresAt) };
      cacheSession(token, sess);
    }
  }
  if (!sess || new Date(sess.expiresAt).getTime() < Date.now()) throw new Error('AUTH_EXPIRED');
  if (requiredRole === 'admin' && sess.role !== 'admin') throw new Error('FORBIDDEN');
  sess.token = token;
  return sess;
}

function cacheSession(token, sess) {
  // Cache max is 6h; sessions can outlive the cache entry (sheet is the source of truth)
  CacheService.getScriptCache().put('sess:' + token, JSON.stringify(sess), 21600);
}

function purgeExpiredSessions() {
  var now = Date.now();
  deleteRowsWhere('Sessions', function (r) { return new Date(iso(r.expiresAt)).getTime() < now; });
}

/* ============================================================
 *  EMPLOYEE / SHARED ACTIONS
 * ============================================================ */

function apiGetBootstrap(p, session) {
  var user = readRows('Users').filter(function (u) { return u.userId === session.userId; })[0];
  if (!user || !isTrue(user.active)) throw new Error('AUTH_EXPIRED');

  var updates = readRows('Updates')
    .filter(function (u) { return u.status === 'published'; })
    .map(function (u) { return { updateId: u.updateId, title: u.title, summary: u.summary, publishedAt: iso(u.publishedAt) }; })
    .sort(function (a, b) { return b.publishedAt < a.publishedAt ? -1 : 1; });

  var isAdmin = session.role === 'admin';
  var courses = readRows('Courses')
    .filter(function (c) { return isAdmin ? true : c.status === 'open'; })
    .map(function (c) {
      return {
        courseId: c.courseId, title: c.title, description: c.description, status: c.status,
        registrationFormUrl: c.registrationFormUrl, taskCount: Number(c.taskCount) || 0,
        questionCount: Number(c.questionCount) || 0, passThresholdPct: Number(c.passThresholdPct) || 85,
        publishedAt: iso(c.publishedAt), createdAt: iso(c.createdAt), updatedAt: iso(c.updatedAt)
      };
    })
    .sort(function (a, b) { return (b.publishedAt || b.createdAt) < (a.publishedAt || a.createdAt) ? -1 : 1; });

  var links = readRows('Links')
    .map(function (l) { return { linkId: l.linkId, label: l.label, url: l.url, description: l.description, sortOrder: Number(l.sortOrder) || 0 }; })
    .sort(function (a, b) { return a.sortOrder - b.sortOrder; });

  var myProgress = readRows('Progress')
    .filter(function (r) { return r.userId === session.userId; })
    .map(progressToClient);

  var myCertificates = readRows('Certificates')
    .filter(function (c) { return c.userId === session.userId; })
    .map(function (c) {
      return { certId: c.certId, certName: c.certName, courseId: c.courseId, courseTitle: c.courseTitle,
               scorePct: Number(c.scorePct), taskCount: Number(c.taskCount), issuedAt: iso(c.issuedAt) };
    })
    .sort(function (a, b) { return b.issuedAt < a.issuedAt ? -1 : 1; });

  return {
    user: { userId: user.userId, name: user.name, email: user.email, role: user.role },
    updates: updates, courses: courses, links: links,
    myProgress: myProgress, myCertificates: myCertificates,
    settingsLite: { firmName: getSetting('firmName') || 'Magnum CPA Academy' }
  };
}

function apiGetUpdate(p, session) {
  var u = readRows('Updates').filter(function (r) { return r.updateId === p.updateId; })[0];
  if (!u) throw new Error('Update not found.');
  if (u.status !== 'published' && session.role !== 'admin') throw new Error('Update not found.');
  return { updateId: u.updateId, title: u.title, summary: u.summary, status: u.status,
           bodyHtml: readChunks('UpdateData', 'updateId', u.updateId), publishedAt: iso(u.publishedAt) };
}

function apiGetCourse(p, session) {
  var meta = getCourseMeta(p.courseId);
  if (session.role !== 'admin' && meta.status !== 'open') throw new Error('This course is not currently open.');

  var course = readCourseJson(p.courseId);
  var tasks = (course.tasks || []).map(function (t) {
    return { taskId: t.taskId, title: t.title, video: t.video, contentHtml: t.contentHtml };
  });

  var prog = readRows('Progress').filter(function (r) {
    return r.userId === session.userId && r.courseId === p.courseId;
  })[0];

  return {
    meta: metaToClient(meta),
    tasks: tasks,
    quizMeta: { questionCount: (course.quiz || []).length, passThresholdPct: Number(meta.passThresholdPct) || 85 },
    myProgress: prog ? progressToClient(prog) : null
  };
}

function apiRegisterCourse(p, session) {
  var meta = getCourseMeta(p.courseId);
  if (meta.status !== 'open') throw new Error('This course is not currently open.');
  var certName = String(p.certName || '').trim();
  if (!certName) throw new Error('Please enter the name to appear on your certificate.');
  if (certName.length > 80) throw new Error('Certificate name is too long (max 80 characters).');

  var existing = readRows('Progress').filter(function (r) {
    return r.userId === session.userId && r.courseId === p.courseId;
  })[0];

  if (existing) {
    updateRowsWhere('Progress', function (r) { return r.progressId === existing.progressId; },
      { certName: certName, updatedAt: nowIso() });
    return { progressId: existing.progressId };
  }
  var progressId = 'prg-' + Utilities.getUuid();
  appendRow('Progress', {
    progressId: progressId, userId: session.userId, courseId: p.courseId,
    certName: certName, registeredAt: nowIso(), completedTaskIds: '[]',
    quizAttempts: 0, bestScorePct: '', passed: 'FALSE', passedAt: '', updatedAt: nowIso()
  });
  return { progressId: progressId };
}

function apiSaveProgress(p, session) {
  var meta = getCourseMeta(p.courseId);
  if (meta.status !== 'open') throw new Error('This course is not currently open.');

  var prog = readRows('Progress').filter(function (r) {
    return r.userId === session.userId && r.courseId === p.courseId;
  })[0];
  if (!prog) throw new Error('Please register for this course first.');

  var course = readCourseJson(p.courseId);
  var taskIds = (course.tasks || []).map(function (t) { return t.taskId; });
  var idx = taskIds.indexOf(p.taskId);
  if (idx === -1) throw new Error('Unknown task.');

  var done = parseJsonArray(prog.completedTaskIds);
  // enforce order: every earlier task must already be complete
  for (var i = 0; i < idx; i++) {
    if (done.indexOf(taskIds[i]) === -1) throw new Error('Complete the previous tasks first.');
  }
  if (done.indexOf(p.taskId) === -1) done.push(p.taskId);

  updateRowsWhere('Progress', function (r) { return r.progressId === prog.progressId; },
    { completedTaskIds: JSON.stringify(done), updatedAt: nowIso() });
  return { completedTaskIds: done };
}

function apiGetQuiz(p, session) {
  var meta = getCourseMeta(p.courseId);
  if (session.role !== 'admin' && meta.status !== 'open') throw new Error('This course is not currently open.');

  var prog = readRows('Progress').filter(function (r) {
    return r.userId === session.userId && r.courseId === p.courseId;
  })[0];
  if (!prog) throw new Error('Please register for this course first.');

  var course = readCourseJson(p.courseId);
  var taskIds = (course.tasks || []).map(function (t) { return t.taskId; });
  var done = parseJsonArray(prog.completedTaskIds);
  var allDone = taskIds.every(function (id) { return done.indexOf(id) !== -1; });
  if (!allDone) throw new Error('Complete all tasks before taking the knowledge check.');

  // Strip correct answers — they never leave the server.
  var questions = (course.quiz || []).map(function (q) {
    return { qId: q.qId, text: q.text, choices: q.choices };
  });
  return { questions: questions, passThresholdPct: Number(meta.passThresholdPct) || 85 };
}

function apiSubmitQuiz(p, session) {
  var meta = getCourseMeta(p.courseId);
  if (meta.status !== 'open') throw new Error('This course is not currently open.');

  var prog = readRows('Progress').filter(function (r) {
    return r.userId === session.userId && r.courseId === p.courseId;
  })[0];
  if (!prog) throw new Error('Please register for this course first.');

  var course = readCourseJson(p.courseId);
  var quiz = course.quiz || [];
  if (!quiz.length) throw new Error('This course has no knowledge check.');

  var taskIds = (course.tasks || []).map(function (t) { return t.taskId; });
  var done = parseJsonArray(prog.completedTaskIds);
  if (!taskIds.every(function (id) { return done.indexOf(id) !== -1; })) {
    throw new Error('Complete all tasks before taking the knowledge check.');
  }

  var answers = {};
  (p.answers || []).forEach(function (a) { answers[a.qId] = Number(a.choiceIndex); });

  var perQuestion = quiz.map(function (q) {
    return { qId: q.qId, correct: answers[q.qId] === Number(q.correctIndex) };
  });
  var correctCount = perQuestion.filter(function (r) { return r.correct; }).length;
  var scorePct = Math.round((correctCount / quiz.length) * 100);
  var threshold = Number(meta.passThresholdPct) || 85;
  var passed = scorePct >= threshold;

  var attempts = (Number(prog.quizAttempts) || 0) + 1;
  var best = Math.max(Number(prog.bestScorePct) || 0, scorePct);
  var wasPassed = isTrue(prog.passed);

  var patch = { quizAttempts: attempts, bestScorePct: best, updatedAt: nowIso() };
  if (passed && !wasPassed) { patch.passed = 'TRUE'; patch.passedAt = nowIso(); }
  updateRowsWhere('Progress', function (r) { return r.progressId === prog.progressId; }, patch);

  var certificateId = null;
  if (passed) {
    var existingCert = readRows('Certificates').filter(function (c) {
      return c.userId === session.userId && c.courseId === p.courseId;
    })[0];
    if (existingCert) {
      certificateId = existingCert.certId;
    } else {
      certificateId = 'cert-' + Utilities.getUuid();
      var user = readRows('Users').filter(function (u) { return u.userId === session.userId; })[0];
      appendRow('Certificates', {
        certId: certificateId, userId: session.userId,
        certName: prog.certName || (user && user.name) || 'Employee',
        courseId: p.courseId, courseTitle: meta.title,
        scorePct: scorePct, taskCount: taskIds.length, issuedAt: nowIso()
      });
      // Notify the admin through the completion Google Form (first pass only)
      submitCompletionForm({
        name: prog.certName || (user && user.name) || '',
        email: (user && user.email) || '',
        course: meta.title,
        score: scorePct + '%',
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      });
    }
  }

  return { scorePct: scorePct, passed: passed, certificateId: certificateId, perQuestion: perQuestion,
           attempts: attempts, passThresholdPct: threshold };
}

function apiGetCertificate(p, session) {
  var c = readRows('Certificates').filter(function (r) { return r.certId === p.certId; })[0];
  if (!c) throw new Error('Certificate not found.');
  if (session.role !== 'admin' && c.userId !== session.userId) throw new Error('FORBIDDEN');
  return { certId: c.certId, certName: c.certName, courseTitle: c.courseTitle,
           scorePct: Number(c.scorePct), taskCount: Number(c.taskCount), issuedAt: iso(c.issuedAt) };
}

/**
 * Submits a response to the admin's "Course Completion" Google Form.
 * The Settings value `completionFormUrl` is a pre-filled form link whose
 * fields contain the tokens {{name}} {{email}} {{course}} {{score}} {{date}}.
 * Never throws — a notification failure must not block the certificate.
 */
function submitCompletionForm(values) {
  try {
    var url = String(getSetting('completionFormUrl') || '').trim();
    if (!url || url.indexOf('docs.google.com/forms') === -1) return;

    var parts = url.split('?');
    if (parts.length < 2) return;
    var base = parts[0].replace(/\/viewform.*$/, '/formResponse').replace(/\/prefill.*$/, '/formResponse');
    if (base.indexOf('/formResponse') === -1) base += '/formResponse';

    var tokenMap = { '{{name}}': values.name, '{{email}}': values.email, '{{course}}': values.course,
                     '{{score}}': values.score, '{{date}}': values.date };
    var params = [];
    parts[1].split('&').forEach(function (pair) {
      var kv = pair.split('=');
      var key = decodeURIComponent(kv[0] || '');
      var val = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
      if (key.indexOf('entry.') !== 0) return;
      var replaced = tokenMap.hasOwnProperty(val) ? tokenMap[val] : val;
      params.push(encodeURIComponent(key) + '=' + encodeURIComponent(replaced));
    });
    if (!params.length) return;

    UrlFetchApp.fetch(base, {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: params.join('&'),
      muteHttpExceptions: true,
      followRedirects: true
    });
  } catch (err) {
    Logger.log('Completion form submit failed: ' + err);
  }
}

/* ============================================================
 *  ADMIN ACTIONS
 * ============================================================ */

function apiAdminSaveCourse(p) {
  var c = p.course || {};
  var title = String(c.title || '').trim();
  if (!title) throw new Error('Course title is required.');

  var tasks = (c.tasks || []).map(function (t) {
    return {
      taskId: t.taskId || ('t-' + Utilities.getUuid()),
      title: String(t.title || '').trim(),
      video: t.video || null,
      contentHtml: sanitizeHtml(String(t.contentHtml || ''))
    };
  });
  var quiz = (c.quiz || []).map(function (q) {
    return {
      qId: q.qId || ('q-' + Utilities.getUuid()),
      text: String(q.text || '').trim(),
      choices: (q.choices || []).map(function (ch) { return String(ch); }),
      correctIndex: Number(q.correctIndex)
    };
  });

  var status = c.status || 'draft';
  if (status === 'open') validateCourseForPublish(tasks, quiz);

  var json = JSON.stringify({ tasks: tasks, quiz: quiz });
  if (json.length > MAX_COURSE_JSON) throw new Error('Course content is too large. Trim task content or split the course.');

  var threshold = Number(c.passThresholdPct) || Number(getSetting('defaultPassThreshold')) || 85;
  var now = nowIso();
  var courseId = c.courseId;

  if (courseId) {
    var existing = getCourseMeta(courseId);
    var patch = {
      title: title, description: String(c.description || ''), status: status,
      registrationFormUrl: String(c.registrationFormUrl || ''), passThresholdPct: threshold,
      taskCount: tasks.length, questionCount: quiz.length, updatedAt: now
    };
    if (status === 'open' && !existing.publishedAt) patch.publishedAt = now;
    updateRowsWhere('Courses', function (r) { return r.courseId === courseId; }, patch);
  } else {
    courseId = 'crs-' + Utilities.getUuid();
    appendRow('Courses', {
      courseId: courseId, title: title, description: String(c.description || ''), status: status,
      registrationFormUrl: String(c.registrationFormUrl || ''), passThresholdPct: threshold,
      taskCount: tasks.length, questionCount: quiz.length,
      createdAt: now, updatedAt: now, publishedAt: status === 'open' ? now : ''
    });
  }
  writeChunks('CourseData', 'courseId', courseId, json);
  return { courseId: courseId };
}

function validateCourseForPublish(tasks, quiz) {
  if (!tasks.length) throw new Error('Add at least one task before publishing.');
  tasks.forEach(function (t, i) {
    if (!t.title) throw new Error('Task ' + (i + 1) + ' needs a title.');
    if (!t.video || !t.video.embed) throw new Error('Task "' + (t.title || i + 1) + '" needs a valid video link.');
  });
  if (quiz.length < 10 || quiz.length > 15) {
    throw new Error('The knowledge check must have 10–15 questions (currently ' + quiz.length + ').');
  }
  quiz.forEach(function (q, i) {
    if (!q.text) throw new Error('Question ' + (i + 1) + ' is empty.');
    if (!q.choices || q.choices.length < 2) throw new Error('Question ' + (i + 1) + ' needs at least 2 choices.');
    if (!(q.correctIndex >= 0 && q.correctIndex < q.choices.length)) {
      throw new Error('Question ' + (i + 1) + ' has no correct answer selected.');
    }
  });
}

function apiAdminGetCourseFull(p) {
  var meta = getCourseMeta(p.courseId);
  var course = readCourseJson(p.courseId);
  return { meta: metaToClient(meta), tasks: course.tasks || [], quiz: course.quiz || [] };
}

function apiAdminSetCourseStatus(p) {
  var meta = getCourseMeta(p.courseId);
  var status = String(p.status);
  if (['draft', 'open', 'closed'].indexOf(status) === -1) throw new Error('Invalid status.');
  if (status === 'open') {
    var course = readCourseJson(p.courseId);
    validateCourseForPublish(course.tasks || [], course.quiz || []);
  }
  var patch = { status: status, updatedAt: nowIso() };
  if (status === 'open' && !meta.publishedAt) patch.publishedAt = nowIso();
  updateRowsWhere('Courses', function (r) { return r.courseId === p.courseId; }, patch);
  return {};
}

function apiAdminDeleteCourse(p) {
  getCourseMeta(p.courseId); // throws if missing
  deleteRowsWhere('Courses', function (r) { return r.courseId === p.courseId; });
  deleteRowsWhere('CourseData', function (r) { return r.courseId === p.courseId; });
  deleteRowsWhere('Progress', function (r) { return r.courseId === p.courseId; });
  // Certificates are kept — employees earned them.
  return {};
}

function apiAdminSaveUpdate(p) {
  var title = String(p.title || '').trim();
  if (!title) throw new Error('Update title is required.');
  var bodyHtml = sanitizeHtml(String(p.bodyHtml || ''));
  var status = p.status === 'published' ? 'published' : 'draft';
  var now = nowIso();
  var updateId = p.updateId;

  if (updateId) {
    var existing = readRows('Updates').filter(function (r) { return r.updateId === updateId; })[0];
    if (!existing) throw new Error('Update not found.');
    var patch = { title: title, summary: String(p.summary || ''), status: status };
    if (status === 'published' && !existing.publishedAt) patch.publishedAt = now;
    updateRowsWhere('Updates', function (r) { return r.updateId === updateId; }, patch);
  } else {
    updateId = 'upd-' + Utilities.getUuid();
    appendRow('Updates', {
      updateId: updateId, title: title, summary: String(p.summary || ''),
      status: status, createdAt: now, publishedAt: status === 'published' ? now : ''
    });
  }
  writeChunks('UpdateData', 'updateId', updateId, bodyHtml);
  return { updateId: updateId };
}

function apiAdminSetUpdateStatus(p) {
  var existing = readRows('Updates').filter(function (r) { return r.updateId === p.updateId; })[0];
  if (!existing) throw new Error('Update not found.');
  var status = p.status === 'published' ? 'published' : 'draft';
  var patch = { status: status };
  if (status === 'published' && !existing.publishedAt) patch.publishedAt = nowIso();
  updateRowsWhere('Updates', function (r) { return r.updateId === p.updateId; }, patch);
  return {};
}

function apiAdminDeleteUpdate(p) {
  deleteRowsWhere('Updates', function (r) { return r.updateId === p.updateId; });
  deleteRowsWhere('UpdateData', function (r) { return r.updateId === p.updateId; });
  return {};
}

function apiAdminGetTracking() {
  var courses = readRows('Courses')
    .filter(function (c) { return c.status !== 'draft'; })
    .map(function (c) { return { courseId: c.courseId, title: c.title, status: c.status, taskCount: Number(c.taskCount) || 0 }; });

  var employees = readRows('Users')
    .filter(function (u) { return u.role === 'employee' && isTrue(u.active); })
    .map(function (u) { return { userId: u.userId, name: u.name, email: u.email }; });

  var cells = {};
  readRows('Progress').forEach(function (r) {
    cells[r.userId + '|' + r.courseId] = {
      registered: true,
      tasksDone: parseJsonArray(r.completedTaskIds).length,
      quizAttempts: Number(r.quizAttempts) || 0,
      bestScorePct: r.bestScorePct === '' ? null : Number(r.bestScorePct),
      passed: isTrue(r.passed),
      passedAt: iso(r.passedAt)
    };
  });
  return { courses: courses, employees: employees, cells: cells };
}

function apiAdminListEmployees() {
  return readRows('Users').map(function (u) {
    return { userId: u.userId, name: u.name, email: u.email, role: u.role,
             active: isTrue(u.active), mustChangePassword: isTrue(u.mustChangePassword), createdAt: iso(u.createdAt) };
  });
}

function apiAdminSaveEmployee(p, session) {
  var name = String(p.name || '').trim();
  var email = String(p.email || '').trim().toLowerCase();
  if (!name || !email) throw new Error('Name and email are required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');

  var users = readRows('Users');
  var dupe = users.filter(function (u) {
    return String(u.email).toLowerCase() === email && u.userId !== p.userId;
  })[0];
  if (dupe) throw new Error('An account with that email already exists.');

  if (p.userId) {
    var existing = users.filter(function (u) { return u.userId === p.userId; })[0];
    if (!existing) throw new Error('Employee not found.');
    if (existing.role === 'admin' && p.active === false && existing.userId === session.userId) {
      throw new Error('You cannot deactivate your own admin account.');
    }
    var patch = { name: name, email: email, active: p.active === false ? 'FALSE' : 'TRUE' };
    if (p.password) {
      if (String(p.password).length < 8) throw new Error('Password must be at least 8 characters.');
      var salt = Utilities.getUuid();
      patch.salt = salt;
      patch.passwordHash = hashPassword(String(p.password), salt);
      patch.mustChangePassword = 'TRUE';
      purgeUserSessions(p.userId);
    }
    if (p.active === false) purgeUserSessions(p.userId);
    updateRowsWhere('Users', function (r) { return r.userId === p.userId; }, patch);
    return { userId: p.userId };
  }

  var password = String(p.password || '');
  if (password.length < 8) throw new Error('Set a temporary password of at least 8 characters.');
  var newSalt = Utilities.getUuid();
  var userId = 'usr-' + Utilities.getUuid();
  appendRow('Users', {
    userId: userId, name: name, email: email,
    passwordHash: hashPassword(password, newSalt), salt: newSalt,
    role: p.role === 'admin' ? 'admin' : 'employee',
    active: 'TRUE', mustChangePassword: 'TRUE', createdAt: nowIso()
  });
  return { userId: userId };
}

function apiAdminResetPassword(p) {
  var user = readRows('Users').filter(function (u) { return u.userId === p.userId; })[0];
  if (!user) throw new Error('Employee not found.');
  var newPw = String(p.newPassword || '');
  if (newPw.length < 8) throw new Error('Password must be at least 8 characters.');
  var salt = Utilities.getUuid();
  updateRowsWhere('Users', function (r) { return r.userId === p.userId; },
    { salt: salt, passwordHash: hashPassword(newPw, salt), mustChangePassword: 'TRUE' });
  purgeUserSessions(p.userId);
  return {};
}

function purgeUserSessions(userId) {
  var cache = CacheService.getScriptCache();
  readRows('Sessions').forEach(function (r) {
    if (r.userId === userId) cache.remove('sess:' + r.token);
  });
  deleteRowsWhere('Sessions', function (r) { return r.userId === userId; });
}

function apiAdminSaveLinks(p) {
  var links = (p.links || []).map(function (l, i) {
    var label = String(l.label || '').trim();
    var url = String(l.url || '').trim();
    if (!label || !url) throw new Error('Every link needs a label and a URL.');
    if (!/^https?:\/\//i.test(url)) throw new Error('Link "' + label + '" must start with http:// or https://');
    return { linkId: l.linkId || ('lnk-' + Utilities.getUuid()), label: label, url: url,
             description: String(l.description || ''), sortOrder: i };
  });
  clearSheetRows('Links');
  links.forEach(function (l) { appendRow('Links', l); });
  return {};
}

function apiAdminGetSettings() {
  var out = {};
  readRows('Settings').forEach(function (r) { out[r.key] = String(r.value); });
  return out;
}

function apiAdminSaveSettings(p) {
  var allowed = Object.keys(DEFAULT_SETTINGS);
  var current = {};
  readRows('Settings').forEach(function (r) { current[r.key] = true; });
  allowed.forEach(function (key) {
    if (!(key in p)) return;
    var value = String(p[key]);
    if (current[key]) {
      updateRowsWhere('Settings', function (r) { return r.key === key; }, { value: value });
    } else {
      appendRow('Settings', { key: key, value: value });
    }
  });
  return apiAdminGetSettings();
}

/* ============================================================
 *  COURSE / CHUNK HELPERS
 * ============================================================ */

function getCourseMeta(courseId) {
  var meta = readRows('Courses').filter(function (r) { return r.courseId === courseId; })[0];
  if (!meta) throw new Error('Course not found.');
  return meta;
}

function metaToClient(meta) {
  return {
    courseId: meta.courseId, title: meta.title, description: meta.description, status: meta.status,
    registrationFormUrl: meta.registrationFormUrl, passThresholdPct: Number(meta.passThresholdPct) || 85,
    taskCount: Number(meta.taskCount) || 0, questionCount: Number(meta.questionCount) || 0,
    createdAt: iso(meta.createdAt), updatedAt: iso(meta.updatedAt), publishedAt: iso(meta.publishedAt)
  };
}

function progressToClient(r) {
  return {
    courseId: r.courseId, certName: r.certName, registeredAt: iso(r.registeredAt),
    completedTaskIds: parseJsonArray(r.completedTaskIds),
    quizAttempts: Number(r.quizAttempts) || 0,
    bestScorePct: r.bestScorePct === '' ? null : Number(r.bestScorePct),
    passed: isTrue(r.passed), passedAt: iso(r.passedAt)
  };
}

function readCourseJson(courseId) {
  var json = readChunks('CourseData', 'courseId', courseId);
  if (!json) return { tasks: [], quiz: [] };
  return JSON.parse(json);
}

function writeChunks(sheetName, keyCol, keyVal, text) {
  deleteRowsWhere(sheetName, function (r) { return r[keyCol] === keyVal; });
  var sheet = getSheet(sheetName);
  var rows = [];
  var count = Math.max(1, Math.ceil(text.length / CHUNK_SIZE));
  for (var i = 0; i < count; i++) {
    rows.push([keyVal, i, text.substr(i * CHUNK_SIZE, CHUNK_SIZE)]);
  }
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
}

function readChunks(sheetName, keyCol, keyVal) {
  return readRows(sheetName)
    .filter(function (r) { return r[keyCol] === keyVal; })
    .sort(function (a, b) { return Number(a.chunkIndex) - Number(b.chunkIndex); })
    .map(function (r) { return String(r.chunk); })
    .join('');
}

/**
 * Removes <script> blocks, inline event handlers and javascript: URLs
 * from admin-authored HTML. Semi-trusted input, defense in depth.
 */
function sanitizeHtml(html) {
  return String(html)
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'\s>]*/gi, '$1=$2#');
}

/* ============================================================
 *  SHEET PRIMITIVES
 * ============================================================ */

function getSheet(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" is missing. Run setup() from the Apps Script editor.');
  return sheet;
}

function readRows(name) {
  var sheet = getSheet(name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = SCHEMA[name];
  return values.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i] !== undefined ? row[i] : ''; });
    return obj;
  }).filter(function (obj) { return String(obj[headers[0]]) !== ''; });
}

function appendRow(name, obj) {
  var sheet = getSheet(name);
  var headers = SCHEMA[name];
  var row = headers.map(function (h) { return sanitizeCell(obj[h] !== undefined ? obj[h] : ''); });
  sheet.appendRow(row);
}

function updateRowsWhere(name, predicate, patch) {
  var sheet = getSheet(name);
  var headers = SCHEMA[name];
  var values = sheet.getDataRange().getValues();
  var changed = 0;
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    headers.forEach(function (h, c) { obj[h] = values[i][c]; });
    if (!predicate(obj)) continue;
    Object.keys(patch).forEach(function (key) {
      var col = headers.indexOf(key);
      if (col !== -1) sheet.getRange(i + 1, col + 1).setValue(sanitizeCell(patch[key]));
    });
    changed++;
  }
  return changed;
}

function deleteRowsWhere(name, predicate) {
  var sheet = getSheet(name);
  var headers = SCHEMA[name];
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    var obj = {};
    headers.forEach(function (h, c) { obj[h] = values[i][c]; });
    if (predicate(obj)) sheet.deleteRow(i + 1);
  }
}

function clearSheetRows(name) {
  var sheet = getSheet(name);
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
}

/** Prevent formula injection: prefix leading = + - @ with an apostrophe. */
function sanitizeCell(value) {
  if (typeof value === 'string' && /^[=+\-@]/.test(value)) return "'" + value;
  return value;
}

function getSetting(key) {
  var row = readRows('Settings').filter(function (r) { return r.key === key; })[0];
  return row ? String(row.value) : '';
}

/* ============================================================
 *  MISC HELPERS
 * ============================================================ */

function nowIso() { return new Date().toISOString(); }

function iso(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function isTrue(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    var arr = JSON.parse(String(value));
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    return [];
  }
}
