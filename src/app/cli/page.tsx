import Link from "next/link";
import { Download, Terminal, ShieldCheck, ExternalLink, FileCheck2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const releaseTag = "v0.1.1";
const releaseBaseUrl = `https://github.com/abdullahanzar/nest-cli/releases/download/${releaseTag}`;

const assets = [
  {
    os: "macOS (Apple Silicon)",
    file: "nest-cli_0.1.1_darwin_arm64.tar.gz",
    url: `${releaseBaseUrl}/nest-cli_0.1.1_darwin_arm64.tar.gz`,
  },
  {
    os: "macOS (Intel)",
    file: "nest-cli_0.1.1_darwin_amd64.tar.gz",
    url: `${releaseBaseUrl}/nest-cli_0.1.1_darwin_amd64.tar.gz`,
  },
  {
    os: "Linux (x86_64)",
    file: "nest-cli_0.1.1_linux_amd64.tar.gz",
    url: `${releaseBaseUrl}/nest-cli_0.1.1_linux_amd64.tar.gz`,
  },
  {
    os: "Linux (ARM64)",
    file: "nest-cli_0.1.1_linux_arm64.tar.gz",
    url: `${releaseBaseUrl}/nest-cli_0.1.1_linux_arm64.tar.gz`,
  },
  {
    os: "Windows (x86_64)",
    file: "nest-cli_0.1.1_windows_amd64.zip",
    url: `${releaseBaseUrl}/nest-cli_0.1.1_windows_amd64.zip`,
  },
  {
    os: "Windows (ARM64)",
    file: "nest-cli_0.1.1_windows_arm64.zip",
    url: `${releaseBaseUrl}/nest-cli_0.1.1_windows_arm64.zip`,
  },
];

const checksumsUrl = `${releaseBaseUrl}/checksums.txt`;
const releaseUrl = `https://github.com/abdullahanzar/nest-cli/releases/tag/${releaseTag}`;

const mongoUsage = [
  "nest init --origin origin --mongo-uri \"mongodb://user:pass@host:27017\" --mongo-db nest_cli",
  "nest keys generate --profile modern",
  "nest keys register --origin origin",
  "nest push origin my-app",
  "nest pull origin my-app",
];

const apiUsage = [
  "nest init --origin legacy --mode api --api-url https://api.example.com",
  "nest auth login --origin legacy --email you@example.com --api-key <YOUR_API_KEY>",
  "nest keys register --origin legacy",
  "nest push legacy my-app",
  "nest pull legacy my-app",
];

export default function CliPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-black/10 bg-white/80 shadow-[0_8px_28px_-18px_rgba(0,0,0,0.35)] sm:shadow-[0_12px_50px_-30px_rgba(0,0,0,0.55)]">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CLI</p>
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl">Download and use nest-cli</CardTitle>
          <CardDescription className="max-w-3xl text-sm sm:text-base">
            Install binaries from release {releaseTag}, verify checksums, then push and pull encrypted
            <code className="mx-1 rounded bg-background/80 px-1 py-0.5 text-xs text-foreground">.env</code>
            secrets from your own workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={releaseUrl} target="_blank" rel="noreferrer">
              <Download />
              Open Release {releaseTag}
              <ExternalLink />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs">
              <Terminal />
              General Docs
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="text-xl">Download binaries</CardTitle>
          <CardDescription>Choose the asset that matches your operating system and architecture.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          {assets.map((asset) => (
            <a
              key={asset.file}
              href={asset.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-black/10 bg-background/70 p-3 transition-colors hover:bg-background"
            >
              <p className="font-medium text-foreground">{asset.os}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{asset.file}</p>
            </a>
          ))}
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileCheck2 className="h-5 w-5" />
            Verify checksum
          </CardTitle>
          <CardDescription>Always verify downloaded binaries before installation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <a
            href={checksumsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-background/70 px-3 py-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Download className="h-4 w-4" />
            checksums.txt
            <ExternalLink className="h-4 w-4" />
          </a>
          <pre className="overflow-x-auto rounded-md border border-black/10 bg-background/80 p-3 text-xs text-muted-foreground">
{`curl -LO ${checksumsUrl}
sha256sum -c checksums.txt --ignore-missing`}
          </pre>
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="text-xl">Install and make executable</CardTitle>
          <CardDescription>Example for Linux amd64. Replace filename for your platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md border border-black/10 bg-background/80 p-3 text-xs text-muted-foreground">
{`curl -LO ${releaseBaseUrl}/nest-cli_0.1.1_linux_amd64.tar.gz
tar -xzf nest-cli_0.1.1_linux_amd64.tar.gz
chmod +x nest
sudo mv nest /usr/local/bin/nest
nest --help`}
          </pre>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Card className="border-black/10 bg-white/70">
          <CardHeader>
            <CardTitle className="text-xl">Usage: Mongo mode (default)</CardTitle>
            <CardDescription>Developer-owned MongoDB backend, encrypted push/pull workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-md border border-black/10 bg-background/80 p-3 text-xs text-muted-foreground">
{mongoUsage.join("\n")}
            </pre>
          </CardContent>
        </Card>

        <Card className="border-black/10 bg-white/70">
          <CardHeader>
            <CardTitle className="text-xl">Usage: API compatibility mode</CardTitle>
            <CardDescription>For environments using `platanist-nest` API routes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-md border border-black/10 bg-background/80 p-3 text-xs text-muted-foreground">
{apiUsage.join("\n")}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5" />
            Security notes
          </CardTitle>
          <CardDescription>Operational reminders for CLI-based secret workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
            Secret plaintext still exists locally after `nest pull`; secure your workstation.
          </div>
          <div className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
            Protect your Mongo credentials and key bundle backups as high-value secrets.
          </div>
          <div className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
            In API mode, authenticate with `nest auth login` before push or pull operations.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
