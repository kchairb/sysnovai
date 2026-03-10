import { NextResponse } from "next/server";

type Body = {
  product?: string;
  audience?: string;
  language?: string;
  tone?: string;
  format?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const product = body.product ?? "your product";
  const audience = body.audience ?? "your audience";
  const language = body.language ?? "French";
  const tone = body.tone ?? "Premium";
  const format = body.format ?? "Facebook ad";

  return NextResponse.json({
    output: `[${format}] (${language}/${tone}) Discover ${product} designed for ${audience}. Experience trusted quality, fast delivery, and a premium customer journey with Sysnova AI powered campaigns.`,
    meta: { format, language, tone }
  });
}
