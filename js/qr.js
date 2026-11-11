/* ================================================================
   심리마케팅 — 접수 랜딩 QR코드 생성 (qr.html)
   ----------------------------------------------------------------
   · 지금 열린 주소(또는 직접 입력한 주소)를 기준으로 접수 랜딩 QR 3종 생성
       전체:    <사이트>/apply.html
       사장님용: <사이트>/apply.html#store
       청년용:  <사이트>/apply.html#crew
   · PNG(인쇄용 고해상도)·SVG 저장, 주소 복사
   · QR 생성: js/vendor/qrcode-generator.js (Kazuhiko Arase, MIT)
   ================================================================ */
(function () {
  'use strict';
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => Array.from((p || document).querySelectorAll(s));

  const NAVY = '#0B2A3A';
  const QUIET = 4;          // QR 규격의 최소 여백(모듈 4칸)
  const PNG_TARGET = 1200;  // 저장용 PNG 한 변의 목표 픽셀

  const TARGETS = [
    // file: 저장 파일명 (기기·브라우저 호환을 위해 영문)
    { id: 'all', title: '접수 랜딩 (공용)', desc: '사장님·청년 모두에게. 명함, 소개 자료용', path: 'apply.html', file: 'simri-qr-apply' },
    { id: 'store', title: '사장님용', desc: '가게 진단 신청 화면이 바로 열립니다. 전단지, 가게 방문용', path: 'apply.html#store', file: 'simri-qr-store' },
    { id: 'crew', title: '청년용', desc: '크루 지원 화면이 바로 열립니다. 캠퍼스 포스터, 모집 공고용', path: 'apply.html#crew', file: 'simri-qr-crew' },
  ];

  /** 입력값을 "사이트 폴더 주소(끝이 /)"로 정리한다. 한글 도메인은 표준 표기(xn--)로 바뀐다. */
  function normalizeBase(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    let u;
    try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol) || !u.hostname) return null;
    let path = u.pathname || '/';
    if (!path.endsWith('/')) {
      const last = path.slice(path.lastIndexOf('/') + 1);
      path = last.indexOf('.') !== -1 ? path.slice(0, path.lastIndexOf('/') + 1) : path + '/';
    }
    return u.origin + path;
  }

  function makeQr(text) {
    const qr = qrcode(0, 'Q'); // 오류 복원 수준 Q(약 25%) — 인쇄물의 얼룩·구김에 대비
    qr.addData(text);
    qr.make();
    return qr;
  }

  function drawCanvas(canvas, qr) {
    const n = qr.getModuleCount();
    const total = n + QUIET * 2;
    const scale = Math.max(4, Math.round(PNG_TARGET / total));
    const size = total * scale;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = NAVY;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((c + QUIET) * scale, (r + QUIET) * scale, scale, scale);
      }
    }
  }

  function toSvg(qr) {
    const n = qr.getModuleCount();
    const total = n + QUIET * 2;
    let d = '';
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < n) {
        if (!qr.isDark(r, c)) { c++; continue; }
        let run = 1;
        while (c + run < n && qr.isDark(r, c + run)) run++;
        d += 'M' + (c + QUIET) + ' ' + (r + QUIET) + 'h' + run + 'v1h-' + run + 'z';
        c += run;
      }
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" width="' + total * 10 + '" height="' + total * 10 + '" shape-rendering="crispEdges">' +
      '<rect width="' + total + '" height="' + total + '" fill="#ffffff"/>' +
      '<path d="' + d + '" fill="' + NAVY + '"/></svg>\n';
  }

  function saveBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function render(base) {
    const grid = $('#qrGrid');
    grid.innerHTML = TARGETS.map((t) => `
      <article class="qr-card" data-qr="${t.id}">
        <h2>${t.title}</h2>
        <p class="qr-desc">${t.desc}</p>
        <div class="qr-canvas-wrap"><canvas aria-label="${t.title} QR코드" role="img"></canvas></div>
        <p class="qr-url"></p>
        <div class="qr-actions">
          <button type="button" class="btn btn-coral btn-sm" data-save="png">PNG 저장</button>
          <button type="button" class="btn btn-outline btn-sm" data-save="svg">SVG 저장</button>
          <button type="button" class="btn btn-ghost btn-sm" data-copy>주소 복사</button>
        </div>
      </article>
    `).join('');

    TARGETS.forEach((t) => {
      const card = $('[data-qr="' + t.id + '"]', grid);
      const url = base + t.path;
      const qr = makeQr(url);
      const canvas = $('canvas', card);
      drawCanvas(canvas, qr);
      canvas.dataset.url = url;
      $('.qr-url', card).textContent = url;
      $('[data-save="png"]', card).addEventListener('click', () => {
        canvas.toBlob((blob) => { saveBlob(blob, t.file + '.png'); PMUI.toast('PNG로 저장했습니다'); }, 'image/png');
      });
      $('[data-save="svg"]', card).addEventListener('click', () => {
        saveBlob(new Blob([toSvg(qr)], { type: 'image/svg+xml' }), t.file + '.svg');
        PMUI.toast('SVG로 저장했습니다');
      });
      $('[data-copy]', card).addEventListener('click', () => PMUI.copyWithToast(url, '주소를 복사했습니다 📋'));
    });
  }

  function update(value, fromUser) {
    const base = normalizeBase(value);
    const warn = $('#qrWarn');
    if (!base) {
      warn.hidden = false;
      warn.textContent = '주소 형식이 올바르지 않습니다. 예) https://내주소.pages.dev';
      if (fromUser) PMUI.toast('주소를 다시 확인해 주세요', 'err');
      return;
    }
    $('#qrBase').value = base;
    const host = new URL(base).hostname;
    const local = host === 'localhost' || host === '127.0.0.1' || /^(10|192\.168)\./.test(host);
    warn.hidden = !local;
    if (local) warn.textContent = '지금은 미리보기 주소입니다. 이 상태로 만든 QR코드는 다른 사람 휴대폰에서 열리지 않습니다. 실제 사이트 주소를 입력한 뒤 다시 만들어 주세요.';
    render(base);
    if (fromUser) PMUI.toast('QR코드를 새로 만들었습니다');
  }

  $('#qrApply').addEventListener('click', () => update($('#qrBase').value, true));
  $('#qrBase').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); update($('#qrBase').value, true); } });

  // 처음에는 지금 열린 주소 기준으로 생성
  update(location.origin + location.pathname, false);
})();
