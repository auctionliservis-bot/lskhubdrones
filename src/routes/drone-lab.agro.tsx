import { createFileRoute } from "@tanstack/react-router";
import { BrandHeader, BrandFooter } from "@/components/Brand";
import { SurveyForm } from "@/components/SurveyForm";
import { AGRO_SURVEY } from "@/lib/survey-questions";

export const Route = createFileRoute("/drone-lab/agro")({
  head: () => ({
    meta: [
      { title: "Анкета для сельхозпроизводителей · Lisakovsk HUB Drone & AI Lab" },
      { name: "description", content: "Поделитесь опытом — как агродроны и ИИ могут помочь вашему хозяйству." },
      { property: "og:title", content: "Анкета для сельхозпроизводителей · Lisakovsk HUB" },
    ],
  }),
  component: AgroPage,
});

function AgroPage() {
  return (
    <div className="min-h-screen flex flex-col bg-subtle-gradient">
      <BrandHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">{AGRO_SURVEY.title}</h1>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-8 p-4 rounded-lg bg-card border border-border">
          {AGRO_SURVEY.intro}
        </div>
        <SurveyForm survey={AGRO_SURVEY} />
      </main>
      <BrandFooter />
    </div>
  );
}
