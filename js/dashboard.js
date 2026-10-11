/* ================================================================
   심리 마케팅 — 대시보드 스크립트
   로그인 가드 · 뷰 전환 · 4가지 도구 실행 · 결과 렌더/복사 · 히스토리/통계
   ================================================================ */
(function () {
  'use strict';
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => Array.from((p || document).querySelectorAll(s));
  const CFG = window.PM_CONFIG || {};

  /* ---------------- 로그인 가드 ---------------- */
  const session = PMAuth.requireAuth();
  if (!session) return;

  const HIST_KEY = 'pm_history_' + session.userId;
  const STAT_KEY = 'pm_stats_' + session.userId;
  const MONTH = new Date().toISOString().slice(0, 7);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function readJSON(k, fb) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch (e) { return fb; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  const TOOL_META = {
    psychology: { icon: '🧠', name: '심리분석 AI' },
    place: { icon: '📍', name: '플레이스 자동화' },
    ads: { icon: '✍️', name: '광고 생성' },
    performance: { icon: '📊', name: '성과 분석' },
  };

  /* ---------------- 사용자 UI ---------------- */
  const hour = new Date().getHours();
  const timeGreet = hour < 6 ? '늦은 밤까지 고생 많으세요' : hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '오늘 하루도 수고하셨어요';
  const nim = (n) => (/님$/.test(n) ? n : n + '님'); // "달빛사장님" → "달빛사장님님" 방지
  $('#greeting').textContent = `${timeGreet}, ${nim(session.name)} 👋`;
  $('#userName').textContent = session.name;
  $('#umEmail').textContent = session.email || '(간편가입 계정)';
  const avatar = $('#userAvatar');
  if (session.avatar) avatar.innerHTML = `<img src="${esc(session.avatar)}" alt="" />`;
  else avatar.textContent = (session.name || '?').trim().charAt(0).toUpperCase();

  /* 사용자 메뉴 */
  const userMenu = $('#userMenu');
  $('#userChip').addEventListener('click', (e) => { e.stopPropagation(); userMenu.classList.toggle('open'); });
  document.addEventListener('click', (e) => { if (!userMenu.contains(e.target)) userMenu.classList.remove('open'); });
  function doLogout() { PMAuth.logout(); location.href = 'index.html'; }
  $('#logoutBtn').addEventListener('click', doLogout);
  $('#logoutBtn2').addEventListener('click', doLogout);

  /* ---------------- 셀렉트 옵션 채우기 ---------------- */
  const OPTION_SETS = {
    industry: PMEngine.INDUSTRY_LIST,
    age: PMEngine.AGE_LIST,
    channel: PMEngine.CHANNEL_LIST,
    benchmark: PMEngine.CHANNEL_LIST.concat(['전체/기타']),
  };
  $$('select[data-options]').forEach((sel) => {
    const list = OPTION_SETS[sel.dataset.options] || [];
    sel.innerHTML = list.map((v) => `<option>${esc(v)}</option>`).join('');
  });

  /* ---------------- 뷰 전환 ---------------- */
  function goto(view) {
    $$('.view').forEach((v) => v.classList.toggle('on', v.dataset.view === view));
    $$('[data-goto]').forEach((b) => {
      if (b.classList.contains('side-item') || b.classList.contains('tab-item')) {
        b.classList.toggle('on', b.dataset.goto === view);
      }
    });
    userMenu.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'history') renderHist();
    if (view === 'home') renderHome();
    if (view === 'settings') renderSettings();
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-goto]');
    if (btn) goto(btn.dataset.goto);
  });

  /* ---------------- 통계 ---------------- */
  function getStats() {
    const st = readJSON(STAT_KEY, { total: 0, month: MONTH, monthCount: 0, byTool: {} });
    if (st.month !== MONTH) { st.month = MONTH; st.monthCount = 0; }
    return st;
  }
  function bumpStats(tool) {
    const st = getStats();
    st.total += 1;
    st.monthCount += 1;
    st.byTool[tool] = (st.byTool[tool] || 0) + 1;
    writeJSON(STAT_KEY, st);
    renderStatBar();
  }
  function renderStatBar() {
    const st = getStats();
    $('#genLeft').innerHTML = `이번 달 생성 <b>${st.monthCount}회</b>`;
    $('#planUsage').textContent = st.monthCount;
  }

  /* ---------------- 히스토리 ---------------- */
  function getHist() { return readJSON(HIST_KEY, []); }
  function saveToHist(tool, result) {
    const hist = getHist();
    hist.unshift({
      id: 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      tool,
      title: result.title,
      source: result.source,
      meta: result.meta || {},
      sections: result.sections,
      date: new Date().toISOString(),
    });
    writeJSON(HIST_KEY, hist.slice(0, 50));
  }
  function delHist(id) {
    writeJSON(HIST_KEY, getHist().filter((h) => h.id !== id));
    renderHist();
    renderHome();
    PMUI.toast('삭제했습니다');
  }

  function histItemHTML(h) {
    const m = TOOL_META[h.tool] || { icon: '📄', name: h.tool };
    const d = new Date(h.date);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `
      <div class="recent-item" role="button" tabindex="0" data-hist="${h.id}">
        <span class="ri-icon">${m.icon}</span>
        <span class="ri-main">
          <span class="ri-title">${esc(h.title)}</span>
          <span class="ri-meta">${m.name} · ${dateStr}${h.meta && h.meta.badge ? ' · ' + esc(h.meta.badge) : ''}</span>
        </span>
        <button class="ri-del" data-del="${h.id}" aria-label="삭제">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13h8l1-13"/></svg>
        </button>
      </div>`;
  }

  let histFilter = 'all';
  function renderHist() {
    const list = getHist().filter((h) => histFilter === 'all' || h.tool === histFilter);
    $('#histList').innerHTML = list.length
      ? list.map(histItemHTML).join('')
      : '<div class="empty-note">아직 저장된 결과가 없어요.<br />도구에서 첫 결과물을 만들어 보세요!</div>';
  }
  $('#histFilters').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]');
    if (!b) return;
    histFilter = b.dataset.f;
    $$('#histFilters button').forEach((x) => x.classList.toggle('on', x === b));
    $('#histResult').classList.remove('on');
    renderHist();
  });

  document.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); delHist(del.dataset.del); return; }
    const item = e.target.closest('[data-hist]');
    if (item) {
      const h = getHist().find((x) => x.id === item.dataset.hist);
      if (!h) return;
      goto('history');
      renderResult($('#histResult'), h.tool, h, { fromHistory: true });
      setTimeout(() => $('#histResult').scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  });

  /* ---------------- 홈 렌더 ---------------- */
  function renderHome() {
    const st = getStats();
    const hist = getHist();
    $('#stMonth').textContent = st.monthCount;
    $('#stTotal').textContent = st.total;
    const mins = st.total * 47;
    $('#stTime').textContent = mins >= 60 ? `${Math.floor(mins / 60)}시간 ${mins % 60}분` : `${mins}분`;
    $('#stSaved').textContent = hist.length;
    $('#recentList').innerHTML = hist.length
      ? hist.slice(0, 5).map(histItemHTML).join('')
      : '<div class="empty-note">첫 결과물을 만들면 여기에 표시돼요.<br />위의 도구 카드 중 하나를 눌러 시작해 보세요 👆</div>';

    // 오늘의 심리 트리거
    const keys = Object.keys(PMEngine.PRINCIPLES);
    const dayIdx = Math.floor(Date.now() / 86400000) % keys.length;
    const p = PMEngine.PRINCIPLES[keys[dayIdx]];
    $('#dailyTip').textContent = `${p.emoji} ${p.name} — ${p.desc}\n\n적용법: ${p.how}`;
  }

  /* ---------------- 결과 렌더 ---------------- */
  function renderResult(container, tool, result, opts) {
    opts = opts || {};
    const m = TOOL_META[tool] || { icon: '📄', name: tool };
    const badgeCls = result.source === 'gemini' ? 'gemini' : 'engine';
    const badgeTxt = result.source === 'gemini' ? '✦ Gemini AI 생성' : '⚡ 심리 엔진 2.0';
    const dateStr = new Date(opts.fromHistory ? result.date : Date.now()).toLocaleString('ko-KR');

    container.innerHTML = `
      <div class="result-head">
        <div class="rh-top">
          <h2>${m.icon} ${esc(result.title)}</h2>
          <span class="result-badge ${badgeCls}">${badgeTxt}</span>
          ${result.meta && result.meta.badge ? `<span class="score-ring">★ ${esc(result.meta.badge)}</span>` : ''}
        </div>
        <div class="rh-meta">${dateStr} · ${m.name}${opts.fromHistory ? ' · 히스토리에서 불러옴' : ' · 히스토리에 저장됨'}</div>
        <div class="result-actions">
          <button class="btn btn-primary btn-sm" data-act="copyall">📋 전체 복사</button>
          ${opts.fromHistory
            ? '<button class="btn btn-ghost btn-sm" data-act="closehist">닫기</button>'
            : '<button class="btn btn-ghost btn-sm" data-act="regen">🎲 다시 생성</button><button class="btn btn-ghost btn-sm" data-act="newinput">새 입력</button>'}
        </div>
      </div>
      ${result.sections.map((s, i) => `
        <div class="result-section">
          <div class="rs-head">
            <h3>${esc(s.title)}</h3>
            <button class="rs-copy" data-sec="${i}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
              복사
            </button>
          </div>
          <div class="rs-body">${esc(s.body)}</div>
        </div>
      `).join('')}
    `;
    container.classList.add('on');

    // 섹션 복사
    $$('.rs-copy', container).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const s = result.sections[Number(btn.dataset.sec)];
        const ok = await PMUI.copyText(`${s.title}\n\n${s.body}`);
        if (ok) {
          btn.classList.add('copied');
          btn.innerHTML = '✓ 복사됨';
          PMUI.toast('섹션이 복사되었습니다 📋');
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg> 복사';
          }, 1800);
        } else {
          PMUI.toast('복사 실패 — 직접 선택해 복사해 주세요', 'err');
        }
      });
    });
    // 액션
    const actall = $('[data-act="copyall"]', container);
    if (actall) actall.addEventListener('click', () => PMUI.copyWithToast(PMEngine.toText(result), '전체 결과가 복사되었습니다 📋'));
    const regen = $('[data-act="regen"]', container);
    if (regen) regen.addEventListener('click', () => runTool(tool, true));
    const newin = $('[data-act="newinput"]', container);
    if (newin) newin.addEventListener('click', () => {
      container.classList.remove('on');
      $('#f-' + tool).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const closeh = $('[data-act="closehist"]', container);
    if (closeh) closeh.addEventListener('click', () => container.classList.remove('on'));
  }

  /* ---------------- 로더 ---------------- */
  const LOADER_MSGS = {
    psychology: ['타겟 심리 프로파일링 중…', '12가지 트리거 대조 중…', '구매 여정 설계 중…', '리포트 작성 중…'],
    place: ['상권 키워드 조합 중…', '소개글 2종 작성 중…', '4주 소식 플랜 구성 중…', '리뷰 답글 다듬는 중…'],
    ads: ['타겟 심리 스캔 중…', '헤드라인 10개 뽑는 중…', '카피 톤 조정 중…', '해시태그 추출 중…'],
    performance: ['지표 계산 중…', '벤치마크 대조 중…', '병목 구간 진단 중…', '처방전 작성 중…'],
  };
  function playLoader(tool) {
    const card = $('#loader-' + tool);
    const msgEl = $('.loader-msg', card);
    const barEl = $('.loader-bar i', card);
    card.classList.add('on');
    const msgs = LOADER_MSGS[tool];
    let i = 0;
    msgEl.textContent = msgs[0];
    barEl.style.width = '12%';
    const iv = setInterval(() => {
      i = Math.min(i + 1, msgs.length - 1);
      msgEl.textContent = msgs[i];
      barEl.style.width = (18 + (i + 1) * 20) + '%';
    }, 700);
    return () => {
      clearInterval(iv);
      barEl.style.width = '100%';
      setTimeout(() => card.classList.remove('on'), 250);
    };
  }
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------- 입력 수집 ---------------- */
  function collect(tool) {
    const v = (id) => ($('#' + id) ? $('#' + id).value.trim() : '');
    if (tool === 'psychology') {
      return {
        industry: v('psy-industry'), product: v('psy-product'), age: v('psy-age'),
        gender: v('psy-gender'), price: v('psy-price'), goal: v('psy-goal'), concern: v('psy-concern'),
      };
    }
    if (tool === 'place') {
      return {
        store: v('place-store'), industry: v('place-industry'), location: v('place-location'),
        menu: v('place-menu'), strength: v('place-strength'),
      };
    }
    if (tool === 'ads') {
      return {
        channel: v('ads-channel'), product: v('ads-product'), target: v('ads-target'),
        usp: v('ads-usp'), promo: v('ads-promo'), tone: v('ads-tone'),
      };
    }
    return {
      period: v('perf-period'), channel: v('perf-channel'),
      impressions: v('perf-impressions'), clicks: v('perf-clicks'),
      conversions: v('perf-conversions'), cost: v('perf-cost'), revenue: v('perf-revenue'),
    };
  }

  function validate(tool, input) {
    const need = {
      psychology: [['product', '상품/서비스명을 입력해 주세요']],
      place: [['store', '가게 이름을 입력해 주세요'], ['location', '지역/동네를 입력해 주세요'], ['menu', '대표 메뉴/서비스를 입력해 주세요']],
      ads: [['product', '상품/서비스를 입력해 주세요']],
      performance: [['impressions', '노출수를 입력해 주세요'], ['clicks', '클릭수를 입력해 주세요'], ['cost', '광고비를 입력해 주세요']],
    }[tool];
    for (const [k, msg] of need) {
      if (!input[k]) { PMUI.toast(msg, 'err'); return false; }
    }
    if (tool === 'performance') {
      const imp = Number(input.impressions), clk = Number(input.clicks), cnv = Number(input.conversions || 0);
      if (clk > imp) { PMUI.toast('클릭수가 노출수보다 클 수 없어요', 'err'); return false; }
      if (cnv > clk) { PMUI.toast('전환수가 클릭수보다 클 수 없어요', 'err'); return false; }
    }
    return true;
  }

  /* ---------------- 도구 실행 ---------------- */
  const lastRun = {}; // tool → {json, variant}
  let running = false;

  async function runTool(tool, isRegen) {
    if (running) return;
    const input = collect(tool);
    if (!validate(tool, input)) return;

    const json = JSON.stringify(input);
    if (lastRun[tool] && lastRun[tool].json === json && isRegen) lastRun[tool].variant += 1;
    else lastRun[tool] = { json, variant: 0 };

    running = true;
    const resultWrap = $('#result-' + tool);
    resultWrap.classList.remove('on');
    const stopLoader = playLoader(tool);
    $('#loader-' + tool).scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
      const minWait = PMEngine.getGeminiKey() ? 600 : 2600; // 내장 엔진은 "생각하는" 연출
      const [result] = await Promise.all([
        PMEngine.run(tool, input, { variant: lastRun[tool].variant }),
        delay(minWait),
      ]);
      stopLoader();
      saveToHist(tool, result);
      bumpStats(tool);
      renderResult(resultWrap, tool, result);
      setTimeout(() => resultWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      PMUI.toast('생성 완료! 복사 버튼으로 바로 쓰세요 ✨');
    } catch (err) {
      stopLoader();
      PMUI.toast('생성 중 오류가 발생했어요: ' + err.message, 'err');
    } finally {
      running = false;
    }
  }

  ['psychology', 'place', 'ads', 'performance'].forEach((tool) => {
    $('#f-' + tool).addEventListener('submit', (e) => { e.preventDefault(); runTool(tool, false); });
  });

  /* ---------------- 설정 ---------------- */
  function renderSettings() {
    $('#setName').value = session.name;
    const providerNames = {
      email: '이메일 계정', kakao: '카카오 연동 계정', google: 'Google 연동 계정',
      'kakao-demo': '카카오 간편가입 (데모)', 'google-demo': 'Google 간편가입 (데모)', demo: '데모 계정',
    };
    $('#setProviderDesc').textContent = providerNames[session.provider] || session.provider;
    $('#setProviderChip').textContent = session.provider === 'email' ? '이메일' : session.provider.indexOf('kakao') === 0 ? '카카오' : session.provider.indexOf('google') === 0 ? 'Google' : '데모';

    const gKey = PMEngine.getGeminiKey();
    const gs = $('#geminiStatus');
    gs.textContent = gKey ? 'Gemini 연동됨' : '내장 엔진';
    gs.className = 'status-chip ' + (gKey ? 'ok' : 'off');
    $('#geminiKeyInput').value = gKey ? '••••••••' + gKey.slice(-4) : '';

    const kakaoChip = $('#kakaoChip');
    kakaoChip.textContent = CFG.KAKAO_JS_KEY ? '실제 연동' : '데모 모드';
    kakaoChip.className = 'status-chip ' + (CFG.KAKAO_JS_KEY ? 'ok' : 'off');
    const googleChip = $('#googleChip');
    googleChip.textContent = CFG.GOOGLE_CLIENT_ID ? '실제 연동' : '데모 모드';
    googleChip.className = 'status-chip ' + (CFG.GOOGLE_CLIENT_ID ? 'ok' : 'off');
  }

  $('#saveNameBtn').addEventListener('click', () => {
    const n = $('#setName').value.trim();
    if (!n) { PMUI.toast('이름을 입력해 주세요', 'err'); return; }
    PMAuth.updateName(n);
    session.name = n;
    $('#userName').textContent = n;
    avatar.textContent = n.charAt(0).toUpperCase();
    $('#greeting').textContent = `${timeGreet}, ${nim(n)} 👋`;
    PMUI.toast('이름을 변경했습니다');
  });

  $('#saveGeminiBtn').addEventListener('click', () => {
    const k = $('#geminiKeyInput').value.trim();
    if (!k || k.indexOf('•') === 0) { PMUI.toast('새 API 키를 입력해 주세요', 'err'); return; }
    PMEngine.setGeminiKey(k);
    renderSettings();
    PMUI.toast('Gemini 키 저장 완료 — 이제 생성 시 실제 AI가 작성합니다 ✦');
  });
  $('#clearGeminiBtn').addEventListener('click', () => {
    PMEngine.setGeminiKey('');
    $('#geminiKeyInput').value = '';
    renderSettings();
    PMUI.toast('Gemini 연동을 해제했습니다 — 내장 엔진으로 동작합니다');
  });

  $('#clearHistBtn').addEventListener('click', () => {
    if (!confirm('저장된 결과를 모두 삭제할까요? 되돌릴 수 없습니다.')) return;
    writeJSON(HIST_KEY, []);
    renderHist();
    renderHome();
    PMUI.toast('히스토리를 모두 삭제했습니다');
  });

  /* ---------------- 초기화 ---------------- */
  renderStatBar();
  renderHome();
  renderSettings();
})();
