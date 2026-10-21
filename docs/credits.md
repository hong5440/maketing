# 에셋 출처 및 라이선스 (Credits)

이 데모의 모든 3D/그래픽 에셋은 **외부 다운로드 없이 저장소 안에서 절차적으로 생성**되었다.
(해커톤 데모 규칙: 네트워크가 끊겨도 시연이 완주되어야 하므로 외부 CDN 에셋에 의존하지 않는다.)

## HDRI 환경맵 (`public/hdri/*.hdr`)

| 파일 | 내용 | 출처 |
|---|---|---|
| `day.hdr` | 맑은 낮 (파란 하늘 + 태양 글로우) | 자체 생성 (numpy, RGBE 인코딩) |
| `dusk.hdr` | 해질녘 골든아워 (노을 밴드) | 자체 생성 (numpy, RGBE 인코딩) |
| `night.hdr` | 밤하늘 | 자체 생성 (numpy, RGBE 인코딩) |

> 원래 계획은 Poly Haven CC0 HDRI였으나 개발 환경의 네트워크 정책으로 차단되어
> 동일 해상도(512×256)의 절차 생성본으로 대체했다. 파일만 교체하면 상위 품질
> HDRI(예: Poly Haven CC0)로 그대로 업그레이드된다.

## PBR 텍스처

- 지붕 골함석, 금속패널 벽, 콘크리트, 아스팔트, 차선, 창문 띠, 커튼월, 경고 줄무늬,
  숲 캐노피 디테일, 주거지 창문, 빛 웅덩이, 위험 히트맵/등고선, 크레인 이동영역 화살표:
  전부 **Canvas 2D로 절차 생성** (`components/yard3d/materials.ts` 등). 외부 텍스처 없음.
- 노멀맵은 소벨 필터 기반 자체 변환(heightToNormal)으로 생성.

## 3D 모델

- 건물·크레인(골리앗/타워/레벨러핑)·선박(LNG선/컨테이너선/VLCC/드릴십/반잠수식 리그)·
  지형·산 실루엣: 전부 three.js BufferGeometry **절차 모델링**. 외부 glTF 없음.

## 폰트

- **Pretendard** — SIL Open Font License 1.1, © Kil Hyung-jin.
  CDN(jsdelivr) 로드, 실패 시 시스템 폰트 폴백.

## 라이브러리

- three.js (MIT), @react-three/fiber·drei·postprocessing (MIT), n8ao (MIT),
  Next.js (MIT), Tailwind CSS (MIT)
- 바다는 three.js examples의 `Water` 셰이더(MIT)를 절차 노멀맵과 함께 사용.

## 참고 자료

- `reference/` 폴더의 한화오션 거제사업장 공개 조감도 — 3D 배치 재구성의 **참고용**으로만
  사용했으며 이미지 자체는 데모에 포함되지 않는다. 데모 화면 하단에
  "공개 조감도를 바탕으로 재구성한 가상 데모" 고지를 상시 표기한다.
