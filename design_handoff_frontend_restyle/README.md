# Handoff: AudioAI Frontend Restyle (Pro-Audio Dark UI)

## Overview

A full visual redesign of the AudioAI client (repo: `EPW80/audioAi`, `client/` — React 18 + TypeScript + Vite + TailwindCSS). The existing neon/vaporwave glassmorphism theme (animated gradients, scan lines, glow shadows, Orbitron font) is replaced with a refined pro-audio dark UI in the spirit of Ableton/Resolve: flat graphite surfaces, 1px borders, a single amber accent, and IBM Plex Sans/Mono typography.

Four screens are redesigned: **Home**, **Login**, **Projects**, **Editor**. Routes, component structure, and data flow are unchanged — this is a restyle with minor layout refinements.

## About the Design Files

The `.dc.html` files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. The task is to **recreate these designs inside the existing codebase** (React + Tailwind), reusing its component structure (`GlassButton` → restyled `Button`, `GlassCard` → `Card`, etc.) and replacing the theme layer (`index.css` tokens + `tailwind.config.js`). Open each file in a browser to inspect it; all styles are inline, so exact values are readable directly from the markup.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, and states are final. Recreate pixel-perfectly. Sample content (project names, dates, waveform shapes, particle dots, AI suggestions) is placeholder data — bind to real data as today.

## Design Tokens

Replace the HSL variables in `client/src/index.css` with:

| Token | Value | Use |
|---|---|---|
| `--bg-app` | `#141416` | Page background |
| `--bg-panel` | `#1B1B1E` | Header, cards, side panel, bottom dock |
| `--bg-raised` | `#232327` | Secondary buttons, chips, icon tiles, segmented-control active |
| `--bg-inset` | `#101012` | Inputs, timeline rail, segmented-control track |
| `--bg-inset-deep` | `#0F0F11` | Editor preview viewport |
| `--bg-card-nested` | `#161618` | Cards inside the side panel (presets, AI suggestions) |
| `--border` | `#2A2A2F` | Default 1px border everywhere |
| `--border-strong` | `#3A3A41` | Hover borders, active icon-button border |
| `--border-hover-card` | `#45454C` | Project/preset card hover border |
| `--text-primary` | `#EDEDEF` | Headings, body |
| `--text-secondary` | `#A3A3AB` | Labels, descriptions |
| `--text-muted` | `#6C6C74` | Hints, timecodes, inactive tabs |
| `--accent` | `#E8933A` | Primary buttons, active states, playhead, played waveform |
| `--accent-hover` | `#F2A44E` | Primary button hover, accent-link hover |
| `--on-accent` | `#191006` | Text/icons on amber |
| `--accent-dim` | `rgba(232,147,58,0.12)` | Accent chip backgrounds |
| `--accent-border` | `rgba(232,147,58,0.25)` | Accent chip borders (0.45 for active preset card) |
| `--status-ready` | `#55B36E` | ready / complete |
| `--status-analyzing` | `#5C9CD6` | analyzing |
| `--status-rendering` | `#E8933A` | rendering |
| `--status-uploaded` | `#CFAF52` | uploaded |
| `--status-failed` | `#D95F58` | failed (destructive hover: `rgba(217,95,88,0.15)` bg) |
| Waveform unplayed | `#3A3A41` | transport + hero motif |
| Timeline beat grid | `#26262B` | 1px vertical lines |

**Removed entirely:** all `neon-*` colors, glow box-shadows, `glass` blur classes, animated gradient/grid/hexagon/particle/scan-line background components (`AnimatedGradient`, `GridBackground`, `FloatingShapes`, `ParticleBackground`, `ScanLines`, `HexagonPattern`, `NeonText` can be deleted). The only animations kept: a 1.2s opacity pulse on in-progress status dots, and standard 0.15s color/border transitions.

### Typography

