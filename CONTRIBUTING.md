# Contributing to Roast My Skill

## Submit a New Persona

We welcome new roast personas! To add one, open a PR that touches these files:

### 1. `lib/personas.ts`

Add your persona's system prompt to the `PERSONA_PROMPTS` record:

```ts
PERSONA_PROMPTS["your-id"] = `Your persona description here...
${OUTPUT_FORMAT}`;
```

Keep the `OUTPUT_FORMAT` at the end — it ensures the response structure stays consistent.

**Guidelines for good personas:**
- Give them a strong, distinct voice — the roast should be screenshottable
- Stay technically accurate — the review substance must be preserved
- Keep it fun but not mean-spirited
- Avoid real living people's names (use archetypes or fictional characters)

### 2. `components/PersonaPicker.tsx`

Add your persona to the `Persona` type and the `PERSONAS` array:

```ts
export type Persona = "engineer" | "grandma" | "parisian" | "custom" | "your-id";

// In the PERSONAS array:
{
  id: "your-id",
  name: "Display Name",
  image: "/your-id.png",
  color: "var(--your-id)",
}
```

### 3. `components/RoastResult.tsx`

Add entries to `PERSONA_STYLE` and `MOOD_EMOJIS`:

```ts
// PERSONA_STYLE
"your-id": {
  color: "var(--your-id)",
  image: "/your-id.png",
  name: "Display Name",
  subtitle: "A short tagline",
},

// MOOD_EMOJIS
"your-id": {
  pleased: "...",
  disappointed: "...",
  angry: "...",
  shocked: "...",
  hopeful: "...",
},
```

### 4. `app/page.tsx`

Add entries to:
- `WAITING_LINES["your-id"]` — 8 in-character banter lines shown during loading
- `personaStyle` in `WaitingScreen` — color, image, name
- In-character hang-tight message (the 60-second wait message)
- `ShareBar` persona name mapping

### 5. `app/globals.css`

Add a CSS variable for your persona's color:

```css
--your-id: #HEX_COLOR;
```

### 6. `app/api/roast/rewrite/route.ts`

Add your persona ID to the `validPersonas` array.

### 7. `public/`

Add a square image for your persona (PNG, ideally under 100KB).

### 8. Open your PR

- Title: `feat: add [Persona Name] persona`
- Include a screenshot of the persona card and a sample roast output
- Explain the character voice in the PR description

## Other Contributions

- **Bug fixes**: Always welcome, just open a PR
- **UI improvements**: Open an issue first to discuss the approach
- **New features**: Open an issue to discuss before building

## Local Development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`. You'll need:
- `ANTHROPIC_API_KEY` in `.env.local` for the persona rewrite
- The Tessl review microservice running on port 3001 (see `microservice/` directory), or the app falls back to a Claude API review
