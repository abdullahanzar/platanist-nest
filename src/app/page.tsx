import Link from "next/link";
import { ArrowRight, ExternalLink, Github, HardDriveDownload, KeyRound, ShieldCheck } from "lucide-react";
import SecureKeyGenerator from "@/components/keys/symmetric-key-generator";
import { quickStartSteps } from "@/lib/content/trust";

export default function Home() {
  const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO_URL;

  return (
    <div className="flex flex-col gap-12 pb-8 pt-4 sm:pt-8 lg:gap-20">
      <section aria-labelledby="trust-hero-heading" className="animate-fade-up">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Trust in 30 seconds</p>
          <h1 id="trust-hero-heading" className="mt-4 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl lg:text-[4rem] lg:leading-[1.1]">
            You keep the keys.<br className="hidden sm:block" />
            <span className="text-muted-foreground">Nest stores ciphertext.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Zero login, no server-side key custody. A fully open source, self-hostable vault where encryption happens completely on your terms.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="#get-started"
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Get started securely
            </Link>
            <Link
              href="/security"
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-input bg-background/50 px-8 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Read security model
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/security" className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/60 p-5 transition-all hover:-translate-y-1 hover:bg-white/90 hover:shadow-xl hover:shadow-black/5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-background shadow-sm transition-transform group-hover:scale-110">
              <ShieldCheck className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              Security first
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:-translate-y-px group-hover:translate-x-1 group-hover:text-foreground group-hover:opacity-100" />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Encrypt locally. Server stores ciphertext only.</p>
          </Link>

          <Link href="/security" className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/60 p-5 transition-all hover:-translate-y-1 hover:bg-white/90 hover:shadow-xl hover:shadow-black/5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-background shadow-sm transition-transform group-hover:scale-110">
              <KeyRound className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              Zero login
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:-translate-y-px group-hover:translate-x-1 group-hover:text-foreground group-hover:opacity-100" />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">No accounts. Your identity is your private key.</p>
          </Link>

          {repoUrl ? (
            <a href={repoUrl} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/60 p-5 transition-all hover:-translate-y-1 hover:bg-white/90 hover:shadow-xl hover:shadow-black/5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-background shadow-sm transition-transform group-hover:scale-110">
                <Github className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                Open source
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:-translate-y-px group-hover:translate-x-1 group-hover:text-foreground group-hover:opacity-100" />
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Inspect the code and verify all security claims.</p>
            </a>
          ) : (
            <Link href="/github" className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/60 p-5 transition-all hover:-translate-y-1 hover:bg-white/90 hover:shadow-xl hover:shadow-black/5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-background shadow-sm transition-transform group-hover:scale-110">
                <Github className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                Open source
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:-translate-y-px group-hover:translate-x-1 group-hover:text-foreground group-hover:opacity-100" />
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Inspect the code and verify all security claims.</p>
            </Link>
          )}

          <Link href="/cli" className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/60 p-5 transition-all hover:-translate-y-1 hover:bg-white/90 hover:shadow-xl hover:shadow-black/5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-background shadow-sm transition-transform group-hover:scale-110">
              <HardDriveDownload className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              Self-hostable
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:-translate-y-px group-hover:translate-x-1 group-hover:text-foreground group-hover:opacity-100" />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Deploy locally to own your data boundaries.</p>
          </Link>
        </div>
      </section>

      <section id="get-started" aria-labelledby="get-started-heading" className="scroll-mt-24">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Get started</p>
          <h2 id="get-started-heading" className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Generate your key and start encrypting.
          </h2>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickStartSteps.slice(0, 3).map((step, index) => (
            <div key={step} className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/50 p-5">
              <div className="mb-3 inline-flex h-7 items-center justify-center rounded-full bg-foreground px-3 text-[11px] font-semibold tracking-wide text-background shadow-xs">
                STEP {index + 1}
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">{step}</p>
            </div>
          ))}
        </div>

        <section aria-labelledby="home-onboarding-title">
          <h3 id="home-onboarding-title" className="sr-only">
            Platanist Nest onboarding
          </h3>
          <SecureKeyGenerator view="home" />
        </section>
      </section>
    </div>
  );
}
