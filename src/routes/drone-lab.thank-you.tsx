import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader, BrandFooter } from "@/components/Brand";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/drone-lab/thank-you")({
  head: () => ({
    meta: [{ title: "Спасибо! · Lisakovsk HUB Drone & AI Lab" }],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  return (
    <div className="min-h-screen flex flex-col bg-subtle-gradient">
      <BrandHeader />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-xl flex items-center">
        <div className="text-center w-full">
          <div className="w-20 h-20 mx-auto rounded-full bg-success/15 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">Спасибо!</h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            Ваши ответы помогут <strong className="text-foreground">Lisakovsk HUB</strong> развивать новые цифровые направления, обучение перспективным профессиям и практические технологии для региона.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Вернуться на главную</Link>
          </Button>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
