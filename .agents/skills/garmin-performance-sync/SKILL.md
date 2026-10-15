---
name: garmin-performance-sync
description: Garmin Connect 계정 연동, 과거 러닝 전수(297건) 및 1km 랩 스플릿 수집, 세션 토큰 영구 캐싱, Supabase PostgreSQL 1:N FK 무결성 보장 및 청킹 적재 파이프라인 가이드
---

# Garmin Connect 퍼포먼스 동기화 & 1km 랩 분석 스킬 가이드

본 문서는 RACEBOOK 프로젝트에서 **가민 커넥트(Garmin Connect) 계정을 연동하여 과거 전체 러닝 기록 및 1km 랩 스플릿 데이터를 안정적으로 수집하고, Supabase PostgreSQL DB에 1:N 외래키(FK) 관계를 유지하며 적재**하는 전 과정을 정의한 표준 스킬(Runbook)입니다.

---

## 1. 아키텍처 개요

```mermaid
flowchart TD
    User["웹 사용자 (React Frontend)"] -->|연동 요청 (이메일/비밀번호)| ViteProxy["Vite Dev Server (/api/garmin-sync)"]
    ViteProxy -->|Subprocess spawn| PySync["Python Sync Engine (scripts/sync-garmin.py)"]
    
    subgraph Garmin Connect Cloud
        GarminSSO["Garmin SSO Auth"]
        GarminAPI["Garmin Connect API"]
    end
    
    PySync -->|1회 로그인 & 세션 캐시| GarminSSO
    PySync -->|영구 토큰 재사용 (0.5s)| GarminAPI
    GarminAPI -->|활동 목록 & 1km Lap Splits| PySync
    
    PySync -->|결과 JSON 반환| ViteProxy
    ViteProxy -->|JSON Response| User
    
    subgraph Supabase Database (PostgreSQL)
        ActTable["performance_activities (부모, 50개 청크)"]
        LapTable["performance_laps (자식, 100개 청크)"]
        AuthTable["user_garmin_auth (연동 상태)"]
    end
    
    User -->|1. Activities 선적재 (FK 부모)| ActTable
    User -->|2. Laps 후적재 (FK 자식)| LapTable
    User -->|3. 연동 상태 갱신| AuthTable
    
    ActTable -.->|FK: user_id + activity_id (CASCADE)| LapTable
```

---

## 2. 핵심 트러블슈팅 및 해결 내역

### 2.1. 300개 인위적 제한 해제 및 297건 전수 수집
- **원인 분석**:
  - 사용자 가민 계정(`dobest0998@gmail.com`)의 총 활동은 **320건**이며, 이 중 러닝 관련 활동은 **297건**(`running`: 281건, `treadmill_running`: 12건, `track_running`: 4건)입니다.
  - 초기 코드에서 페이징 루프에 `max_limit = 300`이 걸려있어 0, 100, 200번 인덱스까지만 조회하고 중단되었습니다.
  - 가민 전체 320건 중 앞 300건 안에 포함된 러닝 활동이 **정확히 277건**이어서 277회만 수집되는 현상이 발생했습니다.
- **해결 조치**:
  - `scripts/sync-garmin.py`의 `max_limit`를 `10000`으로 상향하여 계정 내 과거 전체 러닝(297건)을 끝까지 순회하여 수집하도록 수정 완료했습니다.

### 2.2. 가민 Cloudflare 429 (Too Many Requests) 차단 방지
- **원인 분석**:
  - 가민은 단시간 내 비밀번호 로그인을 연속 시도할 경우 IP 및 클라이언트 핑거프린트를 기반으로 429 차단(Rate Limit)을 적용합니다.
- **해결 조치**:
  - `~/.racebook_garmin_tokens/<user_id>/garmin_tokens.json` 경로에 영구 OAuth 토큰을 저장하는 `tokenstore`를 구축했습니다.
  - 1회 로그인 성공 이후에는 비밀번호 입력 없이 토큰으로 0.5초 만에 다이렉트 통신하여 429 차단 가능성을 원천 제거했습니다.

### 2.3. Supabase RLS 정책 (42501 에러) 및 DB 미저장 현상 해결
- **원인 분석**:
  - DB 테이블에 `auth.uid() = user_id` RLS가 적용되어 있어, 백엔드 Python이 비인가(Anon) 키로 직접 쓰기를 시도하면 PostgreSQL 레벨에서 42501 에러를 발생시키며 거부되었습니다.
  - 프론트엔드에서도 277개 활동과 2,500여 개의 랩을 하나의 거대한 단일 배열로 전송하여 페이로드 초과/롤백으로 DB 적재가 누락되었습니다.
