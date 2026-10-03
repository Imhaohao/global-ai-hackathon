const PLAUSIBLE_PHONE = /^\+?[0-9]{7,15}$/;

export function normalizePhone(typed: string): string {
  return typed.replace(/[\s-]/g, '');
}

export function isPlausiblePhone(typed: string): boolean {
  return PLAUSIBLE_PHONE.test(normalizePhone(typed));
}
