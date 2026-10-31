# Budgetto agent instructions

Use project-local skills in `.agents/skills/` selectively:

- **Always** apply `antislop` (core); use `antislop-code` for comment reviews.
- React work: `vercel-react-best-practices`.
- UI work: `antislop-ui`, `antislop-human`, `apple-hig-web`, `budgetto-finance-ux`.
- Mobile-responsive UI: `antislop-layoutmobile`.
- User-facing text and documentation: `antislop-copywriting`.

Use original source skill files where included, rather than duplicating their text in responses. Local project skills do not change the user's global ChatGPT settings.

Before committing, run project lint, formatting check, typecheck and build where dependencies are available. Commit each completed task using Conventional Commits. Do not claim GitHub Actions passed unless verified.
