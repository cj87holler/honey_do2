# Development Workflow

As of 2026-06-17, work no longer goes directly to `main`.

## Branches
- **`main`** — production. Protected: changes must arrive via pull request. Deploys to production on merge.
- **`dev`** — day-to-day work. Pushing here creates a Vercel **preview** deployment.

## Loop
```bash
git checkout dev
# ...make changes...
git commit -am "..."
git push                                   # → Vercel preview deployment
gh pr create --base main --head dev        # open PR when ready
gh pr merge --squash                       # merge → production deploy
```

## Local dev
See the Makefile: `make start` (Docker Postgres + migrations + Next.js) or `make dev` once the DB is up.
