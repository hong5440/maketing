/* ================================================================
   심리 마케팅 — 랜딩 페이지 스크립트
   ================================================================ */
(function () {
  'use strict';
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => Array.from((p || document).querySelectorAll(s));
  const CFG = window.PM_CONFIG || {};

  /* ---------------- 내비게이션 ---------------- */
  const nav = $('#nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  const burger = $('#burger');
  const navMobile = $('#navMobile');
  burger.addEventListener('click', () => navMobile.classList.toggle('open'));
  $$('#navMobile a').forEach((a) => a.addEventListener('click', () => navMobile.classList.remove('open')));

  /* ---------------- 스크롤 리빌 ---------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------------- 히어로 카운트업 ---------------- */
  const statIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      statIo.unobserve(e.target);
      const target = Number(e.target.dataset.count) || 0;
      const suffix = e.target.dataset.suffix || '';
      const t0 = performance.now();
      const dur = 1400;
      (function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        e.target.textContent = Math.round(target * eased).toLocaleString('ko-KR') + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.5 });
  $$('[data-count]').forEach((el) => statIo.observe(el));

  /* ---------------- Seedance 비디오 폴백 가드 ---------------- */
  PMUI.guardVideo($('#heroVideo'), $('#heroMedia'));
  PMUI.guardVideo($('#mobileVideo'), $('#phoneScreen'));

  /* ---------------- 심리 원리 그리드 ---------------- */
  const psyGrid = $('#psyGrid');
  if (psyGrid && window.PMEngine) {
    psyGrid.innerHTML = Object.values(PMEngine.PRINCIPLES).map((p) => `
      <div class="psy-card reveal">
        <div class="psy-top"><span class="psy-emoji">${p.emoji}</span><h3>${p.name}</h3></div>
        <p>${p.desc}</p>
      </div>
    `).join('');
    $$('.psy-card', psyGrid).forEach((el) => io.observe(el));
  }

  /* ---------------- 30초 데모 ---------------- */
  const demoInput = $('#demoInput');
  const demoBtn = $('#demoBtn');
  const demoResults = $('#demoResults');
  let demoNonce = 0;

  function runDemo() {
    const product = demoInput.value.trim();
    if (!product) {
      PMUI.toast('상품명을 먼저 입력해 주세요!', 'err');
      demoInput.focus();
      return;
    }
    demoNonce++;
    const items = PMEngine.quickHeadlines(product, demoNonce);
    demoResults.innerHTML = items.map((it, i) => `
      <div class="demo-item" style="animation-delay:${i * 0.12}s">
        <span class="trig">${it.trigger}</span>
        <span class="txt">${it.text}</span>
        <button class="btn btn-ghost btn-sm" data-copy="${encodeURIComponent(it.text)}">복사</button>
      </div>
    `).join('');
    $$('[data-copy]', demoResults).forEach((btn) => {
      btn.addEventListener('click', () => PMUI.copyWithToast(decodeURIComponent(btn.dataset.copy)));
    });
  }
  demoBtn.addEventListener('click', runDemo);
  demoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runDemo(); });

  /* ================================================================
     인증 모달
     ================================================================ */
  const authModal = $('#authModal');
  const socialDemoModal = $('#socialDemoModal');
  const tabLogin = $('#tabLogin');
  const tabSignup = $('#tabSignup');
  const nameField = $('#nameField');
  const authTitle = $('#authTitle');
  const authSub = $('#authSub');
  const authSubmit = $('#authSubmit');
  const authError = $('#authError');
  let authMode = 'login';
  let socialProvider = 'kakao';

  function openModal(m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeModal(m) { m.classList.remove('open'); document.body.style.overflow = ''; }
  $$('.modal-backdrop').forEach((bd) => {
    bd.addEventListener('click', (e) => { if (e.target === bd) closeModal(bd); });
    $$('[data-close-modal]', bd).forEach((btn) => btn.addEventListener('click', () => closeModal(bd)));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal-backdrop.open').forEach(closeModal);
  });

  function setAuthMode(mode) {
    authMode = mode;
    const isLogin = mode === 'login';
    tabLogin.classList.toggle('on', isLogin);
    tabSignup.classList.toggle('on', !isLogin);
    nameField.style.display = isLogin ? 'none' : 'block';
    authTitle.textContent = isLogin ? '다시 만나서 반가워요' : '3초면 충분해요';
    authSub.textContent = isLogin ? '로그인하고 이어서 만들어 보세요.' : '가입 즉시 4가지 AI 도구를 무료로 쓸 수 있어요.';
    authSubmit.textContent = isLogin ? '로그인' : '무료 회원가입';
    authError.textContent = '';
    $('#authPw').setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
  }
  tabLogin.addEventListener('click', () => setAuthMode('login'));
  tabSignup.addEventListener('click', () => setAuthMode('signup'));

  function openAuth(mode) {
    // 이미 로그인 상태라면 바로 대시보드로
    if (PMAuth.current()) { location.href = 'dashboard.html'; return; }
    setAuthMode(mode || 'login');
    openModal(authModal);
    setTimeout(() => $(authMode === 'signup' ? '#authName' : '#authEmail').focus(), 120);
  }
  $$('[data-open-auth]').forEach((btn) => {
    btn.addEventListener('click', () => openAuth(btn.dataset.openAuth));
  });
  // dashboard에서 미로그인 리다이렉트 시 (#login)
  if (location.hash === '#login') openAuth('login');

  const nim = (n) => (/님$/.test(n) ? n : n + '님'); // "사장님" + 님 중복 방지
  function goDashboard(welcome) {
    PMUI.toast(welcome || '환영합니다! 대시보드로 이동합니다 🚀');
    setTimeout(() => (location.href = 'dashboard.html'), 650);
  }

  /* 이메일 로그인/가입 */
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.textContent = '';
    authSubmit.disabled = true;
    try {
      if (authMode === 'signup') {
        const u = await PMAuth.signup($('#authName').value, $('#authEmail').value, $('#authPw').value);
        goDashboard(`${nim(u.name)}, 가입을 환영해요 🎉`);
      } else {
        const u = await PMAuth.login($('#authEmail').value, $('#authPw').value);
        goDashboard(`${nim(u.name)}, 다시 오셨네요 👋`);
      }
    } catch (err) {
      authError.textContent = err.message;
      authSubmit.disabled = false;
    }
  });

  /* 데모 계정 */
  $('#demoAccountBtn').addEventListener('click', () => {
    PMAuth.demoLogin();
    goDashboard('데모 계정으로 입장합니다 👀');
  });

  /* ---------------- 소셜 로그인 ---------------- */
  const socialNote = $('#socialModeNote');
  const hasKakaoKey = !!CFG.KAKAO_JS_KEY;
  const hasGoogleKey = !!CFG.GOOGLE_CLIENT_ID;
  if (!hasKakaoKey && !hasGoogleKey) {
    socialNote.textContent = '현재 간편가입은 체험(데모) 모드로 동작합니다 — 실제 카카오/구글 연동은 js/config.js에 키 입력 시 자동 활성화.';
  }

  // 카카오: 키가 있으면 SDK 로드
  if (hasKakaoKey) {
    PMUI.loadScript('https://developers.kakao.com/sdk/js/kakao.min.js')
      .then(() => PMAuth.initKakao())
      .catch(() => PMUI.toast('카카오 SDK 로드 실패 — 데모 모드로 동작합니다', 'err'));
  }
  $('#kakaoBtn').addEventListener('click', async () => {
    try {
      const res = await PMAuth.kakaoLogin();
      if (res.mode === 'real') {
        goDashboard(`${nim(res.user.name)}, 카카오로 로그인되었어요 💛`);
      } else {
        socialProvider = 'kakao';
        $('#sdTitle').textContent = '카카오 간편가입 (데모)';
        $('#sdSub').textContent = '데모 모드예요. 닉네임만 정하면 카카오 간편가입 흐름을 그대로 체험할 수 있어요.';
        closeModal(authModal);
        openModal(socialDemoModal);
        setTimeout(() => $('#sdName').focus(), 120);
      }
    } catch (err) {
      PMUI.toast(err.message, 'err');
    }
  });

  // 구글: 키가 있으면 GIS 로드 후 공식 버튼 렌더링
  if (hasGoogleKey) {
    PMUI.loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        const slot = $('#googleSlot');
        slot.innerHTML = '';
        PMAuth.renderGoogleButton(slot, (user) => goDashboard(`${nim(user.name)}, Google로 로그인되었어요 🔵`));
      })
      .catch(() => PMUI.toast('Google SDK 로드 실패 — 데모 모드로 동작합니다', 'err'));
  }
  const googleBtn = $('#googleBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      socialProvider = 'google';
      $('#sdTitle').textContent = 'Google 간편가입 (데모)';
      $('#sdSub').textContent = '데모 모드예요. 닉네임만 정하면 Google 간편가입 흐름을 그대로 체험할 수 있어요.';
      closeModal(authModal);
      openModal(socialDemoModal);
      setTimeout(() => $('#sdName').focus(), 120);
    });
  }

  /* 소셜 데모 가입 완료 */
  function completeSocialDemo() {
    const user = PMAuth.socialDemoComplete(socialProvider, $('#sdName').value);
    closeModal(socialDemoModal);
    goDashboard(`${nim(user.name)}, 간편가입 완료 🎉`);
  }
  $('#sdSubmit').addEventListener('click', completeSocialDemo);
  $('#sdName').addEventListener('keydown', (e) => { if (e.key === 'Enter') completeSocialDemo(); });
})();
