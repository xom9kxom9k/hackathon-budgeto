---
name: apple-hig-web
description: Apply Apple Human Interface Guidelines principles when designing or reviewing Budgetto's responsive finance web UI, emphasizing clarity, hierarchy, accessibility, interaction feedback, and platform familiarity.
---
# Apple HIG-inspired web design

This is a project-authored adaptation for a **web app**, not an official Apple skill. Consult Apple's [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) when choosing a pattern.

## Apply to Budgetto
- Design for clear information hierarchy: balances, transaction dates and amounts, and destructive actions must be unmistakable.
- Prefer familiar controls, minimal visual noise, consistent spacing and typography, and meaningful whitespace.
- Always supply explicit loading, empty, error, offline, and success states; never disguise failures.
- Keep interactions predictable. Confirm truly destructive operations, provide undo when feasible, and don't hide critical finance decisions behind gestures.
- Meet WCAG AA contrast and keyboard focus requirements; use semantic HTML and accessible labels.
- Respect reduced-motion preferences; motion should indicate state or causality, not decorate.
- Mobile: adapt layout rather than shrinking desktop content; keep interactive targets comfortable; avoid horizontal scrolling for core tasks.
- Treat privacy as UI: clearly explain what banking data is imported, stored, and shared with AI.
- Avoid imitating iOS controls literally on the web when native browser conventions serve users better.

## Review checklist
Before approving UI work, check readability, spacing, accessibility, mobile behavior, keyboard access, error states, and financial data clarity.

Source: https://developer.apple.com/design/human-interface-guidelines/
