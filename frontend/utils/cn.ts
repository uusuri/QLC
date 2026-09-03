export type ClassNameValue = string | false | null | undefined;

export function cn(...items: ClassNameValue[]) {
  return items.filter(Boolean).join(" ");
}
