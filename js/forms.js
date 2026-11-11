/* ================================================================
   심리마케팅 — 신청 양식 공용 모듈 (PMForms)
   ----------------------------------------------------------------
   가게용·청년용 신청 양식의 화면과 동작을 한 곳에서 관리한다.
   본 홈페이지(index.html)와 접수 전용 랜딩(apply.html)이 같이 쓴다.
     PMForms.mount(container)   양식 2개를 그리고 동작을 연결
     PMForms.applyConfigText()  응답 시간 약속 문구·바닥글 문의처 채우기
   접수 방식 (js/config.js):
     1) 구글 설문지 링크가 있으면 → 설문지 연결 버튼
     2) 없으면 → CONTACT_EMAIL로 메일 초안 (그것도 없으면 내용 복사)
   ================================================================ */
(function () {
  'use strict';
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => Array.from((p || document).querySelectorAll(s));
  const CFG = window.PM_CONFIG || {};
  const CONTACT = CFG.CONTACT_EMAIL || ''; // 더미 값은 config에서 ''로 정리됨
  const PROMISE = CFG.RESPONSE_PROMISE || '영업일 기준 2일 안에';

  const TEMPLATE = `
    <!-- 가게용 -->
    <form class="form-card" id="formStore" novalidate>
      <h3 id="apply-store">🏪 우리 가게 AI 진단 신청</h3>
      <p class="form-sub">소상공인 사장님용 — 진단 후 처방과 가격을 안내드립니다.</p>
      <!-- 구글 설문지 접수: 링크가 설정되면 이 안내가 보이고 아래 입력칸은 숨겨진다 -->
      <div class="gform-box" id="storeGform" hidden>
        <p class="gf-lead">신청은 <b>구글 설문지</b>로 받습니다. 아래 내용을 여쭤봅니다.</p>
        <ul class="gf-list">
          <li>가게 이름 · 업종 · 위치</li>
          <li>지금 쓰고 있는 툴</li>
          <li>지금 가장 큰 고민</li>
          <li>연락처</li>
        </ul>
        <a class="btn btn-coral btn-block" id="storeGformLink" target="_blank" rel="noopener">진단 신청서 작성하기 ↗</a>
        <p class="gf-note">새 창에서 구글 설문지가 열립니다. 개인정보 수집·이용 동의는 설문지 첫 화면에서 받습니다.</p>
      </div>
      <div class="form-progress"><div class="fp-bar"><i id="storeProgBar"></i></div><span id="storeProgTxt">필수 항목 0 / 6</span></div>
      <div class="field">
        <label for="storeName">가게 이름 <span class="req" aria-hidden="true">*</span></label>
        <input type="text" id="storeName" autocomplete="organization" placeholder="예) 원동할매반찬" required />
      </div>
      <div class="field">
        <label for="storeIndustry">업종 <span class="req">*</span></label>
        <select id="storeIndustry" required>
          <option value="">선택해 주세요</option>
          <option>식당/카페</option><option>농자재/농수산</option><option>마을기업/협동조합</option>
          <option>뷰티/미용</option><option>학원/교육</option><option>쇼핑몰/온라인판매</option>
          <option>숙박/펜션</option><option>기타</option>
        </select>
      </div>
      <div class="field">
        <label for="storeLocation">위치 <span class="req">*</span></label>
        <input type="text" id="storeLocation" placeholder="예) 부산 금정구 / 양산 원동면" required />
      </div>
      <div class="field">
        <label id="storeToolsLabel">지금 쓰고 있는 툴 (모두 선택)</label>
        <div class="check-group" role="group" aria-labelledby="storeToolsLabel">
          <label class="check-chip"><input type="checkbox" name="storeTools" value="네이버 플레이스" /><span>네이버 플레이스</span></label>
          <label class="check-chip"><input type="checkbox" name="storeTools" value="스마트스토어" /><span>스마트스토어</span></label>
          <label class="check-chip"><input type="checkbox" name="storeTools" value="인스타그램" /><span>인스타그램</span></label>
          <label class="check-chip"><input type="checkbox" name="storeTools" value="카카오톡 채널" /><span>카카오톡 채널</span></label>
          <label class="check-chip"><input type="checkbox" name="storeTools" value="배달앱" /><span>배달앱</span></label>
          <label class="check-chip"><input type="checkbox" name="storeTools" value="ChatGPT 등 AI 구독" /><span>ChatGPT 등 AI 구독</span></label>
          <label class="check-chip"><input type="checkbox" name="storeTools" value="블로그" /><span>블로그</span></label>
          <label class="check-chip"><input type="checkbox" name="storeTools" value="없음/잘 모름" /><span>없음 / 잘 모름</span></label>
        </div>
      </div>
      <div class="field">
        <label for="storeConcern">지금 가장 큰 고민 <span class="req">*</span></label>
        <textarea id="storeConcern" placeholder="예) 손님이 줄었는데 뭘 해야 할지 모르겠어요. ChatGPT는 결제만 해 두고 못 쓰고 있어요." required></textarea>
      </div>
      <div class="field">
        <label for="storeContact">연락처 <span class="req">*</span></label>
        <input type="tel" id="storeContact" autocomplete="tel" placeholder="전화번호 또는 카카오톡 ID" required />
      </div>
      <div class="consent">
        <label class="consent-row" for="storeConsent">
          <input type="checkbox" id="storeConsent" required />
          <span>개인정보 수집·이용에 동의합니다. <span class="req">(필수)</span></span>
        </label>
        <details>
          <summary>수집 항목·목적·보관 기간 보기</summary>
          <div class="consent-body">
            · 수집 항목: 가게 이름, 위치, 연락처, 상담 내용<br />
            · 이용 목적: AI 진단 상담 및 크루 매칭을 위한 연락<br />
            · 보관 기간: 목적 달성 후 지체 없이 파기 (최대 6개월 이내)<br />
            · 동의를 거부할 수 있으나, 거부 시 신청 접수가 불가합니다. 제3자 제공은 하지 않습니다.
          </div>
        </details>
      </div>
      <p class="form-error" id="storeError" role="alert"></p>
      <button type="submit" class="btn btn-coral btn-block">진단 신청서 보내기</button>
      <div class="form-done" id="storeDone"></div>
    </form>

    <!-- 청년용 -->
    <form class="form-card crew-form" id="formCrew" novalidate>
      <h3 id="apply-crew">🧑‍💻 청년 AI 크루 지원</h3>
      <p class="form-sub">부산 대학생·청년용 — 교육 후 가게와 매칭됩니다. 활동비 지급.</p>
      <div class="gform-box" id="crewGform" hidden>
        <p class="gf-lead">지원은 <b>구글 설문지</b>로 받습니다. 아래 내용을 여쭤봅니다.</p>
        <ul class="gf-list">
          <li>이름 · 학교/전공</li>
          <li>다룰 수 있는 AI·디지털 도구</li>
          <li>활동 가능 시간</li>
          <li>연락처</li>
        </ul>
        <a class="btn btn-navy btn-block" id="crewGformLink" target="_blank" rel="noopener">크루 지원서 작성하기 ↗</a>
        <p class="gf-note">새 창에서 구글 설문지가 열립니다. 개인정보 수집·이용 동의는 설문지 첫 화면에서 받습니다.</p>
      </div>
      <div class="form-progress"><div class="fp-bar"><i id="crewProgBar"></i></div><span id="crewProgTxt">필수 항목 0 / 5</span></div>
      <div class="field">
        <label for="crewName">이름 <span class="req">*</span></label>
        <input type="text" id="crewName" autocomplete="name" placeholder="예) 김새우" required />
      </div>
      <div class="field">
        <label for="crewSchool">학교 / 전공 <span class="req">*</span></label>
        <input type="text" id="crewSchool" placeholder="예) 부산대 경영학과 3학년 (휴학생·졸업생도 환영)" required />
      </div>
      <div class="field">
        <label id="crewSkillsLabel">다룰 수 있는 AI·디지털 도구 (모두 선택)</label>
        <div class="check-group" role="group" aria-labelledby="crewSkillsLabel">
          <label class="check-chip"><input type="checkbox" name="crewSkills" value="ChatGPT/Claude 등 생성 AI" /><span>ChatGPT·Claude 등</span></label>
          <label class="check-chip"><input type="checkbox" name="crewSkills" value="이미지 생성 AI" /><span>이미지 생성 AI</span></label>
          <label class="check-chip"><input type="checkbox" name="crewSkills" value="영상 편집" /><span>영상 편집</span></label>
          <label class="check-chip"><input type="checkbox" name="crewSkills" value="플레이스/스마트스토어" /><span>플레이스·스토어 운영</span></label>
          <label class="check-chip"><input type="checkbox" name="crewSkills" value="인스타/릴스 운영" /><span>인스타·릴스</span></label>
          <label class="check-chip"><input type="checkbox" name="crewSkills" value="엑셀/데이터 정리" /><span>엑셀·데이터 정리</span></label>
        </div>
      </div>
      <div class="field">
        <label for="crewHours">활동 가능 시간 <span class="req">*</span></label>
        <select id="crewHours" required>
          <option value="">선택해 주세요</option>
          <option>주 5시간 이하</option><option>주 5~10시간</option>
          <option>주 10~20시간</option><option>주 20시간 이상</option>
        </select>
      </div>
      <div class="field">
        <label for="crewMessage">하고 싶은 말 (선택)</label>
        <textarea id="crewMessage" placeholder="예) 할머니 가게를 도와드린 경험이 있어요. 우리 동네 가게부터 맡고 싶습니다."></textarea>
      </div>
      <div class="field">
        <label for="crewContact">연락처 <span class="req">*</span></label>
        <input type="tel" id="crewContact" autocomplete="tel" placeholder="전화번호 또는 카카오톡 ID" required />
      </div>
      <div class="consent">
        <label class="consent-row" for="crewConsent">
          <input type="checkbox" id="crewConsent" required />
          <span>개인정보 수집·이용에 동의합니다. <span class="req">(필수)</span></span>
        </label>
        <details>
          <summary>수집 항목·목적·보관 기간 보기</summary>
          <div class="consent-body">
            · 수집 항목: 이름, 학교·전공, 연락처, 지원 내용<br />
            · 이용 목적: 크루 선발 및 교육·매칭 안내 연락<br />
            · 보관 기간: 목적 달성 후 지체 없이 파기 (최대 6개월 이내)<br />
            · 동의를 거부할 수 있으나, 거부 시 지원 접수가 불가합니다. 제3자 제공은 하지 않습니다.
          </div>
        </details>
      </div>
      <p class="form-error" id="crewError" role="alert"></p>
      <button type="submit" class="btn btn-navy btn-block">크루 지원서 보내기</button>
      <div class="form-done" id="crewDone"></div>
    </form>
  `;

  /* ---------------- 제출 내용 구성 ---------------- */
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
      bar: '#storeProgBar', txt: '#storeProgTxt', gbox: '#storeGform', glink: '#storeGformLink', gurl: CFG.GOOGLE_FORM_STORE_URL,
      required: [['#storeName', '가게 이름을 입력해 주세요'], ['#storeIndustry', '업종을 선택해 주세요'], ['#storeLocation', '위치를 입력해 주세요'], ['#storeConcern', '지금 가장 큰 고민을 한 줄이라도 적어 주세요'], ['#storeContact', '연락처를 입력해 주세요']],
      doneTitle: '진단 신청서가 준비되었습니다 🙌',
    },
    crew: {
      form: '#formCrew', error: '#crewError', done: '#crewDone', consent: '#crewConsent', compose: composeCrew,
      bar: '#crewProgBar', txt: '#crewProgTxt', gbox: '#crewGform', glink: '#crewGformLink', gurl: CFG.GOOGLE_FORM_CREW_URL,
      required: [['#crewName', '이름을 입력해 주세요'], ['#crewSchool', '학교/전공을 입력해 주세요'], ['#crewHours', '활동 가능 시간을 선택해 주세요'], ['#crewContact', '연락처를 입력해 주세요']],
      doneTitle: '크루 지원서가 준비되었습니다 💪',
    },
  };

  /* ---------------- 검증 → 동의 확인 → 접수(메일/복사) ---------------- */
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
    const mailto = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);

    doneEl.innerHTML = `
      <div class="fd-title">${cfg.doneTitle}</div>
      <p>${mailReady
        ? '아래 내용으로 메일 앱이 열립니다. <b>메일의 전송 버튼을 눌러야 접수가 완료</b>됩니다. ' + PROMISE + ' 연락드립니다.<br />메일 앱이 열리지 않으면 내용을 복사해 <b>' + CONTACT + '</b> 으로 보내 주세요.'
        : '접수 이메일 주소를 설정하기 전이라, 아래 내용을 <b>복사해서 문자/카카오톡으로</b> 보내 주시면 접수됩니다.'}</p>
      <textarea readonly aria-label="제출 내용">${text.replace(/</g, '&lt;')}</textarea>
      <div class="fd-actions">
        <button type="button" class="btn btn-navy btn-sm" data-fd-copy>📋 내용 복사</button>
        ${mailReady ? '<a class="btn btn-coral btn-sm" data-fd-mail href="' + mailto + '">✉️ 메일 앱으로 보내기</a>' : ''}
      </div>
    `;
    doneEl.classList.add('on');
    $('[data-fd-copy]', doneEl).addEventListener('click', () => PMUI.copyWithToast(text, '신청 내용이 복사되었습니다 📋'));
    doneEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    PMUI.copyText(text); // 안전망: 자동 복사도 함께
    if (mailReady) {
      location.href = mailto;
      PMUI.toast('메일 초안을 열었어요. 전송을 눌러야 접수됩니다!');
    } else {
      PMUI.toast('신청 내용이 복사되었습니다. 문자/카톡으로 보내 주세요!');
    }
  }

  /* ---------------- 구글 설문지 접수 ----------------
     설문지 링크가 있으면 그 양식은 입력칸 대신 설문지 연결 버튼을 보여 준다. */
  const GFORM_URL = /^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)/;
  function enableGform(cfg) {
    if (!cfg.gurl) return false;
    if (!GFORM_URL.test(cfg.gurl)) {
      console.warn('[심리마케팅] 구글 설문지 링크 형식이 아니어서 무시합니다:', cfg.gurl);
      return false;
    }
    $(cfg.glink).href = cfg.gurl;
    $(cfg.gbox).hidden = false;
    $(cfg.form).classList.add('gform-mode');
    return true;
  }

  /* ---------------- 신청서 진행률 (필수 항목 n / n) ---------------- */
  function bindProgress(cfg) {
    const form = $(cfg.form);
    const total = cfg.required.length + 1; // 필수 입력 + 개인정보 동의
    const update = () => {
      let n = cfg.required.filter(([sel]) => $(sel).value.trim()).length;
      if ($(cfg.consent).checked) n += 1;
      $(cfg.bar).style.width = Math.round((n / total) * 100) + '%';
      $(cfg.txt).textContent = n === total ? '필수 항목 모두 작성 ✓' : `필수 항목 ${n} / ${total}`;
      $(cfg.txt).parentElement.classList.toggle('done', n === total);
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
  }

  const PMForms = {
    /** container 안에 가게용·청년용 양식을 그리고 동작을 연결한다 */
    mount(container) {
      if (!container) return;
      container.innerHTML = TEMPLATE;
      Object.keys(FORMS).forEach((kind) => {
        const cfg = FORMS[kind];
        $(cfg.form).addEventListener('submit', (e) => { e.preventDefault(); handleSubmit(kind); });
        enableGform(cfg);
        bindProgress(cfg);
      });
    },

    /** 응답 시간 약속 문구와 바닥글 문의처를 config 값으로 채운다 */
    applyConfigText() {
      $$('[data-response-promise]').forEach((el) => { el.textContent = PROMISE; });
      const fc = $('#footerContact');
      if (fc && CONTACT) {
        fc.innerHTML = '<a href="mailto:' + CONTACT + '" style="color:#fff;text-decoration:underline;">' + CONTACT + '</a>';
      }
    },
  };

  window.PMForms = PMForms;
})();