Google Fonts: `IBM Plex Sans` (400/500/600/700) and `IBM Plex Mono` (400/500/600). Replace Orbitron/Rajdhani/Inter/JetBrains Mono.

- UI/body: Plex Sans. Headings weight 600, letter-spacing −0.01 to −0.025em.
- Mono (Plex Mono): timecodes, dates, email, BPM, style tags (10–11px uppercase, letter-spacing 0.06–0.14em), 12px panel values.
- Scale: hero 52/1.08 · page title 24/30 · card title 22/28 · section 15–16/600 · body 14/21 · panel UI 13/18 · hints 12/17 · micro-mono 9–11px.

### Radii & elevation

- 6px: buttons, inputs, segmented controls, timeline rail
- 8px: editor viewport, preset/suggestion cards, icon tiles
- 10px: cards (features, projects, hero waveform frame)
- 12px: login card
- No drop shadows anywhere; hierarchy comes from surface color + 1px borders.

### Buttons

- **Primary**: amber bg, `--on-accent` text, weight 600, radius 6, hover `--accent-hover`. Sizes: sm 7px/14px padding · 13px text; md 9–11px/16–22px · 14–15px text.
- **Secondary**: `--bg-raised` bg, 1px `--border`, text primary; hover border `--border-strong`.
- **Ghost**: transparent, text secondary; hover bg `--bg-raised`, text primary.
- **Accent chip** (e.g. "Add keyframe"): `--accent-dim` bg, `--accent-border` border, amber text, 12px/600.
- Icon buttons: 7px padding, radius 6, ghost behavior.

### Icons

Lucide (already used by the codebase). SVGs bundled in `icons/` for reference: music, upload, sparkles, download, folder-open, log-out, plus, trash-2, arrow-left, settings, wand-sparkles, refresh-cw, save, play, pause, x, chevron-up/down, clock, circle-check, circle-alert, loader-circle. Sizes: 11–20px depending on context (see markup).

## Shared Chrome: Header

56px tall, `--bg-panel`, 1px bottom `--border`. Content max-width 1120px, 24px side padding.
- **Logo**: 26×26 amber tile (radius 6) with 15px music icon in `--on-accent`, + "AudioAI" 15px/600.
- Logged out: primary sm "Log in". Logged in: secondary sm "Projects" (folder-open 14px) · email in mono 12px `--text-muted` · ghost sm "Log out" (log-out 14px).
- The Editor route replaces this header with its own single top bar (below).

## Screens

### 1. Home (`Redesign - Home.dc.html`)

Max-width 1120, centered, 96px top padding. All background effect layers removed — flat `--bg-app`.
- Eyebrow: mono 12px/500, uppercase, 0.14em tracking, amber — "AUDIO → VIDEO VISUALIZATION", 20px below → H1.
- H1 52px/1.08, 650, −0.025em, centered, max-width 720: "Transform audio to **visual art**" ("visual art" in amber).
- Subcopy 17/26 `--text-secondary`, 36px below → buttons.
- Buttons row: primary "Get started" + secondary "Learn more", 12px gap, 72px below → waveform motif.
- **Waveform motif** (product hint, replaces hero animations): 880px max card, `--bg-inset` bg, border, radius 10, 20/24 padding. 96 bars (flex:1, 2px gap, radius 1, 72px lane): played bars amber, rest `#3A3A41`, playhead at 42%. Footer row: mono 11px — `00:00.000` left (muted), `▶ midnight-drive.wav` center (amber), `03:47.520` right (muted).
- **Features**: 3-col grid, 16px gap. Card: `--bg-panel`, border, radius 10, 24px padding; hover border `--border-strong`. 36×36 icon tile (`--bg-raised` + border, radius 8) with 18px amber icon; 16px/600 title 6px above 14/21 secondary body. Copy unchanged from current app.

### 2. Login (`Redesign - Login.dc.html`)

