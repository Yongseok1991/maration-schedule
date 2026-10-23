# 📋 RACEBOOK 엔지니어링 하네스 TODO 및 진척 상황

이 문서는 반응형 웹 앱 **RACEBOOK**의 하네스 구축, 데이터 안전망, Supabase 클라우드 전환, 커스텀 훅 모듈화, 모던 럭셔리 다크 UI 개편, 브랜드 아이덴티티, CI/CD 배포 상태를 실시간으로 추적하는 마스터 체크리스트입니다.

---

## 🎯 전체 진행률: **100% 완료 (All 6 Phases Completed)**

| Phase | 내용 | 상태 | 완료일 |
|:---:|:---|:---:|:---:|
| **Phase 1** | 데이터 무결성 & CI/CD 하네스 구축 | ✅ 완료 | 2026-10-15 |
| **Phase 2** | Supabase 클라우드 DB & 스토리지 & 유저 데이터 완전 이관 | ✅ 완료 | 2026-10-15 |
| **Phase 3** | 이미지 최적화 및 캔버스 압축 검증 | ✅ 완료 | 2026-10-15 |
| **Phase 4** | 프론트엔드 모듈화 & 커스텀 훅 5종 완전 분리 | ✅ 완료 | 2026-10-15 |
| **Phase 5** | 모던 럭셔리 다크 UI & Pretendard 타이포그래피 전면 개편 | ✅ 완료 | 2026-10-15 |
| **Phase 6** | 원격 저장소 푸시 & GitHub Pages 자동 배포 | ✅ 완료 | 2026-10-15 |

---

## 📋 세부 체크리스트

### Phase 1: 데이터 무결성 & CI/CD 하네스 구축
- [x] Zod 기반 `races.json` 911건 대회 데이터 스키마 검증기 (`scripts/validate-data.js`)
- [x] 스케줄 크롤러 워크플로우에 검증 하네스 단계 추가 (`.github/workflows/scrape-data.yml`)
- [x] PR 및 Push 검증 CI 파이프라인 생성 (`.github/workflows/ci.yml`)
- [x] 원클릭 시스템 헬스체크 도구 (`npm run check:system`, `.gemini/skills/maraton-harness/scripts/check-system.js`)
- [x] `.gitignore`에 `.env*` 추가하여 보안 키 유출 방지

### Phase 2: DB & Auth 아키텍처 설계 및 서비스 구축
- [x] Supabase PostgreSQL 스키마 및 RLS 보안 정책 작성 (`docs/supabase-schema.sql`)
- [x] 시스템 아키텍처 및 데이터 흐름 설계서 작성 (`docs/architecture-design.md`)
- [x] `@supabase/supabase-js` 설치 및 클라이언트 싱글톤 생성 (`src/services/supabase.js`)
- [x] 인증 서비스 모듈 (`src/services/authService.js`)
- [x] 완주증/사진 업로드 스토리지 서비스 (`src/services/storageService.js`)
- [x] 100% Supabase DB 전용 데이터 서비스 (`src/services/dataService.js`)
- [x] 레거시 `IndexedDB` (`src/lib/entriesDb.js`) 파일 완전 삭제
- [x] 유저 계정 생성 및 Supabase Auth 연동 완료
- [x] 기존 18개 마라톤 대회 & 사진 & 러닝화 5켤레 Supabase 클라우드 100% 이관 완료

### Phase 3: 이미지 최적화 및 압축 검증
- [x] 아이폰 HEIC 포맷 자동 감지 및 JPEG 변환 (`heic2any`)
- [x] Canvas 다단계 리사이징(최대 1800px) 및 품질 압축 (용량 100~400KB로 최적화)

### Phase 4: 프론트엔드 커스텀 훅(Custom Hooks) 완전 분리
- [x] `src/hooks/useAuth.js`: Supabase 세션 및 로그인/회원가입/로그아웃 훅
- [x] `src/hooks/useRaces.js`: 공용 대회 목록 페칭, 월별/지역별/접수중 필터링, 검색 훅
- [x] `src/hooks/useEntries.js`: 내 대회 일정 CRUD 및 완주증/사진 업로드 관리 훅
- [x] `src/hooks/useShoes.js`: 러닝화 등록, 누적거리, 수정, 삭제 관리 훅
- [x] `src/hooks/useStats.js`: PB 최고기록(5K/10K/Half/Full) 및 참가비/신발 통계 계산 훅
- [x] `src/App.jsx` 리팩터링: 분리된 훅들을 조합하여 1,239줄의 모놀리식을 깔끔하게 모듈화

