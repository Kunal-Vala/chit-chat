import * as bcrypt from "bcryptjs";
import { getErrorMessage } from "./errorHelper";

export async function createHash(rawPassword: string): Promise<string> {
  try {
    console.log("[password.createHash] Creating password hash");

    const salt: string = await bcrypt.genSalt(10);
    const hash: string = await bcrypt.hash(rawPassword, salt);

    return hash;
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    throw new Error("Failed to hash password");
  }
}

export async function checkPassword(
  rawPassword: string,
  hash: string
): Promise<boolean> {
  try {
    console.log("[password.checkPassword] Checking password");

    const isMatch: boolean = await bcrypt.compare(rawPassword, hash);
    return isMatch;
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    throw new Error("Failed to verify password");
  }
}
