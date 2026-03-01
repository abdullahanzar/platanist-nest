import Link from "next/link";
import { BookOpenText, ArrowRight, KeyRound, ShieldCheck, Vault, Github, Terminal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const quickStartSteps = [
  "Go to Onboarding and choose Create New Vault.",
  "Generate your key bundle in-browser.",
  "Set a backup passphrase and download your encrypted bundle file.",
  "Activate your key once.",
  "Save your first secret using Save and Encrypt.",
];

const returningSteps = [
  "Go to Vault and choose Return to Vault.",
  "Enter your unlock passphrase.",
  "Import your encrypted bundle file.",
  "Activate key (if not already active).",
  "Load Secrets and click Read on any entry.",
];

const troubleshooting = [
  {
    issue: "Incorrect passphrase or corrupted bundle",
    fix: "Confirm you are using the same passphrase used at download time and the correct JSON bundle file.",
  },
  {
    issue: "Unable to decrypt with this key",
    fix: "You likely imported a different key bundle than the one used to create that secret.",
  },
  {
    issue: "Replay or stale request",
    fix: "Retry the action. This protection blocks duplicate or stale signed requests.",
  },
];

export default function DocsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-black/10 bg-white/80 shadow-[0_8px_28px_-18px_rgba(0,0,0,0.35)] sm:shadow-[0_12px_50px_-30px_rgba(0,0,0,0.55)]">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Documentation</p>
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl">How to use Platanist Nest</CardTitle>
          <CardDescription className="max-w-2xl text-sm sm:text-base">
            This guide covers first-time setup, returning access, route intent, and failure recovery.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/">
              <BookOpenText />
              Open Onboarding
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/security">
              Security Deep Dive
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Card className="border-black/10 bg-white/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <KeyRound className="h-5 w-5" />
              First-time setup
            </CardTitle>
            <CardDescription>Create and back up a new key before storing secrets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {quickStartSteps.map((step, index) => (
              <div key={step} className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
                <p>
                  <span className="font-medium text-foreground">Step {index + 1}:</span> {step}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-black/10 bg-white/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Vault className="h-5 w-5" />
              Returning access
            </CardTitle>
            <CardDescription>Import your existing key and load encrypted records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {returningSteps.map((step, index) => (
              <div key={step} className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
                <p>
                  <span className="font-medium text-foreground">Step {index + 1}:</span> {step}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="text-xl">Route map</CardTitle>
          <CardDescription>Each route has one purpose so workflows stay clear.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-md border border-black/10 bg-background/70 p-3">
            <p className="font-medium text-foreground">Onboarding (`/`)</p>
            <p className="mt-1 text-muted-foreground">Guided setup and workflow selection.</p>
          </div>
          <div className="rounded-md border border-black/10 bg-background/70 p-3">
            <p className="font-medium text-foreground">Vault (`/vault`)</p>
            <p className="mt-1 text-muted-foreground">Operational path for return/import/load/read/delete.</p>
          </div>
          <div className="rounded-md border border-black/10 bg-background/70 p-3">
            <p className="font-medium text-foreground">Keys (`/key-generation`)</p>
            <p className="mt-1 text-muted-foreground">Focused key generation and backup lifecycle.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="text-xl">Troubleshooting</CardTitle>
          <CardDescription>Common errors and what they usually mean.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {troubleshooting.map((item) => (
            <div key={item.issue} className="rounded-md border border-black/10 bg-background/70 p-3">
              <p className="font-medium text-foreground">{item.issue}</p>
              <p className="mt-1 text-muted-foreground">{item.fix}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5" />
            Security summary
          </CardTitle>
          <CardDescription>
            Nest uses key-based encryption without login accounts. Server stores ciphertext and metadata only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/security">Read full security model</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Github className="h-5 w-5" />
            GitHub transparency
          </CardTitle>
          <CardDescription>
            The project is fully open source. You can inspect source code and verify implementation details anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/github">Open GitHub section</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Terminal className="h-5 w-5" />
            CLI downloads and usage
          </CardTitle>
          <CardDescription>
            Install `nest-cli` from release assets and follow command-line workflows for push/pull.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/cli">Open CLI section</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