- **해결 조치**:
  1. Python 백엔드는 데이터를 수집하여 구조화된 JSON으로 반환하고, 실제 DB 저장은 웹 브라우저의 로그인된 유저 세션(`supabase` JS 클라이언트)으로 실행합니다.
  2. 파이썬 직접 적재 시에도 `supabase_client.postgrest.session.headers['authorization'] = f'Bearer {access_token}'`를 통해 사용자의 JWT를 명시적으로 주입하도록 개선했습니다.

---

## 3. 데이터베이스 1:N 외래키(FK) 무결성 설계

### 3.1. 테이블 간 외래키(FK) 관계
- **부모 테이블**: `public.performance_activities`
  - 고유 제약조건: `CONSTRAINT unique_user_activity UNIQUE (user_id, activity_id)`
- **자식 테이블**: `public.performance_laps`
  - 고유 제약조건: `CONSTRAINT unique_activity_lap UNIQUE (activity_id, lap_index)`
  - **외래키 제약조건**:
    ```sql
    CONSTRAINT fk_performance_laps_activity
        FOREIGN KEY (user_id, activity_id)
        REFERENCES public.performance_activities (user_id, activity_id)
        ON DELETE CASCADE
    ```
- **효과**:
  - 러닝 활동이 삭제되면 해당 활동의 모든 1km 랩도 자동으로 함께 삭제(`ON DELETE CASCADE`).
  - 부모 활동이 없는 고아 랩(Orphan Lap) 생성을 데이터베이스 레벨에서 원천 차단.

### 3.2. 적재 순서(Order of Insertion) 원칙
외래키 제약조건을 만족하기 위해 반드시 다음 순서로 적재해야 합니다:
1. **1단계 (Activities 선적재)**:
   - 297건의 활동 데이터를 **50개 단위 청크**로 쪼개어 `performance_activities`에 순차 upsert합니다.
2. **2단계 (Laps 후적재)**:
   - 부모 활동 저장이 성공한 후, ~2,700건의 랩 데이터를 **100개 단위 청크**로 쪼개어 `performance_laps`에 순차 upsert합니다.

---

## 4. 데이터 정제(Sanitization) 규격

가민 API 응답 데이터를 PostgreSQL 타입 규격에 맞게 변환해야 합니다:

| 필드명 | 가민 원본 타입 | DB 타입 | 변환 로직 |
| :--- | :--- | :--- | :--- |
| `distance_meters` | Float (m) | `NUMERIC(10, 2)` | `Math.round(val * 100) / 100` |
| `duration_seconds`| Float (s) | `INT` | `Math.round(Number(val))` |
| `avg_pace_seconds`| Float | `INT` | `Math.round(duration / (dist / 1000))` |
| `avg_heart_rate`  | Float (예: 115.0) | `INT` | `Math.round(Number(val))` |
| `avg_cadence`     | Float (예: 174.78)| `INT` | `Math.round(Number(val))` |
| `calories`        | Float (예: 61.0) | `INT` | `Math.round(Number(val))` |
| `vo2max`          | Float | `NUMERIC(4, 1)` | `Math.round(val * 10) / 10` |
| `aerobic_ef`      | 계산값 | `NUMERIC(6, 2)` | `Math.round(speed / avgHR * 100) / 100` |

---

## 5. 정기 자동 동기화 & 중복 0% 누락 방지 아키텍처

### 5.1. 두 가지 동기화 모드
1. **초기 전체 수집 (`mode: "full"`)**:
   - 가민 계정 최초 연동 시 실행.
   - `max_limit = 10000`으로 과거 297건 러닝 및 1km 랩 전수 수집.
2. **월간 증분 갱신 (`mode: "monthly"`)**:
   - 매월 1일 크론 또는 앱 실행 시 주기적 자동 동기화.
   - 최근 35일간의 데이터 조회 후 DB에 없는 신규 활동만 골라내어 적재.

### 5.2. 중복 적재 0% 원천 차단 (2중 방어선)
1. **1차 방어 (Python 엔진 레벨 SKIP)**:
   - 가민에서 활동 목록을 조회한 후, `get_existing_activity_ids()`로 Supabase DB에 이미 존재하는 `activity_id` 목록과 대조.
   - 이미 존재하는 활동은 1km 랩 스플릿 API 호출을 건너뛰고(SKIP), 신규 활동만 조회하여 네트워크 트래픽과 가민 429 차단을 원천 방지.
2. **2차 방어 (PostgreSQL 복합 유니크 제약조건)**:
   - `performance_activities`: `CONSTRAINT unique_user_activity UNIQUE (user_id, activity_id)`
   - `performance_laps`: `CONSTRAINT unique_activity_lap UNIQUE (activity_id, lap_index)`
   - `onConflict: "user_id,activity_id"` 및 `onConflict: "activity_id,lap_index"` 구문으로 동일 데이터 유입 시 신규 행이 추가되지 않고 UPDATE되므로 **중복 데이터 발생 확률은 0%**입니다.

