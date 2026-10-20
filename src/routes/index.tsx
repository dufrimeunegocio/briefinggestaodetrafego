import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import "./google-ads-briefing.css";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Briefing de Google Ads | Dufri Meu Negócio" },
      { name: "description", content: "Conte-nos sobre seu negócio para planejarmos sua campanha de Google Ads." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@600;700&display=swap" },
    ],
  }),
  component: GoogleAdsBriefingPage,
});

type FieldType = "text" | "email" | "tel" | "url" | "textarea" | "radio";
type Question = {
  key: string;
  group: string;
  title: string;
  description?: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  optional?: boolean;
  showIf?: { key: string; values: string[] };
};

const logoUrl = "https://raw.githubusercontent.com/dufrimeunegocio/dufri-briefing/main/public/logo-dufri.jpeg";
const draftKey = "dufri-google-ads-briefing-draft-v1";

const questions: Question[] = [
  { key: "fullName", group: "Dados profissionais e do negócio", title: "Qual é o seu nome completo?", type: "text", placeholder: "Digite seu nome completo" },
  { key: "businessName", group: "Dados profissionais e do negócio", title: "Qual é o seu nome profissional ou nome do negócio?", type: "text", placeholder: "Nome profissional ou da empresa" },
  { key: "email", group: "Dados profissionais e do negócio", title: "Qual é o seu e-mail profissional?", type: "email", placeholder: "voce@exemplo.com.br" },
  { key: "whatsapp", group: "Dados profissionais e do negócio", title: "Qual é o seu WhatsApp profissional?", description: "Inclua o DDD. Usaremos esse contato para tratar da campanha.", type: "tel", placeholder: "(11) 99999-9999" },
  { key: "website", group: "Dados profissionais e do negócio", title: "Você possui site ou página profissional?", type: "url", optional: true, placeholder: "https://seusite.com.br" },
  { key: "instagram", group: "Dados profissionais e do negócio", title: "Qual é o seu Instagram profissional?", type: "text", optional: true, placeholder: "@seuperfil ou link do perfil" },
  { key: "profession", group: "Dados profissionais e do negócio", title: "Qual é sua profissão e área de atuação?", type: "text", placeholder: "Ex.: psicóloga clínica, arquiteto, terapeuta" },
  { key: "cityState", group: "Dados profissionais e do negócio", title: "Em qual cidade e estado você atende?", type: "text", placeholder: "Ex.: Guarulhos, SP" },
  { key: "attendanceType", group: "Dados profissionais e do negócio", title: "Como você atende?", type: "radio", options: ["Online", "Presencial", "Ambos"] },
  { key: "regions", group: "Dados profissionais e do negócio", title: "Quais cidades, bairros ou regiões você atende presencialmente?", description: "Informe somente as áreas relevantes para a divulgação.", type: "textarea", placeholder: "Cidades, bairros ou raio de atendimento", showIf: { key: "attendanceType", values: ["Presencial", "Ambos"] } },

  { key: "services", group: "Serviços oferecidos", title: "Quais serviços deseja divulgar?", type: "textarea", placeholder: "Liste os principais serviços" },
  { key: "priorityService", group: "Serviços oferecidos", title: "Qual serviço deve ser priorizado nos anúncios?", type: "textarea", placeholder: "Indique o serviço mais importante" },
  { key: "servicePrice", group: "Serviços oferecidos", title: "Qual é o preço ou a faixa de preço dos seus serviços?", description: "Essa informação ajuda no planejamento e não precisa aparecer nos anúncios.", type: "text", optional: true, placeholder: "Ex.: a partir de R$ 150" },
  { key: "differential", group: "Serviços oferecidos", title: "Qual é o principal diferencial do seu trabalho?", type: "textarea", placeholder: "O que diferencia seu serviço?" },
  { key: "targetAudience", group: "Serviços oferecidos", title: "Qual perfil geral de público deseja alcançar?", description: "Não informe nomes, diagnósticos ou dados pessoais de pacientes.", type: "textarea", placeholder: "Descreva o público de forma geral" },
  { key: "excludedServices", group: "Serviços oferecidos", title: "Existe algum serviço ou abordagem que não deseja divulgar?", type: "textarea", optional: true, placeholder: "Se houver, descreva aqui" },

  { key: "campaignGoal", group: "Objetivos da campanha", title: "Qual é o principal objetivo dos anúncios?", type: "radio", options: ["Receber contatos pelo WhatsApp", "Receber ligações", "Receber solicitações pelo formulário do site", "Atrair visitantes qualificados para o site", "Outro"] },
  { key: "campaignGoalOther", group: "Objetivos da campanha", title: "Qual outro objetivo deseja alcançar?", type: "text", placeholder: "Descreva o objetivo", showIf: { key: "campaignGoal", values: ["Outro"] } },
  { key: "expectations", group: "Objetivos da campanha", title: "O que espera melhorar com o Google Ads?", type: "textarea", placeholder: "Ex.: aumentar contatos qualificados ou divulgar um serviço" },
  { key: "availability", group: "Objetivos da campanha", title: "Você tem disponibilidade para receber novos clientes ou pacientes?", type: "radio", options: ["Sim", "Não no momento", "Tenho disponibilidade limitada"] },
  { key: "monthlyCapacity", group: "Objetivos da campanha", title: "Quantos novos atendimentos consegue absorver por mês?", type: "text", optional: true, placeholder: "Quantidade aproximada" },
  { key: "hasGoogleAds", group: "Objetivos da campanha", title: "Você já anuncia ou anunciou anteriormente no Google Ads?", type: "radio", options: ["Sim", "Não"] },
  { key: "previousResults", group: "Objetivos da campanha", title: "Quais foram as principais dificuldades ou resultados percebidos?", type: "textarea", optional: true, placeholder: "Conte brevemente sua experiência anterior", showIf: { key: "hasGoogleAds", values: ["Sim"] } },

  { key: "monthlyBudget", group: "Orçamento e investimento", title: "Qual é a verba mensal disponível exclusivamente para os anúncios?", description: "Esse valor é pago à plataforma de anúncios e não corresponde à remuneração da agência.", type: "radio", options: ["Até R$ 300", "De R$ 301 a R$ 500", "De R$ 501 a R$ 1.000", "Acima de R$ 1.000", "Ainda não defini"] },
  { key: "startWhen", group: "Orçamento e investimento", title: "Quando deseja começar a anunciar?", type: "radio", options: ["Assim que possível", "Nas próximas 1 a 2 semanas", "Em até 30 dias", "Ainda estou avaliando"] },
  { key: "budgetLimitations", group: "Orçamento e investimento", title: "Existe alguma limitação orçamentária ou condição importante?", type: "textarea", optional: true, placeholder: "Se houver, explique brevemente" },

  { key: "hasGoogleAdsAccount", group: "Conta e estrutura digital", title: "Você possui uma conta do Google Ads?", type: "radio", options: ["Sim", "Não", "Não sei"] },
  { key: "adminSiteAccess", group: "Conta e estrutura digital", title: "Você possui acesso administrativo ao seu site?", type: "radio", options: ["Sim", "Não", "Não se aplica", "Não sei"] },
  { key: "sitePlatform", group: "Conta e estrutura digital", title: "Em qual plataforma seu site foi criado?", type: "text", optional: true, placeholder: "Ex.: WordPress, Wix, Lovable, Webflow" },
  { key: "adDestination", group: "Conta e estrutura digital", title: "Qual será o principal destino dos anúncios?", type: "radio", options: ["Site", "Página de destino específica", "WhatsApp", "Ligações", "Ainda preciso de orientação"] },
  { key: "conversionTracking", group: "Conta e estrutura digital", title: "Já possui acompanhamento de conversões configurado?", description: "Por exemplo, registro de contatos, ligações ou formulários enviados.", type: "radio", options: ["Sim", "Não", "Não sei"] },
  { key: "digitalNotes", group: "Conta e estrutura digital", title: "Há algo sobre seu site ou estrutura digital que devemos conhecer?", type: "textarea", optional: true, placeholder: "Links, limitações ou detalhes úteis" },

  { key: "successCriteria", group: "Informações adicionais", title: "O que considera mais importante para o sucesso dessa campanha?", type: "textarea", placeholder: "Descreva suas prioridades" },
  { key: "additionalInfo", group: "Informações adicionais", title: "Existe alguma informação que ainda não perguntamos e você gostaria de compartilhar?", type: "textarea", optional: true, placeholder: "Informações adicionais (opcional)" },
  { key: "observations", group: "Informações adicionais", title: "Observações finais", type: "textarea", optional: true, placeholder: "Deixe aqui qualquer observação adicional" },
];

