"use client";

import React, { useMemo, useState } from "react";
import {
  Shield,
  KeyRound,
  Upload,
  Download,
  RefreshCw,
  Lock,
  Unlock,
  Trash2,
  FileUp,
  NotebookPen,
  Layers,
  Search,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import BasicLoader from "../loaders/basic-loader";
import {
  createSignedEnvelope,
  decryptSecret,
  downloadBundle,
  encryptSecret,
  generateVaultKeyBundle,
  getBatchCreatePayload,
  getCreatePayload,
  getDeletePayload,
  getListPayload,
  getRegisterPayload,
  importVaultBundle,
  parseVaultBundleFromFileText,
  type ImportedVaultKeys,
  type VaultKeyBundle,
} from "@/lib/vault/client";
import { parseDotEnv, type EnvParseIssue, type ParsedEnvEntry } from "@/lib/vault/env-parser";
import { SECRET_TEMPLATES } from "@/lib/vault/templates";
import { cn } from "@/lib/utils";

type VaultSecret = {
  secretId: string;
  title: string;
  project?: string;
  entryType?: "secret" | "note";
  contentKind?: "secret" | "note" | "env";
  keyName?: string;
  encryptedSymmetricKey: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
  updatedAt: string;
  decryptedText?: string;
  decryptError?: string;
};

type SecureKeyGeneratorProps = {
  view?: "home" | "keys" | "vault";
};

type FeedbackTone = "info" | "success" | "error";

type RegisterResponse = {
  status: boolean;
  reason?: string;
};

type WorkflowMode = "create" | "access";
type EntryFilter = "all" | "secret" | "env" | "note";

type ParsedRow = ParsedEnvEntry & {
  selected: boolean;
  editableKey: string;
};

type DecryptedNotePayload = {
  kind?: string;
  title?: string;
  description?: string;
};

type DecryptedEnvPayload = {
  kind?: string;
  format?: string;
  content?: string;
};

const SIMPLE_DOTENV_VALUE = /^[A-Za-z0-9_./:@-]+$/;
const LEGACY_ENV_PATTERN = /(^|\W)(\.?env|dotenv)(\W|$)/i;

const formatDotEnvValue = (value: string) => {
  if (value.length === 0) {
    return "";
  }

  if (SIMPLE_DOTENV_VALUE.test(value)) {
    return value;
  }

  const escaped = value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
  return `"${escaped}"`;
};

const buildDotEnvPayload = (rows: ParsedRow[]) => {
  return rows
    .filter((row) => row.selected && row.editableKey.trim())
    .map((row) => `${row.editableKey.trim()}=${formatDotEnvValue(row.value)}`)
    .join("\n");
};

const VIEW_COPY = {
  home: {
    title: "Set up your vault in minutes",
    subtitle: "Create or import your key bundle, then start storing encrypted secrets.",
  },
  keys: {
    title: "Manage encryption keys",
    subtitle: "Generate, back up, and import your private key bundle.",
  },
  vault: {
    title: "Store and retrieve secrets",
    subtitle: "Write secrets, bulk import env files, save notes, and decrypt locally.",
  },
} as const;

const statusClasses: Record<FeedbackTone, string> = {
  info: "border-black/10 bg-muted/60 text-foreground",
  success: "border-black/10 bg-black text-white",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
};

const formatFingerprint = (fingerprint?: string) => {
  if (!fingerprint) return "No key loaded";
  return fingerprint.match(/.{1,8}/g)?.join(" ") ?? fingerprint;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const tryParseDecryptedNote = (decryptedText?: string): DecryptedNotePayload | null => {
  if (!decryptedText) {
    return null;
  }

  try {
    const parsed = JSON.parse(decryptedText) as DecryptedNotePayload;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (parsed.kind !== "note") {
      return null;
    }

    if (typeof parsed.title !== "string" && typeof parsed.description !== "string") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const tryParseDecryptedEnv = (decryptedText?: string): DecryptedEnvPayload | null => {
  if (!decryptedText) {
    return null;
  }

  try {
    const parsed = JSON.parse(decryptedText) as DecryptedEnvPayload;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (parsed.kind !== "env" || parsed.format !== "dotenv" || typeof parsed.content !== "string") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const resolveContentKind = (note: VaultSecret): "secret" | "note" | "env" => {
  if (note.contentKind) {
    return note.contentKind;
  }

  if (note.entryType === "secret") {
    return "secret";
  }

  if (LEGACY_ENV_PATTERN.test(`${note.title} ${note.keyName || ""}`)) {
    return "env";
  }

  return "note";
};

const SecureKeyGenerator = ({ view = "home" }: SecureKeyGeneratorProps) => {
  const [bundle, setBundle] = useState<VaultKeyBundle | null>(null);
  const [importedKeys, setImportedKeys] = useState<ImportedVaultKeys | null>(null);
  const [title, setTitle] = useState("");
  const [secretText, setSecretText] = useState("");
  const [projectInput, setProjectInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [entryFilter, setEntryFilter] = useState<EntryFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [notes, setNotes] = useState<VaultSecret[]>([]);
  const [busy, setBusy] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [importPassphrase, setImportPassphrase] = useState("");
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string } | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowMode>(view === "vault" ? "access" : "create");
  const [envText, setEnvText] = useState("");
  const [strictParse, setStrictParse] = useState(false);
  const [envIssues, setEnvIssues] = useState<EnvParseIssue[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [envNoteTitle, setEnvNoteTitle] = useState(".env");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [decrypting, setDecrypting] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const canUseVault = useMemo(() => Boolean(importedKeys), [importedKeys]);

  const groupedNotes = useMemo(() => {
    return notes.reduce<Record<string, VaultSecret[]>>((acc, item) => {
      const key = item.project?.trim() || "Unassigned";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }, [notes]);

  const totalPages = useMemo(() => {
    if (totalCount === 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  const projectOptions = useMemo(() => {
    const uniqueProjects = new Set<string>();
    for (const item of notes) {
      const normalized = item.project?.trim();
      if (normalized) {
        uniqueProjects.add(normalized);
      }
    }

    return Array.from(uniqueProjects).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const setStatus = (tone: FeedbackTone, text: string) => {
    setFeedback({ tone, text });
  };

  const isAlreadyRegistered = (reason?: string) => {
    return Boolean(reason && /already|exists|registered/i.test(reason));
  };

  const callApi = async <TPayload extends object, TResponse>(
    action: "register" | "create-secret" | "create-secrets-batch" | "list-secrets" | "delete-secret",
    payload: TPayload,
  ): Promise<TResponse> => {
    if (!importedKeys) {
      throw new Error("Import a private key bundle first.");
    }

    const envelope = await createSignedEnvelope(action, payload, importedKeys);
    let endpoint = "/api/vault/register";
    if (action === "create-secret") endpoint = "/api/vault/secrets";
    if (action === "create-secrets-batch") endpoint = "/api/vault/secrets/batch";
    if (action === "list-secrets") endpoint = "/api/vault/secrets/list";
    if (action === "delete-secret") endpoint = "/api/vault/secrets/delete";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}).`);
    }

    return response.json();
  };

  const generateKeyBundle = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const nextBundle = await generateVaultKeyBundle();
      const imported = await importVaultBundle(nextBundle);
      setBundle(nextBundle);
      setImportedKeys(imported);
      setIdentityReady(false);
      setStatus("success", "New key bundle created in this browser.");
    } catch {
      setStatus("error", "Failed to generate a key bundle.");
    } finally {
      setBusy(false);
    }
  };

  const onDownloadBundle = async () => {
    if (!bundle) {
      setStatus("error", "Generate or import a bundle first.");
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      await downloadBundle(bundle, exportPassphrase);
      setStatus("success", "Encrypted bundle downloaded. Keep the file and passphrase safe.");
    } catch (error) {
      if (error instanceof Error) {
        setStatus("error", error.message);
      } else {
        setStatus("error", "Could not download the encrypted bundle.");
      }
    } finally {
      setBusy(false);
    }
  };

  const importBundleFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setFeedback(null);
    try {
      const text = await file.text();
      const parsed = await parseVaultBundleFromFileText(text, importPassphrase);
      const imported = await importVaultBundle(parsed);
      setBundle(parsed);
      setImportedKeys(imported);
      setIdentityReady(false);
      setStatus("success", "Bundle imported locally. You are ready to activate your key.");
    } catch (error) {
      if (error instanceof Error) {
        setStatus("error", error.message);
      } else {
        setStatus("error", "Could not import this bundle.");
      }
    } finally {
      setBusy(false);
    }
  };

  const registerIdentity = async (manual = true): Promise<boolean> => {
    if (!importedKeys) {
      if (manual) setStatus("error", "Import a key bundle first.");
      return false;
    }

    if (identityReady) {
      if (manual) setStatus("success", "Key is already activated.");
      return true;
    }

    const payload = getRegisterPayload(importedKeys);
    try {
      const result = await callApi<typeof payload, RegisterResponse>("register", payload);
      if (result.status || isAlreadyRegistered(result.reason)) {
        setIdentityReady(true);
        if (manual) setStatus("success", "Key activated and ready.");
        return true;
      }

      if (manual) setStatus("error", result.reason || "Activation failed.");
      return false;
    } catch {
      if (manual) setStatus("error", "Activation request failed.");
      return false;
    }
  };

  const ensureIdentityReady = async () => {
    if (!canUseVault) {
      setStatus("error", "Import a key bundle first.");
      return false;
    }

    if (identityReady) {
      return true;
    }

    setStatus("info", "Activating your key...");
    const ok = await registerIdentity(false);
    if (!ok) {
      setStatus("error", "Could not activate key. Try Activate Key and retry.");
      return false;
    }

    return true;
  };

  const loadSecrets = async (requestedPage = page) => {
    const ready = await ensureIdentityReady();
    if (!ready) return;

    setListBusy(true);
    setFeedback(null);
    try {
      const normalizedFilter = entryFilter === "all" ? "all" : entryFilter;
      const entryType = normalizedFilter === "env" ? "note" : normalizedFilter;
      const payload = getListPayload({
        includeCiphertext: true,
        project: projectFilter.trim() || undefined,
        entryType,
        contentKind: normalizedFilter,
        search: search.trim() || undefined,
        page: requestedPage,
        pageSize,
      });
      const result = await callApi<
        typeof payload,
        {
          status: boolean;
          reason?: string;
          secrets?: VaultSecret[];
          total?: number;
          page?: number;
          pageSize?: number;
        }
      >("list-secrets", payload);

      if (!result.status) {
        setStatus("error", result.reason || "Could not load secrets.");
        return;
      }

      setNotes(result.secrets || []);
      setTotalCount(result.total || 0);
      setPage(result.page || requestedPage);
      setStatus("success", `Loaded ${(result.secrets || []).length} encrypted secrets.`);
    } catch {
      setStatus("error", "Failed to load secrets.");
    } finally {
      setListBusy(false);
    }
  };

  const saveSecret = async () => {
    const ready = await ensureIdentityReady();
    if (!ready) return;

    if (!projectInput.trim()) {
      setStatus("error", "Project is required.");
      return;
    }

    if (!title.trim() || !secretText.trim()) {
      setStatus("error", "Title and secret text are required.");
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const encrypted = await encryptSecret(secretText, importedKeys!.encryptionPublicKey);
      const payload = getCreatePayload({
        secretId: crypto.randomUUID(),
        title: title.trim(),
        project: projectInput.trim(),
        entryType: "secret",
        contentKind: "secret",
        keyName: title.trim(),
        encryptedSymmetricKey: encrypted.encryptedSymmetricKey,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
      });

      const result = await callApi<typeof payload, { status: boolean; reason?: string }>("create-secret", payload);

      if (!result.status) {
        setStatus("error", result.reason || "Could not save secret.");
        return;
      }

      setTitle("");
      setSecretText("");
      setStatus("success", "Secret encrypted in this browser and stored as ciphertext.");
    } catch {
      setStatus("error", "Failed to encrypt and store secret.");
    } finally {
      setBusy(false);
    }
  };

  const parseEnvDraft = () => {
    const result = parseDotEnv(envText, strictParse);
    setEnvIssues(result.issues);
    setParsedRows(
      result.entries.map((entry) => ({
        ...entry,
        selected: true,
        editableKey: entry.key,
      })),
    );

    if (result.entries.length === 0 && result.issues.length > 0) {
      setStatus("error", "No valid env entries parsed.");
      return;
    }

    setStatus("success", `Parsed ${result.entries.length} entries from .env.`);
  };

  const applyTemplate = () => {
    const template = SECRET_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    setParsedRows(
      template.keys.map((key, idx) => ({
        key,
        editableKey: key,
        value: "",
        line: idx + 1,
        selected: true,
      })),
    );
    setEnvIssues([]);
    setStatus("success", `${template.label} template loaded.`);
  };

  const saveParsedRows = async () => {
    const ready = await ensureIdentityReady();
    if (!ready) return;

    if (!projectInput.trim()) {
      setStatus("error", "Project is required for bulk save.");
      return;
    }

    const selected = parsedRows.filter((row) => row.selected && row.editableKey.trim());
    if (selected.length === 0) {
      setStatus("error", "Select at least one row to save.");
      return;
    }

    setBatchBusy(true);
    setFeedback(null);
    try {
      const records: ReturnType<typeof getCreatePayload>[] = [];
      for (const row of selected) {
        // Encrypting row-by-row avoids large memory spikes in browsers.
        const encrypted = await encryptSecret(row.value, importedKeys!.encryptionPublicKey);
        records.push(
          getCreatePayload({
            secretId: crypto.randomUUID(),
            title: row.editableKey.trim(),
            project: projectInput.trim(),
            entryType: "secret",
            contentKind: "secret",
            keyName: row.editableKey.trim(),
            encryptedSymmetricKey: encrypted.encryptedSymmetricKey,
            iv: encrypted.iv,
            ciphertext: encrypted.ciphertext,
          }),
        );
      }

      const payload = getBatchCreatePayload(records);
      const result = await callApi<typeof payload, { status: boolean; reason?: string; count?: number }>(
        "create-secrets-batch",
        payload,
      );

      if (!result.status) {
        setStatus("error", result.reason || "Could not save batch.");
        return;
      }

      setStatus("success", `Saved ${result.count || records.length} encrypted entries.`);
      await loadSecrets(1);
    } catch {
      setStatus("error", "Failed to save parsed rows.");
    } finally {
      setBatchBusy(false);
    }
  };

  const saveEnvNote = async () => {
    const ready = await ensureIdentityReady();
    if (!ready) return;

    if (!projectInput.trim()) {
      setStatus("error", "Project is required for .env notes.");
      return;
    }

    if (!envNoteTitle.trim()) {
      setStatus("error", "A title is required for .env notes.");
      return;
    }

    const dotenvContent = buildDotEnvPayload(parsedRows);
    if (!dotenvContent) {
      setStatus("error", "Select at least one valid .env row to save.");
      return;
    }

    setBatchBusy(true);
    setFeedback(null);
    try {
      const payloadText = JSON.stringify({
        kind: "env",
        format: "dotenv",
        content: dotenvContent,
      });

      const encrypted = await encryptSecret(payloadText, importedKeys!.encryptionPublicKey);
      const payload = getCreatePayload({
        secretId: crypto.randomUUID(),
        title: envNoteTitle.trim(),
        project: projectInput.trim(),
        entryType: "note",
        contentKind: "env",
        keyName: envNoteTitle.trim(),
        encryptedSymmetricKey: encrypted.encryptedSymmetricKey,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
      });

      const result = await callApi<typeof payload, { status: boolean; reason?: string }>("create-secret", payload);

      if (!result.status) {
        setStatus("error", result.reason || "Could not save .env note.");
        return;
      }

      setStatus("success", "Saved encrypted .env note as a single payload.");
      await loadSecrets(1);
    } catch {
      setStatus("error", "Failed to save .env note.");
    } finally {
      setBatchBusy(false);
    }
  };

  const saveNote = async () => {
    const ready = await ensureIdentityReady();
    if (!ready) return;

    if (!projectInput.trim()) {
      setStatus("error", "Project is required for notes.");
      return;
    }

    if (!noteTitle.trim() || !noteDescription.trim()) {
      setStatus("error", "Note title and description are required.");
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const payloadText = JSON.stringify({
        kind: "note",
        title: noteTitle.trim(),
        description: noteDescription.trim(),
      });
      const encrypted = await encryptSecret(payloadText, importedKeys!.encryptionPublicKey);
      const payload = getCreatePayload({
        secretId: crypto.randomUUID(),
        title: noteTitle.trim(),
        project: projectInput.trim(),
        entryType: "note",
        contentKind: "note",
        keyName: noteTitle.trim(),
        encryptedSymmetricKey: encrypted.encryptedSymmetricKey,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
      });

      const result = await callApi<typeof payload, { status: boolean; reason?: string }>("create-secret", payload);
      if (!result.status) {
        setStatus("error", result.reason || "Could not save note.");
        return;
      }

      setNoteTitle("");
      setNoteDescription("");
      setStatus("success", "Encrypted note saved.");
    } catch {
      setStatus("error", "Failed to save note.");
    } finally {
      setBusy(false);
    }
  };

  const decryptOne = async (note: VaultSecret) => {
    if (!importedKeys) {
      setStatus("error", "Import a key bundle first.");
      return;
    }

    setDecrypting((prev) => ({ ...prev, [note.secretId]: true }));
    try {
      const plaintext = await decryptSecret(
        {
          encryptedSymmetricKey: note.encryptedSymmetricKey,
          iv: note.iv,
          ciphertext: note.ciphertext,
        },
        importedKeys.encryptionPrivateKey,
      );

      setNotes((prev) =>
        prev.map((item) =>
          item.secretId === note.secretId
            ? { ...item, decryptedText: plaintext, decryptError: undefined }
            : item,
        ),
      );
    } catch {
      setNotes((prev) =>
        prev.map((item) =>
          item.secretId === note.secretId
            ? { ...item, decryptedText: undefined, decryptError: "Unable to decrypt with this key." }
            : item,
        ),
      );
    } finally {
      setDecrypting((prev) => {
        const next = { ...prev };
        delete next[note.secretId];
        return next;
      });
    }
  };

  const decryptVisible = async () => {
    for (const note of notes) {
      if (!note.decryptedText) {
        await decryptOne(note);
      }
    }
  };

  const deleteOne = async (secretId: string) => {
    const ready = await ensureIdentityReady();
    if (!ready) return;

    const shouldDelete = window.confirm("Delete this encrypted secret? This cannot be undone.");
    if (!shouldDelete) return;

    setDeleting((prev) => ({ ...prev, [secretId]: true }));
    setFeedback(null);
    try {
      const payload = getDeletePayload(secretId);
      const result = await callApi<typeof payload, { status: boolean; reason?: string }>("delete-secret", payload);

      if (!result.status) {
        setStatus("error", result.reason || "Delete failed.");
        return;
      }

      setNotes((prev) => prev.filter((item) => item.secretId !== secretId));
      setStatus("success", "Secret deleted.");
    } catch {
      setStatus("error", "Delete request failed.");
    } finally {
      setDeleting((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
    }
  };

  const copyFingerprint = async () => {
    if (!importedKeys?.fingerprint) return;

    try {
      await navigator.clipboard.writeText(importedKeys.fingerprint);
      setStatus("success", "Fingerprint copied.");
    } catch {
      setStatus("error", "Could not copy fingerprint.");
    }
  };

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("success", successMessage);
    } catch {
      setStatus("error", "Could not copy to clipboard.");
    }
  };

  const pageCopy = VIEW_COPY[view];
  const showOnboarding = view === "home";
  const showVaultOps = view !== "keys";
  const showCreatePath = workflow === "create";
  const showAccessPath = workflow === "access";

  return (
    <div className="flex w-full flex-col gap-6">
      <Card className="animate-rise overflow-hidden border-black/10 bg-white/80 shadow-[0_8px_28px_-18px_rgba(0,0,0,0.35)] sm:shadow-[0_12px_50px_-30px_rgba(0,0,0,0.55)]">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Zero-account encrypted storage</p>
            <div
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                canUseVault ? "border-black/15 bg-black text-white" : "border-black/10 bg-muted text-muted-foreground",
              )}
            >
              {canUseVault ? "Key loaded" : "No key loaded"}
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl">{pageCopy.title}</CardTitle>
          <CardDescription className="max-w-2xl text-sm sm:text-base">{pageCopy.subtitle}</CardDescription>
        </CardHeader>
      </Card>

      {showOnboarding && (
        <Card className="animate-rise border-black/10 bg-white/70">
          <CardHeader>
            <CardTitle>Quick path</CardTitle>
            <CardDescription>Keep this simple: generate or import your key, then save your first secret.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-black/10 bg-background/80 p-4">
              <p className="font-medium text-foreground">1. Prepare your key</p>
              <p className="mt-1">Generate a new bundle or import one you already use.</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-background/80 p-4">
              <p className="font-medium text-foreground">2. Back it up safely</p>
              <p className="mt-1">Download your encrypted bundle and store passphrase separately.</p>
            </div>
            <div className="rounded-lg border border-black/10 bg-background/80 p-4">
              <p className="font-medium text-foreground">3. Save and retrieve</p>
              <p className="mt-1">Secrets are encrypted locally before upload. Server stores ciphertext only.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {showVaultOps && (
        <Card className="animate-rise border-black/10 bg-white/70">
          <CardHeader>
            <CardTitle>Choose your path</CardTitle>
            <CardDescription>You can always add with an active key. Use these paths to focus on setup or return access.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setWorkflow("create")}
              className={cn(
                "rounded-lg border p-4 text-left transition-all",
                showCreatePath
                  ? "border-black/20 bg-black text-white"
                  : "border-black/10 bg-background/70 text-foreground hover:border-black/20",
              )}
            >
              <p className="text-sm font-semibold">Create New Vault</p>
              <p className={cn("mt-1 text-xs", showCreatePath ? "text-white/80" : "text-muted-foreground")}>
                Generate a new key and save secrets.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setWorkflow("access")}
              className={cn(
                "rounded-lg border p-4 text-left transition-all",
                showAccessPath
                  ? "border-black/20 bg-black text-white"
                  : "border-black/10 bg-background/70 text-foreground hover:border-black/20",
              )}
            >
              <p className="text-sm font-semibold">Return to Vault</p>
              <p className={cn("mt-1 text-xs", showAccessPath ? "text-white/80" : "text-muted-foreground")}>
                Import your key, load entries, and add more.
              </p>
            </button>
          </CardContent>
        </Card>
      )}

      <Card className="animate-rise border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle>{showCreatePath ? "New vault setup" : "Return with existing key"}</CardTitle>
          <CardDescription>
            Your private key never leaves this browser. Losing your bundle and passphrase means permanent data loss.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCreatePath && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button onClick={generateKeyBundle} disabled={busy} className="w-full sm:w-auto">
                  <KeyRound />
                  Generate Key
                </Button>
                <Button onClick={onDownloadBundle} variant="secondary" disabled={!bundle || busy} className="w-full sm:w-auto">
                  <Download />
                  Download Bundle
                </Button>
                <Button onClick={() => void registerIdentity(true)} variant="outline" disabled={!canUseVault || busy} className="w-full sm:w-auto">
                  <Shield />
                  Activate Key
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="export-passphrase">Backup passphrase</Label>
                <Input
                  id="export-passphrase"
                  type="password"
                  value={exportPassphrase}
                  onChange={(event) => setExportPassphrase(event.target.value)}
                  placeholder="At least 10 characters"
                />
              </div>
            </>
          )}

          {showAccessPath && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button onClick={() => void registerIdentity(true)} variant="outline" disabled={!canUseVault || busy} className="w-full sm:w-auto">
                  <Shield />
                  Activate Key
                </Button>
                {showVaultOps && (
                  <Button onClick={() => void loadSecrets(1)} variant="outline" disabled={!canUseVault || listBusy} className="w-full sm:w-auto">
                    <RefreshCw />
                    Load Secrets
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-passphrase">Unlock passphrase</Label>
                <Input
                  id="import-passphrase"
                  type="password"
                  value={importPassphrase}
                  onChange={(event) => setImportPassphrase(event.target.value)}
                  placeholder="Passphrase used to encrypt your bundle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bundle">Import encrypted bundle</Label>
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="bundle"
                    type="file"
                    accept="application/json"
                    onChange={importBundleFromFile}
                    className="w-full max-w-full sm:max-w-lg"
                  />
                  <div className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                    <Upload className="h-3.5 w-3.5" />
                    JSON bundle only
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2 rounded-lg border border-black/10 bg-background/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Fingerprint</p>
              <Button size="sm" variant="ghost" onClick={() => void copyFingerprint()} disabled={!importedKeys?.fingerprint}>
                Copy
              </Button>
            </div>
            <p className="font-mono break-all text-xs text-foreground">{formatFingerprint(importedKeys?.fingerprint)}</p>
            <p className="text-xs text-muted-foreground">This key id helps confirm you loaded the right bundle.</p>
          </div>

          {feedback && (
            <div className={cn("animate-rise rounded-lg border px-3 py-3 text-sm sm:px-4", statusClasses[feedback.tone])}>
              {feedback.text}
            </div>
          )}
        </CardContent>
      </Card>

      {showVaultOps && (showCreatePath || canUseVault) && (
        <Card className="animate-rise border-black/10 bg-white/70">
          <CardHeader>
            <CardTitle>Create secret</CardTitle>
            <CardDescription>All content below is encrypted in-browser before upload.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Input
                id="project"
                value={projectInput}
                onChange={(event) => setProjectInput(event.target.value)}
                placeholder="Example: payments-api"
              />
            </div>

            <div className="space-y-2 rounded-lg border border-black/10 bg-background/70 p-4">
              <p className="text-sm font-semibold">Single secret</p>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Production API key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret">Secret content</Label>
                <Textarea
                  id="secret"
                  value={secretText}
                  onChange={(event) => setSecretText(event.target.value)}
                  placeholder="Write your secret content here"
                />
              </div>
              <Button onClick={() => void saveSecret()} disabled={!canUseVault || busy} className="w-full sm:w-auto">
                <Lock />
                Save and Encrypt
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border border-black/10 bg-background/70 p-4">
              <div className="flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                <p className="text-sm font-semibold">Bulk import from .env</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="env-draft">Paste .env content</Label>
                <Textarea
                  id="env-draft"
                  value={envText}
                  onChange={(event) => setEnvText(event.target.value)}
                  placeholder="DB_URL=...&#10;API_KEY=..."
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={strictParse}
                  onChange={(event) => setStrictParse(event.target.checked)}
                />
                Strict mode (fail all if any line is invalid)
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={parseEnvDraft}>
                  Parse .env
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="template">Template starter</Label>
                  <select
                    id="template"
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select template</option>
                    {SECRET_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="outline" onClick={applyTemplate} disabled={!templateId}>
                  <Layers />
                  Apply Template
                </Button>
              </div>

              {envIssues.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {envIssues.slice(0, 6).map((issue) => (
                    <p key={`${issue.line}-${issue.reason}`}>Line {issue.line}: {issue.reason}</p>
                  ))}
                  {envIssues.length > 6 && <p>+ {envIssues.length - 6} more issues</p>}
                </div>
              )}

              {parsedRows.length > 0 && (
                <div className="space-y-2 rounded-md border border-black/10 bg-background/90 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    Preview ({parsedRows.length})
                  </p>
                  {parsedRows.map((row, idx) => (
                    <div key={`${row.line}-${idx}`} className="grid grid-cols-[auto_1fr] gap-2 sm:grid-cols-[auto_1fr_2fr]">
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(event) =>
                            setParsedRows((prev) =>
                              prev.map((item, itemIdx) =>
                                itemIdx === idx ? { ...item, selected: event.target.checked } : item,
                              ),
                            )
                          }
                        />
                        L{row.line}
                      </label>
                      <Input
                        value={row.editableKey}
                        onChange={(event) =>
                          setParsedRows((prev) =>
                            prev.map((item, itemIdx) =>
                              itemIdx === idx ? { ...item, editableKey: event.target.value } : item,
                            ),
                          )
                        }
                      />
                      <Input value={row.value} readOnly className="hidden sm:block" />
                    </div>
                  ))}

                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="env-note-title">.env note title</Label>
                      <Input
                        id="env-note-title"
                        value={envNoteTitle}
                        onChange={(event) => setEnvNoteTitle(event.target.value)}
                        placeholder=".env"
                      />
                    </div>
                    <Button type="button" onClick={() => void saveParsedRows()} disabled={!canUseVault || batchBusy}>
                      <Lock />
                      {batchBusy ? "Saving..." : "Save Selected"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void saveEnvNote()} disabled={!canUseVault || batchBusy}>
                      <NotebookPen />
                      Save as .env Note
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-black/10 bg-background/70 p-4">
              <div className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4" />
                <p className="text-sm font-semibold">Encrypted note</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-title">Title</Label>
                <Input
                  id="note-title"
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                  placeholder="Deployment notes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-description">Description</Label>
                <Textarea
                  id="note-description"
                  value={noteDescription}
                  onChange={(event) => setNoteDescription(event.target.value)}
                  placeholder="Write note details here"
                />
              </div>
              <Button type="button" onClick={() => void saveNote()} disabled={!canUseVault || busy}>
                <Lock />
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showVaultOps && showAccessPath && (
        <Card className="animate-rise border-black/10 bg-white/70">
          <CardHeader>
            <CardTitle>Encrypted entries</CardTitle>
            <CardDescription>Load entries, filter by project/type, and decrypt locally when needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="project-filter">Project</Label>
                <select
                  id="project-filter"
                  value={projectFilter}
                  onChange={(event) => setProjectFilter(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">All projects</option>
                  {projectOptions.map((projectOption) => (
                    <option key={projectOption} value={projectOption}>
                      {projectOption}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-filter">Search</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-filter"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-8"
                    placeholder="Title/key/project"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-type">Type</Label>
                <select
                  id="entry-type"
                  value={entryFilter}
                  onChange={(event) => setEntryFilter(event.target.value as EntryFilter)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All</option>
                  <option value="secret">.env Variables / Secrets</option>
                  <option value="env">.env Notes</option>
                  <option value="note">Encrypted Notes</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button type="button" variant="outline" onClick={() => void loadSecrets(1)} disabled={!canUseVault || listBusy}>
                  <RefreshCw />
                  Reload
                </Button>
                <Button type="button" variant="outline" onClick={() => void decryptVisible()} disabled={!canUseVault || listBusy}>
                  <Unlock />
                  Decrypt Visible
                </Button>
              </div>
            </div>

            {listBusy && (
              <div className="flex justify-center rounded-md border border-black/10 bg-background/70">
                <BasicLoader width="60px" height="60px" />
              </div>
            )}

            {notes.length === 0 && !listBusy && (
              <Alert>
                <AlertTitle>No entries loaded</AlertTitle>
                <AlertDescription>Use Load Secrets or Reload to fetch encrypted entries for this key.</AlertDescription>
              </Alert>
            )}

            {Object.entries(groupedNotes).map(([group, groupItems]) => {
              const expanded = expandedGroups[group] ?? true;
              return (
                <div key={group} className="rounded-lg border border-black/10 bg-background/70 p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedGroups((prev) => ({ ...prev, [group]: !expanded }))}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-sm font-semibold">{group}</span>
                    <span className="text-xs text-muted-foreground">{groupItems.length} items</span>
                  </button>

                  {expanded && (
                    <div className="mt-3 space-y-3">
                      {groupItems.map((note) => (
                        <div key={note.secretId} className="space-y-3 rounded-lg border border-black/10 bg-background/80 p-4">
                          {/** Resolve legacy entries so env/notes/secrets are labeled consistently. */}
                          {(() => {
                            const contentKind = resolveContentKind(note);
                            const kindLabel = contentKind === "env" ? ".env note" : contentKind;

                            return (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{note.title}</p>
                                <span className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                                  {kindLabel}
                                </span>
                              </div>
                              <p className="break-all text-xs text-muted-foreground">{note.secretId}</p>
                              <p className="text-xs text-muted-foreground">
                                Created {formatDate(note.createdAt)} | Updated {formatDate(note.updatedAt)}
                              </p>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void decryptOne(note)}
                                disabled={!canUseVault || Boolean(decrypting[note.secretId])}
                                className="w-full sm:w-auto"
                              >
                                <Unlock />
                                {decrypting[note.secretId] ? "Decrypting..." : "Read"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => void deleteOne(note.secretId)}
                                disabled={!canUseVault || Boolean(deleting[note.secretId])}
                                className="w-full sm:w-auto"
                              >
                                <Trash2 />
                                {deleting[note.secretId] ? "Deleting..." : "Delete"}
                              </Button>
                            </div>
                          </div>
                            );
                          })()}

                          {note.decryptedText && (
                            (() => {
                              const parsedNote = note.entryType === "note" ? tryParseDecryptedNote(note.decryptedText) : null;
                              const parsedEnv = note.entryType === "note" ? tryParseDecryptedEnv(note.decryptedText) : null;

                              if (parsedEnv) {
                                return (
                                  <div className="space-y-2 rounded-md border border-black/10 bg-muted/50 p-3 text-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="font-medium text-foreground">.env payload</p>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => void copyText(parsedEnv.content || "", "Copied .env payload.")}
                                      >
                                        Copy .env
                                      </Button>
                                    </div>
                                    <Textarea value={parsedEnv.content || ""} readOnly className="min-h-36 font-mono text-xs" />
                                  </div>
                                );
                              }

                              if (parsedNote) {
                                return (
                                  <div className="rounded-md border border-black/10 bg-muted/50 p-3 text-sm">
                                    <p className="font-medium text-foreground">{parsedNote.title || note.title}</p>
                                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                                      {parsedNote.description || "No note description provided."}
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <div className="whitespace-pre-wrap rounded-md border border-black/10 bg-muted/50 p-3 text-sm">
                                  {note.decryptedText}
                                </div>
                              );
                            })()
                          )}
                          {note.decryptError && <p className="text-sm text-destructive">{note.decryptError}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-black/10 bg-background/70 p-3 text-xs">
              <p className="text-muted-foreground">
                Total {totalCount} items | Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || listBusy}
                  onClick={() => {
                    const next = Math.max(1, page - 1);
                    void loadSecrets(next);
                  }}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || listBusy}
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    void loadSecrets(next);
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SecureKeyGenerator;
