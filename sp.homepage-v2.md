# sp.homepage-v2 — Futuristic 3D Home Page Redesign

**Project:** SMIT AI Teaching Assistant
**Scope:** `smit-frontend` — home page only (`app/page.tsx`, `components/CyberUI.tsx`,
`components/HeroScene.tsx`, `components/RobotCore.tsx`, `components/AICore.tsx`,
`components/HeroSection.tsx`)
**Build tool:** OpenCode
**Goal:** Replace the current bordered-panel terminal aesthetic with a genuinely
futuristic, animated AI/robotics showcase — the home page should feel like a
living machine, not a dashboard.

---

## What's wrong with the current home page (be specific about this)

- The hero is built from `cyber-panel` elements — `border: 1px solid`,
  `border-radius: 0` (see `app/globals.css`) — literal rectangles with hard
  edges around a terminal-text screen. This reads as a retro terminal UI, not
  an AI product.
- `RobotCore.tsx` currently renders an abstract glowing icosahedron-style
  "AI core" with a custom fresnel/displacement shader — it's a nice glowing
  blob, but there's no actual robot or machine silhouette. The brief asks for
  something that unmistakably reads as robot/computer, not an abstract orb.
- Everything is static-panel-plus-text; there's no camera movement, no
  depth, no sense of scale. Scroll currently does very little beyond
  triggering text decode effects.

## What "Home Page 2.0" should feel like

Think: a robot/AI entity that the visitor is meeting for the first time, in
an environment made of light and particles rather than boxes. Concretely:

- No hard-bordered rectangular panels anywhere above the fold. Where text
  needs a background for legibility, use a soft radial glow / gradient falloff
  or a particle-density field behind it — never a straight-edged box.
  Below the fold, where actual product UI (feature panels, CTAs) needs
  structure, soft-edged glass panels (blurred, glowing, rounded, no visible
  straight border line) are fine — just not `cyber-panel`'s literal
  rectangle-with-border look.
- A real robot/machine presence as the hero centerpiece: a stylized robotic
  head or humanoid bust with visible mechanical detail (panel lines, a
  glowing "eye"/visor, articulated joints implied through geometry) — built
  from primitive Three.js geometries + custom shaders (matching the existing
  approach in `RobotCore.tsx`/`AICore.tsx`), OR a loaded low-poly GLTF model
  if OpenCode has one available — whichever produces a more convincing result
  without bloating bundle size. Decide and justify the choice, don't just
  default to primitives if a lightweight model is a better fit.
- The robot reacts to the visitor: subtle head/eye tracking toward the mouse
  cursor (reuse the mouse-vector pattern already in `HeroScene.tsx`), a
  idle "breathing"/pulse animation, and a distinct "thinking" state (reuse
  the `thinking` prop pattern already in `RobotCore.tsx`) that triggers when
  a visitor hovers a CTA — as if the AI is considering the action.
- Depth and camera movement: as the user scrolls, the camera should
  dolly/orbit slightly through the scene (GSAP `ScrollTrigger` + Three.js
  camera position tweens — `HeroScene.tsx` already imports
  `gsap/ScrollTrigger`, extend that setup) rather than the page just being a
  flat stack of sections.
- A living background: replace any flat/solid section backgrounds with a
  continuous particle field or energy-grid that flows underneath every
  section (not just the hero), so scrolling never feels like leaving one
  "screen" and entering a plain page.
- Section transitions should feel like the camera is moving through a space,
  not like divs stacking — e.g. particles converging into a form to
  introduce a new section, or a light trail connecting the robot to the
  next block of content.

## Explicit constraints

- Don't touch `cyber-panel` styling used elsewhere in the app (report page,
  dashboard, etc.) — this redesign is scoped to the home page only. If the
  home page needs its own visual language, add new CSS (e.g. a
  `.hologram-panel` class) rather than modifying the shared `cyber-panel`
  class other pages depend on.
- Keep the existing boot sequence / matrix-decode text effects in
  `CyberUI.tsx` if they still fit tonally — the ask is to remove *boxes*,
  not necessarily every existing effect. Use judgment; reuse what's already
  good (the decode text effects, the mouse-reactive shader pattern) rather
  than rewriting everything from scratch.
- Respect `prefers-reduced-motion`: provide a materially calmer variant
  (slower/no camera movement, robot idle-only, particles static or removed)
  rather than disabling the visual entirely — the page shouldn't become
  blank for those users.
- Provide a mobile fallback: full camera-move + dense-particle scenes are
  expensive on phones. Detect viewport/device and drop to a simpler version
  (fewer particles, a static or minimally-animated robot, no scroll-driven
  camera dolly) rather than shipping the desktop scene unchanged.
- All CTAs (`Start Grading` → `/submit`, any login/dashboard links) must
  still work exactly as they do now — this is a visual redesign, not a
  navigation change.
- Keep frame rate in mind: profile with the browser's performance panel:
  target smooth animation on a mid-range laptop; degrade particle count
  before degrading the robot's fidelity if a trade-off is needed.

## Technical approach

- Stay with raw Three.js (`three` is already a dependency; no
  `@react-three/fiber`/`@react-three/drei` currently installed, despite jest
  mocks existing for them in `__mocks__/` — those mocks appear to be unused
  scaffolding). Only add r3f/drei if you judge it genuinely reduces
  complexity for the scroll-driven camera work — if you do, note it clearly
  in your summary since it's a new dependency.
- Reuse the custom-shader pattern already established in `RobotCore.tsx`
  (vertex displacement + fresnel glow) for a cohesive visual identity between
  whatever the robot's face/eye/core is and the rest of the scene, rather
  than introducing a completely different rendering style.
- Reuse `gsap.context()` + `ScrollTrigger` patterns already present in
  `HeroScene.tsx` for scroll choreography.
- New/renamed files are fine (e.g. `components/RobotHero.tsx` replacing or
  wrapping `RobotCore.tsx`) — this is a big enough visual change that a
  clean restructure of the hero component tree is expected. Keep `AICore.tsx`
  and `HeroScene.tsx`'s existing exports working if any other page imports
  them; check before deleting anything.

## Acceptance criteria

- `npx tsc --noEmit`, `npx jest --watchAll=false`, and `npx next build` all
  pass.
- No `cyber-panel` bordered rectangle visible anywhere above the fold on the
  home page.
- A recognizable robot/machine form is present and animating (idle + mouse
  reaction + a distinct thinking state) — not an abstract orb alone.
- Scrolling produces visible camera/scene movement, not just text reveals.
- `prefers-reduced-motion` and a small-viewport (mobile) pass both produce a
  usable, non-blank, meaningfully lighter version of the page.
- All existing CTAs/links on the home page still navigate correctly.
- Any other page that currently imports `RobotCore`/`AICore`/`HeroScene`
  still renders without errors.
