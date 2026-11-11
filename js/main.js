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
  const CONTACT = CFG.CONTACT_EMAIL || ''; // 더미 키는 config에서 ''로 정리됨
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

  /* ---------------- 응답 시간 약속 · 푸터 연락처 ---------------- */
  if (CFG.RESPONSE_PROMISE) {
    $$('[data-response-promise]').forEach((el) => { el.textContent = CFG.RESPONSE_PROMISE; });
  }
  if (CONTACT) {
    $('#footerContact').innerHTML = '<a href="mailto:' + CONTACT + '" style="color:#fff;text-decoration:underline;">' + CONTACT + '</a>';
  }

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

  /* ================================================================
     신청 양식 2종 — 검증 → 동의 확인 → 접수(메일/복사)
     ================================================================ */
  function checkedValues(name, form) {
    return $$('input[name="' + name + '"]:checked', form).map((c) => c.value);
  }

  function composeStore() {
    return {
      subject: '[심리마케팅] 가게 진단 신청 — ' + $('#storeName').value.trim(),
      lines: [
        '■ 우리 가게 AI 진단 신청',
        '가게 이름: ' + $('#storeName').value.trim(),
        '업종: ' + $('#storeIndustry').value,
        '위치: ' + $('#storeLocation').value.trim(),
        '지금 쓰는 툴: ' + (checkedValues('storeTools', $('#formStore')).join(', ') || '(선택 안 함)'),
        '고민: ' + $('#storeConcern').value.trim(),
        '연락처: ' + $('#storeContact').value.trim(),
        '개인정보 수집·이용 동의: 예 (' + new Date().toLocaleString('ko-KR') + ')',
      ],
    };
  }
  function composeCrew() {
    return {
      subject: '[심리마케팅] 청년 AI 크루 지원 — ' + $('#crewName').value.trim(),
      lines: [
        '■ 청년 AI 크루 지원서',
        '이름: ' + $('#crewName').value.trim(),
        '학교/전공: ' + $('#crewSchool').value.trim(),
        '다룰 수 있는 도구: ' + (checkedValues('crewSkills', $('#formCrew')).join(', ') || '(선택 안 함)'),
        '활동 가능 시간: ' + $('#crewHours').value,
        '하고 싶은 말: ' + ($('#crewMessage').value.trim() || '-'),
        '연락처: ' + $('#crewContact').value.trim(),
        '개인정보 수집·이용 동의: 예 (' + new Date().toLocaleString('ko-KR') + ')',
      ],
    };
  }

  const FORMS = {
    store: {
      form: '#formStore', error: '#storeError', done: '#storeDone', consent: '#storeConsent', compose: composeStore,
      required: [['#storeName', '가게 이름을 입력해 주세요'], ['#storeIndustry', '업종을 선택해 주세요'], ['#storeLocation', '위치를 입력해 주세요'], ['#storeConcern', '지금 가장 큰 고민을 한 줄이라도 적어 주세요'], ['#storeContact', '연락처를 입력해 주세요']],
      doneTitle: '진단 신청서가 준비되었습니다 🙌',
    },
    crew: {
      form: '#formCrew', error: '#crewError', done: '#crewDone', consent: '#crewConsent', compose: composeCrew,
      required: [['#crewName', '이름을 입력해 주세요'], ['#crewSchool', '학교/전공을 입력해 주세요'], ['#crewHours', '활동 가능 시간을 선택해 주세요'], ['#crewContact', '연락처를 입력해 주세요']],
      doneTitle: '크루 지원서가 준비되었습니다 💪',
    },
  };

  function handleSubmit(kind) {
    const cfg = FORMS[kind];
    const errEl = $(cfg.error);
    errEl.textContent = '';

    for (const [sel, msg] of cfg.required) {
      const el = $(sel);
      if (!el.value.trim()) {
        errEl.textContent = msg;
        el.focus();
        return;
      }
    }
    if (!$(cfg.consent).checked) {
      errEl.textContent = '개인정보 수집·이용 동의(필수)에 체크해 주세요.';
      $(cfg.consent).focus();
      return;
    }

    const { subject, lines } = cfg.compose();
    const text = lines.join('\n');
    const doneEl = $(cfg.done);
    const mailReady = !!CONTACT;

    doneEl.innerHTML = `
      <div class="fd-title">${cfg.doneTitle}</div>
      <p>${mailReady
        ? '아래 내용으로 메일 앱이 열립니다. <b>메일의 전송 버튼을 눌러야 접수가 완료</b>됩니다. ' + (CFG.RESPONSE_PROMISE || '영업일 기준 2일 안에') + ' 연락드립니다.<br />메일 앱이 열리지 않으면 내용을 복사해 <b>' + CONTACT + '</b> 으로 보내 주세요.'
        : '접수 이메일 주소를 설정하기 전이라, 아래 내용을 <b>복사해서 문자/카카오톡으로</b> 보내 주시면 접수됩니다.'}</p>
      <textarea readonly aria-label="제출 내용">${text.replace(/</g, '&lt;')}</textarea>
      <div class="fd-actions">
        <button type="button" class="btn btn-navy btn-sm" data-fd-copy>📋 내용 복사</button>
        ${mailReady ? '<a class="btn btn-coral btn-sm" data-fd-mail href="mailto:' + CONTACT + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text) + '">✉️ 메일 앱으로 보내기</a>' : ''}
      </div>
    `;
    doneEl.classList.add('on');
    $('[data-fd-copy]', doneEl).addEventListener('click', () => PMUI.copyWithToast(text, '신청 내용이 복사되었습니다 📋'));
    doneEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    PMUI.copyText(text); // 안전망: 자동 복사도 함께
    if (mailReady) {
      location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
      PMUI.toast('메일 초안을 열었어요. 전송을 눌러야 접수됩니다!');
    } else {
      PMUI.toast('신청 내용이 복사되었습니다. 문자/카톡으로 보내 주세요!');
    }
  }

  $('#formStore').addEventListener('submit', (e) => { e.preventDefault(); handleSubmit('store'); });
  $('#formCrew').addEventListener('submit', (e) => { e.preventDefault(); handleSubmit('crew'); });

  /* ---------------- 구글 설문지 접수 ----------------
     js/config.js에 설문지 링크가 있으면 그 양식은 입력칸 대신 설문지 연결 버튼을 보여 준다.
     링크가 없으면 위의 이메일(또는 복사) 접수 방식 그대로 동작한다. */
  const GFORM_URL = /^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)/;
  function enableGform(formSel, boxSel, linkSel, url) {
    if (!url) return false;
    if (!GFORM_URL.test(url)) {
      console.warn('[심리마케팅] 구글 설문지 링크 형식이 아니어서 무시합니다:', url);
      return false;
    }
    $(linkSel).href = url;
    $(boxSel).hidden = false;
    $(formSel).classList.add('gform-mode');
    return true;
  }
  enableGform('#formStore', '#storeGform', '#storeGformLink', CFG.GOOGLE_FORM_STORE_URL);
  enableGform('#formCrew', '#crewGform', '#crewGformLink', CFG.GOOGLE_FORM_CREW_URL);

  /* ---------------- 신청서 진행률 (필수 항목 n / n) ---------------- */
  function bindProgress(kind, barSel, txtSel) {
    const cfg = FORMS[kind];
    const form = $(cfg.form);
    const total = cfg.required.length + 1; // 필수 입력 + 개인정보 동의
    const update = () => {
      let n = cfg.required.filter(([sel]) => $(sel).value.trim()).length;
      if ($(cfg.consent).checked) n += 1;
      $(barSel).style.width = Math.round((n / total) * 100) + '%';
      $(txtSel).textContent = n === total ? '필수 항목 모두 작성 ✓' : `필수 항목 ${n} / ${total}`;
      $(txtSel).parentElement.classList.toggle('done', n === total);
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
  }
  bindProgress('store', '#storeProgBar', '#storeProgTxt');
  bindProgress('crew', '#crewProgBar', '#crewProgTxt');

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
