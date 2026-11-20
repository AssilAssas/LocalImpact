import bcrypt from "bcryptjs";
import type { PasswordHasherPort } from "@/application/ports";

export class BcryptPasswordHasher implements PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
