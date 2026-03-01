import Link from "next/link";
import { Shield, TriangleAlert, LockKeyhole, ArrowRight, Github } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const guarantees = [
  "Private key material stays in the browser and is never intentionally uploaded.",
  "Secret plaintext is encrypted locally before upload.",
  "Server stores ciphertext, encrypted symmetric key, iv, and metadata only.",
  "Requests are signed and include fingerprint + nonce + timestamp.",
  "Replay and stale request attempts are rejected server-side.",
];

const weaknesses = [
  {
    title: "Key loss is irreversible",
    detail:
      "If the user loses both encrypted bundle and passphrase, secrets cannot be recovered. This is an intentional tradeoff of zero-key-custody architecture.",
  },
  {
    title: "Compromised client device",
    detail:
      "Malware or browser compromise can steal plaintext before encryption or after decryption. Zero-knowledge storage does not protect against endpoint compromise.",
  },
  {
    title: "Weak passphrase choices",
    detail:
      "Bundle encryption strength depends on passphrase quality. Low-entropy passphrases reduce resistance against offline guessing attempts.",
  },
  {
    title: "Operational confusion",
    detail:
      "Importing the wrong bundle causes decrypt failures. UX now separates create vs access paths to reduce this risk, but user process discipline still matters.",
  },
];

const mitigations = [
  "Use long, unique passphrases (prefer passphrase managers).",
  "Keep multiple offline backups of encrypted bundle files.",
  "Verify fingerprint before critical operations.",
  "Use dedicated, updated devices for secret operations.",
  "Limit secret exposure windows; decrypt only when needed.",
];

export default function SecurityPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-black/10 bg-white/80 shadow-[0_8px_28px_-18px_rgba(0,0,0,0.35)] sm:shadow-[0_12px_50px_-30px_rgba(0,0,0,0.55)]">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Security</p>
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl">How Nest stays secure without login</CardTitle>
          <CardDescription className="max-w-3xl text-sm sm:text-base">
            Nest is key-centric: identity is derived from your key fingerprint, not from a username/password session. The service stores encrypted payloads only.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/vault">
              <Shield />
              Open Vault
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs">
              Read Docs
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <LockKeyhole className="h-5 w-5" />
            Security flow in detail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
            User generates/imports key bundle locally.
          </div>
          <div className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
            Client creates a signed envelope for each action (register, create, list, delete).
          </div>
          <div className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
            Envelope includes fingerprint, nonce, timestamp, action, and payload.
          </div>
          <div className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
            Server verifies signature and freshness, then accepts or rejects the request.
          </div>
          <div className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
            Ciphertext and metadata are stored. Plaintext and private keys are not persisted server-side.
          </div>
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="text-xl">Security guarantees</CardTitle>
          <CardDescription>What the system is designed to protect.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {guarantees.map((item) => (
            <div key={item} className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TriangleAlert className="h-5 w-5" />
            Potential weaknesses
          </CardTitle>
          <CardDescription>Known tradeoffs and residual risks in this model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {weaknesses.map((item) => (
            <div key={item.title} className="rounded-md border border-black/10 bg-background/70 p-3">
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="mt-1 text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="text-xl">Recommended hardening</CardTitle>
          <CardDescription>Practical steps to reduce real-world risk.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {mitigations.map((item) => (
            <div key={item} className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Github className="h-5 w-5" />
            Public code verification
          </CardTitle>
          <CardDescription>
            Security claims remain auditable through the open-source repository and commit history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/github">Open GitHub section</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
