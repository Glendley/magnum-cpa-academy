/* ============================================================
   Magnum CPA Academy — DEMO backend (localStorage)
   ------------------------------------------------------------
   Active only while CONFIG.API_URL is empty. Mirrors the real
   Apps Script backend action-for-action so every screen can be
   used before the Google Sheet is connected. Data lives in THIS
   browser only. Demo admin: glenn@magnumcpa.com / ChangeMe123!
   ============================================================ */

var MockApi = (function () {
  var DB_KEY = 'mca_mock_db';

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Demo-only "hash" — real hashing happens server-side in Code.gs.
  function hash(password, salt) {
    var s = salt + '|' + password, h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
    return 'demo-' + (h >>> 0).toString(16);
  }

  function nowIso() { return new Date().toISOString(); }

  function freshDb() {
    var salt = uuid();
    return {
      users: [{
        userId: 'usr-' + uuid(), name: 'Glenn Matias', email: 'glenn@magnumcpa.com',
        passwordHash: hash('ChangeMe123!', salt), salt: salt,
        role: 'admin', active: true, mustChangePassword: true, createdAt: nowIso()
      }],
      sessions: [],
      courses: [],      // { meta:{...}, tasks:[...], quiz:[...] }
      updates: [],      // { updateId, title, summary, bodyHtml, status, createdAt, publishedAt }
      progress: [],
      certificates: [],
      links: [],
      settings: {
        teamEmail: '', ccList: '', completionFormUrl: '',
        defaultPassThreshold: '85', sessionHours: '12', firmName: 'Magnum CPA Academy'
      }
    };
  }

  function load() {
    try {
      var db = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
      if (db && db.users) return db;
    } catch (e) { /* corrupted — reseed */ }
    var fresh = freshDb();
    save(fresh);
    return fresh;
  }

  function save(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

  function sanitizeHtml(html) {
    return String(html)
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<script\b[^>]*>/gi, '')
      .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'\s>]*/gi, '$1=$2#');
  }

  function requireSession(db, token, role) {
    var sess = db.sessions.find(function (s) { return s.token === token; });
    if (!sess || new Date(sess.expiresAt).getTime() < Date.now()) throw new Error('AUTH_EXPIRED');
    if (role === 'admin' && sess.role !== 'admin') throw new Error('FORBIDDEN');
    return sess;
  }

  function findCourse(db, courseId) {
    var c = db.courses.find(function (x) { return x.meta.courseId === courseId; });
    if (!c) throw new Error('Course not found.');
    return c;
  }

  function metaToClient(meta) { return JSON.parse(JSON.stringify(meta)); }

  function progressToClient(r) {
    return {
      courseId: r.courseId, certName: r.certName, registeredAt: r.registeredAt,
      completedTaskIds: r.completedTaskIds.slice(),
      quizAttempts: r.quizAttempts, bestScorePct: r.bestScorePct,
      passed: r.passed, passedAt: r.passedAt || ''
    };
  }

  function validateCourseForPublish(tasks, quiz) {
    if (!tasks.length) throw new Error('Add at least one task before publishing.');
    tasks.forEach(function (t, i) {
      if (!t.title) throw new Error('Task ' + (i + 1) + ' needs a title.');
      if (!t.video || !t.video.embed) throw new Error('Task "' + (t.title || (i + 1)) + '" needs a valid video link.');
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

  var ACTIONS = {

    login: function (db, token, p) {
      var email = String(p.email || '').trim().toLowerCase();
      var user = db.users.find(function (u) { return u.email.toLowerCase() === email && u.active; });
      if (!user || hash(String(p.password || ''), user.salt) !== user.passwordHash) {
        throw new Error('Invalid email or password.');
      }
      db.sessions = db.sessions.filter(function (s) { return new Date(s.expiresAt).getTime() >= Date.now(); });
      var newToken = 'tok-' + uuid() + uuid();
      var hours = Number(db.settings.sessionHours) || 12;
      db.sessions.push({ token: newToken, userId: user.userId, role: user.role,
                         createdAt: nowIso(), expiresAt: new Date(Date.now() + hours * 3600000).toISOString() });
      return {
        token: newToken,
        user: { userId: user.userId, name: user.name, email: user.email, role: user.role },
        mustChangePassword: !!user.mustChangePassword
      };
    },

    logout: function (db, token) {
      var sess = requireSession(db, token);
      db.sessions = db.sessions.filter(function (s) { return s.token !== sess.token; });
      return {};
    },

    changePassword: function (db, token, p) {
      var sess = requireSession(db, token);
      var user = db.users.find(function (u) { return u.userId === sess.userId; });
      if (!user) throw new Error('User not found.');
      if (hash(String(p.oldPassword || ''), user.salt) !== user.passwordHash) {
        throw new Error('Current password is incorrect.');
      }
      if (String(p.newPassword || '').length < 8) throw new Error('New password must be at least 8 characters.');
      user.salt = uuid();
      user.passwordHash = hash(String(p.newPassword), user.salt);
      user.mustChangePassword = false;
      return {};
    },

    getBootstrap: function (db, token) {
      var sess = requireSession(db, token);
      var user = db.users.find(function (u) { return u.userId === sess.userId; });
      if (!user || !user.active) throw new Error('AUTH_EXPIRED');
      var isAdmin = sess.role === 'admin';
      return {
        user: { userId: user.userId, name: user.name, email: user.email, role: user.role },
        updates: db.updates
          .filter(function (u) { return u.status === 'published'; })
          .map(function (u) { return { updateId: u.updateId, title: u.title, summary: u.summary, publishedAt: u.publishedAt }; })
          .sort(function (a, b) { return a.publishedAt < b.publishedAt ? 1 : -1; }),
        courses: db.courses
          .filter(function (c) { return isAdmin || c.meta.status === 'open'; })
          .map(function (c) { return metaToClient(c.meta); })
          .sort(function (a, b) { return (a.publishedAt || a.createdAt) < (b.publishedAt || b.createdAt) ? 1 : -1; }),
        links: db.links.slice().sort(function (a, b) { return a.sortOrder - b.sortOrder; }),
        myProgress: db.progress.filter(function (r) { return r.userId === sess.userId; }).map(progressToClient),
        myCertificates: db.certificates
          .filter(function (c) { return c.userId === sess.userId; })
          .sort(function (a, b) { return a.issuedAt < b.issuedAt ? 1 : -1; }),
        settingsLite: { firmName: db.settings.firmName || 'Magnum CPA Academy' }
      };
    },

    getUpdate: function (db, token, p) {
      var sess = requireSession(db, token);
      var u = db.updates.find(function (x) { return x.updateId === p.updateId; });
      if (!u || (u.status !== 'published' && sess.role !== 'admin')) throw new Error('Update not found.');
      return { updateId: u.updateId, title: u.title, summary: u.summary,
               status: u.status, bodyHtml: u.bodyHtml, publishedAt: u.publishedAt };
    },

    getCourse: function (db, token, p) {
      var sess = requireSession(db, token);
      var c = findCourse(db, p.courseId);
      if (sess.role !== 'admin' && c.meta.status !== 'open') throw new Error('This course is not currently open.');
      var prog = db.progress.find(function (r) { return r.userId === sess.userId && r.courseId === p.courseId; });
      return {
        meta: metaToClient(c.meta),
        tasks: c.tasks.map(function (t) {
          return { taskId: t.taskId, title: t.title, video: t.video, contentHtml: t.contentHtml };
        }),
        quizMeta: { questionCount: c.quiz.length, passThresholdPct: c.meta.passThresholdPct },
        myProgress: prog ? progressToClient(prog) : null
      };
    },

    registerCourse: function (db, token, p) {
      var sess = requireSession(db, token);
      var c = findCourse(db, p.courseId);
      if (c.meta.status !== 'open') throw new Error('This course is not currently open.');
      var certName = String(p.certName || '').trim();
      if (!certName) throw new Error('Please enter the name to appear on your certificate.');
      if (certName.length > 80) throw new Error('Certificate name is too long (max 80 characters).');
      var existing = db.progress.find(function (r) { return r.userId === sess.userId && r.courseId === p.courseId; });
      if (existing) {
        existing.certName = certName;
        existing.updatedAt = nowIso();
        return { progressId: existing.progressId };
      }
      var progressId = 'prg-' + uuid();
      db.progress.push({
        progressId: progressId, userId: sess.userId, courseId: p.courseId,
        certName: certName, registeredAt: nowIso(), completedTaskIds: [],
        quizAttempts: 0, bestScorePct: null, passed: false, passedAt: '', updatedAt: nowIso()
      });
      return { progressId: progressId };
    },

    saveProgress: function (db, token, p) {
      var sess = requireSession(db, token);
      var c = findCourse(db, p.courseId);
      if (c.meta.status !== 'open') throw new Error('This course is not currently open.');
      var prog = db.progress.find(function (r) { return r.userId === sess.userId && r.courseId === p.courseId; });
      if (!prog) throw new Error('Please register for this course first.');
      var taskIds = c.tasks.map(function (t) { return t.taskId; });
      var idx = taskIds.indexOf(p.taskId);
      if (idx === -1) throw new Error('Unknown task.');
      for (var i = 0; i < idx; i++) {
        if (prog.completedTaskIds.indexOf(taskIds[i]) === -1) throw new Error('Complete the previous tasks first.');
      }
      if (prog.completedTaskIds.indexOf(p.taskId) === -1) prog.completedTaskIds.push(p.taskId);
      prog.updatedAt = nowIso();
      return { completedTaskIds: prog.completedTaskIds.slice() };
    },

    getQuiz: function (db, token, p) {
      var sess = requireSession(db, token);
      var c = findCourse(db, p.courseId);
      if (sess.role !== 'admin' && c.meta.status !== 'open') throw new Error('This course is not currently open.');
      var prog = db.progress.find(function (r) { return r.userId === sess.userId && r.courseId === p.courseId; });
      if (!prog) throw new Error('Please register for this course first.');
      var allDone = c.tasks.every(function (t) { return prog.completedTaskIds.indexOf(t.taskId) !== -1; });
      if (!allDone) throw new Error('Complete all tasks before taking the knowledge check.');
      return {
        questions: c.quiz.map(function (q) { return { qId: q.qId, text: q.text, choices: q.choices.slice() }; }),
        passThresholdPct: c.meta.passThresholdPct
      };
    },

    submitQuiz: function (db, token, p) {
      var sess = requireSession(db, token);
      var c = findCourse(db, p.courseId);
      if (c.meta.status !== 'open') throw new Error('This course is not currently open.');
      var prog = db.progress.find(function (r) { return r.userId === sess.userId && r.courseId === p.courseId; });
      if (!prog) throw new Error('Please register for this course first.');
      if (!c.quiz.length) throw new Error('This course has no knowledge check.');
      var allDone = c.tasks.every(function (t) { return prog.completedTaskIds.indexOf(t.taskId) !== -1; });
      if (!allDone) throw new Error('Complete all tasks before taking the knowledge check.');

      var answers = {};
      (p.answers || []).forEach(function (a) { answers[a.qId] = Number(a.choiceIndex); });
      var perQuestion = c.quiz.map(function (q) {
        return { qId: q.qId, correct: answers[q.qId] === Number(q.correctIndex) };
      });
      var correctCount = perQuestion.filter(function (r) { return r.correct; }).length;
      var scorePct = Math.round((correctCount / c.quiz.length) * 100);
      var threshold = c.meta.passThresholdPct || 85;
      var passed = scorePct >= threshold;

      prog.quizAttempts += 1;
      prog.bestScorePct = Math.max(prog.bestScorePct || 0, scorePct);
      var certificateId = null;
      if (passed) {
        if (!prog.passed) { prog.passed = true; prog.passedAt = nowIso(); }
        var user = db.users.find(function (u) { return u.userId === sess.userId; });
        var existingCert = db.certificates.find(function (x) {
          return x.userId === sess.userId && x.courseId === p.courseId;
        });
        if (existingCert) {
          certificateId = existingCert.certId;
        } else {
          certificateId = 'cert-' + uuid();
          db.certificates.push({
            certId: certificateId, userId: sess.userId,
            certName: prog.certName || (user && user.name) || 'Employee',
            courseId: p.courseId, courseTitle: c.meta.title,
            scorePct: scorePct, taskCount: c.tasks.length, issuedAt: nowIso()
          });
          // Real backend also submits the completion Google Form here.
          console.info('[demo] Completion notification would be sent for', c.meta.title);
        }
      }
      prog.updatedAt = nowIso();
      return { scorePct: scorePct, passed: passed, certificateId: certificateId,
               perQuestion: perQuestion, attempts: prog.quizAttempts, passThresholdPct: threshold };
    },

    getCertificate: function (db, token, p) {
      var sess = requireSession(db, token);
      var cert = db.certificates.find(function (x) { return x.certId === p.certId; });
      if (!cert) throw new Error('Certificate not found.');
      if (sess.role !== 'admin' && cert.userId !== sess.userId) throw new Error('FORBIDDEN');
      return { certId: cert.certId, certName: cert.certName, courseTitle: cert.courseTitle,
               scorePct: cert.scorePct, taskCount: cert.taskCount, issuedAt: cert.issuedAt };
    },

    /* ── admin ── */

    adminSaveCourse: function (db, token, p) {
      requireSession(db, token, 'admin');
      var input = p.course || {};
      var title = String(input.title || '').trim();
      if (!title) throw new Error('Course title is required.');
      var tasks = (input.tasks || []).map(function (t) {
        return { taskId: t.taskId || ('t-' + uuid()), title: String(t.title || '').trim(),
                 video: t.video || null, contentHtml: sanitizeHtml(String(t.contentHtml || '')) };
      });
      var quiz = (input.quiz || []).map(function (q) {
        return { qId: q.qId || ('q-' + uuid()), text: String(q.text || '').trim(),
                 choices: (q.choices || []).map(String), correctIndex: Number(q.correctIndex) };
      });
      var status = input.status || 'draft';
      if (status === 'open') validateCourseForPublish(tasks, quiz);
      var threshold = Number(input.passThresholdPct) || Number(db.settings.defaultPassThreshold) || 85;
      var now = nowIso();

      if (input.courseId) {
        var c = findCourse(db, input.courseId);
        c.meta.title = title;
        c.meta.description = String(input.description || '');
        c.meta.status = status;
        c.meta.registrationFormUrl = String(input.registrationFormUrl || '');
        c.meta.passThresholdPct = threshold;
        c.meta.taskCount = tasks.length;
        c.meta.questionCount = quiz.length;
        c.meta.updatedAt = now;
        if (status === 'open' && !c.meta.publishedAt) c.meta.publishedAt = now;
        c.tasks = tasks;
        c.quiz = quiz;
        return { courseId: input.courseId };
      }
      var courseId = 'crs-' + uuid();
      db.courses.push({
        meta: {
          courseId: courseId, title: title, description: String(input.description || ''),
          status: status, registrationFormUrl: String(input.registrationFormUrl || ''),
          passThresholdPct: threshold, taskCount: tasks.length, questionCount: quiz.length,
          createdAt: now, updatedAt: now, publishedAt: status === 'open' ? now : ''
        },
        tasks: tasks, quiz: quiz
      });
      return { courseId: courseId };
    },

    adminGetCourseFull: function (db, token, p) {
      requireSession(db, token, 'admin');
      var c = findCourse(db, p.courseId);
      return { meta: metaToClient(c.meta), tasks: JSON.parse(JSON.stringify(c.tasks)),
               quiz: JSON.parse(JSON.stringify(c.quiz)) };
    },

    adminSetCourseStatus: function (db, token, p) {
      requireSession(db, token, 'admin');
      var c = findCourse(db, p.courseId);
      if (['draft', 'open', 'closed'].indexOf(p.status) === -1) throw new Error('Invalid status.');
      if (p.status === 'open') validateCourseForPublish(c.tasks, c.quiz);
      c.meta.status = p.status;
      c.meta.updatedAt = nowIso();
      if (p.status === 'open' && !c.meta.publishedAt) c.meta.publishedAt = nowIso();
      return {};
    },

    adminDeleteCourse: function (db, token, p) {
      requireSession(db, token, 'admin');
      findCourse(db, p.courseId);
      db.courses = db.courses.filter(function (c) { return c.meta.courseId !== p.courseId; });
      db.progress = db.progress.filter(function (r) { return r.courseId !== p.courseId; });
      return {};
    },

    adminSaveUpdate: function (db, token, p) {
      requireSession(db, token, 'admin');
      var title = String(p.title || '').trim();
      if (!title) throw new Error('Update title is required.');
      var status = p.status === 'published' ? 'published' : 'draft';
      var now = nowIso();
      if (p.updateId) {
        var u = db.updates.find(function (x) { return x.updateId === p.updateId; });
        if (!u) throw new Error('Update not found.');
        u.title = title;
        u.summary = String(p.summary || '');
        u.bodyHtml = sanitizeHtml(String(p.bodyHtml || ''));
        u.status = status;
        if (status === 'published' && !u.publishedAt) u.publishedAt = now;
        return { updateId: u.updateId };
      }
      var updateId = 'upd-' + uuid();
      db.updates.push({
        updateId: updateId, title: title, summary: String(p.summary || ''),
        bodyHtml: sanitizeHtml(String(p.bodyHtml || '')), status: status,
        createdAt: now, publishedAt: status === 'published' ? now : ''
      });
      return { updateId: updateId };
    },

    adminSetUpdateStatus: function (db, token, p) {
      requireSession(db, token, 'admin');
      var u = db.updates.find(function (x) { return x.updateId === p.updateId; });
      if (!u) throw new Error('Update not found.');
      u.status = p.status === 'published' ? 'published' : 'draft';
      if (u.status === 'published' && !u.publishedAt) u.publishedAt = nowIso();
      return {};
    },

    adminDeleteUpdate: function (db, token, p) {
      requireSession(db, token, 'admin');
      db.updates = db.updates.filter(function (x) { return x.updateId !== p.updateId; });
      return {};
    },

    adminGetTracking: function (db, token) {
      requireSession(db, token, 'admin');
      var cells = {};
      db.progress.forEach(function (r) {
        cells[r.userId + '|' + r.courseId] = {
          registered: true, tasksDone: r.completedTaskIds.length,
          quizAttempts: r.quizAttempts, bestScorePct: r.bestScorePct,
          passed: r.passed, passedAt: r.passedAt
        };
      });
      return {
        courses: db.courses
          .filter(function (c) { return c.meta.status !== 'draft'; })
          .map(function (c) { return { courseId: c.meta.courseId, title: c.meta.title,
                                       status: c.meta.status, taskCount: c.meta.taskCount }; }),
        employees: db.users
          .filter(function (u) { return u.role === 'employee' && u.active; })
          .map(function (u) { return { userId: u.userId, name: u.name, email: u.email }; }),
        cells: cells
      };
    },

    adminListEmployees: function (db, token) {
      requireSession(db, token, 'admin');
      return db.users.map(function (u) {
        return { userId: u.userId, name: u.name, email: u.email, role: u.role,
                 active: u.active, mustChangePassword: u.mustChangePassword, createdAt: u.createdAt };
      });
    },

    adminSaveEmployee: function (db, token, p) {
      var sess = requireSession(db, token, 'admin');
      var name = String(p.name || '').trim();
      var email = String(p.email || '').trim().toLowerCase();
      if (!name || !email) throw new Error('Name and email are required.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
      var dupe = db.users.find(function (u) { return u.email.toLowerCase() === email && u.userId !== p.userId; });
      if (dupe) throw new Error('An account with that email already exists.');

      if (p.userId) {
        var user = db.users.find(function (u) { return u.userId === p.userId; });
        if (!user) throw new Error('Employee not found.');
        if (user.role === 'admin' && p.active === false && user.userId === sess.userId) {
          throw new Error('You cannot deactivate your own admin account.');
        }
        user.name = name;
        user.email = email;
        user.active = p.active !== false;
        if (p.password) {
          if (String(p.password).length < 8) throw new Error('Password must be at least 8 characters.');
          user.salt = uuid();
          user.passwordHash = hash(String(p.password), user.salt);
          user.mustChangePassword = true;
          db.sessions = db.sessions.filter(function (s) { return s.userId !== user.userId; });
        }
        if (!user.active) db.sessions = db.sessions.filter(function (s) { return s.userId !== user.userId; });
        return { userId: user.userId };
      }

      var password = String(p.password || '');
      if (password.length < 8) throw new Error('Set a temporary password of at least 8 characters.');
      var salt = uuid();
      var userId = 'usr-' + uuid();
      db.users.push({
        userId: userId, name: name, email: email,
        passwordHash: hash(password, salt), salt: salt,
        role: p.role === 'admin' ? 'admin' : 'employee',
        active: true, mustChangePassword: true, createdAt: nowIso()
      });
      return { userId: userId };
    },

    adminResetPassword: function (db, token, p) {
      requireSession(db, token, 'admin');
      var user = db.users.find(function (u) { return u.userId === p.userId; });
      if (!user) throw new Error('Employee not found.');
      if (String(p.newPassword || '').length < 8) throw new Error('Password must be at least 8 characters.');
      user.salt = uuid();
      user.passwordHash = hash(String(p.newPassword), user.salt);
      user.mustChangePassword = true;
      db.sessions = db.sessions.filter(function (s) { return s.userId !== user.userId; });
      return {};
    },

    adminSaveLinks: function (db, token, p) {
      requireSession(db, token, 'admin');
      db.links = (p.links || []).map(function (l, i) {
        var label = String(l.label || '').trim();
        var url = String(l.url || '').trim();
        if (!label || !url) throw new Error('Every link needs a label and a URL.');
        if (!/^https?:\/\//i.test(url)) throw new Error('Link "' + label + '" must start with http:// or https://');
        return { linkId: l.linkId || ('lnk-' + uuid()), label: label, url: url,
                 description: String(l.description || ''), sortOrder: i };
      });
      return {};
    },

    adminGetSettings: function (db, token) {
      requireSession(db, token, 'admin');
      return JSON.parse(JSON.stringify(db.settings));
    },

    adminSaveSettings: function (db, token, p) {
      requireSession(db, token, 'admin');
      Object.keys(db.settings).forEach(function (key) {
        if (key in p) db.settings[key] = String(p[key]);
      });
      return JSON.parse(JSON.stringify(db.settings));
    }
  };

  return {
    handle: function (action, token, payload) {
      return new Promise(function (resolve) {
        // small delay to exercise the same loading states as the real API
        setTimeout(function () {
          var db = load();
          try {
            var fn = ACTIONS[action];
            if (!fn) throw new Error('Unknown action: ' + action);
            var data = fn(db, token, payload || {});
            save(db);
            resolve({ ok: true, data: data });
          } catch (err) {
            resolve({ ok: false, error: String(err.message || err) });
          }
        }, 120);
      });
    }
  };
})();
