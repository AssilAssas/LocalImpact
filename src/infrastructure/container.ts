import { BcryptPasswordHasher } from "./auth/password";
import { JoseSessionAdapter } from "./auth/session";
import { prisma } from "./db/prisma";
import { PrismaReportRepository } from "./repositories/prisma-report-repository";
import { PrismaUserRepository } from "./repositories/prisma-user-repository";
import { LocalFileStorage } from "./storage/local-file-storage";

const users = new PrismaUserRepository(prisma);
const reports = new PrismaReportRepository(prisma);
const hasher = new BcryptPasswordHasher();
const session = new JoseSessionAdapter();
const storage = new LocalFileStorage();

export function getAppDeps() {
  return {
    prisma,
    users,
    reports,
    hasher,
    session,
    storage,
  };
}
