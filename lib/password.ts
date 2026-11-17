import { isValidNewPasswordValue } from "./password-rules.ts";

export const BCRYPT_PASSWORD_COST = 10;

export function isValidNewPassword(password: string) {
    return isValidNewPasswordValue(password);
}