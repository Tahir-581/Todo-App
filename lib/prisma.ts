import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** After `prisma generate`, an old singleton on globalThis can miss new model delegates (Next dev HMR). */
function isStaleDevClient(client: PrismaClient): boolean {
  const models = Prisma.dmmf.datamodel.models;
  const c = client as unknown as Record<string, unknown>;
  for (const m of models) {
    const key = m.name.charAt(0).toLowerCase() + m.name.slice(1);
    if (c[key] === undefined) return true;
  }
  return false;
}

function getPrisma(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (
    process.env.NODE_ENV !== "production" &&
    existing &&
    isStaleDevClient(existing)
  ) {
    void existing.$disconnect().catch(() => {});
    const fresh = createPrismaClient();
    globalForPrisma.prisma = fresh;
    return fresh;
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();
