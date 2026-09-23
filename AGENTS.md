# Pharmacy App — Project Standards

## Verified changes must be committed

After any change is implemented and verified working (typecheck/build passes
and manual checks confirm it works), commit it immediately with a clear
message. Never leave verified work uncommitted at the end of a session.

This file defines how this codebase is structured and how the coding agent
should work in it. Read this before making changes, especially during the
TanStack Start -> Next.js migration.

## Stack (locked)

- Next.js (App Router) + TypeScript
- Tailwind CSS for all styling — no separate CSS-per-component files;
  utility classes colocated with the component they style
- Prisma + PostgreSQL (migrations via `prisma migrate dev` — never `db push`
  for anything beyond local scratch experiments)
- NextAuth (credentials provider) for auth, with `role` + `branchId` embedded
  in the session — see `lib/auth.ts` and `lib/permissions.ts`

## Folder organization: feature-based, not type-based

Group by feature/domain, not by technical layer. Avoid a global `components/`,
`hooks/`, `utils/` dumping ground. No `src/` wrapper — `app/`, `features/`,
and `lib/` all live at the project root.

```
app/                       # Next.js routes only — thin, delegate to features
features/
  catalog/                 # categories, ingredients, variants
    components/
    lib/
    types.ts
  inventory/                # batches, stock receiving, expiry
  pricing/                  # branch pricing
  pos/                      # checkout flow
  reports/                  # sales/audit views
  auth/
lib/                        # true cross-feature shared code only
  prisma.ts
  auth.ts
  permissions.ts
```

If a piece of logic is only used by one feature, it lives inside that
feature's folder — not in the shared `lib/`.

## File size: ~300 lines is the split signal

Not a hard ceiling enforced by a linter — a trigger to stop and ask "does this
file have more than one responsibility?" the moment it crosses ~300 lines.
Split along that responsibility boundary, not arbitrarily by function count.

## Shared logic: extract on the SECOND duplication, not before

Don't pre-build abstractions for logic used in only one place. When the same
logic is written a second time, that's the signal to extract it into a shared
function/hook — not before, not "just in case."

## V1 vs. later — apply this filter to every feature

Default assumption: build the smallest version of a feature that's actually
usable, not the version with every actor/lifecycle stage represented. Before
adding scope to any feature, ask: "is this needed for V1, or am I building
ahead of the actual requirement?" If genuinely unsure, flag it for a decision
rather than building it in.

Confirmed V1 scope for this project (do not expand without confirming):
- Roles: ADMIN, BRANCH_MANAGER, POS — hard-coded permissions
  (see `lib/permissions.ts`), NOT a configurable permissions table. No
  separate INVENTORY role — Branch Manager covers stock/batch/pricing
  duties directly at their branch.
- No offline/sync mode, no inter-branch stock transfer, no multi-tenant
  support, no prescription/controlled-substance enforcement

## Migrating existing code (TanStack Start scaffold -> Next.js)

When porting a file from the old scaffold:
1. Assess whether it can be safely restructured into the feature-based
   layout above, or whether doing so risks breaking working logic
   (e.g. auth flows, DB connection handling).
2. If safe — migrate it directly into the new structure.
3. If risky — do NOT force the new structure on it. Instead, port it as-is
   into the closest matching feature folder, leave a comment noting it's
   using the old pattern, and flag it back for a decision on whether to
   restructure later or leave it.
4. Never carry over TanStack Start-specific APIs (its router, server
   functions, etc.) — those get rewritten for Next.js App Router
   conventions since the framework itself is changing, not just the folder
   layout.

## Naming

Once patterns stabilize across a couple of features, this doc gets a
"Naming conventions" section added — not written speculatively before
there's real precedent to document.