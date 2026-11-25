---
name: Kinetic Obsidian
colors:
  surface: '#121315'
  surface-dim: '#121315'
  surface-bright: '#38393b'
  surface-container-lowest: '#0d0e10'
  surface-container-low: '#1b1c1e'
  surface-container: '#1f2022'
  surface-container-high: '#292a2c'
  surface-container-highest: '#343537'
  on-surface: '#e3e2e5'
  on-surface-variant: '#c0caad'
  inverse-surface: '#e3e2e5'
  inverse-on-surface: '#303033'
  outline: '#8b947a'
  outline-variant: '#414a34'
  surface-tint: '#8edb00'
  primary: '#ffffff'
  on-primary: '#203600'
  primary-container: '#a3fa00'
  on-primary-container: '#467000'
  inverse-primary: '#426900'
  secondary: '#c7c6ce'
  on-secondary: '#2f3036'
  secondary-container: '#46464d'
  on-secondary-container: '#b5b4bc'
  tertiary: '#ffffff'
  on-tertiary: '#2e303a'
  tertiary-container: '#e1e1ef'
  on-tertiary-container: '#62646f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#a3fa00'
  primary-fixed-dim: '#8edb00'
  on-primary-fixed: '#112000'
  on-primary-fixed-variant: '#304f00'
  secondary-fixed: '#e3e1ea'
  secondary-fixed-dim: '#c7c6ce'
  on-secondary-fixed: '#1a1b21'
  on-secondary-fixed-variant: '#46464d'
  tertiary-fixed: '#e1e1ef'
  tertiary-fixed-dim: '#c5c5d3'
  on-tertiary-fixed: '#191b25'
  on-tertiary-fixed-variant: '#444651'
  background: '#121315'
  on-background: '#e3e2e5'
  surface-variant: '#343537'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  metric-numeral-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.04em
  metric-numeral-lg:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
  label-badge:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1.25rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system channels an uncompromising, high-precision athletic aesthetic engineered for serious bodybuilders, strength athletes, and performance-focused lifters. The design language marries the industrial discipline of elite sports science with modern computational minimalism: hyper-legible metrics, calibrated dark surfaces, and razor-sharp accents. 

The emotional tone balances obsessive focus, visceral motivation, and technical mastery. The UI recedes into the periphery, allowing performance data—reps, volume load, exertion curves, and localized muscle fatigue—to command the visual field. Interactions are instantaneous, physical, and tactile, relying on high-contrast data pills, calibrated tabular geometry, and targeted neon highlights rather than decorative distraction.

## Colors

The palette establishes an ultra-deep visual field where the canvas (`#08090B`) absorbs ambient distraction, and mid-tier structural surfaces (`#1C1D23`) stage actionable tracking components.

- **Primary (`#A6FF00`)**: An electric kinetic lime applied exclusively to high-intent interactions: primary call-to-action buttons, completed set badges, active PR breakthroughs, active progress rings, and targeted anatomical activation zones. Never used for continuous bulk text or non-interactive container fills.
- **Secondary (`#1C1D23`)**: Dark graphite surface container tier used to lift cards, modular metric tiles, and input sheets out of the abyss.
- **Tertiary / Structural Stroke (`#262832`)**: Subtle boundary definition for cards, split rows, table grids, and empty progress ring tracks.
- **Neutral Canvas (`#08090B`)**: Deep void black serving as the universal app canvas backdrop.
- **Primary Text (`#FFFFFF`)**: Pure crisp white reserved for core telemetry, current weight loads, rep counters, and section headers.
- **Secondary Text (`#8E92A0`)**: Muted titanium gray for field labels, timestamps, RPE notes, and secondary telemetry metadata.
- **Semantic Accents**: Critical strain/plateau states use `#FF334B`; neutral recovery/rest states use `#00E5FF`.

## Typography

The type system pairs the calculated, mechanistic geometry of Space Grotesk for metrics, technical indices, and display structures with the frictionless clarity of Inter for body text, session logs, and input feeds.

- Force tabular figures (`font-variant-numeric: tabular-nums`) across all weight logs, rep tickers, and active rest chronometers to prevent visual jitter during workout execution.
- `label-caps` must always be rendered in full uppercase with positive letter spacing (+0.08em) when designating telemetry states (e.g., `TARGET RPE`, `EST. 1RM`, `FATIGUE INDEX`).
- Numerical weights (kg/lbs) must prioritize hierarchy: the integer uses `metric-numeral-*` in pure white, while units (LBS / KG) trail in `label-caps` in `#8E92A0`.

## Layout & Spacing

The architecture operates on a mobile-first 4-column dynamic grid, scaling into a fixed 12-column analytical layout for tablet and desktop dashboard interfaces.