Header nav: single ghost-bordered "Back to home". Card centered, 400px, 88px below header.
- Card: `--bg-panel`, border, radius 12, 32px padding. Title "Welcome back" 22/600; sub "Sign in to your projects and exports." 14px secondary, 28px below.
- Fields (18px gap): label 13px/500 secondary, 6px above input. Input: `--bg-inset`, border, radius 6, 10/12 padding, 14px text; focus → border amber (no glow ring).
- Submit: primary full-width, 11px vertical padding, "Sign in".
- Below card (20px): "Don't have an account? **Create one**" — 14px secondary, link amber/500, hover `--accent-hover`.
- Error state (from current app): keep a 13px `--status-failed` text block above fields, bg `rgba(217,95,88,0.1)`, border `rgba(217,95,88,0.3)`, radius 6, 12px padding.

### 3. Projects (`Redesign - Projects.dc.html`)

Max-width 1120, 40px vertical padding.
- Title row: "Projects" 24/600 with "{n} projects" 13px muted 4px below; right: primary "New project" with plus 16px.
- Grid: 3 columns, 14px gap. Card: `--bg-panel`, border, radius 10, 18px padding; hover border `#45454C`, cursor pointer.
  - Row 1: name 15px/600, ellipsis; trash icon-button (15px) — opacity 0, fades in on card hover; its hover: `--status-failed` color + `rgba(217,95,88,0.15)` bg.
  - Row 2 (14px below name): 7px status dot (colors above; analyzing/rendering pulse 1.2s) + status label 13px secondary capitalize + optional style tag (mono 10px uppercase, `--bg-raised` + border, radius 4, 2/7 padding) + date right-aligned mono 11px muted (`YYYY-MM-DD`).
- Upload modal (not mocked): reuse current structure with these surfaces — overlay `rgba(0,0,0,0.6)`, dialog `--bg-panel` + border radius 12, dashed drop zone border `--border-strong` → amber when drag-active.

### 4. Editor (`Redesign - Editor.dc.html`)

Full-viewport column: top bar / main / bottom dock. Replaces both the app header and the old editor top bar with **one 52px bar**.
- **Top bar**: `--bg-panel`, bottom border. Left: back arrow icon-button → 24×24 amber logo tile → project name 14px/600 → status pill (mono 10px uppercase, `rgba(85,179,110,0.12)` bg, `--status-ready` text, radius 4). Right: mono 11px muted "128 BPM · 03:47" → settings icon-button (toggles panel; active = `--bg-raised` bg + `--border-strong` border) → primary sm "Export" with download 14px.
- **Viewport**: fills remaining space, 12px margin, `--bg-inset-deep`, border, radius 8. Three.js canvas inside. Overlay labels mono 10px muted: "PREVIEW · PARTICLES" top-left, "720p · 30 fps" bottom-right.
- **Side panel**: 300px, `--bg-panel`, 1px left border; column = tabs / scrollable content (14px padding) / footer.
  - Tabs: 3 equal-width (Style / Params / AI) with 13px icons, 13px/500 text; active = text primary + 2px amber underline; inactive = muted.
  - **Style tab**: hint 12px muted; preset cards 8px gap — `--bg-card-nested`, border, radius 8, 10/12 padding; row: three 10px swatches (radius 3) + name 13px/600 + "ACTIVE" (mono 9px uppercase amber, right) on selected; description 12/17 muted below. Selected: border `rgba(232,147,58,0.45)`, bg `rgba(232,147,58,0.07)`. Hover: border `#45454C`.
  - **Params tab**: each control = label 13px/500 secondary left, value mono 12px primary right, slider below. Slider: 4px track `--border` radius 2, 14px amber round thumb. Colors: three 34×34 swatches radius 6 + border (color inputs). Export resolution: segmented control — `--bg-inset` track, border, radius 6, 2px padding; active segment `--bg-raised` mono 12px/600 primary, inactive transparent muted.
  - **AI tab**: "Style suggestions" 13px/600 + amber "Refresh" (refresh-cw 11px) right. Mood row: 12px muted label + mono uppercase tag. Suggestion card: `--bg-card-nested`, radius 8, 12px padding — name 13px/600 capitalize; confidence = 56×4px bar (`--border` track, amber fill) + mono 11px muted %; 16px palette swatches radius 4; explanation 12/18 secondary; "Apply style" amber 12px/600. "Generation mode" section after 1px divider: segmented Procedural/AI hybrid, description 12px muted, secondary full-width "Save AI settings" (save 12px).
  - Footer: 12/14 padding, top border, primary full-width "Save settings".
