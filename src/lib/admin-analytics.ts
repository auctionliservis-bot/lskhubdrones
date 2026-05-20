import type { Tables } from "@/integrations/supabase/types";
import { AGRO_SURVEY, INDUSTRY_SURVEY, type SurveyDef } from "@/lib/survey-questions";

export type SurveyRow = Tables<"survey_responses">;

export type AnswersMap = Record<string, string | string[]>;

export function answersOf(row: SurveyRow): AnswersMap {
  return (row.answers as AnswersMap) ?? {};
}

export function surveyFor(row: SurveyRow): SurveyDef {
  return row.survey_type === "agro" ? AGRO_SURVEY : INDUSTRY_SURVEY;
}

// Count frequency of single/multi answers across rows for a given question id
export function frequency(rows: SurveyRow[], questionId: string): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const a = answersOf(r)[questionId];
    if (!a) continue;
    const values = Array.isArray(a) ? a : [a];
    for (const v of values) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

// Hot lead: pilot + contact + (perspective positive) + 2+ services
export function isHotLead(row: SurveyRow): boolean {
  if (!row.interested_in_pilot) return false;
  if (!row.phone_or_contact) return false;
  const a = answersOf(row);

  const perspective = row.survey_type === "agro" ? a["q20_perspective"] : a["q25_perspective"];
  const positive = ["Очень перспективно", "Перспективно, но нужно тестировать", "Интересно для отдельных задач"];
  if (typeof perspective !== "string" || !positive.includes(perspective)) return false;

  const services = row.survey_type === "agro" ? a["q12_interest_areas"] : a["q11_services"];
  if (!Array.isArray(services) || services.length < 2) return false;
  return true;
}

export function topN<T extends { count: number }>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}
