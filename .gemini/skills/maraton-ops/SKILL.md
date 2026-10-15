---
name: maraton-ops
description: Maraton 일정 수집, 데이터 정합성 검증, Supabase 동기화 및 CI/CD 운영을 보조하는 프로젝트 하네스 스킬
---

# Maraton 프로젝트 운영 & 하네스 스킬 (`maraton-ops`)

이 스킬은 `maraton-schedule` 프로젝트의 데이터 파이프라인 관리, 크롤러 디버깅, Supabase DB 동기화 점검 및 코드 품질 하네스 작업을 지원합니다.

## 1. 데이터 검증 및 크롤러 실행 (Data Harness)

### 1.1 데이터 무결성 검증
수집된 마라톤 데이터(`public/data/races.json`)가 올바른 구조를 갖추고 있는지 검사합니다:
```powershell
npm run validate:data
```
- 실패 시: 필수 필드(`id`, `name`, `date_iso`) 누락이나 수집 건수(5건 미만) 부족을 확인합니다.

### 1.2 크롤러 테스트 실행
실제 roadrun 사이트에서 마라톤 일정을 다시 수집해야 할 때:
```powershell
npm run scrape
```
- 특정 연도/월만 수집하거나 최대 수집 수를 제한할 때:
```powershell
$env:MAX_DETAILS="5"; node scripts/scrape.js
```

---

## 2. Supabase DB 및 스키마 점검

- DB 스키마 DDL 위치: `docs/supabase-schema.sql`
- 아키텍처 명세 위치: `docs/architecture-design.md`
- 환경 변수 점검:
  - `.env.local`의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 확인
  - `src/services/supabase.js`의 `isSupabaseConfigured` 상태 확인

---

## 3. CI/CD 및 배포 파이프라인

- CI 워크플로우: `.github/workflows/ci.yml` (PR 및 master 푸시 시 데이터 검증 및 Vite 빌드 실행)
- Pages 배포: `.github/workflows/deploy-pages.yml` (빌드 후 GitHub Pages로 정적 배포)
- 크롤러 자동화: `.github/workflows/scrape-data.yml` (하루 3회: UTC 00, 08, 16시 자동 수집 후 커밋)
