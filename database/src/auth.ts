import { createHash } from 'node:crypto';

const SALT = 'stratera-rd-2026';

export function hashPassword(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex');
}
