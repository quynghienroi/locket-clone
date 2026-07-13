CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender TEXT NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
  receiver TEXT NOT NULL, -- 'global' for group chat, or 'username' for 1-on-1
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated server" ON public.messages FOR ALL USING (true);
