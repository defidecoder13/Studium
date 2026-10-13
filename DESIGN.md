---
name: Studium
description: Precision learning platform — cited answers, quizzes and flashcards with page-level provenance.
colors:
  seminar-indigo: "#4f46e5"
  indigo-pale: "#818cf8"
  reading-white: "#fafafa"
  card-white: "#ffffff"
  muted-mist: "#f4f4f5"
  muted-ink: "#52525b"
  ink: "#18181b"
  hairline: "#e4e4e7"
  night-ink: "#0b0b0d"
  night-card: "#131316"
  night-muted: "#1c1c20"
  night-muted-ink: "#a1a1aa"
  emerald-seal: "#047857"
  signal-red: "#dc2626"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(3rem, 5vw, 4.75rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.14em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.seminar-indigo}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.md}"
    padding: "0 28px"
    height: "44px"
  button-ghost:
    backgroundColor: "#00000000"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-destructive:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "40px"
  input-text:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
  card-quiet:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.lg}"
    padding: "20px"
  dialog-panel:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Studium

## Overview

**Creative North Star: "The Reading Room"**

Studium looks like a quiet library, not a software demo: ink on reading white, one indigo accent kept rare, hairline rules setting the cadence between sections. Density is comfortable, never packed; flat bordered surfaces carry the interface while depth appears only where the system rises to meet the user — a modal veil, a toast, a sheet of paper. Typography does the persuading: a Fraunces serif makes the claims, DM Sans does the work, and JetBrains Mono stamps provenance (page numbers, statuses, metadata) in small tracked capitals. The voice on screen is precise, calm, scholarly — short declarative sentences, exact numbers, zero hype. This system explicitly rejects generic AI SaaS: gradient heroes and gradient text, big-number metric templates, glassmorphism cards, pulsing baits, and three-identical-card feature grids.

**Key Characteristics:**
- Editorial restraint: single accent, neutral canvas, flat borders
- Provenance as a material: serif claims, sans body, mono citations
- Flat-by-default elevation with state-driven depth
- Specific, verifiable copy over marketing filler

## Colors

Restrained neutrals with one indigo accent kept rare; warmth comes from typography and content, never from the canvas.

