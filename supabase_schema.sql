-- Supabase Schema: Dostlara mesaj sistemi
-- Bu SQL kodu Supabase SQL Editor-da icra et

-- İstifadəçilər cədvəli (qeydiyyat məlumatları)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ad TEXT NOT NULL,
  soyad TEXT NOT NULL,
  nomre TEXT NOT NULL,
  numara TEXT NOT NULL,
  fon TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mesajlar cədvəli
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  reqem TEXT NOT NULL,
  qosulma_tarixi TEXT NOT NULL,
  kod TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) aktiv et
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Hər kəs oxuya və yaza bilsin (statik sayt üçün)
CREATE POLICY "Allow all for users" ON public.users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for messages" ON public.messages
  FOR ALL USING (true) WITH CHECK (true);

-- İndekslər
CREATE INDEX IF NOT EXISTS idx_users_nomre ON public.users(nomre);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at DESC);
