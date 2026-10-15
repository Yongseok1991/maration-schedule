-- ========================================================
-- RACEBOOK: Garmin Performance & 1km Laps Database Schema
-- ========================================================

-- 1. 가민 계정 연동 및 세션 관리 테이블
CREATE TABLE IF NOT EXISTS public.user_garmin_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    garmin_email TEXT NOT NULL,
    session_token_encrypted TEXT, -- 암호화된 가민 SSO 세션 토큰
    sync_status TEXT DEFAULT 'idle', -- 'idle' | 'syncing' | 'success' | 'error'
    last_sync_at TIMESTAMPTZ,
    last_error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_garmin UNIQUE (user_id)
);

ALTER TABLE public.user_garmin_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only manage their own garmin auth"
ON public.user_garmin_auth FOR ALL
USING (auth.uid() = user_id);


-- 2. 러닝 액티비티 마스터 테이블 (Garmin Activity Summary)
CREATE TABLE IF NOT EXISTS public.performance_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL, -- Garmin Activity ID
    activity_name TEXT NOT NULL,
    activity_type TEXT DEFAULT 'running',
    start_time TIMESTAMPTZ NOT NULL,
    distance_meters NUMERIC(10, 2) NOT NULL, -- 총 거리 (m)
    duration_seconds INT NOT NULL, -- 총 소요 시간 (초)
    avg_pace_seconds INT, -- 평균 페이스 (초/km)
    avg_heart_rate INT, -- 평균 심박수 (bpm)
    max_heart_rate INT, -- 최대 심박수 (bpm)
    avg_cadence INT, -- 평균 케이던스 (spm)
    elevation_gain_meters NUMERIC(6, 1), -- 총 상승고도 (m)
    calories INT, -- 소모 칼로리 (kcal)
    vo2max NUMERIC(4, 1), -- 가민 추정 VO2Max
    aerobic_ef NUMERIC(6, 2), -- 유산소 심폐 효율 지수 (속도 m/min / 심박)
    pace_consistency_score INT, -- 페이스 일관성 점수 (100점 만점)
    split_type TEXT, -- 'negative' | 'even' | 'positive'
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_activity UNIQUE (user_id, activity_id)
);

ALTER TABLE public.performance_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own performance activities"
ON public.performance_activities FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_perf_act_user_date ON public.performance_activities (user_id, start_time DESC);


-- 3. 1km 랩(Lap) 스플릿 세부 기록 테이블
CREATE TABLE IF NOT EXISTS public.performance_laps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id TEXT NOT NULL, -- Garmin Activity ID
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lap_index INT NOT NULL, -- 1km 랩 번호 (1, 2, 3...)
    distance_meters NUMERIC(10, 2) NOT NULL, -- 구간 거리 (통상 1000m)
    duration_seconds INT NOT NULL, -- 해당 1km 소요 시간 (초)
    pace_seconds INT NOT NULL, -- 1km 페이스 (초/km)
    avg_heart_rate INT, -- 해당 1km 평균 심박수
    max_heart_rate INT, -- 해당 1km 최고 심박수
    avg_cadence INT, -- 해당 1km 케이던스
    elevation_diff_meters NUMERIC(6, 1), -- 1km 내 고도 변화
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_activity_lap UNIQUE (activity_id, lap_index)
);

ALTER TABLE public.performance_laps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own performance laps"
ON public.performance_laps FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_perf_laps_act ON public.performance_laps (activity_id, lap_index ASC);