### Primary
- **Seminar Indigo** (#4f46e5): the only saturated hue. Primary actions, current selection, citation accents, and fills. White text on it hits 6.29:1 in both themes.

### Neutral
- **Reading White** (#fafafa): page background in light mode. True neutral, untinted toward warmth.
- **Card White** (#ffffff): cards, popovers, inputs in light mode.
- **Muted Mist** (#f4f4f5): secondary surfaces, tint fills, hover grounds.
- **Muted Ink** (#52525b): secondary text. 7.41:1 on Reading White.
- **Ink** (#18181b): primary text and the inverted CTA fill.
- **Hairline** (#e4e4e7): borders, rules, dividers — the section cadence.
- **Night Ink** (#0b0b0d): page background in dark mode.
- **Night Card** (#131316): cards and sheets in dark mode.
- **Night Muted** (#1c1c20): secondary surfaces in dark mode.
- **Night Muted Ink** (#a1a1aa): secondary text in dark mode. 7.24:1 on Night Card.

### Named Rules (optional, powerful)
**The One Voice Rule.** Seminar Indigo appears on ≤10% of any screen. Its rarity is the point; if everything is accented, nothing is.
**The Split Ramp Rule.** In dark mode, fills use Seminar Indigo (#4f46e5) while small text uses Indigo Pale (#818cf8, 6.22:1 on night surfaces). One indigo cannot serve text and fill at once — the roles split by theme.
**The Status Pairing Rule.** Status colors always ship as light/dark pairs: Emerald Seal (#047857) with light emerald in dark mode, Signal Red (#dc2626) with light red in dark mode. Never a single status hue across themes.

## Typography

**Display Font:** Fraunces (with Georgia, serif fallback; normal + italic, 400–700)
**Body Font:** DM Sans (with system-ui, sans-serif fallback; 400–700)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace fallback; 400–700)

**Character:** A magazine pairing — the serif makes statements, the sans does the work, and the mono stamps provenance. Contrast on the pairing axis, never two similar sans faces.

### Hierarchy
- **Display** (600, clamp 3rem–4.75rem, 0.95, -0.04em): hero claims and big statements only. Ceiling 6rem; floor on tracking -0.04em. `text-wrap: balance`.
- **Headline** (700, 1.875rem, 1.1, tight): page titles and section heads. Sans, never the serif.
- **Title** (600, 1rem, 1.4): card titles, row names.
- **Body** (400, 0.875rem–1.125rem, 1.6): prose and UI text. Line length 65–75ch; `text-wrap: pretty` on paragraphs.
- **Label** (700, 0.6875rem, 0.14em tracking, uppercase): provenance, status, metadata. The citation voice.

### Named Rules (optional)
**The Statements-Only Rule.** Fraunces appears on claims and headlines that persuade. UI labels, buttons, data, and navigation stay in DM Sans. Serif in chrome is forbidden.
**The Floor Rule.** Functional text never drops below 11px; body copy never below 12px. Small is a label, never an excuse.

## Elevation

This system is flat by default and honest about it: surfaces rest at zero elevation, separated by 1px hairlines and tonal steps (Muted Mist against Reading White). Depth is a response to state, never decoration — it appears when the system rises (modal veil, toast), presses (tactile buttons), or presents paper (the PDF sheet on its muted ground).

### Shadow Vocabulary (if applicable)
- **Modal veil** (`box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25)`): dialog panels and toasts floating above the page.
- **Selected pill** (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)`): the raised segment in a segmented control.
- **Paper sheet** (`box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)`): the rendered document page only — never UI cards.

### Named Rules (optional)
**The Flat-By-Default Rule.** Cards sit flat with border-only hover (border-color shifts, nothing lifts). A shadow on a resting card is a defect.

## Components

### Buttons
Character: refined and restrained — quiet fills, color-only feedback, never lift.
- **Shape:** medium rounding (8px), 44px primary height.
- **Primary:** Seminar Indigo fill, white text, 0 28px padding. Hover dims to 90%; press scale is feedback, not decoration.
- **Hover / Focus:** background or border-color transitions at 150–200ms; visible `ring-2` focus in the ring token. No translate, no shadow.
- **Secondary / Ghost / Tertiary (if applicable):** ghost is transparent ink text over muted hover; destructive pairs a solid Signal Red action with an outlined tint variant.

### Chips
- **Style:** provenance chips sit on a 10% indigo tint with an indigo-ink label, 6px radius, 10–11px bold mono. Status chips pair Emerald Seal / Signal Red tints with matching ink.
- **State:** selected pills fill solid indigo with white text; unselected stay neutral bordered.

### Cards / Containers
- **Corner Style:** large rounding max (10px); controls step down to medium (8px).
- **Background:** Card White (Night Card in dark mode).
- **Shadow Strategy:** none at rest — see Elevation.
- **Border:** 1px Hairline always; hover shifts border-color toward indigo, never shadow.
- **Internal Padding:** 16–24px cards, 24–32px panels and dialogs.

### Inputs / Fields
- **Style:** card-background fill, hairline stroke, medium rounding, 40px height, 12–14px text.
- **Focus:** 1px ring in the accent, no layout shift, no glow sprawl.
- **Error / Disabled:** destructive-tint alert boxes with recovery copy; disabled fields mute to secondary surfaces with `not-allowed` cursor.

### Navigation
- **Sidebar:** quiet rows, medium rounding, muted labels; active state is a 10% indigo wash with indigo text plus a 4px rail — never a filled pill. Collapses under 1024px; icon-only buttons always carry accessible names.

### Citation Chip (signature component)
The product's moat as a component: an inline `[Page N]` pill — 10–11px bold mono on indigo tint with a hairline indigo border — that scrolls the document to the exact page on activation. Always keyboard-focusable with a visible ring. Citations are load-bearing UI; they are never truncated, never decorative, never faked.

## Do's and Don'ts

### Do:
- **Do** keep Seminar Indigo rare (≤10% of any screen) — The One Voice Rule.
- **Do** use Fraunces for statements and DM Sans for everything functional — The Statements-Only Rule.
- **Do** separate resting surfaces with hairlines and tonal steps, reserving shadow for overlays, press states, and paper.
- **Do** write specific, verifiable copy with exact numbers and named pages.
- **Do** hold body text to ≥4.5:1 (large ≥3:1) and functional text to ≥11px — The Floor Rule.
- **Do** give every icon-only control an accessible name and a visible focus ring.

### Don't:
- **Don't** ship generic AI SaaS: no gradient heroes, no gradient text (`background-clip: text` is forbidden), no big-number metric templates, no glassmorphism, no pulsing liveness baits.
- **Don't** build identical card grids — same-sized icon + heading + text cards repeated endlessly. Vary topology or don't build the grid.
- **Don't** put a tiny uppercase tracked eyebrow above sections, or numbered `01 / 02 / 03` markers anywhere except a genuine ordered sequence.
- **Don't** use `border-left` / `border-right` over 1px as a colored accent on cards, callouts, or alerts.
- **Don't** animate layout properties, bounce, or elastic easing; motion conveys state at 150–200ms with exponential ease-out, and every animation respects `prefers-reduced-motion`.
- **Don't** fake UI: no dead buttons, no stub actions, no invented data, no limits revealed after commitment.
