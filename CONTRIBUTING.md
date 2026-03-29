# Contributing to Kopern

Thank you for considering contributing to Kopern. Every contribution matters — whether it's a bug fix, a new feature, better docs, or a typo.

## Getting Started

1. **Fork** the repo and clone your fork
2. Install dependencies: `npm install`
3. Copy environment: `cp .env.example .env.local` and fill in your keys
4. Start dev server: `npm run dev`

## Development Workflow

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes
3. Ensure quality:
   ```bash
   npm run lint       # ESLint
   npx tsc --noEmit   # TypeScript strict check
   npm run build      # Production build passes
   ```
4. Commit with a clear message following [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: add Notion tool integration`, `fix: grading score calculation`)
5. Push and open a **Pull Request** against `main`

## What We're Looking For

- **Agent templates** — New examples for the gallery (see `src/data/use-cases.ts`)
- **Vertical templates** — Business-specific templates (see `src/data/vertical-templates.ts`)
- **LLM providers** — Add support for new providers in `src/lib/llm/client.ts`
- **Tool integrations** — Pre-built tools for popular services (Notion, Linear, Discord, Airtable...)
- **Grading criteria** — New criterion types or improvements to existing ones
- **Translations** — Languages beyond English and French (see `src/i18n/dictionaries/`)
- **Performance** — Bundle size, Firestore query optimizations, streaming improvements
- **Tests** — Unit, integration, E2E (we use Vitest)
- **Documentation** — Tutorials, examples, guides

## Code Guidelines

- **TypeScript strict mode** — No `any` types
- **UI components** — Use shadcn/ui primitives (`Card`, `Button`, `Dialog`, etc.)
- **Icons** — lucide-react only
- **Routing** — Use `<LocalizedLink>` not `<Link>`, `useLocalizedRouter()` not `useRouter()`
- **i18n** — `useDictionary()` for translated strings, `useLocale()` for current locale. All new UI must support EN and FR
- **Auth** — `useAuth()` hook for user context
- **Data** — `useDocument()` / `useCollection()` hooks for Firestore
- **Animations** — `<FadeIn>`, `<SlideUp>`, `<StaggerChildren>` from `components/motion/`
- **Server actions** — Client Firestore SDK in `src/actions/`, Admin SDK in `src/app/api/`
- **Async on Vercel** — Use `after()` from `next/server` for post-response work, never fire-and-forget

## PR Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Add i18n keys to both `en.json` and `fr.json` if you add UI text
- If you add a new API route, add rate limiting and input validation (Zod schema)
- If you add a tool, ensure `executeCode` is production-ready (no placeholders, no stubs)

## Reporting Bugs

Use the **built-in bug reporter** in the app (navbar icon), or open an issue on [GitHub Issues](https://github.com/berch-t/kopern/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Browser / OS / Node version
- Screenshots if relevant

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## Questions?

Open a [Discussion](https://github.com/berch-t/kopern/discussions) or reach out on Discord.
