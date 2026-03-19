# Contributing to Roast My Skill

Thanks for wanting to contribute! The easiest (and most fun) way to help is by **adding a new roast persona**. This guide walks you through exactly what to touch.

## Adding a New Persona

A persona needs five things: an ID, a name, a color, an image, and a system prompt. You'll touch five files total.

### 1. Write the system prompt

**File:** `lib/personas.ts`

Add a new entry to the `PERSONA_PROMPTS` record. Your key is the persona ID (lowercase, one word).

```ts
const PERSONA_PROMPTS: Record<string, string> = {
  engineer: `...`,
  grandma: `...`,
  parisian: `...`,
  // Add yours here:
  pirate: `You are a ruthless pirate captain... ${OUTPUT_FORMAT}`,
};
```

**Prompt guidelines:**

- **End with `${OUTPUT_FORMAT}`** — this ensures the structured Assessment table, Final Score, and Suggestions format is included. Every persona must use it.
- Explain the persona's voice, catchphrases, and metaphor style. The existing prompts are good templates.
- Include the line: *"You're reviewing someone's 'skill file' (a configuration file that teaches AI coding assistants new capabilities)"* so the model has context.
- Keep all technical substance — the persona rewrites the *tone*, not the content.
- Aim for personality that's fun to screenshot and share.

Then update the type union in the `generatePersonaRoast` function signature:

```ts
export async function generatePersonaRoast(
  tesslReview: string,
  persona: "engineer" | "grandma" | "parisian" | "pirate"  // <-- add here
)
```

### 2. Update the Persona type and picker

**File:** `components/PersonaPicker.tsx`

Add your persona ID to the `Persona` type:

```ts
export type Persona = "engineer" | "grandma" | "parisian" | "pirate";
```

Add an entry to the `PERSONAS` array:

```ts
{
  id: "pirate",
  name: "Captain Code Beard",
  image: "/pirate.png",
  color: "var(--pirate)",
},
```

### 3. Add a CSS color variable

**File:** `app/globals.css`

Add a color for your persona in the `:root` block alongside the existing ones:

```css
:root {
  /* ... existing vars ... */
  --engineer: #4ADE80;
  --grandma: #F472B6;
  --parisian: #A78BFA;
  --pirate: #F59E0B;    /* <-- add yours */
}
```

Pick a color that's distinct from the existing green, pink, and purple.

### 4. Register in the API route

**File:** `app/api/roast/rewrite/route.ts`

Add your persona ID to the validation array:

```ts
const validPersonas = ["engineer", "grandma", "parisian", "pirate"];
```

### 5. Add a persona image

**File:** `public/<persona-id>.png`

Drop a square-ish image in `public/`. It displays in a square aspect-ratio card with `object-cover`, so it'll be cropped to fill. Aim for something fun and recognizable — the existing ones are meme-style images.

Keep it reasonable in file size (under 500KB ideally).

### Checklist

Before opening your PR, make sure:

- [ ] System prompt added in `lib/personas.ts` (ends with `${OUTPUT_FORMAT}`)
- [ ] Type union updated in `lib/personas.ts` (`generatePersonaRoast` signature)
- [ ] `Persona` type updated in `components/PersonaPicker.tsx`
- [ ] Entry added to `PERSONAS` array in `components/PersonaPicker.tsx`
- [ ] CSS color variable added in `app/globals.css`
- [ ] Persona ID added to `validPersonas` in `app/api/roast/rewrite/route.ts`
- [ ] Image added to `public/`
- [ ] `npm run build` passes

## Development Setup

```bash
# Install dependencies
npm install

# You'll need an Anthropic API key for the roast to work
export ANTHROPIC_API_KEY=sk-ant-...

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and test your persona end-to-end.

## Other Contributions

Bug fixes, UI improvements, and other enhancements are welcome too. Please open an issue first to discuss larger changes before putting in the work.

## Code Style

- TypeScript throughout
- Tailwind CSS v4 (no config file — styles via `@import "tailwindcss"`)
- Dark terminal aesthetic: monospace, sharp corners, uppercase labels
- Keep it simple — no unnecessary abstractions
