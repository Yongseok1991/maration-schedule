# 📋 Maraton 엔지니어링 하네스 TODO 및 진척 상황

이 문서는 프로젝트의 하네스 구축, 데이터 안전망, 유저 인증, 모듈화 리팩터링 상태를 실시간으로 추적하는 마스터 체크리스트입니다.

---

## 🎯 전체 진행률 (Progress: 100% 달성)

- [x] **Phase 1: 데이터 무결성 & CI/CD 하네스 구축**
  - [x] Zod 기반 `races.json` 데이터 스키마 검증기 (`scripts/validate-data.js`)
  - [x] 스케줄 크롤러 워크플로우에 검증 하네스 단계 추가 (`.github/workflows/scrape-data.yml`)
  - [x] PR 및 Push 검증 CI 파이프라인 생성 (`.github/workflows/ci.yml`)
  - [x] `.gitignore`에 `.env*` 추가하여 보안 키 유출 방지

- [x] **Phase 2: DB & Auth 아키텍처 설계 및 서비스 구축**
  - [x] Supabase PostgreSQL 스키마 및 RLS 보안 정책 작성 (`docs/supabase-schema.sql`)
  - [x] 시스템 아키텍처 및 데이터 흐름 설계서 작성 (`docs/architecture-design.md`)
  - [x] `@supabase/supabase-js` 설치 및 클라이언트 싱글톤 생성 (`src/services/supabase.js`)
  - [x] 인증 서비스 모듈 (`src/services/authService.js`)
  - [x] 완주증/사진 업로드 스토리지 서비스 (`src/services/storageService.js`)
  - [x] 100% Supabase DB 전용 데이터 서비스 (`src/services/dataService.js`)
  - [x] 레거시 `IndexedDB` (`src/lib/entriesDb.js`) 파일 완전 삭제
  - [x] 기존 18개 마라톤 대회 & 사진 & 러닝화 5켤레 Supabase 클라우드 이관 완료 (`dobest0998@gmail.com`)

- [x] **Phase 3: 프론트엔드 커스텀 훅(Custom Hooks) 완전 분리**
  - [x] `useAuth.js`: Supabase 세션 및 로그인/회원가입/로그아웃 훅
  - [x] `useRaces.js`: 공용 대회 목록 페칭, 월별/지역별/접수중 필터링, 검색 훅
  - [x] `useEntries.js`: 내 대회 일정 CRUD 및 완주증/사진 업로드 관리 훅
  - [x] `useShoes.js`: 러닝화 등록, 누적거리, 수정, 삭제 관리 훅
  - [x] `useStats.js`: PB 최고기록(5K/10K/Half/Full) 및 참가비/신발 통계 계산 훅
  - [x] `imageOptimizer.js`: 이미지 HEIC 변환 및 캔버스 압축 유틸 분리
  - [x] `App.jsx` 리팩터링: 분리된 훅들을 조합하여 1,200줄의 모놀리식 코드 경량화 및 헤더에 로그인/프로필 바 부착

- [x] **Phase 4: Antigravity 하네스 스킬 (Skill) 패키지화**
  - [x] `.gemini/skills/maraton-harness/SKILL.md` (공식 규격 스킬 정의)
  - [x] `.gemini/skills/maraton-harness/scripts/check-system.js` (원클릭 진단 도구: `npm run check:system`)

- [x] **Phase 5: README 및 명세 문서 완벽화**
  - [x] 아키텍처 다이어그램 (Mermaid)
  - [x] 데이터베이스 4대 테이블(`profiles`, `user_races`, `race_photos`, `shoes`) 컬럼 명세표
  - [x] 커스텀 훅 및 디렉터리 구조도
  - [x] 엔지니어링 하네스 CLI 레퍼런스
  - [x] Antigravity 스킬 사용 가이드
