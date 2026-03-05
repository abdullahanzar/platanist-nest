export type ParsedEnvEntry = {
  key: string;
  value: string;
  line: number;
};

export type EnvParseIssue = {
  line: number;
  reason: string;
  content: string;
};

export type ParseEnvResult = {
  entries: ParsedEnvEntry[];
  issues: EnvParseIssue[];
};

const KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isQuoted(value: string): boolean {
  return (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  );
}

function unquote(value: string): string {
  if (!isQuoted(value)) {
    return value;
  }

  const quote = value[0];
  const core = value.slice(1, -1);
  if (quote === "'") {
    return core;
  }

  return core
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function stripInlineComment(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (isQuoted(trimmed)) {
    return trimmed;
  }

  const hashIndex = rawValue.indexOf("#");
  if (hashIndex === -1) {
    return rawValue.trim();
  }

  return rawValue.slice(0, hashIndex).trim();
}

function startsMultiline(value: string): boolean {
  if (!value.startsWith('"')) {
    return false;
  }

  let escaped = false;
  for (let i = 1; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === "\\" && !escaped) {
      escaped = true;
      continue;
    }

    if (ch === '"' && !escaped) {
      return false;
    }

    escaped = false;
  }

  return true;
}

function closesQuote(line: string): boolean {
  let escaped = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\\" && !escaped) {
      escaped = true;
      continue;
    }

    if (ch === '"' && !escaped) {
      return true;
    }

    escaped = false;
  }

  return false;
}

export function parseDotEnv(input: string, strict: boolean): ParseEnvResult {
  const entries: ParsedEnvEntry[] = [];
  const issues: EnvParseIssue[] = [];

  const lines = input.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const displayLine = i + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      i += 1;
      continue;
    }

    const withoutExport = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const equalIndex = withoutExport.indexOf("=");
    if (equalIndex === -1) {
      issues.push({ line: displayLine, reason: "Missing '=' separator", content: rawLine });
      i += 1;
      continue;
    }

    const key = withoutExport.slice(0, equalIndex).trim();
    let valuePart = withoutExport.slice(equalIndex + 1);

    if (!KEY_REGEX.test(key)) {
      issues.push({ line: displayLine, reason: "Invalid key name", content: rawLine });
      i += 1;
      continue;
    }

    if (startsMultiline(valuePart.trim())) {
      let combined = valuePart;
      let foundClose = closesQuote(valuePart.trim().slice(1));
      let j = i + 1;
      while (!foundClose && j < lines.length) {
        combined += `\n${lines[j]}`;
        foundClose = closesQuote(lines[j]);
        j += 1;
      }

      if (!foundClose) {
        issues.push({ line: displayLine, reason: "Unterminated multiline quoted value", content: rawLine });
        i = j;
        continue;
      }

      valuePart = combined;
      i = j;
    } else {
      i += 1;
    }

    const candidate = stripInlineComment(valuePart);
    const value = unquote(candidate.trim());
    entries.push({ key, value, line: displayLine });
  }

  if (strict && issues.length > 0) {
    return { entries: [], issues };
  }

  return { entries, issues };
}
