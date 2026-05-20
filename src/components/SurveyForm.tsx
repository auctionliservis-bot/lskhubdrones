import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Question, SurveyDef } from "@/lib/survey-questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type AnswersMap = Record<string, string | string[]>;

function isAnswered(q: Question, value: string | string[] | undefined): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return value.trim().length > 0;
}

export function SurveyForm({ survey }: { survey: SurveyDef }) {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setAnswer = (id: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const toggleMulti = (id: string, option: string) => {
    const current = (answers[id] as string[] | undefined) ?? [];
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    setAnswer(id, next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // bot
    if (!consent) {
      toast.error("Необходимо подтвердить согласие");
      return;
    }

    // Validate required
    const newErrors: Record<string, string> = {};
    for (const q of survey.questions) {
      if (q.required && !isAnswered(q, answers[q.id])) {
        newErrors[q.id] = "Это поле обязательно";
      }
    }
    // Contact required if followup = Да
    let followupYes = false;
    for (const q of survey.questions) {
      if (q.mapTo === "followup" && q.trueValues?.includes((answers[q.id] as string) ?? "")) {
        followupYes = true;
      }
    }
    if (followupYes) {
      const contactQ = survey.questions.find((q) => q.mapTo === "contact");
      if (contactQ && !isAnswered(contactQ, answers[contactQ.id])) {
        newErrors[contactQ.id] = "Укажите контакт, чтобы мы могли связаться";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Пожалуйста, заполните обязательные поля");
      const firstId = Object.keys(newErrors)[0];
      document.getElementById(`q-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Build payload
    const payload: {
      survey_type: "agro" | "industry";
      consent_given: boolean;
      answers: AnswersMap;
      respondent_name?: string | null;
      respondent_position?: string | null;
      organization_name?: string | null;
      location?: string | null;
      phone_or_contact?: string | null;
      wants_followup?: boolean;
      wants_results?: boolean;
      interested_in_pilot?: boolean;
      interested_in_training?: boolean;
    } = {
      survey_type: survey.type,
      consent_given: true,
      answers,
      wants_followup: false,
      wants_results: false,
      interested_in_pilot: false,
      interested_in_training: false,
    };

    for (const q of survey.questions) {
      const v = answers[q.id];
      if (v === undefined) continue;
      const str = Array.isArray(v) ? v.join(", ") : v;
      switch (q.mapTo) {
        case "name":
          payload.respondent_name = str;
          break;
        case "position":
          payload.respondent_position = str;
          break;
        case "org":
          payload.organization_name = str;
          break;
        case "location":
          payload.location = str;
          break;
        case "contact":
          payload.phone_or_contact = str;
          break;
        case "pilot":
          payload.interested_in_pilot = q.trueValues?.includes(str) ?? false;
          break;
        case "results":
          payload.wants_results = q.trueValues?.includes(str) ?? false;
          break;
        case "followup":
          payload.wants_followup = q.trueValues?.includes(str) ?? false;
          break;
        case "training":
          payload.interested_in_training = q.trueValues?.includes(str) ?? false;
          break;
      }
    }

    setSubmitting(true);
    const { error } = await supabase.from("survey_responses").insert(payload);
    setSubmitting(false);
    if (error) {
      console.error(error);
      toast.error("Не удалось отправить анкету. Попробуйте ещё раз.");
      return;
    }
    navigate({ to: "/thank-you" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* honeypot */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] opacity-0"
        aria-hidden="true"
      />

      {survey.questions.map((q, i) => (
        <Card id={`q-${q.id}`} key={q.id} className="p-5 shadow-card">
          <Label className="text-base font-medium leading-snug block mb-3">
            <span className="text-primary font-semibold mr-1.5">{i + 1}.</span>
            {q.label}
            {q.required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {q.type === "short_text" && (
            <Input
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder={q.placeholder}
            />
          )}

          {q.type === "long_text" && (
            <Textarea
              rows={4}
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder={q.placeholder}
            />
          )}

          {q.type === "single" && q.options && (
            <RadioGroup
              value={(answers[q.id] as string) ?? ""}
              onValueChange={(v) => setAnswer(q.id, v)}
              className="space-y-2"
            >
              {q.options.map((opt) => (
                <label
                  key={opt}
                  className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <RadioGroupItem value={opt} id={`${q.id}-${opt}`} className="mt-0.5" />
                  <span className="text-sm leading-snug">{opt}</span>
                </label>
              ))}
            </RadioGroup>
          )}

          {q.type === "multi" && q.options && (
            <div className="space-y-2">
              {q.options.map((opt) => {
                const checked = ((answers[q.id] as string[] | undefined) ?? []).includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleMulti(q.id, opt)}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-snug">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {errors[q.id] && <p className="text-xs text-destructive mt-2">{errors[q.id]}</p>}
        </Card>
      ))}

      <Card className="p-5 shadow-card border-primary/30 bg-accent/30">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={consent}
            onCheckedChange={(c) => setConsent(c === true)}
            className="mt-0.5"
            required
          />
          <span className="text-sm leading-snug">
            Я согласен(на), что мои ответы могут быть использованы Lisakovsk HUB в обобщённом виде для анализа потребностей региона и подготовки пилотного проекта.
            <span className="text-destructive ml-1">*</span>
          </span>
        </label>
      </Card>

      <Button
        type="submit"
        size="lg"
        disabled={submitting || !consent}
        className="w-full h-12 text-base bg-hero-gradient hover:opacity-90 transition-opacity shadow-soft"
      >
        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Отправить анкету
      </Button>
    </form>
  );
}
