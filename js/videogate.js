/* ============================================================
   Magnum CPA Academy — shared video mounting + "finished" gates
   ------------------------------------------------------------
   Used by both the employee course player (course.js) and the
   client course viewer (client-course.js). Fully decoupled from
   progress/quiz state — just mounts a video into #video-shell and
   calls onEnded() once the viewer has (probably) watched it.
   ============================================================ */

var _gateTimer = null;
var _ytPlayer = null;

function clearGate() {
  if (_gateTimer) { clearInterval(_gateTimer); _gateTimer = null; }
  if (_ytPlayer && _ytPlayer.destroy) { try { _ytPlayer.destroy(); } catch (e) {} _ytPlayer = null; }
}

/**
 * Browsers only allow unmuted autoplay when it's tied to a user gesture
 * (which most task transitions here are — a click). Try unmuted first;
 * if the browser blocks it, fall back to muted so playback always
 * starts at least visually, and the viewer can unmute with one click.
 */
function attemptAutoplay(mediaEl) {
  var p = mediaEl.play();
  if (p && p.catch) {
    p.catch(function () {
      mediaEl.muted = true;
      mediaEl.play().catch(function () {});
    });
  }
}

function mountVideo(video, onEnded) {
  clearGate();
  var host = document.getElementById('video-shell');

  if (video.type === 'mp4') {
    host.innerHTML = '<video controls autoplay playsinline preload="auto" src="' + escapeHtml(video.embed) + '"></video>';
    var videoEl = host.querySelector('video');
    videoEl.addEventListener('ended', onEnded);
    attemptAutoplay(videoEl);
    return;
  }

  if (video.type === 'youtube') {
    var holderId = 'yt-holder-' + Math.random().toString(36).slice(2);
    host.innerHTML = '<div id="' + holderId + '"></div>';
    loadYouTubeApi(function () {
      _ytPlayer = new YT.Player(holderId, {
        videoId: video.videoId,
        playerVars: { rel: 0, modestbranding: 1, autoplay: 1, playsinline: 1 },
        events: {
          onReady: function (e) {
            try { e.target.playVideo(); } catch (err) {}
            // If the browser blocked unmuted autoplay, the state won't
            // have advanced to "playing" shortly after — mute and retry.
            setTimeout(function () {
              try {
                if (e.target.getPlayerState() !== 1) {
                  e.target.mute();
                  e.target.playVideo();
                }
              } catch (err) {}
            }, 700);
          },
          onStateChange: function (e) {
            if (e.data === YT.PlayerState.ENDED) onEnded();
          }
        }
      });
    });
    return;
  }

  // Google Drive preview iframe: no end event and no reliable autoplay
  // control (best-effort query param only) — gate stays purely on time.
  var driveSrc = video.embed + (video.embed.indexOf('?') === -1 ? '?' : '&') + 'autoplay=1';
  host.innerHTML = '<iframe src="' + escapeHtml(driveSrc) + '" allow="autoplay; fullscreen" allowfullscreen></iframe>';
  var gateMsg = document.getElementById('gate-msg');
  var waitSec = Math.max(Math.round((video.durationSec || 0) * 0.85), 30);
  var left = waitSec;
  _gateTimer = setInterval(function () {
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

var _ytApiLoading = false, _ytApiQueue = [];
function loadYouTubeApi(cb) {
  if (window.YT && window.YT.Player) { cb(); return; }
  _ytApiQueue.push(cb);
  if (_ytApiLoading) return;
  _ytApiLoading = true;
  window.onYouTubeIframeAPIReady = function () {
    _ytApiQueue.forEach(function (fn) { fn(); });
    _ytApiQueue = [];
  };
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}
