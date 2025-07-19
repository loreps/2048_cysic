CREATE TABLE public.leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text NOT NULL,
  score int NOT NULL,
  time_taken int, -- Nullable for losses
  timestamp timestamp with time zone DEFAULT now()
);

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.leaderboard
  FOR INSERT WITH CHECK (true); -- You might want to restrict this further in a real app