### 5.3. 1달 주기 자동 갱신 트리거 (듀얼 자동화)
1. **서버 사이드 정기 크론 (`.github/workflows/sync-garmin-monthly.yml`)**:
   - 매월 1일 새벽 04:00 (KST) GitHub Actions 자동 실행.
   - `scripts/sync-garmin.py --monthly-cron` 모드로 연동 유저의 토큰스토어를 순회하며 최신 활동 자동 적재.
2. **클라이언트 사이드 자동 감지 갱신 (`usePerformance.js`)**:
   - 사용자가 앱에 접속할 때 `last_sync_at`을 검사하여 마지막 동기화로부터 7일 이상 경과했을 경우, 백그라운드에서 `/api/garmin-sync`를 조용히 실행하여 항상 최신 상태 유지.

---

## 6. DB 스키마 마이그레이션 SQL

Supabase SQL 에디터에서 실행 가능한 멱등성 스크립트: `docs/supabase-performance-schema.sql`

```sql
-- 외래키 안전 추가 스크립트 예시
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_performance_laps_activity'
    ) THEN
        ALTER TABLE public.performance_laps
        ADD CONSTRAINT fk_performance_laps_activity
        FOREIGN KEY (user_id, activity_id)
        REFERENCES public.performance_activities (user_id, activity_id)
        ON DELETE CASCADE;
    END IF;
END $$;
```

---

## 7. 월별 거리 통계 (Select) 및 마라톤 대회 기록(Race Filter) 판별 규격

### 7.1. 월별 거리 집계 (`monthStatsList`)
- 활동의 `start_time`을 기준으로 `YYYY-MM`을 파싱하여 최신순 정렬된 셀렉트 박스 제공.
- 옵션 라벨: `YYYY년 M월 (총 X.Xkm · N회 · 🏆대회 M건)`
- "전체 기간 누적" 옵션 선택 시 전체 활동 누적 거리 및 전체 통계 동적 표출.

### 7.2. 마라톤 대회 활동 판별 로직 (`isRaceActivity`)
- 가민의 자동 생성 패턴(`Ilsandong - Daehwadong` 등 지명-지명, `러닝`, `Running`, `Indoor Running` 등)을 제외하고, **사용자가 직접 대회명으로 제목을 수정한 활동**만 엄격히 판별:
  1. `activity.event_type === "race"` (가민 이벤트 타입이 레이스인 경우)
  2. `activity.activity_name`에 사용자가 직접 입력한 대회 키워드 패턴 포함:
     - `마라톤`, `marathon`, `race`, `레이스`, `half`, `하프`, `풀코스`, `10k`, `21k`, `42k`, `jtbc`, `동마`, `춘마`, `제마`, `런(`, `run (`
  3. 트레드밀, 실내 등 훈련 키워드는 자동 제외.
  - (결과: 사용자 계정 내 `Seoul Half Marathon`, `Goyang JTBC Half Marathon`, `Kiwoom Run (10km)`, `손기정 평화마라톤(10km)` 등 실제 대회 10건만 100% 정확하게 필터링됨)

### 7.3. 대회 카테고리 태그 (`getRaceCategory`)
- 거리 및 이름 기반 `10K`, `하프`, `풀코스`, `5K`, `대회` 뱃지 자동 생성 및 UI 표출.

### 7.4. UI/UX 사용성 개선 규격
- **초기 진입 시 최신 월 자동 선택**: `activities[0]`의 연월을 기본값으로 바인딩하여 진입 시 최신 러닝 기록과 월간 통계가 즉시 표출됨.
- **가로 스크롤바 완전 제거**:
  - `[ ◀ 이전 ] [ 드롭다운 선택 ▾ ] [ 다음 ▶ ]` 컨트롤을 상단에 배치하여 1초 만에 원하는 활동으로 즉각 이동.
  - 하단에는 세로 카드 리스트를 배치하여 날짜, 제목, 거리, 페이스, 심박수를 한눈에 파악하고 원클릭 선택 가능.

---

## 8. 스포츠 과학 퍼포먼스 리포트 & 예상 완주 시간 산출 기준

### 8.1. 마라톤 예상 완주 시간 산출 기준 (Pete Riegel 공식)
- **공식**:
  $$T_2 = T_1 \times \left(\frac{D_2}{D_1}\right)^{1.06}$$
  - $D_1, T_1$: 기준이 되는 러닝 활동의 실제 거리(m)와 소요 시간(초)
  - $D_2$: 목표 거리 (5km, 10km, 하프 21.0975km, 풀코스 42.195km)
  - $T_2$: 예상 완주 시간
- **피로 지수 ($1.06$) 원리**:
  - 단순 비례 곱셈($1.0$)이 아니라, 거리가 늘어남에 따라 체내 글리코겐 고갈, 젖산 축적, 심폐/근육 피로가 누적되어 페이스가 점진적으로 저하되는 생리학적 감속 지수 $1.06$ (Fatigue Factor)을 승수로 반영한 세계 공인 예측 모델.

