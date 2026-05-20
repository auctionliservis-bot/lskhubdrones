import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader, BrandFooter } from "@/components/Brand";
import { Card } from "@/components/ui/card";
import { Sprout, Factory, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lisakovsk HUB · Drone & AI Lab — исследование потребностей региона" },
      {
        name: "description",
        content:
          "Lisakovsk HUB изучает запуск Drone & AI Lab: дроны, ИИ-аналитика и цифровые технологии для сельского хозяйства и промышленности региона. Заполните анкету.",
      },
      { property: "og:title", content: "Lisakovsk HUB · Drone & AI Lab" },
      { property: "og:description", content: "Исследование потребностей региона в дронах и ИИ-технологиях." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-subtle-gradient">
      <BrandHeader />

      <main className="flex-1 container mx-auto px-4 py-10 sm:py-16 max-w-4xl">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Исследование региона · 2026
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
            <span className="text-gradient">Drone &amp; AI Lab</span>
            <br />
            <span className="text-foreground">для развития региона</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            <strong className="text-foreground">Lisakovsk HUB</strong> изучает возможность запуска направления Drone &amp; AI Lab — применение дронов, ИИ/AI-аналитики и цифровых технологий для сельского хозяйства, промышленности, карьеров и инфраструктуры региона.
          </p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto mt-4">
            Цель — понять реальные потребности бизнеса, запустить обучение новым профессиям и развивать практическую цифровизацию региона.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <Link to="/drone-lab/agro" className="group">
            <Card className="h-full p-6 sm:p-7 shadow-card hover:shadow-soft transition-all hover:-translate-y-0.5 border-border/60 cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mb-4">
                <Sprout className="w-6 h-6 text-secondary-foreground" style={{ color: "oklch(0.5 0.16 165)" }} />
              </div>
              <h2 className="font-semibold text-lg mb-2">Анкета для сельхозпроизводителей</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Агродроны, мониторинг полей, точечная обработка, ИИ-анализ урожайности.
              </p>
              <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 gap-1.5 transition-all">
                Открыть анкету <ArrowRight className="w-4 h-4" />
              </div>
            </Card>
          </Link>

          <Link to="/drone-lab/industry" className="group">
            <Card className="h-full p-6 sm:p-7 shadow-card hover:shadow-soft transition-all hover:-translate-y-0.5 border-border/60 cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
                <Factory className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-semibold text-lg mb-2">Анкета для промышленных предприятий</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Карьеры, отвалы, склады, 3D-модели, обмеры, цифровой мониторинг объектов.
              </p>
              <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 gap-1.5 transition-all">
                Открыть анкету <ArrowRight className="w-4 h-4" />
              </div>
            </Card>
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Анкета займёт несколько минут. Мы ничего не продаём — мы изучаем потребности.
        </p>
      </main>

      <BrandFooter />
    </div>
  );
}
