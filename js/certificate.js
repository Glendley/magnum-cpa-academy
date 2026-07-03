/* ============================================================
   Magnum CPA Academy — certificate viewer
   Loads the certificate record (?certId=…) and fills the
   printable A4 template. Only the owner (or an admin) can view.
   ============================================================ */

(function () {
  var user = requireLogin();
  if (!user) return;

  var certId = qsParam('certId');
  var loading = document.getElementById('cert-loading');

  if (!certId) {
    loading.textContent = 'No certificate specified.';
    return;
  }

  api('getCertificate', { certId: certId }).then(function (cert) {
    document.getElementById('certName').textContent = cert.certName || '—';
    document.getElementById('certCourse').textContent = cert.courseTitle || '—';
    document.getElementById('certDate').textContent = fmtDate(cert.issuedAt);
    document.getElementById('certModules').textContent =
      cert.taskCount + ' Task' + (cert.taskCount === 1 ? '' : 's');
    document.getElementById('certScore').textContent = cert.scorePct + '%';
    document.title = 'Certificate — ' + cert.certName + ' — ' + cert.courseTitle;

    loading.style.display = 'none';
    document.getElementById('cert-wrap').style.display = 'flex';
  }).catch(function (err) {
    loading.textContent = err.message;
  });
})();
