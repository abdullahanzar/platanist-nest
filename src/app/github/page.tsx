import Link from "next/link";
import { Github, SearchCheck, ShieldCheck, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inspectChecklist, transparencyPoints } from "@/lib/content/trust";

const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO_URL;

export default function GithubPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-black/10 bg-white/80 shadow-[0_8px_28px_-18px_rgba(0,0,0,0.35)] sm:shadow-[0_12px_50px_-30px_rgba(0,0,0,0.55)]">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Open Source</p>
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl">GitHub transparency</CardTitle>
          <CardDescription className="max-w-3xl text-sm sm:text-base">
            Nest is fully open source. Security and behavior are based on verifiable code, not hidden logic.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {repoUrl ? (
            <Button asChild>
              <a href={repoUrl} target="_blank" rel="noreferrer">
                <Github />
                Open GitHub Repository
                <ExternalLink />
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <Github />
              Repository URL pending configuration
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/security">
              <ShieldCheck />
              Security Model
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="text-xl">Why this matters</CardTitle>
          <CardDescription>
            Users can inspect truth directly instead of trusting marketing claims.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {transparencyPoints.map((point) => (
            <div key={point} className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
              {point}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-black/10 bg-white/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <SearchCheck className="h-5 w-5" />
            What to inspect first
          </CardTitle>
          <CardDescription>Start here to validate encryption, identity, and server constraints.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {inspectChecklist.map((item) => (
            <div key={item} className="rounded-md border border-black/10 bg-background/70 px-3 py-2">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      {!repoUrl && (
        <Card className="border-black/10 bg-white/70">
          <CardHeader>
            <CardTitle className="text-xl">Repository configuration</CardTitle>
            <CardDescription>
              Add `NEXT_PUBLIC_GITHUB_REPO_URL` in `.env.local` when your final repository is ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md border border-black/10 bg-background/80 p-3 text-xs text-muted-foreground">
              NEXT_PUBLIC_GITHUB_REPO_URL=https://github.com/your-org/your-repo
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
