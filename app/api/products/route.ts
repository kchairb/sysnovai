import { NextResponse } from "next/server";
import { catalogProducts } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({
    data: catalogProducts,
    total: catalogProducts.length
  });
}
