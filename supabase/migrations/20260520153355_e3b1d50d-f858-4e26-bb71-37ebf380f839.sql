
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Survey type enum
CREATE TYPE public.survey_type AS ENUM ('agro', 'industry');

-- Unified survey responses table
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_type public.survey_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  respondent_name TEXT,
  respondent_position TEXT,
  organization_name TEXT,
  location TEXT,
  phone_or_contact TEXT,
  wants_followup BOOLEAN NOT NULL DEFAULT false,
  wants_results BOOLEAN NOT NULL DEFAULT false,
  interested_in_pilot BOOLEAN NOT NULL DEFAULT false,
  interested_in_training BOOLEAN NOT NULL DEFAULT false,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can submit a survey
CREATE POLICY "Public can insert surveys" ON public.survey_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (consent_given = true);

-- Only admins can read
CREATE POLICY "Admins can read all surveys" ON public.survey_responses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_survey_responses_type ON public.survey_responses (survey_type);
CREATE INDEX idx_survey_responses_created ON public.survey_responses (created_at DESC);
