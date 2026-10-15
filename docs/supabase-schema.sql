-- ==============================================================================
-- Maraton App - Supabase PostgreSQL Schema (Idempotent / 멱등성 보장 스크립트)
-- ==============================================================================

-- 1. UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. 프로필 테이블 (auth.users와 1:1 매핑)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nickname TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 회원가입 시 프로필 자동 생성 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nickname, avatar_url)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. 유저 마라톤 일정 및 기록 테이블 (user_races)
-- auth.users(id)를 직접 참조하여 profiles 테이블 생성 지연/오류에 영향받지 않도록 안전화
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_races (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    race_id TEXT, -- 원본 roadrun 크롤링 ID (수동 등록 시 null)
    name TEXT NOT NULL,
    date_iso DATE NOT NULL,
    date_display TEXT,
    place TEXT,
    distances TEXT,
    homepage TEXT,
    status TEXT NOT NULL DEFAULT 'registered' 
        CHECK (status IN ('interested', 'registered', 'training', 'finished', 'dns')),
    race_type TEXT DEFAULT '' 
        CHECK (race_type IN ('', '5k', '10k', 'half', 'full')),
    entry_fee INTEGER DEFAULT 0,
    goal_time TEXT,
    goal_pace TEXT,
    result_time TEXT,
    memo TEXT,
    result_note TEXT,
    certificate_url TEXT, -- Supabase Storage 이미지 URL
    is_manual BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_races_user_date ON public.user_races(user_id, date_iso DESC);
CREATE INDEX IF NOT EXISTS idx_user_races_race_id ON public.user_races(user_id, race_id);

-- ------------------------------------------------------------------------------
-- 4. 대회 사진 갤러리 테이블 (race_photos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.race_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_race_id UUID NOT NULL REFERENCES public.user_races(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_race_photos_race ON public.race_photos(user_race_id, display_order ASC);

-- ------------------------------------------------------------------------------
-- 5. 러닝화 관리 테이블 (shoes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price INTEGER DEFAULT 0,
    purchase_date DATE,
    distance_km NUMERIC(6, 1) DEFAULT 0,
    memo TEXT,
    is_retired BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shoes_user ON public.shoes(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. Row Level Security (RLS) 보안 정책 (기존 정책 삭제 후 재생성하여 충돌 방지)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoes ENABLE ROW LEVEL SECURITY;

-- profiles RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- user_races RLS
DROP POLICY IF EXISTS "Users can CRUD own user_races" ON public.user_races;
CREATE POLICY "Users can CRUD own user_races" ON public.user_races
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- race_photos RLS
DROP POLICY IF EXISTS "Users can CRUD own race_photos" ON public.race_photos;
CREATE POLICY "Users can CRUD own race_photos" ON public.race_photos
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- shoes RLS
DROP POLICY IF EXISTS "Users can CRUD own shoes" ON public.shoes;
CREATE POLICY "Users can CRUD own shoes" ON public.shoes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
