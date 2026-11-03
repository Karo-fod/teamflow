// Only allow same-site relative paths, so "?redirect=" can't be abused to
// send people to another website after login.
export function safeRedirect(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
