import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { generateAssignmentsForWindow } from "@/lib/scheduling/generate";

// Triggered daily by Vercel Cron (see vercel.json) to keep the rolling
// planning horizon populated without an admin having to visit /admin/settings.
// Vercel signs cron requests with this bearer token automatically when
// CRON_SECRET is set as an env var; without it, this route rejects every
// request (fails closed, not open).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const companies = await prisma.company.findMany({ select: { id: true } });
  const results = await Promise.all(
    companies.map((company) => generateAssignmentsForWindow(company.id))
  );

  return NextResponse.json({
    companies: companies.length,
    created: results.reduce((sum, r) => sum + r.created, 0),
  });
}
