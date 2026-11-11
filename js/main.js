/* ================================================================
   심리마케팅 — 랜딩 v3 스크립트
   내비게이션 · 리빌 · 30초 데모 · 로그인 모달(카카오/구글/데모) ·
   신청 양식 2종(개인정보 동의 + 메일/복사 접수) · 미디어 폴백
   ================================================================ */
(function () {
  'use strict';
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => Array.from((p || document).querySelectorAll(s));
  const CFG = window.PM_CONFIG || {};
  const nim = (n) => (/님$/.test(n) ? n : n + '님');

  /* ---------------- 내비게이션 ---------------- */
  const nav = $('#nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  const burger = $('#burger');
  const navMobile = $('#navMobile');
  burger.addEventListener('click', () => {
    const open = navMobile.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('#navMobile a, #navMobile .btn').forEach((a) => a.addEventListener('click', () => {
    navMobile.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  /* ---------------- 신청 양식 (js/forms.js — 접수 전용 랜딩과 같은 양식을 공유) ---------------- */
  PMForms.mount($('#applyForms'));
  $$('#applyForms .form-card').forEach((el) => el.classList.add('reveal'));

  /* ---------------- 스크롤 리빌 ---------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------------- 현장 이야기: 동의받은 사진·영상 파일이 실제로 있을 때만 표시 ----------------
     assets/field/ 에 파일을 넣으면 섹션이 자동으로 나타나고, 파일이 없는 칸은 숨긴다. */
  const fieldSec = $('#field');
  const showField = () => { fieldSec.hidden = false; };
  $$('[data-media]').forEach((tile) => {
    const img = $('img', tile);
    tile.classList.add('pending');
    const ok = () => { tile.classList.remove('pending'); showField(); };
    if (img.complete && img.naturalWidth > 0) ok();
    img.addEventListener('load', ok);
  });
  $$('[data-media-video]').forEach((card) => {
    const v = $('video', card);
    card.classList.add('pending');
    v.addEventListener('loadedmetadata', () => { card.classList.remove('pending'); showField(); });
    try { v.load(); } catch (e) { /* ignore */ }
  });

  /* ---------------- 응답 시간 약속 · 바닥글 문의처 ---------------- */
  PMForms.applyConfigText();

  /* ---------------- 30초 데모 (크루 진단 도구 맛보기) ---------------- */
  const demoInput = $('#demoInput');
  const demoBtn = $('#demoBtn');
  const demoResults = $('#demoResults');
  let demoNonce = 0;

  function runDemo() {
    const product = demoInput.value.trim();
    if (!product) {
      PMUI.toast('대표 메뉴나 상품명을 먼저 입력해 주세요!', 'err');
      demoInput.focus();
      return;
    }
    demoNonce++;
    const items = PMEngine.quickHeadlines(product, demoNonce);
    demoResults.innerHTML = items.map((it, i) => `
      <div class="demo-item" style="animation-delay:${i * 0.1}s">
        <span class="trig">${it.trigger}</span>
        <span class="txt">${it.text}</span>
        <button class="btn btn-ghost btn-sm" data-copy="${encodeURIComponent(it.text)}" type="button">복사</button>
      </div>
    `).join('');
    $$('[data-copy]', demoResults).forEach((btn) => {
      btn.addEventListener('click', () => PMUI.copyWithToast(decodeURIComponent(btn.dataset.copy)));
    });
  }
  demoBtn.addEventListener('click', runDemo);
  demoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); runDemo(); } });

  /* ---------------- 진단 도구 전체 체험 ---------------- */
  $('#toolsTryBtn').addEventListener('click', () => {
    if (PMAuth.current()) { location.href = 'dashboard.html'; return; }
    PMAuth.demoLogin();
    PMUI.toast('데모 계정으로 진단 도구를 열어 드릴게요 👀');
    setTimeout(() => (location.href = 'dashboard.html'), 600);
  });

  /* ================================================================
     인증 모달 (이메일 + 카카오/구글 간편가입)
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
    authSub.textContent = isLogin ? '로그인하고 진단 도구를 이어서 쓰세요.' : '가입 즉시 크루 진단 도구를 무료로 체험할 수 있어요.';
    authSubmit.textContent = isLogin ? '로그인' : '무료 회원가입';
    authError.textContent = '';
    $('#authPw').setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
  }
  tabLogin.addEventListener('click', () => setAuthMode('login'));
  tabSignup.addEventListener('click', () => setAuthMode('signup'));

  function openAuth(mode) {
    if (PMAuth.current()) { location.href = 'dashboard.html'; return; }
    setAuthMode(mode || 'login');
    openModal(authModal);
    setTimeout(() => $(authMode === 'signup' ? '#authName' : '#authEmail').focus(), 120);
  }
  $$('[data-open-auth]').forEach((btn) => {
    btn.addEventListener('click', () => openAuth(btn.dataset.openAuth));
  });
  if (location.hash === '#login') openAuth('login');

  function goDashboard(welcome) {
    PMUI.toast(welcome || '환영합니다! 진단 도구로 이동합니다 🚀');
    setTimeout(() => (location.href = 'dashboard.html'), 650);
  }

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

  $('#demoAccountBtn').addEventListener('click', () => {
    PMAuth.demoLogin();
    goDashboard('데모 계정으로 입장합니다 👀');
  });

  /* 소셜 로그인 */
  const socialNote = $('#socialModeNote');
  const hasKakaoKey = !!CFG.KAKAO_REST_API_KEY;
  const hasGoogleKey = !!CFG.GOOGLE_CLIENT_ID;
  if (!hasKakaoKey && !hasGoogleKey) {
    socialNote.textContent = '현재 간편가입은 체험(데모) 모드로 동작합니다 — js/config.js의 더미 키를 실제 키로 교체하면 자동 활성화.';
  }

  $('#kakaoBtn').addEventListener('click', async () => {
    try {
      const res = await PMAuth.kakaoLogin(); // 키 설정 시 카카오 인증 페이지로 리다이렉트됨
      if (res && res.mode === 'demo') {
        socialProvider = 'kakao';
        $('#sdTitle').textContent = '카카오 간편가입 (데모)';
        $('#sdSub').textContent = '데모 모드예요. 닉네임만 정하면 간편가입 흐름을 체험할 수 있어요.';
        closeModal(authModal);
        openModal(socialDemoModal);
        setTimeout(() => $('#sdName').focus(), 120);
      }
    } catch (err) {
      PMUI.toast(err.message, 'err');
    }
  });

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
      $('#sdSub').textContent = '데모 모드예요. 닉네임만 정하면 간편가입 흐름을 체험할 수 있어요.';
      closeModal(authModal);
      openModal(socialDemoModal);
      setTimeout(() => $('#sdName').focus(), 120);
    });
  }

  function completeSocialDemo() {
    const user = PMAuth.socialDemoComplete(socialProvider, $('#sdName').value);
    closeModal(socialDemoModal);
    goDashboard(`${nim(user.name)}, 간편가입 완료 🎉`);
  }
  $('#sdSubmit').addEventListener('click', completeSocialDemo);
  $('#sdName').addEventListener('keydown', (e) => { if (e.key === 'Enter') completeSocialDemo(); });

  /* ---------------- 모바일 하단 고정 신청 바 ----------------
     첫 화면·신청 양식·바닥글이 보일 때는 숨기고, 그 사이에서만 보여 준다. */
  const sticky = $('#stickyCta');
  const inView = { hero: true, apply: false, footer: false };
  const syncSticky = () => {
    const show = !inView.hero && !inView.apply && !inView.footer;
    sticky.classList.toggle('show', show);
    document.body.classList.toggle('has-sticky', show);
  };
  const stickyIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => { inView[e.target.dataset.sticky] = e.isIntersecting; });
    syncSticky();
  }, { threshold: 0.02 });
  [['#top', 'hero'], ['#apply', 'apply'], ['.footer', 'footer']].forEach(([sel, key]) => {
    const el = $(sel);
    el.dataset.sticky = key;
    stickyIo.observe(el);
  });

  /* ---------------- 카카오 인증 복귀(?code=...) 처리 ---------------- */
  (async () => {
    try {
      const user = await PMAuth.handleKakaoCallback();
      if (user) goDashboard(`${nim(user.name)}, 카카오로 로그인되었어요 💛`);
    } catch (err) {
      PMUI.toast(err.message, 'err');
      openAuth('login');
    }
  })();
})();
