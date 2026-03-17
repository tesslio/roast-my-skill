# Roast My Skill — Project Context

## What is this?
A satellite site at **https://roast-my-skill.vercel.app/** where developers drop a SKILL.md (paste or GitHub link), pick a roast persona, and get their skill file reviewed with personality. Think "Rate My Professor" but for AI skill files.

**GitHub**: https://github.com/fernandezbaptiste/roast-my-skill
**Deployed on**: Vercel (baps-projects team), auto-deploys from `main`
**Env vars on Vercel**: `ANTHROPIC_API_KEY` (server-side only)

## Architecture

```
User → Landing (paste/URL) → API /api/roast (Claude API review)
                                ↓
                          Persona Picker (3 characters)
                                ↓
                          API /api/roast/rewrite (Claude API persona rewrite, streamed)
                                ↓
                          Result: metrics dashboard + persona-voiced roast + raw review toggle
```

### Two-step API flow
1. **`POST /api/roast`** — Takes `{type: "url"|"paste", content: string}`. If URL, fetches Skill.md from GitHub. Sends to Claude API (Sonnet) with a structured review prompt. Returns `{review: string, metrics: {...}}` as JSON.
2. **`POST /api/roast/rewrite`** — Takes `{review: string, persona: "engineer"|"grandma"|"parisian"}`. Streams the persona-styled roast back as chunked text.

### Important: No tessl CLI dependency
Originally shelled out to `npx tessl skill review` but that doesn't work on Vercel serverless. Replaced with a **Claude API call** (`lib/tessl.ts`) that uses tessl's review criteria (Validation, Discovery, Implementation) to produce equivalent structured output. The persona rewrite is a separate Claude call (`lib/personas.ts`).

## Tech Stack
- **Next.js 16** (App Router)
- **Tailwind CSS v4** (`@import "tailwindcss"` — no config file)
- **@anthropic-ai/sdk** — Claude API for both review + persona rewrite
- **react-markdown + remark-gfm** — renders markdown tables, code, etc. in roast output
- **Fonts**: JetBrains Mono (display/mono), DM Sans (body)

## Three Personas

### 1. Disappointed Jedi Dev (`engineer`)
- Image: `/public/engineer.png` (hooded monk meme)
- Color: `var(--engineer)` green
- Voice: Quiet Obi-Wan disappointment, Jedi metaphors, technically rigorous but weary
- "I sense a disturbance in this description..."

### 2. Grandma Thinks You Suck (`grandma`)
- Image: `/public/grandma.png` (grandma with bottles)
- Color: `var(--grandma)` pink
- Voice: Loves you, HATES your code. Passive-aggressive cousin Timmy comparisons, occasional gen-z slang
- "Honey, I love you, but this is the worst thing I've read since your grandfather's love letters"

### 3. Rudest French Waiter Alive (`parisian`)
- Image: `/public/parisian.png` (B&W waiter photo, converted from TIFF)
- Color: `var(--parisian)` purple
- Voice: Michelin-starred contempt, everything is a culinary disaster, personally offended
- "I have seen better structure in a crêpe that fell on the floor"

## Key Files

```
app/
  page.tsx              — Main page: landing → persona picker → result. All phase logic lives here.
                          Also contains ShareBar and TerminalCta inline components.
  layout.tsx            — Fonts (JetBrains Mono, DM Sans), metadata
  globals.css           — Tailwind v4, CSS vars, animations, .roast-prose markdown styles
  api/roast/route.ts    — Step 1: review via Claude API, returns JSON with metrics
  api/roast/rewrite/route.ts — Step 2: persona rewrite, streams text

components/
  SkillInput.tsx        — GitHub Link (default) / Paste toggle + textarea/input + submit button
  PersonaPicker.tsx     — 3 image cards with hover glow, persona selection
  RoastResult.tsx       — Metrics dashboard (Validation/Discovery/Implementation bars),
                          persona-voiced roast with mood reactions + inline metric badges,
                          "View full technical review" collapsible

lib/
  tessl.ts              — Claude API structured review (NOT tessl CLI). Returns TesslReview
                          with metrics {validation, discovery, implementation, finalScore, securityRating}
  personas.ts           — Three persona system prompts + streaming rewrite function.
                          Output format: Assessment table → Final Score → Suggestions.
                          Mood markers: ::mood:disappointed:: rendered as avatar+emoji inline.
  github.ts             — Fetches Skill.md from GitHub URLs (converts to raw.githubusercontent.com)
  rate-limit.ts         — Simple in-memory IP-based rate limiter (5 req/min)

public/
  engineer.png          — Hooded monk meme (Disappointed Jedi Dev)
  grandma.png           — Grandma with bottles
  parisian.png          — B&W French waiter photo
```

## Design
- **Aesthetic**: skills.sh-inspired — dark (#0A0A0B), flat, sharp corners, monospace, no gradients
- **Title**: ASCII art "ROAST" in Unicode box-drawing chars + "my-skill" subtitle
- **Score bars**: Segmented 10-block retro health bars (not smooth progress bars)
- **Cursor**: Blinking step-function (terminal style), not smooth pulse
- **All caps labels**: Uppercase + wide tracking throughout
- **Inline metric badges**: `84%`, `7/10` in backtick code spans → colored bordered badges (green/yellow/red)

## UX Flow
1. **Landing** — ASCII title, paste/URL input, one CTA "ROAST MY SKILL"
2. **Picking** — Tessl review runs in background via `/api/roast`. Persona picker shows 3 image cards. Green dot "Analyzing..." while review runs, changes to "✓ Analysis complete" when done.
3. **Streaming** — Persona rewrite streams in via `/api/roast/rewrite`. Blinking cursor.
4. **Done** — Full result with: metrics dashboard, persona roast (with mood reactions), "View full technical review" toggle, CTA ("Want to fix this? `npx tessl skill review --optimize`"), share buttons (Twitter/LinkedIn/Bluesky/Reddit/HN), "Roast another" + "Copy roast" buttons.

## What's NOT done / potential next steps
- OG image / social card for link previews
- Analytics (how many roasts, which persona is most popular)
- Rate limiting could be Redis-based for production scale
- Could add a "share this specific roast" permalink feature
- Mobile responsiveness could be tightened (persona cards on small screens)
- The review prompt in `lib/tessl.ts` could be tuned further to match tessl's exact criteria
- Could add drag-and-drop for .md files
