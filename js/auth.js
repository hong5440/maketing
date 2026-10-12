/* ================================================================
   심리 마케팅 — 인증 모듈 (PMAuth)
   ----------------------------------------------------------------
   - 이메일 회원가입/로그인 (비밀번호 SHA-256 해시, localStorage 저장)
   - 카카오 간편가입: OAuth 2.0 리다이렉트 방식 (SDK 불필요, 서버 불필요)
       KAKAO_REST_API_KEY 설정 시 실제 연동, 미설정 시 데모 플로우
   - 구글 간편가입: Google Identity Services
       GOOGLE_CLIENT_ID 설정 시 실제 연동, 미설정 시 데모 플로우
   ================================================================ */
(function () {
  'use strict';

  const LS_USERS = 'pm_users';
  const LS_SESSION = 'pm_session';
  const SALT = 'pm::v2::';

  /* ---------- 저장소 유틸 ---------- */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- 해시 ---------- */
  async function sha256(text) {
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SALT + text));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* 보안 컨텍스트가 아니면 아래 폴백 사용 */ }
    // 폴백: 단순 해시 (file:// 등 비보안 컨텍스트 전용)
    let h1 = 0x811c9dc5;
    const s = SALT + text;
    for (let i = 0; i < s.length; i++) {
      h1 ^= s.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193) >>> 0;
    }
    return 'fb_' + h1.toString(16) + '_' + s.length;
  }

  function uid() {
    return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- 사용자 ---------- */
  function getUsers() { return readJSON(LS_USERS, []); }
  function saveUsers(users) { return writeJSON(LS_USERS, users); }
  function findByEmail(email) {
    return getUsers().find((u) => u.email && u.email.toLowerCase() === String(email).toLowerCase());
  }

  function setSession(user) {
    writeJSON(LS_SESSION, {
      userId: user.id,
      name: user.name,
      email: user.email,
      provider: user.provider,
      avatar: user.avatar || null,
      plan: user.plan || 'free',
      loginAt: new Date().toISOString(),
    });
  }

  /* ---------- 공개 API ---------- */
  const PMAuth = {
    /** 현재 로그인 세션 (없으면 null) */
    current() { return readJSON(LS_SESSION, null); },

    /** 로그인 필수 페이지에서 호출: 미로그인 시 랜딩으로 이동 */
    requireAuth() {
      const s = this.current();
      if (!s) {
        location.href = 'index.html#login';
        return null;
      }
      return s;
    },

    logout() {
      localStorage.removeItem(LS_SESSION);
    },

    /** 이메일 회원가입 */
    async signup(name, email, password) {
      name = String(name || '').trim();
      email = String(email || '').trim();
      if (!name) throw new Error('이름을 입력해 주세요.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('올바른 이메일 주소를 입력해 주세요.');
      if (!password || password.length < 6) throw new Error('비밀번호는 6자 이상이어야 합니다.');
      if (findByEmail(email)) throw new Error('이미 가입된 이메일입니다. 로그인해 주세요.');

      const user = {
        id: uid(),
        name,
        email,
        passhash: await sha256(password),
        provider: 'email',
        plan: 'free',
        createdAt: new Date().toISOString(),
      };
      const users = getUsers();
      users.push(user);
      if (!saveUsers(users)) throw new Error('브라우저 저장소에 접근할 수 없습니다.');
      setSession(user);
      return user;
    },

    /** 이메일 로그인 */
    async login(email, password) {
      const user = findByEmail(email);
      if (!user || user.provider !== 'email') throw new Error('가입되지 않은 이메일입니다.');
      const hash = await sha256(password || '');
      if (user.passhash !== hash) throw new Error('비밀번호가 올바르지 않습니다.');
      setSession(user);
      return user;
    },

    /** 소셜(간편) 로그인 — 프로필로 가입 또는 로그인 */
    socialLogin(provider, profile) {
      const email = profile.email || (provider + '_' + (profile.pid || uid()) + '@social.local');
      let user = findByEmail(email);
      if (!user) {
        user = {
          id: uid(),
          name: profile.name || (provider === 'kakao' ? '카카오 회원' : '구글 회원'),
          email,
          provider,
          avatar: profile.avatar || null,
          plan: 'free',
          createdAt: new Date().toISOString(),
        };
        const users = getUsers();
        users.push(user);
        saveUsers(users);
      } else {
        user.name = profile.name || user.name;
        user.avatar = profile.avatar || user.avatar;
        saveUsers(getUsers().map((u) => (u.id === user.id ? user : u)));
      }
      setSession(user);
      return user;
    },

    /** 데모 계정 원클릭 로그인 */
    demoLogin() {
      return this.socialLogin('demo', {
        pid: 'demo',
        name: '데모 사장님',
        email: 'demo@simli.app',
      });
    },

    /** 데모 간편가입 완료 처리 */
    socialDemoComplete(provider, nickname) {
      const name = String(nickname || '').trim() || (provider === 'kakao' ? '카카오 회원' : '구글 회원');
      return this.socialLogin(provider + '-demo', {
        pid: provider + '_' + Date.now().toString(36),
        name,
        email: '',
      });
    },

    /** 프로필 이름 변경 */
    updateName(newName) {
      const s = this.current();
      if (!s) return;
      const users = getUsers().map((u) => (u.id === s.userId ? Object.assign(u, { name: newName }) : u));
      saveUsers(users);
      s.name = newName;
      writeJSON(LS_SESSION, s);
    },

    /* ================================================================
       카카오 — OAuth 2.0 인가 코드 리다이렉트 방식 (SDK·서버 불필요)
       1) kakaoLogin(): kauth.kakao.com 인증 페이지로 이동
       2) 동의 후 ?code=... 와 함께 이 페이지로 복귀
       3) handleKakaoCallback(): 토큰 교환(kauth는 CORS 허용) → 프로필 조회 → 로그인
       * 카카오 콘솔 설정: Redirect URI 등록 + Client Secret "사용 안 함"
       ================================================================ */
    kakaoConfigured() {
      return !!((window.PM_CONFIG || {}).KAKAO_REST_API_KEY);
    },

    /** 등록해야 하는 Redirect URI (index.html을 뗀 디렉터리 주소) */
    kakaoRedirectUri() {
      return location.origin + location.pathname.replace(/index\.html$/, '');
    },

    /** 카카오 로그인 시작. 키가 없으면 {mode:'demo'} 반환 → UI가 데모 플로우 진행 */
    kakaoLogin() {
      if (!this.kakaoConfigured()) return Promise.resolve({ mode: 'demo' });
      const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { sessionStorage.setItem('pm_kakao_state', state); } catch (e) { /* ignore */ }
      const url = 'https://kauth.kakao.com/oauth/authorize'
        + '?response_type=code'
        + '&client_id=' + encodeURIComponent(window.PM_CONFIG.KAKAO_REST_API_KEY)
        + '&redirect_uri=' + encodeURIComponent(this.kakaoRedirectUri())
        + '&state=' + encodeURIComponent(state);
      location.href = url;
      return new Promise(() => { /* 페이지가 이동하므로 resolve되지 않음 */ });
    },

    /**
     * 카카오 인증 후 복귀 처리. 랜딩 페이지 로드 시 1회 호출.
     * @returns {Promise<object|null>} 로그인된 사용자, 콜백 상황이 아니면 null
     */
    async handleKakaoCallback() {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const err = params.get('error');
      if (!code && !err) return null;

      // 새로고침 시 코드 재사용 방지: 주소에서 쿼리 제거
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ }

      if (err) {
        throw new Error('카카오 로그인이 취소되었거나 실패했습니다. (' + (params.get('error_description') || err) + ')');
      }
      if (!this.kakaoConfigured()) return null;

      // CSRF 방지용 state 검증
      let saved = null;
      try {
        saved = sessionStorage.getItem('pm_kakao_state');
        sessionStorage.removeItem('pm_kakao_state');
      } catch (e) { /* ignore */ }
      const state = params.get('state');
      if (saved && state && saved !== state) {
        throw new Error('보안 검증(state)에 실패했습니다. 다시 시도해 주세요.');
      }

      // 1) 인가 코드 → 액세스 토큰 (kauth는 브라우저 CORS 호출 허용)
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: window.PM_CONFIG.KAKAO_REST_API_KEY,
        redirect_uri: this.kakaoRedirectUri(),
        code: code,
      });
      const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: body.toString(),
      });
      if (!tokenRes.ok) {
        throw new Error('카카오 토큰 발급 실패(' + tokenRes.status + ') — 콘솔의 Redirect URI 등록값과 REST API 키, Client Secret "사용 안 함" 설정을 확인해 주세요.');
      }
      const token = await tokenRes.json();

      // 2) 액세스 토큰 → 사용자 프로필
      const meRes = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: 'Bearer ' + token.access_token },
      });
      if (!meRes.ok) throw new Error('카카오 프로필 조회에 실패했습니다. (' + meRes.status + ')');
      const me = await meRes.json();
      const acc = me.kakao_account || {};
      const prof = acc.profile || {};
      return this.socialLogin('kakao', {
        pid: me.id,
        name: prof.nickname,
        email: acc.email,
        avatar: prof.thumbnail_image_url,
      });
    },

    /* ================================================================
       구글 — Google Identity Services (완전 클라이언트 사이드)
       ================================================================ */
    googleAvailable() {
      return !!((window.PM_CONFIG || {}).GOOGLE_CLIENT_ID && window.google && window.google.accounts);
    },

    renderGoogleButton(container, onLogin) {
      const cfg = window.PM_CONFIG || {};
      if (!this.googleAvailable()) return false;
      const self = this;
      window.google.accounts.id.initialize({
        client_id: cfg.GOOGLE_CLIENT_ID,
        callback(resp) {
          try {
            const payload = JSON.parse(decodeURIComponent(escape(atob(resp.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
            const user = self.socialLogin('google', {
              pid: payload.sub,
              name: payload.name,
              email: payload.email,
              avatar: payload.picture,
            });
            if (onLogin) onLogin(user);
          } catch (e) {
            console.error('Google credential parse 실패', e);
          }
        },
      });
      window.google.accounts.id.renderButton(container, {
        theme: 'outline', size: 'large', width: container.offsetWidth || 320,
        text: 'continue_with', locale: 'ko',
      });
      return true;
    },
  };

  window.PMAuth = PMAuth;
})();
