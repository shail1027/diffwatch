# diffwatch ≠

Chrome DevTools에서 API 응답을 캡처하고, 두 응답을 라인 단위로 비교하는 확장프로그램입니다.

![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-7fffb2)

---

## 개요

DevTools Network 탭에서 캡처된 XHR/Fetch 요청 중 두 개를 A, B로 지정하면 응답 바디를 git diff 형식으로 비교해줍니다.

스테이징과 프로덕션의 같은 엔드포인트 응답이 다른지 확인하거나, 배포 전후로 응답 구조가 바뀌었는지 검증할 때 사용합니다.

---

## 설치

*추후 추가 예정*

---

## 사용 방법

1. API 요청이 발생하는 페이지에서 DevTools를 열고 **Request Diff** 탭으로 이동합니다
2. 페이지를 새로고침하면 XHR/Fetch 요청이 왼쪽 목록에 자동으로 수집됩니다
3. 비교할 첫 번째 요청의 **A** 버튼, 두 번째 요청의 **B** 버튼을 클릭합니다
4. diff가 즉시 실행됩니다

**주의:** DevTools를 열기 전에 발생한 요청은 캡처되지 않습니다. DevTools를 먼저 열고 페이지를 새로고침해야 합니다.

---

## 기능

**3가지 뷰 모드**

- `Unified` — git 스타일의 `+` / `−` 라인 diff. 라인 번호와 hunk 헤더 포함
- `Side-by-side` — 좌우 두 컬럼으로 JSON을 나란히 비교
- `Raw` — 포맷 없는 원본 응답 그대로 비교

**그 외**

- URL 필터로 요청 목록 검색
- 3초마다 자동 폴링 (새로고침 버튼 불필요)
- JSON 응답 자동 포맷팅 (들여쓰기 정규화 후 비교)
- 외부 의존성 없음 — 빌드 단계 없이 바로 로드 가능

---

## 파일 구조

```
diffwatch/
├── manifest.json
├── background/
│   └── background.js      # Service Worker
├── devtools/
│   ├── devtools.html      # DevTools 진입점
│   └── devtools.js        # 패널 등록 + 네트워크 요청 캡처
├── panel/
│   └── panel.html         # UI + diff 엔진
└── icons/
```

