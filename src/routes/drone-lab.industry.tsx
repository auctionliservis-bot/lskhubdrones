import { createFileRoute } from "@tanstack/react-router";
import { BrandHeader, BrandFooter } from "@/components/Brand";
import { SurveyForm } from "@/components/SurveyForm";
import { INDUSTRY_SURVEY } from "@/lib/survey-questions";

export const Route = createFileRoute("/drone-lab/industry")({
  head: () => ({
    meta: [
      { title: "Анкета для промышленных предприятий · Lisakovsk HUB Drone & AI Lab" },
      { name: "description", content: "Поделитесь задачами вашего предприятия — где могут помочь дроны и ИИ." },
      { property: "og:title", content: "Анкета для промышленных предприятий · Lisakovsk HUB" },
    ],
  }),
  component: IndustryPage,
});

function IndustryPage() {
  return (
    <div className="min-h-screen flex flex-col bg-subtle-gradient">
      <BrandHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">{INDUSTRY_SURVEY.title}</h1>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-8 p-4 rounded-lg bg-card border border-border">
          {INDUSTRY_SURVEY.intro}
        </div>
        <SurveyForm survey={INDUSTRY_SURVEY} />
      </main>
      <BrandFooter />
    </div>
  );
}
