/* ================================================================
   심리 마케팅 — AI 생성 엔진 (PMEngine) v2.0
   ----------------------------------------------------------------
   4가지 도구의 실제 생성 로직:
     1) psychology  — 심리분석 AI
     2) place       — 플레이스 자동화
     3) ads         — 광고 생성
     4) performance — 성과 분석
   기본은 내장 행동심리 엔진(오프라인 동작)으로 생성하며,
   Gemini API 키가 설정되어 있으면 실제 생성형 AI가 작성합니다.
   ================================================================ */
(function () {
  'use strict';

  /* ================= 유틸 ================= */
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  // mulberry32 — 입력이 같으면 결과가 같고, "다시 생성" 시 변형이 나오도록 시드 기반
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function sample(r, arr, n) {
    const copy = arr.slice();
    const out = [];
    while (copy.length && out.length < n) out.push(copy.splice(Math.floor(r() * copy.length), 1)[0]);
    return out;
  }
  function fmt(n) { return Number(n).toLocaleString('ko-KR'); }
  function pct(n, d = 2) { return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)) + '%'; }

  /* ================= 지식 베이스: 심리 트리거 12종 ================= */
  const PRINCIPLES = {
    loss: {
      name: '손실 회피', emoji: '🛡️',
      desc: '사람은 같은 크기라도 "얻는 기쁨"보다 "잃는 고통"을 약 2배 크게 느낍니다.',
      how: '혜택을 나열하지 말고, 지금 행동하지 않으면 잃게 되는 것을 구체적으로 말해 주세요.',
      copy: (p) => `오늘이 지나면 ${p}의 첫 방문 혜택은 사라져요 — 내일의 나에게 미루지 마세요.`,
    },
    social: {
      name: '사회적 증거', emoji: '👥',
      desc: '확신이 없을 때 사람은 다수의 선택을 따라갑니다. 후기 숫자 하나가 설득 열 마디를 이깁니다.',
      how: '구체적인 숫자(누적 방문, 재구매율, 후기 수)와 실제 후기 문장을 전면에 배치하세요.',
      copy: (p) => `이번 달에만 312명이 ${p}을(를) 선택했습니다. 다들 이유가 있겠죠?`,
    },
    scarcity: {
      name: '희소성', emoji: '⏳',
      desc: '얻기 어려운 것일수록 가치 있어 보입니다. 한정 수량·한정 시간은 결정을 앞당깁니다.',
      how: '거짓 없는 진짜 한정(하루 준비 수량, 예약 가능 슬롯)을 숫자로 보여 주세요.',
      copy: (p) => `${p}, 오늘 준비 수량 20개 — 마감되면 내일 다시 만나요.`,
    },
    anchor: {
      name: '앵커링', emoji: '⚓',
      desc: '처음 본 숫자가 기준점이 되어 이후의 가격 판단을 지배합니다.',
      how: '정가·원가·시장 평균을 먼저 보여 준 뒤 실제 가격을 제시해 "이득 보는 느낌"을 설계하세요.',
      copy: (p) => `정가 59,000원 → 오픈 기념 29,000원. ${p}을(를) 가장 좋은 조건으로 만나는 날.`,
    },
    authority: {
      name: '권위', emoji: '🎓',
      desc: '전문가·자격·경력·수상 이력은 의심을 신뢰로 바꾸는 가장 빠른 지름길입니다.',
      how: '경력 연차, 자격증, 언론 소개, 누적 시술/제작 건수를 한 줄로 요약해 노출하세요.',
      copy: (p) => `12년째 이것만 해온 사람이 만드는 ${p} — 경력은 거짓말을 못 합니다.`,
    },
    reciprocity: {
      name: '상호성', emoji: '🎁',
      desc: '먼저 받으면 갚고 싶어집니다. 작은 무료 제공이 큰 구매로 돌아옵니다.',
      how: '무료 샘플·무료 진단·웰컴 드링크처럼 "조건 없이 먼저 주는 것"을 하나 설계하세요.',
      copy: (p) => `첫 방문이시면 일단 무료로 드려 볼게요. ${p}은(는) 드셔 보면 압니다.`,
    },
    commitment: {
      name: '일관성', emoji: '🪜',
      desc: '작은 YES를 한 사람은 큰 YES도 하게 됩니다. 문턱을 낮춘 첫 행동을 설계하세요.',
      how: '구매 전에 할 수 있는 아주 작은 행동(찜하기, 무료 체험, 카톡 친구 추가)을 먼저 요청하세요.',
      copy: (p) => `일단 ${p} 무료 체험부터 — 결정은 그다음에 하셔도 늦지 않아요.`,
    },
    framing: {
      name: '프레이밍', emoji: '🖼️',
      desc: '같은 사실도 어떤 틀로 말하느냐에 따라 전혀 다르게 느껴집니다.',
      how: '월 구독료는 "하루 커피 한 잔 값"으로, 지방 10%는 "90% 무지방"으로 바꿔 말해 보세요.',
      copy: (p) => `하루 990원. 커피 반 잔 값으로 ${p}을(를) 매일 쓸 수 있다면요?`,
    },
    peakend: {
      name: '피크엔드 법칙', emoji: '🎬',
      desc: '경험 전체가 아니라 "가장 강렬했던 순간"과 "마지막 순간"이 기억을 결정합니다.',
      how: '마지막 접점(포장, 배웅 인사, 구매 완료 화면)에 작은 감동 하나를 심어 재방문을 설계하세요.',
      copy: (p) => `${p}의 마지막 한 입까지 계획되어 있습니다. 나가실 때 작은 선물도요.`,
    },
    decoy: {
      name: '미끼 효과', emoji: '🪤',
      desc: '비교 대상이 되는 옵션 하나가 "원래 팔고 싶었던 옵션"을 가장 합리적으로 보이게 만듭니다.',
      how: '가격을 3단으로 구성하고, 중간 옵션의 구성을 가장 매력적으로 설계하세요.',
      copy: (p) => `싱글 9,900 / 세트 14,900 / 프리미엄 24,900 — 다들 ${p} 세트로 가시더라고요.`,
    },
    curiosity: {
      name: '호기심 간극', emoji: '🔍',
      desc: '아는 것과 모르는 것 사이의 틈이 생기면 사람은 그 틈을 메우려 클릭합니다.',
      how: '결론을 다 말하지 말고 "단골만 아는", "사장님이 숨겨 둔" 같은 정보의 빈틈을 만드세요.',
      copy: (p) => `단골들만 조용히 시키는 ${p} 주문법이 있습니다. (매장에서 물어보세요)`,
    },
    ownership: {
      name: '보유 효과', emoji: '🤲',
      desc: '일단 내 손에 들어온 것은 더 가치 있게 느껴져 돌려주기 어렵습니다.',
      how: '무료 체험 기간, 착용·시승·시식처럼 "먼저 소유하게 하는 장치"를 만드세요.',
      copy: (p) => `${p}, 7일 동안 먼저 써 보세요. 반납하고 싶지 않아질 테니까요.`,
    },
  };
  const PRINCIPLE_KEYS = Object.keys(PRINCIPLES);

  /* ================= 지식 베이스: 업종 ================= */
  const INDUSTRIES = {
    '카페/디저트': {
      pains: ['주변에 비슷한 카페가 너무 많아 고르기 피곤함', '사진과 실물이 다를까 봐 걱정', '웨이팅·좌석 불확실성'],
      desires: ['인증샷이 예쁘게 나오는 공간', '나만 아는 단골집이라는 느낌', '당 충전과 휴식이라는 확실한 보상'],
      triggers: ['scarcity', 'social', 'peakend', 'curiosity'],
      placeTip: '메뉴보다 "공간에서 보내는 시간"을 팔고, 시그니처 메뉴 1개에 서사를 집중하세요.',
      kw: ['카페', '디저트카페', '분위기좋은카페', '신상카페', '디저트맛집', '브런치'],
    },
    '음식점': {
      pains: ['실패하기 싫은 한 끼 — 선택 피로', '위생·재료 원산지에 대한 불안', '혼잡 시간대 웨이팅'],
      desires: ['줄 서서라도 먹을 가치가 있는 확실한 맛', '대접받는 느낌', '재료에 대한 신뢰'],
      triggers: ['social', 'authority', 'scarcity', 'peakend'],
      placeTip: '"대표 메뉴 1개 = 가게 이름"이 되도록 각인시키고, 주방·재료 공개로 불안을 제거하세요.',
      kw: ['맛집', '점심맛집', '저녁회식', '혼밥', '단체석', '배달맛집'],
    },
    '뷰티/미용': {
      pains: ['시술 결과가 기대와 다를까 봐 불안', '가격이 불투명하다는 인상', '강요당하는 추가 결제'],
      desires: ['달라진 내 모습에 대한 기대', '전문가가 나를 전담해 준다는 안심', '유지력·가성비'],
      triggers: ['authority', 'social', 'anchor', 'ownership'],
      placeTip: '비포/애프터와 시술자 경력을 전면에, 가격표는 투명하게 공개해 불안을 지우세요.',
      kw: ['미용실', '네일', '왁싱', '피부관리', '속눈썹', '두피케어'],
    },
    '피트니스/요가': {
      pains: ['작심삼일에 대한 자기 불신', '기구·수업을 못 따라갈까 봐 두려움', '장기 결제 부담'],
      desires: ['꾸준히 다니게 만들어 주는 시스템', '몸의 변화라는 눈에 보이는 성과', '운동이 즐거워지는 경험'],
      triggers: ['commitment', 'loss', 'social', 'framing'],
      placeTip: '"의지"가 아니라 "시스템"을 파세요. 출석 관리·바디 프로필 변화 사례가 최고의 광고입니다.',
      kw: ['헬스장', 'PT', '요가', '필라테스', '다이어트', '바디프로필'],
    },
    '병원/의원': {
      pains: ['과잉 진료에 대한 경계심', '대기 시간 불만', '내 증상을 대충 들을까 봐 걱정'],
      desires: ['충분한 설명과 경청', '검증된 전문성', '예측 가능한 비용'],
      triggers: ['authority', 'social', 'reciprocity', 'framing'],
      placeTip: '의료광고 규정을 지키는 범위에서 의료진 이력·장비·진료 철학을 담백하게 전달하세요. (치료 효과 보장·비교 표현 금지)',
      kw: ['의원', '내과', '정형외과', '피부과', '야간진료', '주말진료'],
    },
    '학원/교육': {
      pains: ['성적이 오를지 확신 없음', '아이가 흥미를 잃을까 봐 걱정', '환불·레벨 테스트 부담'],
      desires: ['눈에 보이는 성적·실력 변화', '아이를 세심히 관리해 주는 담임', '명확한 커리큘럼 로드맵'],
      triggers: ['authority', 'social', 'commitment', 'loss'],
      placeTip: '합격/성적 향상 사례를 숫자로, 상담은 "무료 진단"으로 문턱을 낮추세요.',
      kw: ['학원', '영어학원', '수학학원', '입시', '내신', '레벨테스트'],
    },
    '쇼핑몰/이커머스': {
      pains: ['실물이 사진과 다를 위험', '배송·교환 불편', '비슷한 상품 대비 가격 비교 피로'],
      desires: ['실패 없는 구매 확신', '나를 아는 듯한 추천', '빠른 배송과 쉬운 반품'],
      triggers: ['social', 'loss', 'anchor', 'ownership'],
      placeTip: '상세페이지 상단 3초 안에 후기 수·재구매율을 보여 주고, 무료 반품으로 망설임을 제거하세요.',
      kw: ['쇼핑몰', '온라인스토어', '무료배송', '당일발송', '리뷰이벤트', '신상'],
    },
    '숙박/펜션': {
      pains: ['사진발에 속을까 봐 불안', '위생 상태 걱정', '취소·환불 규정 스트레스'],
      desires: ['일상 탈출의 완벽한 하루', '사진 그대로의 공간', '호스트의 세심한 배려'],
      triggers: ['scarcity', 'peakend', 'social', 'curiosity'],
      placeTip: '보정 없는 실사+객실 영상으로 신뢰를, "이번 주 잔여 1실"로 결정을 앞당기세요.',
      kw: ['펜션', '풀빌라', '감성숙소', '애견동반', '커플여행', '가족여행'],
    },
    '반려동물': {
      pains: ['내 아이를 맡겨도 될지 불안', '위생·안전 사고 걱정', '가격 대비 케어 품질 의심'],
      desires: ['보호자보다 더 세심한 케어', '투명하게 공개되는 돌봄 과정', '아이가 즐거워하는 모습'],
      triggers: ['authority', 'social', 'reciprocity', 'peakend'],
      placeTip: '케어 과정 사진/영상 전송 서비스를 만들고 후기로 증명하세요. 신뢰가 전부인 업종입니다.',
      kw: ['애견미용', '펫호텔', '동물병원', '유치원', '강아지간식', '고양이'],
    },
    '부동산/인테리어': {
      pains: ['허위 매물·과장 견적 불신', '큰돈이 걸린 결정의 공포', '사후 AS 걱정'],
      desires: ['전 과정의 투명한 공개', '전문가의 손에 맡기는 안심', '예산 안에서의 최선'],
      triggers: ['authority', 'social', 'anchor', 'commitment'],
      placeTip: '시공 전후 사진·실제 견적서 샘플 공개가 가장 강력합니다. 무료 실측/상담으로 시작하세요.',
      kw: ['인테리어', '리모델링', '부동산', '전세', '매매', '상가'],
    },
    '프리랜서/서비스': {
      pains: ['결과물 품질을 미리 알 수 없음', '커뮤니케이션 비용 걱정', '일정 지연 불안'],
      desires: ['포트폴리오로 확인되는 실력', '빠른 응답과 명확한 프로세스', '합리적인 견적'],
      triggers: ['authority', 'social', 'commitment', 'framing'],
      placeTip: '포트폴리오 3개를 엄선해 보여 주고, 진행 프로세스를 단계별로 시각화하세요.',
      kw: ['디자인외주', '영상편집', '마케팅대행', '개발외주', '컨설팅', '레슨'],
    },
    '기타': {
      pains: ['선택지가 많아 비교가 피곤함', '실패 비용에 대한 두려움', '신뢰할 근거 부족'],
      desires: ['확실한 문제 해결', '합리적인 가격', '믿을 수 있는 전문성'],
      triggers: ['social', 'loss', 'authority', 'curiosity'],
      placeTip: '고객이 가장 두려워하는 것 1가지를 찾아 그 두려움을 제거하는 메시지부터 시작하세요.',
      kw: ['추천', '후기', '가성비', '예약', '이벤트', '신규오픈'],
    },
  };

  /* ================= 지식 베이스: 연령대 심리 ================= */
  const AGE_PSY = {
    '10대': {
      traits: '또래 집단의 인정이 소비의 가장 큰 동력입니다. 유행 민감도가 극도로 높고, "나만 모르는 것"에 대한 FOMO가 강합니다.',
      hooks: '밈·챌린지 등 참여형 콘텐츠, 또래 인증샷', channels: '틱톡 · 인스타 릴스 · 유튜브 쇼츠',
      caution: '어른의 말투로 가르치려 들면 즉시 이탈합니다.',
    },
    '20대': {
      traits: '가성비와 가심비 사이에서 움직입니다. 후기 검색이 습관화되어 있고, "경험 소비"에 지갑을 엽니다. 인증 욕구와 자기 보상 심리가 강합니다.',
      hooks: '인생샷 스팟, 첫 방문 혜택, 솔직 후기', channels: '인스타그램 · 네이버 지도 · 유튜브',
      caution: '과장 광고 냄새가 나면 캡처되어 역풍이 붑니다. 솔직함이 최고의 전략.',
    },
    '30대': {
      traits: '시간이 가장 귀한 자원입니다. 실패 없는 선택을 위해 비교·검증에 능숙하고, 검증만 되면 가격 저항이 낮습니다. 아이·커리어·자기관리가 핵심 관심사.',
      hooks: '시간 절약, 전문가 검증, 예약·픽업 편의', channels: '네이버 검색 · 인스타그램 · 당근',
      caution: '모호한 설명은 불신으로 이어집니다. 숫자와 근거로 말하세요.',
    },
    '40대': {
      traits: '신뢰와 관계 기반 소비가 중심입니다. 한번 만족하면 재방문율과 소개율이 가장 높은 세대. 가족 단위 의사결정권을 쥐고 있습니다.',
      hooks: '경력·전문성, 가족 혜택, 단골 우대', channels: '네이버 검색/블로그 · 카카오톡 · 밴드',
      caution: '어설픈 유행어 사용은 신뢰를 깎습니다. 정중하고 확실하게.',
    },
    '50대 이상': {
      traits: '품질과 건강, 그리고 "대접받는 느낌"이 핵심입니다. 전화·대면 소통을 선호하고, 만족 시 주변 추천 파워가 막강합니다.',
      hooks: '건강·안전 키워드, 친절한 안내, 전화 예약', channels: '카카오톡 · 네이버 · 지역 커뮤니티',
      caution: '글씨가 작거나 절차가 복잡하면 바로 포기합니다. 쉽고 크게.',
    },
    '전연령': {
      traits: '전 연령을 노린다는 것은 아무도 못 잡는다는 뜻이 되기 쉽습니다. 핵심 고객 1명을 구체적으로 그리는 것부터 시작하세요.',
      hooks: '명확한 대표 상품 1개, 보편적 신뢰 요소(후기·위생·경력)', channels: '네이버 지도 · 카카오톡',
      caution: '메시지를 하나로 좁힐수록 반응은 올라갑니다.',
    },
  };

  /* ================= 지식 베이스: 광고 채널 ================= */
  const CHANNELS = {
    '인스타그램': { style: '비주얼 중심, 첫 문장 승부, 줄바꿈 리듬감', limit: '본문 2,200자(첫 2줄이 승부처)', cta: '프로필 링크 클릭 유도', tags: true },
    '네이버': { style: '검색 의도 대응형, 신뢰·정보 중심', limit: '파워링크 제목 15자 / 설명 45자', cta: '사이트 방문·예약 유도', tags: false },
    '당근마켓': { style: '동네 이웃 말투, 과장 없는 진정성', limit: '제목 간결, 동네 지명 포함', cta: '채팅·매장 방문 유도', tags: true },
    '카카오톡': { style: '친구에게 보내는 메시지 톤, 혜택 명확', limit: '메시지 400자 내외 권장', cta: '채널 추가·쿠폰 받기', tags: false },
    '페이스북': { style: '스토리텔링 허용, 타겟 공감 서사', limit: '본문 제한 없음(3줄 이후 더보기)', cta: '자세히 보기 클릭', tags: false },
    '유튜브': { style: '첫 5초 훅, 문제 제기 → 해결 구조', limit: '설명란 활용, 영상 스크립트 중심', cta: '구독·링크 클릭', tags: true },
  };

  const BENCHMARKS = {
    '네이버': { ctr: 1.2, cvr: 2.5, roas: 350 },
    '인스타그램': { ctr: 0.9, cvr: 1.8, roas: 280 },
    '당근마켓': { ctr: 1.5, cvr: 2.2, roas: 300 },
    '카카오톡': { ctr: 0.8, cvr: 1.6, roas: 260 },
    '페이스북': { ctr: 1.0, cvr: 1.9, roas: 270 },
    '유튜브': { ctr: 0.7, cvr: 1.5, roas: 250 },
    '전체/기타': { ctr: 1.0, cvr: 2.0, roas: 300 },
  };

  /* ================= 조사(은/는, 이/가, 을/를) 처리 ================= */
  function josa(word, type) {
    const w = String(word || '').trim();
    if (!w) return '';
    const code = w.charCodeAt(w.length - 1);
    const hasJong = code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 > 0 : false;
    const map = { '은는': hasJong ? '은' : '는', '이가': hasJong ? '이' : '가', '을를': hasJong ? '을' : '를', '과와': hasJong ? '과' : '와', '으로': hasJong ? '으로' : '로' };
    return w + (map[type] || '');
  }

  /* ================================================================
     도구 1 — 심리분석 AI
     input: {industry, product, age, gender, price, goal, concern}
     ================================================================ */
  function toolPsychology(input, seed) {
    const r = rng(seed);
    const ind = INDUSTRIES[input.industry] || INDUSTRIES['기타'];
    const age = AGE_PSY[input.age] || AGE_PSY['전연령'];
    const p = input.product || '우리 상품';
    const score = 83 + Math.floor(r() * 15);

    const genderNote = input.gender === '여성 중심'
      ? '여성 중심 타겟은 구매 전 후기·실사용 콘텐츠 탐색 비중이 높은 경향이 있어, 비포/애프터와 상세 후기가 특히 효과적입니다.'
      : input.gender === '남성 중심'
        ? '남성 중심 타겟은 비교표·스펙·숫자 등 "빠른 판단 근거"에 반응하는 경향이 있어, 핵심 수치를 전면 배치하는 것이 좋습니다.'
        : '성별 구분 없이, 구매 결정 순간의 "망설임 포인트"를 좁혀 공략하는 것이 효과적입니다.';

    const triggers = sample(r, ind.triggers, Math.min(3, ind.triggers.length))
      .concat(sample(r, PRINCIPLE_KEYS.filter((k) => !ind.triggers.includes(k)), 1));

    const motives = sample(r, ind.desires, 3);
    const barriers = sample(r, ind.pains, 3);
    const remedies = [
      '첫 화면에서 숫자(후기 수·경력·누적 고객)로 증명해 의심을 제거',
      '"무료·체험·환불 보장" 같은 안전장치로 실패 비용을 0에 가깝게',
      '선택지를 3개 이하로 줄여 결정 피로를 차단',
    ];

    const journey = [
      ['① 인지', `${age.channels} 중 1개 채널에 집중해 "${pick(r, ['3초 안에 멈추게 하는', '스크롤을 세우는', '한 번 더 보게 되는'])}" 첫 장면을 만드세요. 핵심 무기: ${PRINCIPLES[triggers[0]].name}.`],
      ['② 관심', `${josa(p, '을를')} "기능"이 아니라 "${pick(r, ['달라질 하루', '해결된 고민', '누리게 될 장면'])}"으로 보여 주세요. 타겟의 욕망 키워드: ${motives[0]}.`],
      ['③ 비교', `경쟁 대안과 나란히 놓였을 때를 대비해 "우리만 말할 수 있는 한 줄"을 준비하세요. ${genderNote}`],
      ['④ 구매', `마지막 망설임은 "${barriers[0]}"입니다. ${remedies[0]}하면 전환이 열립니다.`],
      ['⑤ 재구매', `${PRINCIPLES.peakend.name}을 활용해 마지막 접점(포장·배웅·완료 화면)에 기억될 순간 하나를 심으세요. 재방문 쿠폰은 "다음에 쓸 이유"가 됩니다.`],
    ];

    const checklist = [
      `대표 상품을 "${p}" 하나로 좁히고 모든 메시지를 집중`,
      `${PRINCIPLES[triggers[0]].name} 문구를 간판·상세페이지 첫 줄에 적용`,
      '후기 10개 확보 캠페인 실행 (리뷰 혜택 설계)',
      `${age.channels.split('·')[0].trim()} 채널에 주 2회 콘텐츠 업로드`,
      '가격 표기를 앵커링 구조(정가→혜택가)로 변경',
      `구매 직전 이탈 요인 "${barriers[1] || barriers[0]}" 해소 문구 추가`,
      '이번 주 지표 1개(문의 수/예약 수)만 정해서 매일 기록',
    ];

    return {
      title: `${p} 타겟 심리 분석 리포트`,
      meta: { score, badge: '심리 적합도 ' + score + '점' },
      sections: [
        {
          tag: 'PROFILE', title: '🧠 타겟 심리 프로파일',
          body: `[${input.age || '전연령'} · ${input.gender || '전체'} · ${input.industry || '기타'}]\n\n${age.traits}\n\n${genderNote}\n\n⚠️ 주의: ${age.caution}\n📍 주력 채널: ${age.channels}`,
        },
        {
          tag: 'MOTIVE', title: '🔥 핵심 구매 동기 TOP3',
          body: motives.map((m, i) => `${i + 1}. ${m}`).join('\n') + `\n\n→ 이 중 1번을 ${josa(p, '의') || p + '의'} 메인 메시지로 삼으세요. 여러 동기를 동시에 건드리면 어느 것도 꽂히지 않습니다.`,
        },
        {
          tag: 'BARRIER', title: '🧱 구매를 막는 심리 장벽 TOP3 & 해소법',
          body: barriers.map((b, i) => `${i + 1}. ${b}\n   ↳ 해소법: ${remedies[i]}`).join('\n\n'),
        },
        {
          tag: 'TRIGGER', title: '🎯 추천 심리 트리거 4선',
          body: triggers.map((k, i) => {
            const t = PRINCIPLES[k];
            return `${i + 1}. ${t.emoji} ${t.name}\n   원리: ${t.desc}\n   적용: ${t.how}\n   바로 쓰는 문구: "${t.copy(p)}"`;
          }).join('\n\n'),
        },
        { tag: 'JOURNEY', title: '🗺️ 구매 여정 5단계 전략', body: journey.map(([s, b]) => `${s}\n${b}`).join('\n\n') },
        { tag: 'ACTION', title: '✅ 이번 주 실행 체크리스트', body: checklist.map((c) => `☐ ${c}`).join('\n') },
        input.concern ? {
          tag: 'QNA', title: '💡 사장님 고민에 대한 처방',
          body: `고민: "${input.concern}"\n\n${pick(r, [
            '이 고민의 본질은 "신뢰 부족"일 가능성이 큽니다. 설득을 더하려 하지 말고, 의심을 하나씩 제거하는 방향(후기·보장·투명한 가격)으로 접근해 보세요.',
            '지금 필요한 것은 더 많은 노출이 아니라 "기억에 남는 한 가지"입니다. 모든 걸 알리려 하지 말고, 가장 강한 무기 하나로 메시지를 좁혀 보세요.',
            '고객은 상품이 아니라 "달라진 자신"을 삽니다. 상품 설명을 줄이고, 사용 후의 장면을 보여 주는 콘텐츠로 바꿔 보세요.',
          ])}\n\n우선 적용 트리거: ${PRINCIPLES[triggers[0]].name} + ${PRINCIPLES[triggers[1]].name}`,
        } : null,
      ].filter(Boolean),
    };
  }

  /* ================================================================
     도구 2 — 플레이스 자동화
     input: {store, industry, location, menu, strength, tone}
     ================================================================ */
  function toolPlace(input, seed) {
    const r = rng(seed);
    const ind = INDUSTRIES[input.industry] || INDUSTRIES['기타'];
    const store = input.store || '우리 가게';
    const loc = input.location || '우리 동네';
    const menu = input.menu || '대표 메뉴';
    const strength = input.strength || '정성과 꾸준함';

    const introA = `${loc}에서 ${josa(menu, '을를')} 가장 진심으로 만드는 곳, ${store}입니다.\n\n${pick(r, [
      `문을 열고 들어오는 순간부터 나가시는 순간까지 — 저희는 "${strength}" 하나만큼은 양보하지 않습니다.`,
      `화려한 말 대신 ${josa(strength, '으로')} 증명하겠습니다. 한 번 오신 분들이 다시 찾는 데는 이유가 있으니까요.`,
    ])}\n\n${pick(r, [
      `${josa(menu, '은는')} 매일 준비한 만큼만 판매합니다. 품절이라면 죄송하지만, 그만큼 내일의 신선함을 약속드리는 일이기도 합니다.`,
      `처음 오셨다면 ${josa(menu, '을를')} 먼저 드셔 보세요. ${store}의 모든 자신감이 그 안에 담겨 있습니다.`,
    ])}\n\n📍 ${loc}에서 검색하고 오시는 길이 가장 빠릅니다. 오늘도 좋은 하루 되세요 :)`;

    const introB = `[${store}] ${loc} ${input.industry || ''}\n\n✔ 대표 메뉴/서비스: ${menu}\n✔ 우리의 강점: ${strength}\n✔ 운영 원칙: ${ind.placeTip}\n\n${pick(r, [
      '과장된 수식어 대신 기본을 지킵니다. 재료, 위생, 응대 — 보이지 않는 곳까지 신경 쓰는 것이 저희의 마케팅입니다.',
      '첫 방문이 어려우신 걸 압니다. 그래서 가격과 과정은 투명하게, 응대는 더 따뜻하게 준비했습니다.',
    ])}\n\n예약·문의는 플레이스 하단 버튼으로 간편하게 가능합니다. 방문 전 "새소식"에서 이번 주 혜택을 꼭 확인해 주세요!`;

    const kwBase = [loc + ' ' + (input.industry || '맛집').split('/')[0], loc + ' ' + menu, menu + ' 맛집', loc + ' ' + menu + ' 추천'];
    const kwInd = ind.kw.map((k) => loc + ' ' + k);
    const kwExtra = [menu + ' 예약', loc + ' 가볼만한곳', store, loc + ' ' + ind.kw[0] + ' 추천', '근처 ' + (ind.kw[1] || ind.kw[0])];
    const keywords = Array.from(new Set(kwBase.concat(sample(r, kwInd, 8)).concat(kwExtra))).slice(0, 15);

    const weeks = [
      { t: `“${menu}” 뒤에 숨은 이야기`, trig: 'curiosity', b: `${josa(menu, '이가')} 지금의 맛/퀄리티가 되기까지의 과정을 공개합니다. ${pick(r, ['버린 레시피만 수십 개', '새벽 준비 과정', '재료를 고르는 기준'])} — 단골들도 몰랐던 비하인드를 소식으로 풀어 보세요.` },
      { t: '이번 주 한정 혜택 안내', trig: 'scarcity', b: `이번 주 방문 고객 대상 한정 혜택(수량/기간 명시)을 공지하세요. 예: "금~일 3일간, ${menu} 주문 시 ○○ 증정 (하루 20분 한정)". 끝나는 날짜가 명확할수록 반응이 빠릅니다.` },
      { t: '고객 후기 리그램 & 감사 인사', trig: 'social', b: `이번 주 받은 실제 후기 1~2개를 캡처해 소개하고 정중히 감사를 전하세요. "후기 속 그 메뉴"를 함께 태그하면 신규 고객의 선택 장벽이 크게 낮아집니다.` },
      { t: `${store}가 ${josa(strength, '을를')} 지키는 방법`, trig: 'authority', b: `강점(${strength})을 증명하는 구체적 장면을 보여 주세요. 사진 3장 + 짧은 설명이면 충분합니다. 말이 아닌 "장면"이 신뢰를 만듭니다.` },
    ];
    const weekPlan = weeks.map((w, i) => {
      const t = PRINCIPLES[w.trig];
      return `${i + 1}주차 — ${w.t}  [${t.emoji} ${t.name}]\n${w.b}\n해시태그: #${loc.replace(/\s/g, '')} #${(menu || '').replace(/\s/g, '')} #${(ind.kw[0] || '추천').replace(/\s/g, '')}`;
    }).join('\n\n');

    const reviews = [
      `⭐ 긍정 후기 답글\n"${pick(r, ['소중한 시간 내어', '바쁘신 와중에'])} 후기 남겨 주셔서 진심으로 감사합니다 😊 ${josa(menu, '을를')} 맛있게/만족스럽게 즐기셨다니 ${store} 식구들 모두 힘이 납니다. 다음 방문엔 더 좋은 모습으로 보답할게요. 또 뵙겠습니다!"`,
      `🙂 보통(3점대) 후기 답글\n"방문해 주셔서 감사합니다. 말씀해 주신 부분 덕분에 저희가 놓치고 있던 점을 돌아보게 되었어요. ○○ 부분은 이번 주 안으로 개선하겠습니다. 다음에 오시면 달라진 ${store}를 보여 드리고 싶습니다. 꼭 다시 한번 기회를 주세요."`,
      `🙏 불만 후기 답글 (서비스 회복 공식: 공감→사과→조치→보상)\n"먼저 기대하고 방문해 주셨는데 실망을 드려 진심으로 죄송합니다. 말씀하신 ○○ 문제는 변명의 여지가 없습니다. 오늘 바로 (구체적 조치)를 완료했고, 재발하지 않도록 (시스템 개선)하겠습니다. 괜찮으시다면 다음 방문 시 저희가 제대로 다시 모실 기회를 주시면 감사하겠습니다."`,
    ].join('\n\n');

    const ctas = [
      `“${loc}에서 ${menu} 찾으셨다면, 저장해 두세요. 품절이 빠른 집입니다.” (희소성)`,
      `“첫 방문이세요? 플레이스 ‘소식’의 첫 방문 혜택을 보여 주세요. 먼저 챙겨 드릴게요.” (상호성)`,
      `“이번 주 예약 가능 시간대가 몇 자리 남지 않았습니다. 지금 바로 예약 버튼을 눌러 주세요.” (손실 회피)`,
    ].join('\n\n');

    return {
      title: `${store} 플레이스 운영 패키지`,
      meta: { badge: '4주 자동화 플랜' },
      sections: [
        { tag: 'INTRO', title: '🏪 플레이스 소개글 A — 감성형', body: introA },
        { tag: 'INTRO', title: '🏪 플레이스 소개글 B — 신뢰형', body: introB },
        { tag: 'KEYWORD', title: '🔑 대표 키워드 15 (검색 노출용)', body: keywords.map((k, i) => `${i + 1}. ${k}`).join('\n') + '\n\n→ 플레이스 "대표 키워드"란과 소개글 본문에 자연스럽게 녹여 주세요.' },
        { tag: 'PLAN', title: '📅 4주 소식 포스팅 플랜', body: weekPlan },
        { tag: 'REVIEW', title: '💬 리뷰 답글 템플릿 3종', body: reviews },
        { tag: 'CTA', title: '📣 방문·예약 유도 문구 3', body: ctas },
        { tag: 'TIP', title: `💡 ${input.industry || '우리'} 업종 플레이스 공략 팁`, body: ind.placeTip + '\n\n체크포인트:\n☐ 대표 사진 첫 장 = 가장 맛있어/매력 있어 보이는 1장 (내부 전경 X)\n☐ 소식 주 1회 이상 업로드 (노출 지수에 영향)\n☐ 모든 리뷰에 24시간 내 답글 (예비 고객이 다 봅니다)\n☐ 영업시간·브레이크타임 최신화 (틀리면 신뢰 급락)' },
      ],
    };
  }

  /* ================================================================
     도구 3 — 광고 생성
     input: {channel, product, target, usp, promo, tone}
     ================================================================ */
  function toolAds(input, seed) {
    const r = rng(seed);
    const ch = CHANNELS[input.channel] || CHANNELS['인스타그램'];
    const p = input.product || '우리 상품';
    const target = input.target || '우리 고객';
    const usp = input.usp || '확실한 품질';
    const promo = input.promo || '';
    const tone = input.tone || '친근한';

    const toneWrap = {
      '친근한': (s) => s,
      '전문적인': (s) => s.replace(/요\.|요!/g, '습니다.').replace(/해요/g, '합니다'),
      '유머러스한': (s) => s,
      '감성적인': (s) => s,
      '긴급한': (s) => s,
    };

    const H = [
      ['loss', `${target}님, 이걸 모르면 계속 손해 보실 거예요`],
      ['loss', `오늘 지나면 ${promo || '이 혜택'}은 없던 일이 됩니다`],
      ['social', `요즘 ${target} 사이에서 ${josa(p, '이가')} 돌고 있는 이유`],
      ['social', `후기만 읽어 보세요. ${josa(p, '은는')} 설명이 필요 없습니다`],
      ['scarcity', `${p}, 오늘 준비된 수량이 거의 끝났습니다`],
      ['curiosity', `${josa(p, '을를')} 써 본 사람들이 입을 모아 하는 말`],
      ['curiosity', `${target}의 90%가 놓치고 있는 것`],
      ['anchor', `원래 가격을 알면 지금 이 가격이 이상하게 느껴질 겁니다`],
      ['authority', `${usp} — 이 한 줄이면 충분합니다`],
      ['framing', `하루 커피 한 잔 값으로 ${josa(p, '을를')} 매일`],
      ['ownership', `일단 7일만 써 보세요. 반품하고 싶지 않아질 테니까`],
      ['reciprocity', `${target}님께 먼저 드립니다. 조건 없이요`],
    ];
    const headlines = sample(r, H, 10).map(([k, h], i) => `${i + 1}. [${PRINCIPLES[k].emoji} ${PRINCIPLES[k].name}] ${toneWrap[tone] ? toneWrap[tone](h) : h}`).join('\n');

    const shortCopy = input.channel === '네이버'
      ? `제목(15자 내): ${p.slice(0, 8)}, ${promo ? '지금 ' + promo.slice(0, 6) : '오늘만 혜택'}\n설명(45자 내): ${usp}. ${target} 만족 후기 다수. 지금 확인하고 예약하세요.`
      : `${pick(r, ['멈추세요, 스크롤.', '3초만 보고 가세요.', '이건 저장해 두셔야 해요.'])}\n${josa(p, '이가')} ${target}에게 필요한 이유 — ${usp}.\n${promo ? '지금 ' + promo + ' 진행 중.' : '지금이 가장 좋은 타이밍.'}\n${ch.cta} 👉`;

    const midCopy = `${target}님, 혹시 이런 적 없으세요?\n\n${pick(r, ['매번 비슷한 선택을 하고 후회하는 것', '좋다는 건 많은데 뭐가 진짜인지 모르겠는 것', '시간은 없는데 알아볼 건 너무 많은 것'])}.\n\n그래서 ${josa(p, '을를')} 만들었습니다.\n핵심은 하나예요 — ${usp}.\n\n${promo ? `지금 시작하시면 ${promo}까지 챙겨 드립니다.\n` : ''}망설이는 사이에 ${pick(r, ['이번 달 수량이', '혜택 기간이', '예약 자리가'])} 줄어들고 있어요.\n\n${ch.cta} — 지금 바로.`;

    const storyCopy = `처음엔 저도 반신반의했습니다.\n"${pick(r, ['또 광고겠지', '다 거기서 거기 아니야?', '좋은 말은 누구나 하지'])}" 싶었거든요.\n\n그런데 ${josa(p, '을를')} 직접 경험한 날, 생각이 바뀌었습니다.\n${usp} — 이게 말뿐이 아니었어요.\n\n${target}이라면 공감하실 거예요.\n우리에게 필요한 건 화려한 광고가 아니라, 한 번의 확실한 경험이라는 걸.\n\n${promo ? `마침 지금은 ${promo} 기간입니다.\n` : ''}오늘의 선택이 내일의 차이를 만듭니다.\n${ch.cta} 👉`;

    const ctas = sample(r, [
      '지금 바로 시작하기', '오늘의 혜택 받기', '무료로 먼저 경험하기', '남은 자리 확인하기',
      '1분 만에 예약하기', '혜택 마감 전에 받기', '내 것으로 만들기', '지금 확인하러 가기',
    ], 5).map((c, i) => `${i + 1}. [ ${c} ]`).join('\n');

    const tagBase = [p, target, usp, input.channel === '당근마켓' ? '동네' : '추천'].join(' ').replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const tags = Array.from(new Set(tagBase.concat(['이벤트', '꿀팁', '추천', '내돈내산', '신상', '할인', '일상', '소통'])))
      .slice(0, 20).map((t) => '#' + t).join(' ');

    return {
      title: `${p} ${input.channel || ''} 광고 세트`,
      meta: { badge: (input.channel || '멀티채널') + ' 최적화' },
      sections: [
        { tag: 'INFO', title: `📌 ${input.channel || '채널'} 공략 포인트`, body: `스타일: ${ch.style}\n규격: ${ch.limit}\n목표 액션: ${ch.cta}\n선택 톤: ${tone}` },
        { tag: 'HEAD', title: '💥 심리 트리거 헤드라인 10', body: headlines + '\n\n→ 반응이 좋은 2개를 골라 A/B 테스트하세요.' },
        { tag: 'COPY', title: '📝 메인 카피 — 숏버전', body: shortCopy },
        { tag: 'COPY', title: '📝 메인 카피 — 미디엄버전', body: midCopy },
        { tag: 'COPY', title: '📖 스토리형 카피 (전환용)', body: storyCopy },
        { tag: 'CTA', title: '🔘 CTA 버튼 문구 5', body: ctas },
        ch.tags ? { tag: 'TAG', title: '#️⃣ 해시태그 추천', body: tags } : null,
        {
          tag: 'AB', title: '🧪 A/B 테스트 가이드',
          body: `1. 헤드라인 2종(감정형 vs 숫자형)만 바꿔 동일 예산으로 3일 집행\n2. 승자 헤드라인 + 카피 2종(숏 vs 스토리)으로 2차 테스트\n3. 판정 기준: CTR이 아니라 "전환당 비용(CPA)"으로 결정\n4. 패자 소재도 버리지 말 것 — 타겟 연령을 바꾸면 승자가 되기도 합니다\n5. 성과 수치는 [성과분석] 도구에 입력하면 심리학 처방까지 받아볼 수 있어요`,
        },
      ].filter(Boolean),
    };
  }

  /* ================================================================
     도구 4 — 성과 분석
     input: {channel, period, impressions, clicks, conversions, cost, revenue}
     ================================================================ */
  function toolPerformance(input, seed) {
    const r = rng(seed);
    const imp = Math.max(0, Number(input.impressions) || 0);
    const clk = Math.max(0, Number(input.clicks) || 0);
    const cnv = Math.max(0, Number(input.conversions) || 0);
    const cost = Math.max(0, Number(input.cost) || 0);
    const rev = Math.max(0, Number(input.revenue) || 0);
    const bm = BENCHMARKS[input.channel] || BENCHMARKS['전체/기타'];

    const ctr = imp > 0 ? (clk / imp) * 100 : 0;
    const cvr = clk > 0 ? (cnv / clk) * 100 : 0;
    const cpc = clk > 0 ? cost / clk : 0;
    const cpa = cnv > 0 ? cost / cnv : 0;
    const roas = cost > 0 ? (rev / cost) * 100 : 0;
    const aov = cnv > 0 ? rev / cnv : 0;

    function grade(v, base) {
      if (base <= 0) return '—';
      const ratio = v / base;
      if (ratio >= 1.3) return '🟢 우수';
      if (ratio >= 0.85) return '🟡 평균';
      return '🔴 개선 필요';
    }
    const gCtr = grade(ctr, bm.ctr), gCvr = grade(cvr, bm.cvr), gRoas = grade(roas, bm.roas);

    // 병목 진단
    let bottleneck, bottleneckKey;
    if (imp > 0 && ctr < bm.ctr * 0.85) { bottleneck = '🪧 관심 단계(광고 소재)'; bottleneckKey = 'ctr'; }
    else if (clk > 0 && cvr < bm.cvr * 0.85) { bottleneck = '🛒 전환 단계(랜딩/상세페이지)'; bottleneckKey = 'cvr'; }
    else if (cost > 0 && roas < bm.roas * 0.85) { bottleneck = '💰 수익 단계(객단가/타겟 정확도)'; bottleneckKey = 'roas'; }
    else { bottleneck = '✨ 뚜렷한 병목 없음 — 확장 타이밍'; bottleneckKey = 'scale'; }

    const scoreRaw = (Math.min(ctr / bm.ctr, 2) + Math.min(cvr / bm.cvr, 2) + Math.min(roas / bm.roas, 2)) / 6 * 100;
    const score = Math.max(5, Math.min(99, Math.round(scoreRaw)));

    const RX = {
      ctr: [
        `${PRINCIPLES.curiosity.emoji} 호기심 간극 — 헤드라인에서 결론을 다 말하지 마세요. "〜한 이유", "〜만 아는" 구조로 바꾸면 CTR이 움직입니다.`,
        `${PRINCIPLES.loss.emoji} 손실 회피 — "받으세요" 대신 "놓치지 마세요"로. 혜택 프레임을 손실 프레임으로 전환해 보세요.`,
        `${PRINCIPLES.social.emoji} 사회적 증거 — 썸네일/첫 줄에 구체적 숫자(후기 2,400개 등)를 박아 신뢰로 멈추게 하세요.`,
      ],
      cvr: [
        `${PRINCIPLES.anchor.emoji} 앵커링 — 랜딩 첫 화면에 정가→혜택가 구조를 배치해 "이득 보는 느낌"부터 만드세요.`,
        `${PRINCIPLES.ownership.emoji} 보유 효과 — 무료 체험/샘플/시착 등 "먼저 소유하게 하는 장치"가 전환 장벽을 녹입니다.`,
        `${PRINCIPLES.social.emoji} 사회적 증거 — 구매 버튼 바로 위에 실제 후기 2줄을 배치하세요. 버튼과 후기의 거리가 전환율을 좌우합니다.`,
      ],
      roas: [
        `${PRINCIPLES.decoy.emoji} 미끼 효과 — 가격을 3단 구성으로 바꿔 중간 옵션(목표 상품)의 선택률과 객단가를 함께 올리세요.`,
        `${PRINCIPLES.framing.emoji} 프레이밍 — 번들/세트 구성으로 "개당 가격"을 낮게 보이게 하면 객단가가 오릅니다.`,
        `${PRINCIPLES.peakend.emoji} 피크엔드 — 구매 완료 직후 재구매 쿠폰을 제시하세요. 가장 만족한 순간이 가장 싼 재획득 타이밍입니다.`,
      ],
      scale: [
        `${PRINCIPLES.social.emoji} 사회적 증거 축적 — 지금의 만족 고객에게 후기를 요청해 다음 분기의 전환 자산을 쌓으세요.`,
        `${PRINCIPLES.commitment.emoji} 일관성 — 잘 되는 소재의 "구조"는 유지하고 소재만 교체하며 예산을 20%씩 증액하세요.`,
        `${PRINCIPLES.scarcity.emoji} 희소성 — 수요가 검증되었으니 한정판/시즌 상품으로 객단가 상단을 테스트할 타이밍입니다.`,
      ],
    };

    // 개선 시뮬레이션
    let sim;
    if (bottleneckKey === 'ctr' && imp > 0) {
      const nClk = Math.round(imp * (bm.ctr / 100));
      const nCnv = cvr > 0 ? Math.round(nClk * (cvr / 100)) : 0;
      sim = `CTR을 시장 평균(${bm.ctr}%)까지만 끌어올려도:\n· 클릭 ${fmt(clk)} → ${fmt(nClk)}회 (+${fmt(Math.max(0, nClk - clk))})\n· 전환 ${fmt(cnv)} → 약 ${fmt(nCnv)}건${aov > 0 ? `\n· 예상 추가 매출 약 ${fmt(Math.round(Math.max(0, nCnv - cnv) * aov))}원` : ''}`;
    } else if (bottleneckKey === 'cvr' && clk > 0) {
      const nCnv = Math.round(clk * (bm.cvr / 100));
      sim = `CVR을 시장 평균(${bm.cvr}%)까지만 끌어올려도:\n· 전환 ${fmt(cnv)} → 약 ${fmt(nCnv)}건 (+${fmt(Math.max(0, nCnv - cnv))})${aov > 0 ? `\n· 예상 추가 매출 약 ${fmt(Math.round(Math.max(0, nCnv - cnv) * aov))}원` : ''}\n· 광고비 추가 없이 랜딩 개선만으로 가능한 수치입니다`;
    } else if (bottleneckKey === 'roas' && cnv > 0) {
      const nAov = aov * 1.2;
      sim = `객단가를 20%만 올려도 (세트 구성/업셀):\n· 객단가 ${fmt(Math.round(aov))}원 → ${fmt(Math.round(nAov))}원\n· 동일 전환 기준 매출 ${fmt(Math.round(rev))} → ${fmt(Math.round(nAov * cnv))}원\n· ROAS ${pct(roas, 0)} → 약 ${pct(roas * 1.2, 0)}`;
    } else {
      sim = `현재 구조가 안정적입니다. 예산을 20% 증액했을 때:\n· 기대 추가 전환: 약 ${fmt(Math.round(cnv * 0.18))}건 (체감 효율 90% 가정)\n· 핵심은 증액 후에도 CPA가 ${cpa > 0 ? fmt(Math.round(cpa * 1.15)) + '원' : '현 수준의 115%'} 이내로 유지되는지 모니터링하는 것입니다`;
    }

    const metricTable =
      `기간/채널: ${input.period || '—'} · ${input.channel || '전체'} (벤치마크: 일반 시장 평균, 참고용)\n` +
      `──────────────────────────\n` +
      `노출수      ${fmt(imp)}회\n` +
      `클릭수      ${fmt(clk)}회\n` +
      `전환수      ${fmt(cnv)}건\n` +
      `광고비      ${fmt(cost)}원\n` +
      `매출        ${fmt(rev)}원\n` +
      `──────────────────────────\n` +
      `CTR (클릭률)    ${pct(ctr)}  vs 평균 ${bm.ctr}%  ${gCtr}\n` +
      `CVR (전환율)    ${pct(cvr)}  vs 평균 ${bm.cvr}%  ${gCvr}\n` +
      `CPC (클릭단가)  ${fmt(Math.round(cpc))}원\n` +
      `CPA (전환단가)  ${fmt(Math.round(cpa))}원\n` +
      `ROAS (수익률)   ${pct(roas, 0)}  vs 평균 ${bm.roas}%  ${gRoas}\n` +
      `객단가          ${fmt(Math.round(aov))}원`;

    const diagnosis = bottleneckKey === 'scale'
      ? `종합 점수 ${score}점. 전 구간이 평균 이상으로 건강한 퍼널입니다. 지금은 "고치는 시기"가 아니라 "키우는 시기"예요. 검증된 소재의 구조를 유지한 채 예산과 타겟을 단계적으로 확장하세요.`
      : `종합 점수 ${score}점. 퍼널에서 가장 먼저 새는 곳은 [${bottleneck}] 입니다. 마케팅 성과는 평균이 아니라 병목이 결정합니다 — 다른 곳에 손대기 전에 이 구간부터 막는 것이 비용 대비 효과가 가장 큽니다.`;

    return {
      title: `${input.period || ''} ${input.channel || ''} 성과 분석 리포트`.trim(),
      meta: { score, badge: '종합 ' + score + '점' },
      sections: [
        { tag: 'METRIC', title: '📊 핵심 지표 계산 결과', body: metricTable },
        { tag: 'DIAG', title: '🩺 종합 진단', body: diagnosis },
        { tag: 'BOTTLENECK', title: '⚠️ 병목 구간', body: `${bottleneck}\n\n${bottleneckKey === 'ctr' ? '사람들이 광고를 보고도 멈추지 않습니다. 문제는 상품이 아니라 "첫 3초의 메시지"일 가능성이 높습니다.' : bottleneckKey === 'cvr' ? '클릭까지는 성공했지만 결제 직전에 돌아섭니다. 랜딩페이지가 광고의 약속을 지키지 못하고 있거나, 마지막 불안을 못 지우고 있습니다.' : bottleneckKey === 'roas' ? '전환은 일어나지만 남는 게 적습니다. 객단가를 올리거나, 구매 가능성이 높은 타겟으로 좁혀야 할 때입니다.' : '병목이 없으니 핵심 지표를 유지하면서 볼륨을 키우는 데 집중하세요.'}` },
        { tag: 'RX', title: '💊 심리학 처방전 3', body: RX[bottleneckKey].map((x, i) => `${i + 1}. ${x}`).join('\n\n') },
        { tag: 'SIM', title: '📈 개선 시뮬레이션', body: sim },
        { tag: 'ACTION', title: '🚀 다음 2주 액션 플랜', body: [
          `1주차: ${bottleneckKey === 'ctr' ? '헤드라인 2종 A/B 테스트 (호기심형 vs 손실회피형)' : bottleneckKey === 'cvr' ? '랜딩 첫 화면에 후기+보장 요소 배치, 버튼 문구 교체' : bottleneckKey === 'roas' ? '세트/번들 구성 설계, 가격 3단 구조 적용' : '예산 20% 증액, 유사 타겟 1개 추가'}`,
          `2주차: 결과 수치를 다시 [성과분석]에 입력해 개선 폭 확인 → 승자 전략에 집중`,
          `측정 원칙: 한 번에 한 가지만 바꾸고, 판단은 최소 ${pick(r, ['3일', '5일', '7일'])} 데이터로.`,
        ].join('\n') },
      ],
    };
  }

  /* ================================================================
     랜딩 페이지 30초 데모 — 헤드라인 3개
     ================================================================ */
  function quickHeadlines(product, nonce) {
    const r = rng(hashStr('quick::' + product) + (nonce || 0));
    const p = product || '우리 상품';
    const picks = sample(r, PRINCIPLE_KEYS, 3);
    return picks.map((k) => ({ trigger: PRINCIPLES[k].emoji + ' ' + PRINCIPLES[k].name, text: PRINCIPLES[k].copy(p) }));
  }

  /* ================================================================
     Gemini 연동 (선택)
     ================================================================ */
  function getGeminiKey() {
    try {
      return localStorage.getItem('pm_gemini_key') || (window.PM_CONFIG || {}).GEMINI_API_KEY || '';
    } catch (e) { return (window.PM_CONFIG || {}).GEMINI_API_KEY || ''; }
  }
  function setGeminiKey(key) {
    try {
      if (key) localStorage.setItem('pm_gemini_key', key.trim());
      else localStorage.removeItem('pm_gemini_key');
    } catch (e) { /* ignore */ }
  }

  const GEMINI_ROLE = {
    psychology: '당신은 행동심리학 기반 마케팅 전략가입니다. 타겟 고객 심리 분석 리포트를 작성하세요.',
    place: '당신은 네이버 플레이스 마케팅 전문가입니다. 플레이스 운영 콘텐츠 패키지를 작성하세요.',
    ads: '당신은 전환율 높은 한국어 광고 카피라이터입니다. 심리 트리거 기반 광고 세트를 작성하세요.',
    performance: '당신은 퍼포먼스 마케팅 분석가입니다. 지표를 해석하고 행동심리학 기반 개선안을 제시하세요.',
  };

  async function tryGemini(tool, input, localResult) {
    const key = getGeminiKey();
    if (!key) return null;
    const cfg = window.PM_CONFIG || {};
    const model = cfg.GEMINI_MODEL || 'gemini-2.0-flash';
    const sectionHint = localResult.sections.map((s) => s.title).join(' / ');
    const prompt =
      `${GEMINI_ROLE[tool]}\n\n` +
      `입력 정보(JSON): ${JSON.stringify(input, null, 0)}\n\n` +
      `다음 섹션 구성을 참고하여(동일할 필요는 없음) 한국어로 작성: ${sectionHint}\n\n` +
      `반드시 아래 형식의 JSON 배열만 출력하세요(마크다운 코드블록 없이):\n` +
      `[{"title":"섹션 제목(이모지 포함)","body":"본문(줄바꿈은 \\n)"}]\n` +
      `섹션은 5~7개, 각 본문은 구체적이고 바로 복사해 쓸 수 있는 수준으로.`;
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 4096 },
          }),
        }
      );
      if (!res.ok) throw new Error('Gemini HTTP ' + res.status);
      const data = await res.json();
      let text = (((data.candidates || [])[0] || {}).content || {}).parts;
      text = text && text[0] && text[0].text ? text[0].text : '';
      text = text.replace(/```json|```/g, '').trim();
      const start = text.indexOf('['), end = text.lastIndexOf(']');
      if (start === -1 || end === -1) throw new Error('JSON 배열을 찾을 수 없음');
      const arr = JSON.parse(text.slice(start, end + 1));
      if (!Array.isArray(arr) || !arr.length) throw new Error('빈 결과');
      return {
        title: localResult.title,
        meta: Object.assign({}, localResult.meta, { badge: 'Gemini AI 생성' }),
        sections: arr.map((s) => ({ tag: 'AI', title: String(s.title || '섹션'), body: String(s.body || '') })).slice(0, 8),
      };
    } catch (e) {
      console.warn('[PMEngine] Gemini 호출 실패 → 내장 엔진으로 대체:', e.message);
      return null;
    }
  }

  /* ================================================================
     공개 API
     ================================================================ */
  const TOOLS = { psychology: toolPsychology, place: toolPlace, ads: toolAds, performance: toolPerformance };

  const PMEngine = {
    TOOL_NAMES: { psychology: '심리분석 AI', place: '플레이스 자동화', ads: '광고 생성', performance: '성과 분석' },
    PRINCIPLES,
    INDUSTRY_LIST: Object.keys(INDUSTRIES),
    CHANNEL_LIST: Object.keys(CHANNELS),
    AGE_LIST: Object.keys(AGE_PSY),
    quickHeadlines,
    getGeminiKey,
    setGeminiKey,

    /**
     * 도구 실행
     * @param {string} tool psychology|place|ads|performance
     * @param {object} input 폼 입력값
     * @param {object} opts {variant:number} — "다시 생성" 시 증가시켜 변형 생성
     * @returns {Promise<{source:'engine'|'gemini', title, meta, sections:[{tag,title,body}]}>}
     */
    async run(tool, input, opts) {
      opts = opts || {};
      const fn = TOOLS[tool];
      if (!fn) throw new Error('알 수 없는 도구: ' + tool);
      const seed = hashStr(tool + '::' + JSON.stringify(input)) + (opts.variant || 0) * 7919;
      const local = fn(input, seed);
      local.source = 'engine';
      if (getGeminiKey()) {
        const g = await tryGemini(tool, input, local);
        if (g) { g.source = 'gemini'; return g; }
      }
      return local;
    },

    /** 결과를 복사용 플레인 텍스트로 직렬화 */
    toText(result) {
      const head = `[${(window.PM_CONFIG || {}).APP_NAME || '심리 마케팅'}] ${result.title}\n생성: ${new Date().toLocaleString('ko-KR')}${result.meta && result.meta.badge ? ' · ' + result.meta.badge : ''}\n`;
      const body = result.sections.map((s) => `\n━━ ${s.title} ━━\n${s.body}`).join('\n');
      return head + body + '\n';
    },
  };

  window.PMEngine = PMEngine;
})();
