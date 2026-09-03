export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const path = value.trim();

  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(path)
  );
}

export function getSafeInternalPath(value: unknown, fallback = "/"): string {
  return isSafeInternalPath(value) ? value.trim() : fallback;
}
