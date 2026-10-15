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

## 5. 두 가지 동기화 모드

1. **초기 전체 수집 (`mode: "full"`)**:
   - 가민 계정 최초 연동 시 실행.
   - 과거 전체 활동(297건) 및 1km 랩 전수 수집.
2. **월간 증분 갱신 (`mode: "monthly"`)**:
   - 정기 크론 또는 월간 새로고침 시 실행.
   - 최근 35일간의 데이터만 조회.
   - DB에 이미 존재하는 `activity_id`는 랩 조회를 건너뛰고(SKIP), 신규 활동만 삽입하여 중복 100% 방지.

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