- **Mobile Viewport (Base)**: 4-column layout with 16px (`1rem`) outer canvas margins and 12px (`0.75rem`) gutters. Content groups adhere strictly to 4px and 8px base multipliers. Vertical rhythm within active workout logging must remain dense (compact 8px gaps between previous set rows) to maximize visible vertical real estate above mobile soft keyboards.
- **Card Enclosures**: Internal card padding standard is `space-lg` (20px) for standard summary cards, reduced to `space-md` (16px) for fast-entry set tables and compact telemetry pods.
- **Reflow & Responsive Adaptations**: On larger views (viewport > 768px), set logs and anatomical heatmaps reposition side-by-side into split 6-column panes to keep active logging forms within single-hand thumb reach on portable tablets.

## Elevation & Depth

Visual hierarchy uses tonal surface layering and razor-sharp border strokes rather than diffused multi-directional drop shadows.

- **Base Canvas**: Level 0 (`#08090B`), non-elevated ground plane.
- **Layer 1 (Cards & Modules)**: Level 1 (`#1C1D23`), bounded by an absolute 1px inner or outer hairline border of `#262832`. No drop shadows; separation is established strictly through edge demarcation and tonal shift.
- **Layer 2 (Sheets, Modals & Floating Bottom Bar)**: Level 2 (`#22242C`) with a precise 1px perimeter stroke of `#323542`. For fixed bottom bars, a directional top-border border-line (`#262832`) is combined with a subtle 24px vertical background blur (`backdrop-filter: blur(16px); background: rgba(28, 29, 35, 0.85)`).
- **Active Focus & Glowing Accentuation**: When a set is actively timer-bound or a rep field is engaged, replace the neutral `#262832` border with a 1px `#A6FF00` stroke, accompanied by a targeted ambient glow: `box-shadow: 0 0 16px rgba(166, 255, 0, 0.15)`.

## Shapes

The interface balances soft industrial ergonomics with athletic rigidity:
- **Cards & Primary Modules**: Formed with standard 16px to 20px corners (`rounded-xl` to `rounded-2xl`), delivering smooth pocket framing for data matrices and set tables.
- **Interactive Data Pills & Chips**: Fixed at full pill contour (`rounded-full`, 9999px) to contrast against rectangular card bounding boxes.
- **Input Fields & Numeric Cells**: Scaled at `rounded-md` (8px to 10px) to sustain mechanical rigidity and tabular stability.
- **Heatmap Anatomy Nodes**: Anatomical muscle segment polygons use rounded join caps (2px) within vector silhouettes to blend organic physiology with high-tech HUD styling.

## Components

### Action Buttons
- **Primary Execution (Log Set / Finish Workout)**: Solid background in `#A6FF00`, text and icons in `#08090B` (`Space Grotesk`, Bold 14px uppercase). Height: 52px on mobile for confident thumb tapping. Active state transitions to `#8CE600`.
- **Secondary (Add Exercise / Reorder)**: Background in transparent fill, 1px stroke in `#262832`, crisp white text. Hover/pressed turns background to `rgba(166, 255, 0, 0.08)` and stroke to `#A6FF00`.

### Data Pills & Set Badges
- **Status Pills**: Fully rounded pill capsules containing metric telemetry (e.g., `+5.0 LBS`, `RPE 9`). Solid background in `#262832` with `#8E92A0` text; dynamic PR badges take solid `#A6FF00` with `#08090B` typography.
- **Set Completion Checkboxes**: 28x28px squircle (8px radius) container. Default state: 1px border `#262832`, empty background. Completed state: Solid `#A6FF00` fill with a sharp `#08090B` checkmark icon.

### Set Table Rows
- Monospaced alignment using Space Grotesk tabular figures. Column sequence: Set Number (`label-caps`), Previous Performance (`#8E92A0`), Weight Field, Reps Field, Completion Check.
- Row separators: 1px solid `#262832`. Alternate row coloring is strictly avoided; use 4px vertical cell spacing instead.

### Input Fields (Weight & Rep Entry)
- Flat container `#14151A` with a 1px border of `#262832`. Centered text using `metric-numeral-lg` in pure white.
- Focused state: 1px active `#A6FF00` border, keyboard opens in specialized dark numeric keypad mode without dismissing lower summary stats.

### Sleek Progress Rings
- Vector SVG circular gauges with 6px to 8px stroke weight.
- Unfilled background rail rendered in `#262832`. Active trajectory rendered in `#A6FF00` with rounded stroke-ends (`stroke-linecap: round`). Central void houses `metric-numeral-lg` with contextual sub-label underneath in `#8E92A0`.

### Anatomical Muscle Heatmap Pods
- Modular cards housing an obsidian-tinted anatomical vector silhouette (anterior and posterior views).
- Baseline unworked muscle tissue rendered in `#262832`. Muscle group activation scales dynamically:
  - 1-3 sets: `rgba(166, 255, 0, 0.25)`
  - 4-7 sets: `rgba(166, 255, 0, 0.65)`
  - 8+ sets (High Fatigue / Target Reached): `#A6FF00` solid with an ambient 4px localized drop shadow.