- **Bottom dock**: `--bg-panel`, top border, 12/16 padding, 10px row gap.
  - Timeline header: "TIMELINE" mono 10px uppercase 0.1em muted left; right: secondary chip "Beats" (music 11px, active = `--border-strong` border), "Snap" checkbox (13px, `accent-color` amber), accent chip "Add keyframe" (plus 11px).
  - Rail: 36px, `--bg-inset`, border, radius 6. Beat grid: 1px `#26262B` verticals (per beat). Progress fill `rgba(232,147,58,0.08)`; playhead 2px amber; keyframes = 8px amber diamonds (rotate 45°, radius 2, 1px `--bg-panel` outline) at their times; mono 9px muted "0:00"/"3:47" in bottom corners.
  - Keyframe chips (replaces old stacked list): wrap row, 6px gap — `--bg-raised` + border, radius 5, 4/8 padding: time mono 11px amber · three 9px swatches · style name 12px secondary capitalize · trash 11px (hover `--status-failed`).
  - Transport: 44px round amber play button (`--on-accent` 20px play icon, hover `--accent-hover`) · time "1:23 / 3:47" mono 13px (current primary, total muted) · waveform lane 64px: bars flex:1 with 1px gap, radius 1, played amber / unplayed `#3A3A41` (WaveSurfer: `waveColor #3A3A41`, `progressColor #E8933A`, `cursorColor #EDEDEF`, cursorWidth 1.5, barWidth 2, barGap 1, barRadius 1, height 64).

## Interactions & Behavior

- All hover/focus states above; transitions 0.15s ease on color/border/background only. No transform or glow effects.
- Focus-visible: replace the neon glow with a plain 2px amber outline, 2px offset.
- Editor: settings button toggles side panel; tabs switch panel content; preset click selects (updates border/bg/ACTIVE tag and should apply preset settings as today); sliders update mono value live; rail click seeks; play/pause toggles icon.
- Projects: card click navigates to editor; trash appears on card hover, click stops propagation + confirm-deletes.
- Status dots for `analyzing`/`rendering` pulse (opacity 1 → 0.35 → 1, 1.2s ease-in-out infinite).
- Scrollbars: drop the neon gradient scrollbar; use default dark or a plain `#3A3A41` thumb.

## State Management

Unchanged from the current app (Zustand auth store, React Query, editor local state: activeTab, showSettings, activeStyle, particleCount, intensity, colorPalette, keyframes, resolution). The redesign adds no new state; the merged Editor top bar means the global `<Header>` should not render on `/editor/:id`.

## Assets

- Fonts: Google Fonts — IBM Plex Sans, IBM Plex Mono (linked in each design file).
- Icons: `icons/` (Lucide SVGs, MIT) — same set as the `lucide-react` package already in the codebase.
- No raster images.

## Files

- `Redesign - Home.dc.html` — landing page
- `Redesign - Login.dc.html` — auth screen
- `Redesign - Projects.dc.html` — project grid (populated state; statuses/tags/dates are sample data)
- `Redesign - Editor.dc.html` — full workspace (open in a browser: tabs, panel toggle, preset selection, and sliders are interactive)
- `icons/` — Lucide SVG reference set

Each file is self-contained HTML with inline styles — inspect any element to read its exact values.
