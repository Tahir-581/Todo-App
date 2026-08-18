import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { labelSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const labels = await prisma.label.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(labels);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = labelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const label = await prisma.label.create({
      data: {
        name: parsed.data.name,
        color: parsed.data.color ?? "#6366F1",
        userId: session.user.id,
      },
    });
    return NextResponse.json(label);
  } catch {
    return NextResponse.json({ error: "Label may already exist" }, { status: 409 });
  }
}
