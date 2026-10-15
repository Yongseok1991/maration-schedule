---
name: maraton-harness
description: 마라톤 스케줄 프로젝트의 전주기 엔지니어링 하네스 (데이터 무결성 검증, 크롤러 디버깅, Supabase DB 진단, CI 상태 검사)
---

# Maraton Engineering Harness Skill (`maraton-harness`)

이 스킬은 `maraton-schedule` 프로젝트의 신뢰성, 데이터 무결성, DB 연동 및 프론트엔드 모듈 상태를 종합 검증하고 운영을 자동화하기 위한 공식 엔지니어링 하네스 스킬입니다.

---

## 🛠️ 하네스 CLI 도구 모음

### 1. 원클릭 시스템 종합 진단 (`check-system`)
환경 변수, Supabase 연결 상태, 마라톤 데이터 JSON 정합성, 빌드 상태를 한 번에 검사합니다:
```powershell
node .gemini/skills/maraton-harness/scripts/check-system.js
```

### 2. 마라톤 데이터 스키마 유효성 검사 (Zod)
roadrun에서 크롤링된 `public/data/races.json`의 스키마 및 필수 필드를 검증합니다:
```powershell
npm run validate:data
```

### 3. 크롤러 디버그 실행 (Scraper Dry-Run)
실제 roadrun 사이트에서 마라톤 일정을 수집하거나 특정 범위만 테스트 수집할 때:
```powershell
# 전체 수집
npm run scrape

# 최신 5건만 샘플 테스트 수집
$env:MAX_DETAILS="5"; node scripts/scrape.js
```

### 4. 전체 빌드 & PWA 서비스워커 검증
```powershell
npm run build
```

---

## 📂 아키텍처 및 데이터 참조

- **PostgreSQL DDL & RLS 정책**: `docs/supabase-schema.sql`
- **시스템 및 데이터 흐름 명세**: `docs/architecture-design.md`
- **커스텀 훅 레이어**: `src/hooks/`
  - `useAuth.js`: 인증 및 세션
  - `useRaces.js`: 공용 마라톤 일정 페칭 및 필터
  - `useEntries.js`: 사용자 등록 일정 및 사진 관리 (Supabase)
  - `useShoes.js`: 러닝화 관리 (Supabase)
  - `useStats.js`: 코스별 PB 및 통계 집계
- **데이터 서비스 어댑터**: `src/services/dataService.js`
- **실시간 진척 상황 체크리스트**: `TODO.md`
