"use client";

import { useState } from "react";
import { marketingOutputs, marketingTemplates } from "@/lib/mock-data";
import { generateMarketingContent } from "@/lib/client-api";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MarketingPage() {
  const { tr } = useLocale();
  const [product, setProduct] = useState("Premium Olive Oil 750ml");
  const [audience, setAudience] = useState("Urban Tunisian online buyers");
  const [language, setLanguage] = useState("French");
  const [tone, setTone] = useState("Premium");
  const [format, setFormat] = useState("Facebook ad");
  const [generated, setGenerated] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onGenerate = async () => {
    try {
      setIsLoading(true);
      const result = await generateMarketingContent({
        product,
        audience,
        language,
        tone,
        format
      });
      setGenerated(result.output);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="premium-page-hero">
        <p className="premium-page-kicker">{tr("page.marketingKicker", "Marketing Studio")}</p>
        <h1 className="premium-page-title">
          {tr("page.marketingTitle", "Generate high-converting business content")}
        </h1>
        <p className="premium-page-description">
          {tr(
            "page.marketingDescription",
            "Build product descriptions, ads, captions, WhatsApp promos, and formal emails with language and tone control."
          )}
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <article className="premium-panel p-4">
          <h2 className="text-lg font-medium">{tr("marketing.generationInput", "Generation Input")}</h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void onGenerate();
            }}
          >
            <Input
              placeholder={tr("marketing.productOrService", "Product or service")}
              value={product}
              onChange={(event) => setProduct(event.target.value)}
            />
            <Input
              placeholder={tr("marketing.audience", "Audience")}
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
            />
            <Input
              placeholder={tr("marketing.languagePlaceholder", "Language (FR, EN, AR, Darija)")}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            />
            <Input
              placeholder={tr("marketing.tonePlaceholder", "Tone (premium, salesy, formal...)")}
              value={tone}
              onChange={(event) => setTone(event.target.value)}
            />
            <Input
              placeholder={tr("marketing.format", "Format")}
              value={format}
              onChange={(event) => setFormat(event.target.value)}
            />
            <div className="grid gap-2">
              {marketingTemplates.map((template) => (
                <Button
                  key={template}
                  type="button"
                  variant="secondary"
                  className="justify-start"
                  onClick={() => setFormat(template)}
                >
                  {template}
                </Button>
              ))}
            </div>
            <Button className="w-full" disabled={isLoading}>
              {isLoading
                ? tr("marketing.generating", "Generating...")
                : tr("marketing.generateContent", "Generate Content")}
            </Button>
          </form>
        </article>

        <article className="premium-panel p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">{tr("marketing.generatedOutputs", "Generated Outputs")}</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                {tr("marketing.shorter", "Shorter")}
              </Button>
              <Button size="sm" variant="outline">
                {tr("marketing.morePremium", "More premium")}
              </Button>
              <Button size="sm" variant="outline">
                {tr("marketing.moreSalesy", "More salesy")}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {generated && (
              <article className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm premium-interactive">
                <p className="font-medium">{tr("marketing.liveApiOutput", "Live API output")}</p>
                <p className="mt-2 text-secondary">{generated}</p>
              </article>
            )}
            {marketingOutputs.map((output) => (
              <article
                key={output.id}
                className="premium-subpanel p-3 text-sm premium-interactive"
              >
                <p className="font-medium">
                  {output.channel} · {output.language} · {output.tone}
                </p>
                <p className="mt-2 text-secondary">{output.preview}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary">
                    {tr("common.copy", "Copy")}
                  </Button>
                  <Button size="sm" variant="outline">
                    {tr("common.regenerate", "Regenerate")}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