type Answers = Record<string, string>;
type Screen = "welcome" | "form" | "review" | "success";

function readDraft(): Answers {
  try {
    const value = sessionStorage.getItem(draftKey);
    return value ? JSON.parse(value) as Answers : {};
  } catch {
    return {};
  }
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? "(" + digits : "";
  if (digits.length <= 6) return "(" + digits.slice(0, 2) + ") " + digits.slice(2);
  if (digits.length <= 10) return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
  return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark">
      <img src={logoUrl} alt="Dufri Meu Negócio" className={compact ? "brand-logo compact" : "brand-logo"} />
      <div className="brand-wordmark">
        <strong>DUFRI</strong>
        <span>MEU NEGÓCIO</span>
      </div>
    </div>
  );
}

function GoogleAdsBriefingPage() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [answers, setAnswers] = useState<Answers>(readDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submissionToken, setSubmissionToken] = useState(() => crypto.randomUUID());

  const visibleQuestions = useMemo(
    () => questions.filter((question) => !question.showIf || question.showIf.values.includes(answers[question.showIf.key] || "")),
    [answers],
  );
  const currentIndex = Math.min(stepIndex, visibleQuestions.length - 1);
  const question = visibleQuestions[currentIndex];
  const value = question ? answers[question.key] || "" : "";
  const progress = visibleQuestions.length ? ((currentIndex + 1) / visibleQuestions.length) * 100 : 0;
  const sectionNumber = question ? Array.from(new Set(visibleQuestions.map((item) => item.group))).indexOf(question.group) + 1 : 1;
  const sectionCount = new Set(visibleQuestions.map((item) => item.group)).size;

  useEffect(() => {
    try {
      if (screen === "success") sessionStorage.removeItem(draftKey);
      else sessionStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {
      // O formulário continua funcionando sem armazenamento temporário do navegador.
    }
  }, [answers, screen]);

  function setAnswer(key: string, nextValue: string) {
    setAnswers((previous) => {
      const updated = { ...previous, [key]: nextValue };
      for (const conditionalQuestion of questions) {
        if (
          conditionalQuestion.showIf?.key === key &&
          !conditionalQuestion.showIf.values.includes(nextValue)
        ) {
          updated[conditionalQuestion.key] = "";
        }
      }
      return updated;
    });
    setError("");
  }

  function validateCurrent() {
    if (!question) return "";
    if (!question.optional && !value.trim()) return "Preencha esta resposta para continuar.";
    if (value.trim() && question.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Digite um e-mail válido.";
    if (value.trim() && question.type === "tel") {
      const digits = value.replace(/\D/g, "");
      if (digits.length !== 10 && digits.length !== 11) return "Digite um telefone brasileiro com DDD.";
    }
    if (value.trim() && question.type === "url") {
      try {
        const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : "https://" + value.trim();
        new URL(candidate);
      } catch {
        return "Digite um endereço de site válido.";
      }
    }
    return "";
  }

  function next() {
    const validation = validateCurrent();
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    if (currentIndex >= visibleQuestions.length - 1) setScreen("review");
    else setStepIndex(currentIndex + 1);
  }

  function back() {
    setError("");
    if (currentIndex <= 0) setScreen("welcome");
    else setStepIndex(currentIndex - 1);
  }

  async function submit() {
    if (saving) return;
    if (!supabase) {
      setError("O envio ainda não está conectado ao Supabase. Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY nas variáveis do projeto.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const { error: insertError } = await supabase.from("google_ads_briefings").insert({
        submission_token: submissionToken,
        full_name: (answers["fullName"] || "").trim(),
        business_name: (answers["businessName"] || "").trim(),
        email: (answers["email"] || "").trim(),
        answers,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          setScreen("success");
          return;
        }
        console.error("Falha ao enviar briefing:", insertError.code, insertError.message);
throw new Error(`Erro ao salvar: ${insertError.code} - ${insertError.message}`);      }
      setScreen("success");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ocorreu um erro ao enviar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function restart() {
    setAnswers({});
    setStepIndex(0);
    setError("");
    setSubmissionToken(crypto.randomUUID());
    setScreen("welcome");
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const nextValue = question?.type === "tel" ? formatPhone(event.target.value) : event.target.value;
    if (question) setAnswer(question.key, nextValue);
  }

  if (screen === "welcome") {
    return (
      <div className="google-ads-page">
      <main className="welcome-shell">
        <section className="welcome-brand-panel">
          <div className="brand-grid" aria-hidden="true" />
          <div className="welcome-brand-top">
            <img src={logoUrl} alt="Dufri Meu Negócio" className="welcome-logo" />
            <p>Estratégia, presença digital e campanhas orientadas por objetivos.</p>
          </div>
          <span className="brand-footer">DUFRI MEU NEGÓCIO</span>
        </section>
        <section className="welcome-content">
          <div className="welcome-inner">
            <div className="mobile-brand"><BrandMark compact /></div>
            <span className="eyebrow">Briefing de Google Ads</span>
            <h1>Vamos entender seu negócio e planejar sua campanha.</h1>
            <p className="welcome-copy">Responda às perguntas para reunirmos as informações necessárias para planejar sua campanha de Google Ads com mais clareza.</p>
            <div className="trust-row">
              <span><Clock3 size={17} /> Cerca de 7–10 minutos</span>
              <span><MessageCircle size={17} /> Simples e direto</span>
            </div>
            <div className="privacy-note">
              <ShieldCheck size={19} />
              <p>Não informe senhas, códigos de acesso, dados de pagamento nem nomes, diagnósticos ou relatos de pacientes.</p>
            </div>
            <button className="button button-primary start-button" onClick={() => setScreen("form")}>
              Começar briefing <ArrowRight size={19} />
            </button>
          </div>
        </section>
      </main>
      </div>
    );
  }

  if (screen === "success") {
    return (
      <div className="google-ads-page">
      <main className="status-page">
        <header className="status-header"><BrandMark compact /><span>Briefing concluído</span></header>
        <section className="status-content">
          <div className="success-icon"><Check size={36} strokeWidth={2.5} /></div>
          <span className="eyebrow">Envio realizado</span>
          <h1>Recebemos suas informações!</h1>
          <p>Obrigado por preencher o briefing. A equipe da Dufri Meu Negócio poderá analisar as respostas e dar continuidade ao planejamento da campanha.</p>
          <div className="success-note"><CheckCircle2 size={19} /> Suas respostas foram enviadas com sucesso.</div>
        </section>
      </main>
      </div>
    );
  }

  if (screen === "review") {
    return (
      <div className="google-ads-page">
      <main className="review-page">
        <header className="status-header"><BrandMark compact /><span>Revisão final</span></header>
        <section className="review-content">
          <span className="eyebrow">Última etapa</span>
          <h1>Confira suas respostas</h1>
          <p className="review-intro">Revise as informações antes de enviar. Se precisar alterar algo, volte às perguntas.</p>
          {Array.from(new Set(visibleQuestions.map((item) => item.group))).map((group) => (
            <section className="review-group" key={group}>
              <h2>{group}</h2>
              {visibleQuestions.filter((item) => item.group === group).map((item) => (
                <div className="review-answer" key={item.key}>
                  <span>{item.title}{item.optional ? " (opcional)" : ""}</span>
                  <p>{(answers[item.key] || "").trim() || "Não informado"}</p>
                </div>
              ))}
            </section>
          ))}
          <div className="review-actions">
            <button className="button button-secondary" onClick={() => { setScreen("form"); setStepIndex(0); }}><ArrowLeft size={18} /> Voltar às perguntas</button>
            <button className="button button-primary" disabled={saving} onClick={submit}>{saving ? "Enviando..." : "Enviar briefing"} <ArrowRight size={18} /></button>
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}
          <p className="secure-footnote"><LockKeyhole size={14} /> Não compartilhe senhas ou códigos de autenticação neste formulário.</p>
        </section>
      </main>
      </div>
    );
  }

  return (
    <div className="google-ads-page">
    <main className="form-page">
      <header className="form-header">
        <BrandMark compact />
        <div className="progress-label"><strong>Pergunta {currentIndex + 1} de {visibleQuestions.length}</strong><span>Etapa {sectionNumber} de {sectionCount}</span></div>
      </header>
      <div className="progress-track" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={"Progresso: " + Math.round(progress) + "%"}>
        <div className="progress-value" style={{ width: progress + "%" }} />
      </div>
      <section className="question-layout">
        <aside className="question-aside">
          <span className="aside-kicker">Seu planejamento começa aqui</span>
          <h2>{question?.group}</h2>
          <p>Responda com informações gerais e objetivas. Se algo não se aplicar, use a opção disponível ou deixe em branco quando o campo for opcional.</p>
          <div className="aside-privacy"><ShieldCheck size={18} /><span>Suas respostas são tratadas como informações do seu negócio.</span></div>
        </aside>
        <section className="question-content" aria-live="polite">
          <span className="eyebrow">Pergunta {currentIndex + 1}</span>
          <h1>{question?.title}</h1>
          {question?.description && <p className="question-description">{question.description}</p>}
          {question?.optional ? <p className="optional-label">Campo opcional</p> : <p className="required-label">Campo obrigatório</p>}
          {question?.type === "radio" ? (
            <div className="radio-list" role="radiogroup" aria-label={question.title}>
              {question.options?.map((option) => (
                <label className={"radio-option" + (value === option ? " selected" : "")} key={option}>
                  <input type="radio" name={question.key} value={option} checked={value === option} onChange={() => setAnswer(question.key, option)} />
                  <span>{option}</span>
                  <span className="radio-indicator" aria-hidden="true">{value === option ? <Check size={16} /> : null}</span>
                </label>
              ))}
            </div>
          ) : question?.type === "textarea" ? (
            <textarea className="answer-field answer-textarea" rows={5} value={value} onChange={handleInputChange} placeholder={question.placeholder} aria-invalid={Boolean(error)} autoComplete="off" />
          ) : (
            <input className="answer-field" type={question?.type || "text"} value={value} onChange={handleInputChange} placeholder={question?.placeholder} aria-invalid={Boolean(error)} autoComplete={question?.type === "email" ? "email" : question?.type === "tel" ? "tel" : "off"} />
          )}
          {question?.key === "monthlyBudget" && <p className="field-note">A verba dos anúncios é paga à plataforma, separadamente da remuneração pelo serviço de gestão.</p>}
          {question?.group === "Serviços oferecidos" && <p className="field-note">Por segurança e privacidade, não compartilhe informações identificáveis ou clínicas de pacientes.</p>}
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="question-actions">
            <button className="button button-secondary" onClick={back}><ArrowLeft size={18} /> Voltar</button>
            <button className="button button-primary" onClick={next}>Continuar <ArrowRight size={18} /></button>
          </div>
          <p className="secure-footnote"><LockKeyhole size={14} /> {question?.optional ? "Campo opcional — você pode continuar sem responder." : "Os campos obrigatórios precisam ser preenchidos para continuar."}</p>
        </section>
      </section>
    </main>
    </div>
  );
}