### Phase 5: 모던 럭셔리 다크 테마(UI/UX) & 인터랙션 개편
- [x] 강제 화이트 오버라이드 CSS 버그 원인 규명 및 제거
- [x] 흑요석(Obsidian `#0a0b0f`) 매트 캔버스 및 앰비언트 라이트 적용
- [x] 미세 테두리(`rgba(255,255,255,0.08)`) 및 백드롭 블러 글래스모피즘(`card-panel`)
- [x] 플래그십 스포츠 워치 느낌의 샴페인 골드 & 에메랄드 절제된 배색
- [x] Pretendard 프리미엄 한글 타이포그래피 적용
- [x] 플로팅 네비게이션 및 다크 폼 컨트롤(`dark-input`, `dark-chip`)
- [x] 딥 다크 글래스 인증 모달(`AuthModal`) 적용
- [x] 캘린더 날짜 클릭 시 당일 전국 대회(911건) 및 내 일정 상세 연동 (`racesByDate` 인덱싱)
- [x] 레거시 GitHub PAT 동기화 탭 완전 제거 (Supabase 클라우드로 단일화)
- [x] 비로그인 게스트 사용자 시 '대회 탐색' 전용 단순 뷰 제공 (로그인 시 4개 탭 활성화)
- [x] '내 일정' 목록 날짜 최신순(내림차순, 최신/미래 대회 우선) 정렬 적용
- [x] 서비스 공식 명칭 'RACEBOOK' 브랜드 아이덴티티 전면 적용 (HTML 타이틀, PWA 매니페스트, 히어로 헤더, PRO 뱃지)
- [x] 탐색 탭의 월 선택 바(Month Filter Chips) 및 대회 목록 날짜 최신순(내림차순) 정렬 적용 (오래된 2025.09 우선 노출 문제 해결)
- [x] 마이페이지 PB(Personal Best) 종목별 최고 기록 및 대회명/일자 정상 계산·연동 버그 수정 (`useStats.js`)
- [x] '내 일정' 카드별 명시적 '기록 저장 💾' 액션 바 및 실시간 피드백(저장 중 / ✓ 저장 완료) 추가 (`saveEntry`)
- [x] '이메일(아이디) 기억하기' 기능 구현 (`localStorage.setItem('racebook_saved_email')`, 비밀번호 저장 원천 금지)
- [x] 개인 기기 vs 공용 PC 분리 '로그인 상태 유지 (자동 로그인)' 세션 스토리지 어댑터 적용 (`localStorage` vs `sessionStorage` 창 닫을 시 파기)
- [x] 비밀번호 숄더 서핑 방어 보기/숨기기(눈 아이콘 👁️) 토글 지원
- [x] 무차별 대입(Brute-force) 방어 5회 연속 실패 시 60초 쿨다운 잠금 및 실시간 카운트다운 타이머 탑재
- [x] 목표 시간 / 실제 기록 전용 시:분:초 구조화 컴포넌트(`TimeInput`) 및 자동 포커스 이동·초기화 기능 탑재 (오타 원천 차단)
- [x] 목표 페이스 전용 분:초 구조화 컴포넌트(`PaceInput`, `M:SS/km`) 탑재 및 PB 계산 표준 호환 보장

### Phase 6: 원격 푸시 및 자동 배포
- [x] GitHub Secret Scanning 차단 해결 (시크릿 키 클린업)
- [x] Supabase 기본 연결 URL 및 공개 Anon 키 클라이언트 폴백 구성 (GitHub Pages 배포 환경 인증 오류 영구 해결)
- [x] CI/CD 워크플로우(`ci.yml`, `deploy-pages.yml`) 환경변수 폴백 주입 연동
- [x] `master` 원격 브랜치 푸시 완료
- [x] GitHub Actions 자동 CI/CD 및 GitHub Pages 배포 연동
- [x] README.md 전면 개편 (Mermaid 다이어그램, 테이블 명세서, CLI 안내)

### Phase 7: 운동 퍼포먼스 탭 & 가민(Garmin) 1km 랩 연동 및 월간 자동 수집기
- [x] Supabase 러닝 퍼포먼스 및 1km 랩 테이블 스키마 작성 (`docs/supabase-performance-schema.sql`)
- [x] 스포츠 과학 통계 알고리즘 & 스마트 리포트 모듈 구현 (`src/utils/performanceMath.js`, LLM 제로 순수 팩트 계산)
- [x] 가민 연동 및 러닝/1km 랩 데이터 관리 커스텀 훅 (`src/hooks/usePerformance.js`)
- [x] 5번째 네비게이션 탭 `[퍼포먼스]` 및 대시보드 뷰 구현 (`src/components/performance/PerformanceView.jsx`)
- [x] 1km 구간별 페이스 바 & 심박수 스플릿 인터랙티브 시각화 차트 탑재
- [x] 가민 로그인 연동 모달 구현 (`src/components/performance/GarminAuthModal.jsx`)
- [x] 가민 SSO 데이터 수집 엔진 스크립트 작성 (`scripts/sync-garmin.py`)
- [x] 매월 1일 새벽 04:00 (KST) 무인 자동 수집 GitHub Actions 워크플로우 구축 (`.github/workflows/sync-garmin-monthly.yml`)
