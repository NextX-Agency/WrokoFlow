-- Migration 012: AI settings (App-provided free tier APIs)
-- Each user picks their preferred AI provider + model.
-- API keys are stored server-side in Vercel env vars, not exposed to frontend.

CREATE TABLE IF NOT EXISTS user_ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'gemini',             -- gemini | groq | openrouter (app-provided)
  model text NOT NULL DEFAULT 'gemini-2.0-flash-lite', -- default free-tier model
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_ai_settings_user ON user_ai_settings(user_id);

-- RLS: each user can only access their own row
ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own AI settings"
  ON user_ai_settings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_ai_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_ai_settings_updated ON user_ai_settings;
CREATE TRIGGER trg_user_ai_settings_updated
  BEFORE UPDATE ON user_ai_settings
  FOR EACH ROW EXECUTE FUNCTION update_ai_settings_timestamp();