### 8.2. 달별 스포츠 과학 리포트 듀얼 탭 구조 (`PerformanceView.jsx`)
- **[ 🏃 선택 러닝 분석 ]**:
  - 선택된 개별 러닝 활동의 1km 구간별 페이스 표준편차(일관성 점수 100점 만점)
  - 전반 vs 후반 페이스 비교(네거티브/파지티브/이븐 스플릿)
  - 심폐 유산소 효율(EF, Speed/HR)
  - 해당 활동 기준 5K/10K/하프/풀코스 Riegel 예상 시간
- **[ 📅 {periodLabel} 종합 분석 ]**:
  - **월 누적 마일리지 평가**: 150km+ 엘리트 베이스, 80km+ 완주 안정권, 기초 체력 빌드업 여부 진단
  - **월간 최장 롱런(LSD) 평가**: 풀코스 글리코겐 고갈 방지를 위한 20km+ 완수 여부
  - **월간 평균 유산소 심폐 효율(EF)**: 한 달간의 심박수 대비 스피드 효율 추적
  - **월간 대표 기록 기준 대회 완주 시간 예측**: 해당 월의 최장 거리/대표 러닝을 기준으로 피트 리겔 공식을 적용한 5K/10K/하프/풀코스 예상 시간 도출

---

## 9. 대회 D-Day 웹푸시 알림 시스템 아키텍처

### 9.1. 발송 규칙 및 메시지
- **발송 시점**: 매일 한국 시간 **오전 9시 (KST 09:00 / UTC 00:00)**
- **대상**:
  1. **관심 등록 대회 (`user_races.status = 'interested'`)**:
     - **접수 시작 D-1 (`REG-D-1`)**: `📢 [대회명] 내일 접수 오픈!` - 선착순 마감 전 공식 홈페이지 신청 준비 권장
     - **접수 시작 당일 (`REG-D-0`)**: `🚀 오늘 [대회명] 접수 오픈일!` - 지금 바로 공식 홈페이지에서 신청 안내
  2. **접수 완료/준비중 대회 (`user_races.status IN ('registered', 'training')`)**:
     - **대회 D-7**: `[대회명] 일주일 전! (D-7)` - 무리한 장거리 지양 및 가벼운 조깅/영양 보충 컨디션 조절 권장
     - **대회 D-3**: `[대회명] 3일 전! (D-3)` - 배번호, 러닝화, 에너지젤 필수 준비물 점검 및 탄수화물 로딩 안내
     - **대회 D-1**: `내일은 [대회명] 결전의 날! (D-1)` - 출발 시간/장소 확인 및 최적 수면 권장

### 9.2. 컴포넌트 구성
1. **대회 탐색 원클릭 `[ ⭐ ]` 찜 기능 및 필터 (`src/App.jsx`)**:
   - 대회 카드 우측 상단 `[ ☆ / ⭐ ]` 버튼으로 원클릭 찜 토글 (`user_races`에 `status = 'interested'` 저장).
   - 탐색 탭 상단에 `[ ⭐ 찜한 대회 (N) ]` 필터 칩을 두어 찜한 대회만 0.1초 만에 모아보기 제공.
2. **PWA 서비스 워커 (`public/custom-sw.js` + `dist/sw.js`)**:
   - `vite.config.js`의 `workbox.importScripts: ["custom-sw.js"]` 설정으로 Workbox 캐시와 푸시 수신(`push`) 및 클릭(`notificationclick`) 완벽 결합.
3. **클라이언트 훅 (`src/hooks/useWebPush.js`)**:
   - `Notification.requestPermission()` 및 `PushManager.subscribe()`로 VAPID 공개키 서명 토큰 생성.
   - Supabase `push_subscriptions` 테이블에 upsert 동기화.
   - 마이페이지에 **"알림 켜기/끄기"** 및 **"테스트 알림 받기"** 즉시 확인 버튼 제공.
4. **발송 엔진 (`scripts/send-race-push.js`)**:
   - 관심 대회의 `registration_period`에서 접수 시작일을 추출(`YYYY-MM-DD`)하여 D-1, D-Day 대상자 필터링.
   - 접수완료 대회의 `date_iso`를 비교하여 대회 D-7, D-3, D-1 대상자 필터링.
   - `push_logs` 중복 방지 테이블(`uk_push_logs_user_race_dday`)을 통해 중복 발송 0% 보장.
   - 만료된 푸시 토큰(HTTP 410/404) 자동 정리.
5. **자동화 워크플로우 (`.github/workflows/daily-push.yml`)**:
   - GitHub Actions `cron: "0 0 * * *"` (KST 09:00) 매일 자동 실행.




