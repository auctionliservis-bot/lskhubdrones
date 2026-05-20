import type { SurveyRow } from "./admin-analytics";
import { answersOf, frequency, isHotLead, surveyFor } from "./admin-analytics";

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = Array.isArray(value) ? value.join("; ") : String(value);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function rowsToCSV(rows: SurveyRow[]): string {
  // Collect all question ids
  const headerBase = [
    "id",
    "survey_type",
    "created_at",
    "respondent_name",
    "respondent_position",
    "organization_name",
    "location",
    "phone_or_contact",
    "wants_followup",
    "wants_results",
    "interested_in_pilot",
    "interested_in_training",
    "hot_lead",
  ];
  const questionIds = new Set<string>();
  for (const r of rows) for (const k of Object.keys(answersOf(r))) questionIds.add(k);
  const qIds = Array.from(questionIds).sort();
  const header = [...headerBase, ...qIds];
  const lines = [header.join(",")];
  for (const r of rows) {
    const a = answersOf(r);
    const base = [
      r.id,
      r.survey_type,
      r.created_at,
      r.respondent_name,
      r.respondent_position,
      r.organization_name,
      r.location,
      r.phone_or_contact,
      r.wants_followup,
      r.wants_results,
      r.interested_in_pilot,
      r.interested_in_training,
      isHotLead(r),
    ];
    const qVals = qIds.map((id) => a[id]);
    lines.push([...base, ...qVals].map(escapeCSV).join(","));
  }
  return "\uFEFF" + lines.join("\n");
}

export function contactsToCSV(rows: SurveyRow[]): string {
  const header = ["created_at", "survey_type", "name", "organization", "location", "contact", "pilot", "training", "hot"];
  const lines = [header.join(",")];
  for (const r of rows) {
    if (!r.phone_or_contact) continue;
    lines.push(
      [
        r.created_at,
        r.survey_type,
        r.respondent_name,
        r.organization_name,
        r.location,
        r.phone_or_contact,
        r.interested_in_pilot,
        r.interested_in_training,
        isHotLead(r),
      ]
        .map(escapeCSV)
        .join(","),
    );
  }
  return "\uFEFF" + lines.join("\n");
}

export function downloadFile(content: string, filename: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildTextReport(rows: SurveyRow[]): string {
  const agro = rows.filter((r) => r.survey_type === "agro");
  const ind = rows.filter((r) => r.survey_type === "industry");
  const hot = rows.filter(isHotLead);
  const pilot = rows.filter((r) => r.interested_in_pilot);
  const training = rows.filter((r) => r.interested_in_training);

  const lines: string[] = [];
  lines.push("LISAKOVSK HUB · DRONE & AI LAB");
  lines.push("Краткий отчёт по исследованию потребностей региона");
  lines.push("Дата формирования: " + new Date().toLocaleString("ru-RU"));
  lines.push("=".repeat(60));
  lines.push("");
  lines.push("1. КОЛИЧЕСТВО ОТВЕТОВ");
  lines.push(`Всего: ${rows.length}`);
  lines.push(`  · Сельское хозяйство: ${agro.length}`);
  lines.push(`  · Промышленность: ${ind.length}`);
  lines.push(`Готовы к пилоту: ${pilot.length}`);
  lines.push(`Заинтересованы в обучении: ${training.length}`);
  lines.push(`Потенциальные «горячие» контакты: ${hot.length}`);
  lines.push("");

  const block = (title: string, data: { label: string; count: number }[]) => {
    lines.push(title);
    if (data.length === 0) {
      lines.push("  (нет данных)");
      return;
    }
    data.slice(0, 5).forEach((d, i) => lines.push(`  ${i + 1}. ${d.label} — ${d.count}`));
  };

  lines.push("2. ГЛАВНЫЕ БОЛИ — СЕЛЬСКОЕ ХОЗЯЙСТВО");
  block("Топ сложностей:", frequency(agro, "q9_difficulties"));
  lines.push("");
  lines.push("3. ГЛАВНЫЕ БОЛИ — ПРОМЫШЛЕННОСТЬ");
  block("Топ сложностей:", frequency(ind, "q9_difficulties"));
  lines.push("");
  lines.push("4. УРОВЕНЬ ИНТЕРЕСА");
  block("Интерес агро к дронам:", frequency(agro, "q11_pilot_interest"));
  lines.push("");
  block("Готовность промышленников к пилоту:", frequency(ind, "q18_pilot"));
  lines.push("");
  lines.push("5. ВОСТРЕБОВАННЫЕ УСЛУГИ");
  block("Агро — что интересно в дронах:", frequency(agro, "q12_interest_areas"));
  lines.push("");
  block("Промышленность — желаемые услуги:", frequency(ind, "q11_services"));
  lines.push("");
  lines.push("6. РЕКОМЕНДАЦИИ ПО СЛЕДУЮЩИМ ШАГАМ");
  if (hot.length > 0) {
    lines.push(`  · Связаться с ${hot.length} горячими контактами для пилотных проектов.`);
  }
  if (agro.length > 0) {
    const topService = frequency(agro, "q12_interest_areas")[0];
    if (topService) lines.push(`  · В агро-направлении в первую очередь развивать: «${topService.label}».`);
  }
  if (ind.length > 0) {
    const topService = frequency(ind, "q11_services")[0];
    if (topService) lines.push(`  · В промышленности приоритет: «${topService.label}».`);
  }
  if (training.length > 0) {
    lines.push(`  · Сформировать программу обучения — ${training.length} компаний заинтересованы.`);
  }
  lines.push("");
  lines.push("7. ГОРЯЧИЕ КОНТАКТЫ");
  if (hot.length === 0) lines.push("  (пока нет)");
  hot.forEach((r) => {
    const s = surveyFor(r);
    lines.push(
      `  · [${s.type === "agro" ? "АГРО" : "ПРОМ"}] ${r.organization_name ?? "—"} · ${r.respondent_name ?? "—"} · ${r.location ?? "—"} · ${r.phone_or_contact}`,
    );
  });

  return lines.join("\n");
}
