export type KnowledgePack = {
  id: string;
  title: string;
  description: string;
  bullets: string[];
};

export const tunisianKnowledgePacks: KnowledgePack[] = [
  {
    id: "culture",
    title: "Culture & Etiquette",
    description: "Social codes, tone, and expectations across Tunisian contexts.",
    bullets: [
      "Respectful greetings and warmth build trust quickly.",
      "Family context matters in gifting and buying decisions.",
      "Religious seasons and national events strongly impact customer behavior."
    ]
  },
  {
    id: "admin",
    title: "Admin & Documents",
    description: "Common practical guidance for forms, procedures, and public services.",
    bullets: [
      "Always mention that local office requirements can vary by governorate.",
      "Encourage users to verify latest official requirements before submission.",
      "Prefer clear step-by-step instructions with required documents first."
    ]
  },
  {
    id: "business",
    title: "Business & Commerce",
    description: "Local e-commerce habits, delivery realities, and trust levers.",
    bullets: [
      "Cash on delivery remains very common.",
      "Customers often ask for WhatsApp/phone confirmation before shipping.",
      "Delivery windows should be communicated as ranges, not exact promises."
    ]
  },
  {
    id: "lifestyle",
    title: "Daily Life & Practicality",
    description: "Advice for routines, transport, communication, and local preferences.",
    bullets: [
      "Mixing Darija with French is common in daily communication.",
      "Practical recommendations should consider budget and transport constraints.",
      "Tone should stay human, direct, and non-judgmental."
    ]
  }
];

export type EvaluationPrompt = {
  id: string;
  language: "darija" | "ar" | "fr" | "en";
  prompt: string;
  expectedSignals: string[];
};

export const tunisianEvaluationPrompts: EvaluationPrompt[] = [
  {
    id: "darija-delivery",
    language: "darija",
    prompt:
      "3tini radd mo7taram bel derja 3la client yse2el 3la delai ta3 livraison w tarika el paiement.",
    expectedSignals: ["delivery", "payment", "darija", "clear"]
  },
  {
    id: "fr-admin",
    language: "fr",
    prompt:
      "Explique en francais les etapes pour preparer un dossier administratif en Tunisie avec prudence.",
    expectedSignals: ["etapes", "verification", "documents", "prudence"]
  },
  {
    id: "ar-culture",
    language: "ar",
    prompt: "اعطني نصيحة اجتماعية قصيرة للتعامل باحترام مع كبار السن في تونس.",
    expectedSignals: ["احترام", "تونس", "نصيحة", "tone"]
  },
  {
    id: "en-business",
    language: "en",
    prompt:
      "How should a Tunisian online store improve trust for first-time customers in a practical way?",
    expectedSignals: ["trust", "delivery", "confirmation", "practical"]
  }
];

export function scoreTunisianAnswer(answer: string, language: string) {
  const text = answer.toLowerCase();
  const hasStepStructure =
    text.includes("1") || text.includes("2") || text.includes("-") || text.includes("step");
  const hasCaution =
    text.includes("verify") ||
    text.includes("check") ||
    text.includes("depends") ||
    text.includes("قد") ||
    text.includes("ممكن");
  const hasWarmTone =
    text.includes("please") ||
    text.includes("merci") ||
    text.includes("marhbe") ||
    text.includes("مرحبا");
  const hasTunisiaSignal =
    text.includes("tunisia") || text.includes("tounes") || text.includes("تونس");
  const languageSignal =
    language === "ar"
      ? /[\u0600-\u06FF]/.test(answer)
      : language === "fr"
        ? /(bonjour|francais|livraison|conseil)/i.test(answer)
        : language === "darija"
          ? /(3|7|ch|w|barcha|tounes)/i.test(answer)
          : true;

  const clarity = hasStepStructure ? 25 : 14;
  const safety = hasCaution ? 25 : 12;
  const localization = hasTunisiaSignal ? 25 : 10;
  const empathy = hasWarmTone ? 15 : 8;
  const languageFit = languageSignal ? 10 : 3;
  const total = clarity + safety + localization + empathy + languageFit;

  return {
    total,
    breakdown: {
      clarity,
      safety,
      localization,
      empathy,
      languageFit
    }
  };
}
