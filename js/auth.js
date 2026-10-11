/* ================================================================
   심리 마케팅 — 인증 모듈 (PMAuth)
   ----------------------------------------------------------------
   - 이메일 회원가입/로그인 (비밀번호 SHA-256 해시, localStorage 저장)
   - 카카오 간편가입: PM_CONFIG.KAKAO_JS_KEY 설정 시 실제 카카오 SDK,
     미설정 시 데모 간편가입 플로우
   - 구글 간편가입: PM_CONFIG.GOOGLE_CLIENT_ID 설정 시 Google Identity
     Services, 미설정 시 데모 간편가입 플로우
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

    /** 프로필 이름 변경 */
    updateName(newName) {
      const s = this.current();
      if (!s) return;
      const users = getUsers().map((u) => (u.id === s.userId ? Object.assign(u, { name: newName }) : u));
      saveUsers(users);
      s.name = newName;
      writeJSON(LS_SESSION, s);
    },

    /* ============ 카카오 ============ */
    kakaoReady: false,

    initKakao() {
      const key = (window.PM_CONFIG || {}).KAKAO_JS_KEY;
      if (!key) return false;
      if (this.kakaoReady) return true;
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(key);
      }
      this.kakaoReady = !!(window.Kakao && window.Kakao.isInitialized());
      return this.kakaoReady;
    },

    /**
     * 카카오 로그인. 키가 있으면 실제 SDK 팝업, 없으면 데모 플로우.
     * @returns {Promise<{mode:'real'|'demo', user?:object}>}
     */
    kakaoLogin() {
      const self = this;
      return new Promise((resolve, reject) => {
        if (self.initKakao() && window.Kakao && window.Kakao.Auth && window.Kakao.Auth.login) {
          window.Kakao.Auth.login({
            scope: 'profile_nickname, account_email',
            success() {
              window.Kakao.API.request({
                url: '/v2/user/me',
                success(res) {
                  const acc = res.kakao_account || {};
                  const prof = acc.profile || {};
                  const user = self.socialLogin('kakao', {
                    pid: res.id,
                    name: prof.nickname,
                    email: acc.email,
                    avatar: prof.thumbnail_image_url,
                  });
                  resolve({ mode: 'real', user });
                },
                fail(err) { reject(new Error('카카오 프로필 조회에 실패했습니다.')); },
              });
            },
            fail() { reject(new Error('카카오 로그인이 취소되었습니다.')); },
          });
        } else {
          // 키 미설정 → 데모 간편가입 플로우 (UI 쪽에서 닉네임을 받아 완료)
          resolve({ mode: 'demo' });
        }
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

    /* ============ 구글 ============ */
    /**
     * 구글 로그인. GOOGLE_CLIENT_ID가 있으면 GIS 사용, 없으면 데모 플로우.
     * 실제 모드에서는 지정한 컨테이너에 공식 구글 버튼을 렌더링한다.
     */
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
