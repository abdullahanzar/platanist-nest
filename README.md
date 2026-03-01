# platanist-nest

Platanist Nest is a key-based encrypted vault interface and API.

- No login/profile management in the main vault UX.
- Private keys are generated/imported client-side.
- Secrets are encrypted client-side before upload.
- Server stores ciphertext and metadata only.

## Open Source Transparency

This project is fully open source. Source code can be inspected anytime to verify how encryption, signatures, and server validation are implemented.

You can review:
- Client encryption and key bundle logic: `src/lib/vault/client.ts`
- Server verification and nonce freshness checks: `src/lib/vault/server.ts`
- Vault API routes: `src/app/api/vault/**`
- UI workflow behavior: `src/components/keys/symmetric-key-generator.tsx`

In the web app, see:
- `/github` for open-source transparency details
- `/docs` for practical usage guide
- `/security` for deep security model and weaknesses

## GitHub Repository Link

Set the repository URL in `.env.local` when ready:

```bash
NEXT_PUBLIC_GITHUB_REPO_URL=https://github.com/your-org/your-repo
```

The UI GitHub section will automatically use this value.

## License

Licensed under the Apache License 2.0.

- Project license file: `LICENSE`
- Repository root license file: `../LICENSE`

Apache 2.0 allows use, modification, distribution, and hosting (including commercial use), subject to license terms and notices.

## Development

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.
