export function canonicalize(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : "null";
  }

  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((item) =>
        item === undefined || typeof item === "function" || typeof item === "symbol"
          ? "null"
          : canonicalize(item),
      )
      .join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined && typeof item !== "function" && typeof item !== "symbol")
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(",")}}`;
}
