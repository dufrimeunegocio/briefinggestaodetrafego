-- Briefings de Google Ads em tabela separada: não altera public.briefings.
CREATE TABLE IF NOT EXISTS public.google_ads_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_token UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  answers JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'Novo',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_ads_briefings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.google_ads_briefings FROM anon, authenticated;
GRANT INSERT ON TABLE public.google_ads_briefings TO anon, authenticated;
GRANT SELECT ON TABLE public.google_ads_briefings TO authenticated;
GRANT ALL ON TABLE public.google_ads_briefings TO service_role;

DROP POLICY IF EXISTS "Public can submit Google Ads briefings" ON public.google_ads_briefings;
CREATE POLICY "Public can submit Google Ads briefings"
  ON public.google_ads_briefings
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view Google Ads briefings" ON public.google_ads_briefings;
CREATE POLICY "Admins can view Google Ads briefings"
  ON public.google_ads_briefings
  FOR SELECT TO authenticated
  USING (public.is_briefing_admin());

CREATE OR REPLACE FUNCTION public.validate_google_ads_briefing_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  required_key TEXT;
  answer_item RECORD;
BEGIN
  IF jsonb_typeof(NEW.answers) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'As respostas devem estar em formato de objeto.' USING ERRCODE = '22023';
  END IF;

  FOREACH required_key IN ARRAY ARRAY[
    'fullName', 'businessName', 'email', 'whatsapp', 'profession', 'cityState',
    'attendanceType', 'services', 'priorityService', 'differential', 'targetAudience',
    'campaignGoal', 'expectations', 'availability', 'hasGoogleAds', 'monthlyBudget',
    'startWhen', 'hasGoogleAdsAccount', 'adminSiteAccess', 'adDestination',
    'conversionTracking', 'successCriteria'
  ] LOOP
    IF NULLIF(BTRIM(NEW.answers ->> required_key), '') IS NULL THEN
      RAISE EXCEPTION 'Campo obrigatório ausente: %', required_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF BTRIM(NEW.answers ->> 'email') !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail inválido.' USING ERRCODE = '22023';
  END IF;

  IF LENGTH(REGEXP_REPLACE(COALESCE(NEW.answers ->> 'whatsapp', ''), '[^0-9]', '', 'g')) NOT IN (10, 11) THEN
    RAISE EXCEPTION 'WhatsApp inválido: informe DDD e número brasileiro.' USING ERRCODE = '22023';
  END IF;

  IF NEW.answers ->> 'attendanceType' NOT IN ('Online', 'Presencial', 'Ambos') THEN
    RAISE EXCEPTION 'Tipo de atendimento inválido.' USING ERRCODE = '22023';
  END IF;

  IF NEW.answers ->> 'attendanceType' IN ('Presencial', 'Ambos')
     AND NULLIF(BTRIM(NEW.answers ->> 'regions'), '') IS NULL THEN
    RAISE EXCEPTION 'Informe as regiões de atendimento presencial.' USING ERRCODE = '22023';
  END IF;

  IF NEW.answers ->> 'campaignGoal' NOT IN (
    'Receber contatos pelo WhatsApp', 'Receber ligações',
    'Receber solicitações pelo formulário do site',
    'Atrair visitantes qualificados para o site', 'Outro'
  ) THEN
    RAISE EXCEPTION 'Objetivo da campanha inválido.' USING ERRCODE = '22023';
  END IF;

  IF NEW.answers ->> 'campaignGoal' = 'Outro'
     AND NULLIF(BTRIM(NEW.answers ->> 'campaignGoalOther'), '') IS NULL THEN
    RAISE EXCEPTION 'Descreva o outro objetivo da campanha.' USING ERRCODE = '22023';
  END IF;

  IF NEW.answers ->> 'monthlyBudget' NOT IN (
    'Até R$ 300', 'De R$ 301 a R$ 500', 'De R$ 501 a R$ 1.000',
    'Acima de R$ 1.000', 'Ainda não defini'
  ) THEN
    RAISE EXCEPTION 'Faixa de orçamento inválida.' USING ERRCODE = '22023';
  END IF;

  FOR answer_item IN SELECT key, value FROM jsonb_each(NEW.answers) LOOP
    IF jsonb_typeof(answer_item.value) IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Cada resposta deve ser texto.' USING ERRCODE = '22023';
    END IF;
    IF LENGTH(answer_item.value #>> '{}') > 5000 THEN
      RAISE EXCEPTION 'Uma das respostas excede o limite permitido.' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF OCTET_LENGTH(NEW.answers::TEXT) > 60000 THEN
    RAISE EXCEPTION 'O tamanho total das respostas excede o limite permitido.' USING ERRCODE = '22023';
  END IF;

  -- O servidor define os campos de controle; o cliente não pode forjá-los.
  NEW.full_name := BTRIM(NEW.answers ->> 'fullName');
  NEW.business_name := BTRIM(NEW.answers ->> 'businessName');
  NEW.email := LOWER(BTRIM(NEW.answers ->> 'email'));
  NEW.status := 'Novo';
  NEW.submitted_at := now();
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_google_ads_briefing_submission ON public.google_ads_briefings;
CREATE TRIGGER validate_google_ads_briefing_submission
  BEFORE INSERT ON public.google_ads_briefings
  FOR EACH ROW EXECUTE FUNCTION public.validate_google_ads_briefing_submission();
