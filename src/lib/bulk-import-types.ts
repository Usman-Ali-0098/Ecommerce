// Name-matching helper shared by the CSV bulk-import pipeline's retry page
// (matches a failed row's saved category/color/size names against the
// current active options).
export function findByName<T extends { name: string }>(list: T[], name: string): T | undefined {
  const target = name.trim().toLowerCase();
  if (!target) return undefined;
  return list.find((item) => item.name.trim().toLowerCase() === target);
}
