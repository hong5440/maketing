/* ================================================================
   심리마케팅 — 접수 전용 랜딩(apply.html) 스크립트
   ----------------------------------------------------------------
   · 신청 종류(사장님/청년) 전환 — 한 번에 한 양식만 보여 준다
   · 주소로 바로 열기:  apply.html#store  /  apply.html#crew
     (QR코드를 사장님용·청년용으로 따로 만들 때 사용)
   ================================================================ */
(function () {
  'use strict';
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => Array.from((p || document).querySelectorAll(s));

  PMForms.mount($('#applyForms'));
  PMForms.applyConfigText();

  const KINDS = {
    store: { seg: '#segStore', form: '#formStore', title: '가게 AI 진단 신청 — 심리마케팅' },
    crew: { seg: '#segCrew', form: '#formCrew', title: '청년 AI 크루 지원 — 심리마케팅' },
  };

  /** 주소의 #store / #crew (또는 ?for=crew)에서 신청 종류를 읽는다. 기본은 사장님용 */
  function kindFromUrl() {
    const hash = location.hash.replace('#', '').toLowerCase();
    const q = (new URLSearchParams(location.search).get('for') || '').toLowerCase();
    if (/crew/.test(hash) || q === 'crew') return 'crew';
    return 'store';
  }

  function select(kind, updateUrl) {
    Object.keys(KINDS).forEach((k) => {
      const on = k === kind;
      $(KINDS[k].seg).setAttribute('aria-selected', String(on));
      $(KINDS[k].form).hidden = !on;
      $$('[data-for="' + k + '"]').forEach((el) => { el.hidden = !on; });
      $$('[data-nav-kind="' + k + '"]').forEach((el) => el.classList.toggle('on', on));
    });
    document.title = KINDS[kind].title;
    if (updateUrl) {
      try { history.replaceState(null, '', '#' + kind); } catch (e) { /* ignore */ }
    }
  }

  $$('.seg [data-kind]').forEach((btn) => {
    btn.addEventListener('click', () => select(btn.dataset.kind, true));
  });
  $$('[data-nav-kind]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      select(a.dataset.navKind, true);
      $('#applyForms').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  window.addEventListener('hashchange', () => select(kindFromUrl(), false));

  select(kindFromUrl(), false);

  /* 내비게이션 스크롤 표시 */
  const nav = $('#nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
})();
