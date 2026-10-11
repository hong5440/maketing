/* ================================================================
   심리 마케팅 — 공용 UI 헬퍼 (PMUI)
   토스트 / 클립보드 복사 / 외부 스크립트 로더 / 비디오 폴백
   ================================================================ */
(function () {
  'use strict';

  const PMUI = {
    /** 토스트 알림 */
    toast(msg, type) {
      let wrap = document.getElementById('toastWrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'toastWrap';
        wrap.className = 'toast-wrap';
        document.body.appendChild(wrap);
      }
      const el = document.createElement('div');
      el.className = 'toast ' + (type === 'err' ? 'err' : 'ok');
      el.textContent = msg;
      wrap.appendChild(el);
      setTimeout(() => {
        el.style.transition = 'opacity 0.35s, transform 0.35s';
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        setTimeout(() => el.remove(), 380);
      }, 2300);
    },

    /** 클립보드 복사 (Clipboard API → execCommand 폴백) */
    async copyText(text) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
        throw new Error('insecure');
      } catch (e) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
          document.body.appendChild(ta);
          ta.select();
          ta.setSelectionRange(0, ta.value.length);
          const ok = document.execCommand('copy');
          ta.remove();
          return ok;
        } catch (e2) {
          return false;
        }
      }
    },

    /** 결과 복사 + 토스트 */
    async copyWithToast(text, okMsg) {
      const ok = await this.copyText(text);
      this.toast(ok ? (okMsg || '클립보드에 복사되었습니다 📋') : '복사에 실패했습니다. 길게 눌러 직접 복사해 주세요.', ok ? 'ok' : 'err');
      return ok;
    },

    /** 외부 스크립트 로더 */
    loadScript(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('script load fail: ' + src));
        document.head.appendChild(s);
      });
    },

    /**
     * 비디오 로드 실패 시 컨테이너에 video-failed 클래스 부여
     * (로컬 소스 → CDN 소스 순서로 시도 후 모두 실패하면 그라데이션 폴백 유지)
     */
    guardVideo(videoEl, containerEl) {
      if (!videoEl) return;
      const container = containerEl || videoEl.parentElement;
      const sources = videoEl.querySelectorAll('source');
      const last = sources[sources.length - 1];
      const fail = () => container && container.classList.add('video-failed');
      if (last) last.addEventListener('error', fail);
      videoEl.addEventListener('error', fail);
      setTimeout(() => {
        // NETWORK_NO_SOURCE(3) 또는 아무 데이터도 못 받은 경우
        if (videoEl.networkState === 3 || (videoEl.readyState === 0 && videoEl.networkState === 0)) fail();
      }, 6000);
      // 모바일 자동재생 보강
      const tryPlay = () => videoEl.play().catch(() => {});
      if (document.readyState === 'complete') tryPlay();
      else window.addEventListener('load', tryPlay, { once: true });
    },
  };

  window.PMUI = PMUI;
})();
