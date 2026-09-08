# Corgi GrowthOS — Overview Screen UI Specification

> **Document type:** Senior product designer's screen spec (MVP, screen 1 of 4).
> **Data source:** All example values are pulled from the generated synthetic dataset (`summary.json`, `acquisition_data.csv`). This is a **synthetic portfolio simulation**, not Corgi's actual performance. Every number below is real within the simulated dataset and should be populated dynamically at build time.

---

## 0. Senior designer's framing

Before any layout: **design the screen around the operator's morning decision, not dashboard completeness.**

Corgi's public website sells trust and speed — "Business Insurance at the Speed of Compute," founder-first, AI-native. That language is for *buyers*. GrowthOS is for the *operator inside Corgi* whose job is to defend ad spend. So the product's job is not to look like the marketing site; it is to **operationalize speed** — take the same "fast, sharp, no-waiting" promise and point it inward, at the question:

> *Where should the next dollar go, and why?*

A growth lead opens this screen every morning to answer one thing: **did anything change overnight that changes where I spend today?** Every component on the screen is in service of that question. If a component does not help the operator decide where to put the next dollar, it does not belong on this screen.

---

## 1. Product principles (applied to every component)

These principles are the tiebreaker when a design choice is ambiguous. They also make the "why" obvious to anyone reviewing the portfolio.

| # | Principle | What it means in practice | Where it shows up |
|---|---|---|---|
| P1 | **Decision before decoration** | Every panel ends with a recommended action, not just a number. No chart exists "for completeness." | Insight panel, campaign drill-in, funnel |
| P2 | **CAC and CPQL over clicks** | The headline metric is cost to acquire a *qualified customer*, not cost to acquire a click. Hierarchy: CAC > CPQL > CPL > CTR. | KPI card order, channel bar ordering |
| P3 | **Insight → evidence → action** | Every recommendation is followed by the 2–3 numbers that justify it, then a single verb. No naked assertions. | Insight panel, drill-in drawer |
| P4 | **Synthetic-data transparency** | The simulation is labeled, not hidden. It demonstrates honesty about attribution, not a fake "we hit our numbers." | Header disclaimer chip, footer |
| P5 | **Scale-aware recommendations** | "Best CAC" is never the whole answer; volume and diminishing returns are always stated alongside efficiency. | Retargeting insight, trend, budget hand-off |

The single design principle that differentiates this from a generic Looker/Tableau dashboard is **P1 + P3**: the product always tells you *so what* and *what to do*, with the evidence attached.

---

## 2. Product mental model and information architecture

### 2.1 Mental model

```
ACQUIRE  →  MEASURE  →  LEARN  →  ALLOCATE  →  ACQUIRE BETTER
```

The Overview screen lives in **MEASURE** and feeds **LEARN** and **ALLOCATE**. It is not the acquisition engine and it is not the budget optimizer — it is the instrument panel that tells the operator whether the current allocation is producing qualified customers, and where the funnel is breaking.

### 2.2 Information architecture

```
                        CORGI GROWTHOS
                             │
          ┌──────────────────┼──────────────────┐
          ↓                  ↓                  ↓
      UNDERSTAND         LEARN             ALLOCATE
       Overview        Experiments          Budget
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ↓
                     Better acquisition
                             │
                          (Leads)
```

Four screens, always-visible left rail:

| Nav item | Screen job | Mental-model stage | One-line answer |
|---|---|---|---|
| **Overview** | What happened and what needs attention? | MEASURE | "Where is the funnel breaking and where should I look?" |
| **Experiments** | What are we learning? | LEARN | "Which test should I scale, continue, or kill?" |
| **Budget** | Where does the next dollar go? | ALLOCATE | "Reallocate $X from channel A to channel B, within these constraints." |
| **Leads** | Who is converting? | (feedback loop) | "Which leads became customers, and what does that say about targeting?" |

> **Scope of this document:** the Overview screen in full depth. Experiments, Budget, and Leads are included only as IA stubs (Section 13) so the architecture reads as complete. Each gets its own spec next.

### 2.3 Design hierarchy (the four levels every screen climbs)

| Level | Question | Overview component |
|---|---|---|
| 1 — What happened? | Raw facts | KPI cards |
| 2 — Why? | Diagnosis | Channel bars + funnel diagnostic |
| 3 — So what? | Interpretation | Insight panel ("What needs attention") |
| 4 — What do I do? | Recommendation | Per-campaign action + budget hand-off |

Level 4 is the differentiator. A senior designer ensures the eye lands on Level 3–4 first, not Level 1.

---

## 3. Overview screen — purpose and primary decision

- **Screen name:** Acquisition / Overview
- **User question (the one the operator types into nothing, but feels):** *"Did anything change that changes where I spend today?"*
- **Primary decision the screen supports:** *"Which channel/campaign should I expand, hold, or cut — and what evidence backs that?"*
- **Success metric for the screen itself:** time-to-first-decision under 60 seconds. The operator should be able to name the one campaign to expand and the one to cut before scrolling.

---

## 4. Desktop layout grid

Fixed-maximum app shell, centered, so it reads as a tool on large monitors and degrades gracefully.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ 12-col grid · max-width 1280px · gutter 24px · outer margin 32px           │
│                                                                           │
│ ┌─────┐ ┌─────────────────────────────────────────────────────────────────┐│
│ │     │ │  HEADER                                                        ││
│ │  N  │ ├─────────────────────────────────────────────────────────────────┤│
│ │  A  │ │  [Synthetic] chip · disclaimer                                  ││
│ │  V  │ ├─────────────────────────────────────────────────────────────────┤│
│ │     │ │  KPI CARDS   (4 across, 1 row)                                   ││
│ │  ◉  │ ├─────────────────────────────────────────────────────────────────┤│
│ │  ○  │ │  ECONOMIC SUMMARY   (premium + ROAS, slim)                      ││
│ │  ○  │ ├─────────────────────────────────────────────────────────────────┤│
│ │  ○  │ │  WHAT NEEDS ATTENTION   (insight panel — full width)           ││
│ │     │ ├─────────────────────────────────────────────────────────────────┤│
│ │     │ │  CHANNEL PERFORMANCE   │  FUNNEL DIAGNOSTIC                     ││
│ │     │ │  (7 cols)               │  (5 cols)                             ││
│ │     │ ├─────────────────────────────────────────────────────────────────┤│
│ │     │ │  CAC TREND   (full width, ~280px tall)                          ││
│ │     │ ├─────────────────────────────────────────────────────────────────┤│
│ │     │ │  FOOTER   data source · last updated · methodology link         ││
│ └─────┘ └─────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────────┘
```

- **Nav rail:** 64px collapsed (icons + labels on hover), 200px expanded. Sticky, full height.
- **Main column:** 12-col fluid grid inside the 1280px max.
- **Vertical rhythm:** sections separated by 32px; cards separated by 16px.
- **Min supported width:** 1024px. Below that, the two-column channel/funnel row stacks and KPI cards wrap 2×2.

---

## 5. Sidebar / navigation

### 5.1 Structure

```
┌─────────────────────┐
│  🐺  CORGI          │   ← wordmark, 16px bold, letter-spacing +1
│  GrowthOS            │   ← 11px muted, "internal operator tool"
├─────────────────────┤
│                     │
│  ● Overview         │   ← active: left 3px accent bar + tinted surface
│  ○ Experiments      │
│  ○ Budget           │
│  ○ Leads            │
│                     │
├─────────────────────┤
│  ACQUIRE → MEASURE   │   ← the mental model, 10px faint, rotated or
│  → LEARN → ALLOCATE  │     stacked; static, non-interactive
└─────────────────────┘
```

### 5.2 Rules
- Active item: 3px left accent bar in Primary, surface tinted `Surface alt`.
- Hover: surface tint only, no color shift.
- No icons that imply meaning the label doesn't already carry — keep them neutral (filled circle = active, hollow = inactive) to avoid decoration (design principle: no decoration).
- The mental-model footer is presentational only; it anchors the operator's mental map on every screen.

---

## 6. Header

### 6.1 Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Acquisition / Overview          [Synthetic]   90 days ▾   US ▾   ↗Export │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Breadcrumbs:** `Acquisition / Overview` — 13px muted. "Acquisition" is the product area; "Overview" is the screen. Clicking "Acquisition" does nothing (no parent screen) — it is context, not a link.
- **Synthetic chip:** a small pill, `Warning`-toned border, 11px. Tooltip on hover: *"Synthetic data for portfolio demonstration. No Corgi internal advertising or policy data was used."* This satisfies P4 (transparency) without clutter.
- **Date range:** `90 days ▾` defaulting to **Last 90 days (Jun 1 – Aug 29, 2026)**. Presets: 7d / 30d / 90d. No custom range picker in MVP.
- **Market:** `US ▾` — single value in MVP; the control exists to signal the operator thinks in markets.
- **Export:** ghost button, 13px. Exports current view as CSV + a 1-page PDF summary. Present but not wired in MVP.

### 6.2 Exact copy
- Breadcrumb: `Acquisition / Overview`
- Chip: `Synthetic`
- Range default: `Last 90 days`
- Market default: `US`
- Export label: `Export`

---

## 7. Executive KPI layer

Four cards only. The hierarchy is deliberate: **CAC and qualified customers come first, not spend.** Spend is card 1 because it is the input the operator controls; CAC is card 4 and visually the heaviest because it is the verdict.

### 7.1 Card layout and exact values (from `summary.json` → `totals`)

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ SPEND            │  │ QUALIFIED LEADS   │  │ POLICIES BOUND   │  │ CAC              │
│                  │  │                  │  │                  │  │                  │
│ $72.7K           │  │ 474              │  │ 51               │  │ $1,425           │
│ ▲ 8% vs prior 90d│  │ ▲ 12%            │  │ ▲ 4             │  │ ▼ $64 vs prior   │
│ ▁▂▃▄▃▅▆▇        │  │ ▁▂▂▃▃▄▅▆        │  │ ▁▁▂▃▃▄▅▆        │  │ ▆▅▄▃▄▃▂▂        │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

| Card | Value (from dataset) | Delta vs prior 90d* | Sparkline | Why this card |
|---|---|---|---|---|
| **Spend** | $72.7K (total `spend` = $72,671.80) | ▲ 8% | spend by week | The input the operator controls |
| **Qualified Leads** | 474 (`qualified_leads`) | ▲ 12% | qualified by week | Quality-adjusted demand, not raw leads |
| **Policies Bound** | 51 (`policies_bound`) | ▲ 4 | policies by week | Actual business output |
| **CAC** | $1,425 (`overall_cac` = $1,424.94) | ▼ $64 | CAC by week | The verdict on spend efficiency |

\*Deltas are computed against the prior 90-day window. In the synthetic dataset, the prior-window values are illustrative placeholders — wire them to a rolling comparison once the generator produces a second window, or compute "vs first 45 days" as a standing substitute and label it so.

### 7.2 Card anatomy
- **Label:** 11px, muted, uppercase, letter-spacing +0.5.
- **Value:** 28px bold, tabular-nums. This is the dominant element.
- **Delta:** 12px. `▲` in Success for good direction, `▼` in Error for bad. **Direction is semantic, not numeric:** for Spend, up can be neutral; for CAC, down is good; for Policies/Qualified, up is good. The arrow color follows *what the operator wants*, not the sign.
- **Sparkline:** 1px line, 32px tall, no axes, Primary at 60% opacity. Purely directional.
- **Surface:** `Surface` background, 1px `Border`, 12px radius, 20px padding.

### 7.3 Economic summary (slim, under the cards)

```
  Premium generated  $228.8K        ROAS  3.15×        CPQL  $153        CPL  $69
```

- 13px, muted, inline, separated by 24px gaps. No cards — this is secondary context.
- Values: `premium` = $228,837.16; `overall_roas` = 3.1489; `overall_cpql` = $153.32; `overall_cpl` = $68.75.
- Why this row: it gives the operator the full unit-economics set (CPL → CPQL → CAC → ROAS) without promoting them to card status. Reinforces P2 (CAC/CPQL over clicks) by showing the ladder explicitly.

---

## 8. "What needs attention" insight panel (the differentiator)

This is the most important component on the screen. It is where GrowthOS stops being a dashboard and starts being a decision system.

### 8.1 Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHAT NEEDS ATTENTION                                            see all →  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ⚠ Meta Generic — cheap leads, poor customers                              │
│  CPL $47 · CAC $5,018 · 2 policies from $10.0K spend                        │
│  → Reduce spend 30% and investigate lead quality before scaling.            │
│                                                                             │
│  ● Google Enterprise — your strongest scalable campaign                    │
│  21 policies · $1,114 CAC · 4.1× ROAS                                       │
│  → Expand carefully; watch marginal CAC rising after $4K/week (trend ↓).    │
│                                                                             │
│  ● Meta Retargeting — exceptional CAC, limited scale                        │
│  $68 CAC · 14 policies · ROAS 69×                                            │
│  → Hold at current budget; audience is near saturation, do not scale.       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Component rules
- **One primary insight (⚠)** at the top — the thing that most needs action today. Chosen by the worst ratio of spend-to-bound-customers.
- **2–3 supporting insights (●)** below it — the strongest scalable campaign, and the efficient-but-capped one.
- **Every insight is three lines:** headline (what), evidence (the 2–3 numbers), action (one verb + constraint). This is P3 made literal.
- **Icons:** `⚠` uses `Warning` color; `●` uses `Primary`. No emoji, no decorative icons (design principle).
- **"see all →"** links to a full insights list (out of scope for MVP — placeholder).

### 8.3 Exact copy and data mapping

| Insight | Headline | Evidence (from `by_campaign`) | Recommended action |
|---|---|---|---|
| Primary ⚠ | Meta Generic — cheap leads, poor customers | CPL $47 (`C-MTA-GEN.cpl`) · CAC $5,018 (`C-MTA-GEN.cac`) · 2 policies from $10.0K spend | Reduce spend 30% and investigate lead quality before scaling |
| Supporting ● | Google Enterprise — your strongest scalable campaign | 21 policies · $1,114 CAC · 4.1× ROAS (`C-GGL-ENT`) | Expand carefully; watch marginal CAC rising after ~$4K/week (see trend) |
| Supporting ● | Meta Retargeting — exceptional CAC, limited scale | $68 CAC · 14 policies · ROAS 69× (`C-MTA-RET`) | Hold at current budget; audience near saturation, do not scale |

> **Why this matters for the portfolio (call it out in the case study):** this panel demonstrates the operator does not just visualize data — they *interpret* it and *recommend an action*. That is the Growth Engineer role in one component.

### 8.4 Selection logic (how the system picks the primary insight)

The primary insight is the campaign with the **worst spend-to-policy ratio among campaigns with meaningful spend** (spend > $5K) — i.e., the biggest dollar sink producing the fewest customers. `C-MTA-GEN` wins this on $10.0K → 2 policies → CAC $5,018.

Supporting insights are: (a) the campaign with the most policies and CAC under target (`C-GGL-ENT`, 21 policies, CAC $1,114 < $2,500 target), and (b) the campaign with the best CAC but sub-scale volume (`C-MTA-RET`, $68 CAC but only 14 policies and a capped audience).

---

## 9. Channel performance module

### 9.1 Goal
Show the operator, at a glance, that **the cheapest-lead channel is not the cheapest-customer channel** — the central insight of the whole project.

### 9.2 Visual: ranked horizontal bars, not a spreadsheet

Ordered by CAC ascending (best first), with a secondary marker for volume (policies). Bars are CAC; the small dot is policies bound, so efficiency and volume are visible together.

```
CHANNEL PERFORMANCE                              ordered by CAC ▾

Google     ████████████            $1,779 CAC · 21 policies
LinkedIn   █████████████████       $1,415 CAC · 13 policies
Meta       ██████████████████████  $995 CAC · 17 policies

Wait — re-order by CPQL to reveal the real story:
Google     ██████████████          $156 CPQL
LinkedIn   ██████████████          $153 CPQL
Meta       █████████████           $147 CPQL   ← cheapest CPQL...

...but Meta's CAC is dragged down only by retargeting. Toggle to
campaign view to see Meta Generic at $5,018 CAC.
```

### 9.3 Actual values (from `summary.json` → `by_channel`)

| Channel | Spend | Leads | Qualified | Policies | CPL | CPQL | CAC |
|---|---|---|---|---|---|---|---|
| Google Search | $37.4K | 507 | 239 | 21 | $74 | $156 | $1,779 |
| LinkedIn | $18.4K | 187 | 120 | 13 | $98 | $153 | $1,415 |
| Meta | $16.9K | 363 | 115 | 17 | $47 | $147 | $995 |

### 9.4 Component rules
- **Default sort: CAC ascending.** Toggle: `CAC / CPQL / Policies / Spend`.
- **Bar = CAC** (or selected metric); bar length is linear, capped at the dataset max so the longest bar fills the column.
- **Dot at end of bar = policies bound** (volume indicator). This is P5 (scale-aware) in visual form: a short bar with a big dot is "efficient but high-volume"; a short bar with a tiny dot is "efficient but can't scale."
- **Click a channel** → expands to its campaigns inline (campaign-level bars, same anatomy).
- **No giant table.** The table above is the data source, not the UI. The UI is bars + dots + two numbers per row.

### 9.5 Campaign drill-in (expanded)

Clicking Google Search expands:

```
  Google Search
    C-GGL-ENT   ████████████   $1,114 CAC · 21 policies   ← scale this
    C-GGL-GEN   ████████████████████████████████   $— · 0 policies   ← cheap CPL, 0 customers
    C-GGL-RET   ████████████████████   $— · 0 policies   ← tiny volume
```

This is where the "cheap-leads trap" becomes undeniable: `C-GGL-GEN` has a fine CPL ($73) but zero bound policies — its CAC is `—` (displayed as the em-dash, never `Infinity`, per the generator's null-safe rule).

---

## 10. Funnel diagnostic

### 10.1 Goal
Show *where* the funnel breaks, not just *that* it converts. The operator should be able to point to one transition and say "this is the problem."

### 10.2 Layout (stacked conversion funnel)

```
FUNNEL                                    conversion rate →

  CLICKS              10,172
                         ↓ 79.0%        ← click→visit (bounce = 21%)
  LANDING PAGE VISITS  8,035
                         ↓ 13.1%        ← visit→lead
  LEADS                1,057
                         ↓ 44.8%        ← lead→qualified      ⚠ widest variance here
  QUALIFIED LEADS        474
                         ↓ 59.1%        ← qualified→quote start
  QUOTE STARTS           280
                         ↓ 44.3%        ← quote start→completed
  QUOTES COMPLETED       124
                         ↓ 41.1%        ← completed→bound
  POLICIES BOUND          51
```

### 10.3 Actual values (from `totals`)
Clicks 10,172 → Visits 8,035 → Leads 1,057 → Qualified 474 → Quote starts 280 → Quotes completed 124 → Policies 51. Stage conversion rates computed from these.

### 10.4 The "why" flag
Under the funnel, a single flagged transition:

```
⚠ Largest variance: Lead → Qualified
   Meta Generic:   18%   (234 leads → 41 qualified)
   Google Enterprise: 53%  (264 leads → 139 qualified)
   Potential issue: lead quality / message-to-audience fit
```

This tells the operator the problem is *lead quality at the qualification stage*, not *quote-flow friction*. That distinction changes the action: you fix targeting and messaging, not the form.

### 10.5 Component rules
- Funnel bars are single-hue (Primary at decreasing opacity per stage) — sequential, not categorical (design principle: sequential data, single hue).
- Conversion rates are **between adjacent stages**, not "% of top of funnel" — per the user's explicit instruction.
- The flagged transition is chosen by the largest inter-campaign variance in that stage's rate. For Lead→Qualified, `C-MTA-GEN` (18%) vs `C-GGL-ENT` (53%) is the widest gap.
- `tabular-nums` on every number so the columns align.

---

## 11. CAC trend

### 11.1 Goal
Reveal the dataset's core temporal story: **Google performs well but marginal CAC rises as spend scales.** This sets up the Budget Simulator naturally — the operator sees the curve bending and wants to model reallocation.

### 11.2 Layout

```
CAC OVER TIME                                    CAC ▾   CPQL   Policies   All campaigns ▾

  $1,800 ┤
        │                    ╱──── Google Enterprise (rising)
  $1,400 ┤─────────╱────────╱
        │        ╱
  $1,000 ┤──────╱─────────────── Meta (retargeting pulls it down)
        │   ╱
    $600 ┤──╱─────────────────────── Meta Retargeting
        │
        └─────────────────────────────────────────────────
         Jun        Jul              Aug
```

### 11.3 Component rules
- **Toggle metrics:** `CAC` (default) · `CPQL` · `Policies` (policies shown as area, not line, to signal volume vs efficiency).
- **Campaign selector:** `All campaigns` default; multi-select `C-GGL-ENT`, `C-MTA-GEN`, `C-MTA-RET`, etc.
- **One headline annotation** placed directly on the Google line, near the bend: *"marginal CAC rising as spend scales — see Budget."* Direct labeling, no separate legend (design principle).
- **Weekend ticks** de-emphasized (lighter gridlines) to reflect the seasonality baked into the data.
- Line chart, 1.5px, Primary per selected campaign with others at 40% opacity (focus + dim, per data-viz principles).

### 11.4 The budget hand-off
The trend ends with a non-clickable callout that bridges to the next screen:

```
→ Google's marginal CAC is rising. Model the reallocation in Budget.
```

This is the MEASURE → ALLOCATE hand-off made visible. It is not a button in MVP (Budget screen is separate), but it tells the operator where to go next.

---

## 12. The key interaction: Campaign → Why? → Action

This is the single most important interaction on the page. Clicking any campaign (in the channel bars, the expanded campaign list, or an insight) opens a right-side drawer.

### 12.1 Drawer anatomy (using `C-GGL-ENT` as the example)

```
┌──────────────────────────────────────────────┐
│  C-GGL-ENT  ·  Google Enterprise             │  ← 18px bold + channel tag
│  enterprise message · ai_founders audience   │  ← 12px muted
├──────────────────────────────────────────────┤
│                                              │
│  CAC            $1,114      Policies    21   │  ← 2×2 metric grid
│  Qualified       139        ROAS     4.1×    │
│  Spend         $23.4K      CPL        $89    │
│                                              │
├──────────────────────────────────────────────┤
│  WHY IS IT WORKING?                          │  ← 13px uppercase muted
│                                              │
│  • Enterprise messaging connects insurance   │
│    to an urgent buying trigger (contract     │
│    close), raising qualification intent.     │
│  • High-intent Google search traffic +      │
│    message-matched landing page.             │
│  • Strong downstream: 53% lead→qualified,    │
│    41% completed→bound.                      │
│                                              │
├──────────────────────────────────────────────┤
│  RECOMMENDED ACTION                          │
│                                              │
│  → Expand budget, but cap weekly spend      │
│    at ~$4K: marginal CAC rises beyond that  │
│    (see trend). Pair with the active         │
│    enterprise-message A/B test before full   │
│    scale-up.                                 │
│                                              │
│  [ Open in Budget → ]   [ View leads ]      │
└──────────────────────────────────────────────┘
```

### 12.2 The three-part structure (P3 made into a component)
1. **What** — the 2×2 metric grid (CAC, Policies, Qualified, ROAS, Spend, CPL).
2. **Why** — 2–3 bullet reasons drawn from the campaign's profile (message, audience, LP match, downstream rates).
3. **Action** — one verb + one constraint + cross-links to Budget and Leads.

### 12.3 Data mapping for the drawer (per campaign)
All values from `summary.json` → `by_campaign`. The "why" bullets are generated from campaign attributes (`message_variant`, `audience`, `landing_page_variant`, `qual_rate`, `bind_rate`, `lp_conversion_rate`) using a small rules function — not hand-written per campaign. This makes the drawer generalizable, which is the point.

### 12.4 Why this interaction is the portfolio's centerpiece
A conventional dashboard shows you that C-GGL-ENT has a $1,114 CAC. GrowthOS tells you *why* it works and *what to do next*, with the constraint that prevents a careless scale-up. That is the Growth Engineer's job description in one drawer.

---

## 13. States (empty / loading / error)

Senior designers spec these before build, not after.

| State | Trigger | UI |
|---|---|---|
| **Loading** | Data fetch in progress | Skeleton shimmer on KPI cards + bars; insight panel shows "Reading acquisition data…" in muted text. No spinners. |
| **Empty (no data for filter)** | e.g., a campaign with 0 rows in the selected range | KPI cards show `—`; channel bars show "No spend in this period for [campaign]." Insight panel hides. |
| **Error** | Data fetch failed | Full-width banner: "Couldn't load acquisition data. Retry." Inline, not a modal. |
| **Zero-conversion (CAC undefined)** | `policies_bound = 0` | CAC displays `—` (em-dash), never `Infinity` or `NaN`. Sparkline shows flat. This is the `C-GGL-GEN` / `C-GGL-RET` case. |
| **Single-day** | Date range = 7d and a campaign ran 1 day | Trend chart shows a single point with a label; no line. |

---

## 14. Exact copy (final strings, MVP)

| Location | Copy |
|---|---|
| App title (nav) | `Corgi GrowthOS` |
| Breadcrumb | `Acquisition / Overview` |
| Synthetic chip | `Synthetic` |
| Synthetic tooltip | `Synthetic data for portfolio demonstration. No Corgi internal advertising or policy data was used.` |
| Date range default | `Last 90 days` |
| Market default | `US` |
| KPI labels | `Spend` · `Qualified Leads` · `Policies Bound` · `CAC` |
| Economic row | `Premium generated` · `ROAS` · `CPQL` · `CPL` |
| Insight panel title | `What needs attention` |
| Insight (primary) | `Meta Generic — cheap leads, poor customers` |
| Insight action (primary) | `Reduce spend 30% and investigate lead quality before scaling.` |
| Channel module title | `Channel Performance` |
| Channel sort default | `CAC ▾` |
| Funnel title | `Funnel` |
| Funnel flag | `Largest variance: Lead → Qualified` |
| Trend title | `CAC Over Time` |
| Trend hand-off | `Google's marginal CAC is rising. Model the reallocation in Budget.` |
| Drawer action (C-GGL-ENT) | `Expand budget, but cap weekly spend at ~$4K…` |
| Drawer buttons | `Open in Budget` · `View leads` |
| Footer | `Synthetic dataset · 720 rows · 90 days · generated 2026-09-08 · Methodology →` |

---

## 15. Data mappings (dataset → component)

| Component | Source | Field(s) |
|---|---|---|
| KPI Spend | `summary.json → totals` | `spend` |
| KPI Qualified Leads | `totals` | `qualified_leads` |
| KPI Policies Bound | `totals` | `policies_bound` |
| KPI CAC | `totals` | `overall_cac` |
| Economic row | `totals` | `premium`, `overall_roas`, `overall_cpql`, `overall_cpl` |
| Insight panel | `by_campaign` | `cpl`, `cac`, `policies_bound`, `spend`, `roas` (for `C-MTA-GEN`, `C-GGL-ENT`, `C-MTA-RET`) |
| Channel bars | `by_channel` | `spend`, `leads`, `qualified_leads`, `policies_bound`, `cpl`, `cpql`, `cac` |
| Campaign drill-in | `by_campaign` | same fields, per campaign |
| Funnel | `totals` | `clicks`, `landing_page_visits`, `leads`, `qualified_leads`, `quote_starts`, `quotes_completed`, `policies_bound` |
| Funnel flag | `by_campaign` | `qual_rate` per campaign (variance) |
| Trend | `acquisition_data.csv` | `date`, `channel`/`campaign`, `cac` (daily, aggregated to weekly) |
| Drawer | `by_campaign` | all fields for the selected campaign |

> **Build note:** the frontend should compute KPIs from the CSV at runtime (or read the pre-aggregated `summary.json`). For the trend, aggregate daily rows to weekly to smooth noise. Use `cac = null` (not `Infinity`) when `policies_bound = 0` and render as `—`.

---

## 16. Color and typography (applied)

From the design system, kept restrained to match the "operator cockpit" tone:

### 16.1 Color
- Background `#F7F6F2`, Surface `#F9F8F5`, Border `#D4D1CA`, Text `#28251D`, Text muted `#7A7974`.
- **Primary accent:** `#01696F` (Hydra Teal) — used only for active nav, primary CTA, the one headline number, and the trend's focus line. Everything else is neutral. This is P1 (decision before decoration) in color form: one accent, earned.
- **Semantic:** Success `#437A22` (good deltas), Warning `#964219` (the primary insight ⚠), Error `#A12C7B` (bad deltas / cut recommendations).
- **Chart sequence** (channel bars, trend multi-series): teal `#20808D`, terra `#A84B2F`, dark teal `#1B474D`. Three channels = three colors, all within the teal family so the chart feels like the same product.
- Dark mode available (`#171614` bg) — include the toggle; the operator may work early/late.

### 16.2 Typography
- **Body/UI:** Inter (or Satoshi) — 14px body, 13px secondary, 12px captions, 11px labels. `tabular-nums` on every number.
- **Display (KPI values, page title):** 28px KPI values, 18px drawer title, 24px screen title.
- **2 weights:** Regular + Bold. No italics in the UI (used only in markdown case-study).
- Floor 12px. WCAG AA verified on all text-on-surface pairs.

### 16.3 The "Corgi but operator" tone
Corgi's site is warm and founder-celebratory. GrowthOS is cooler, sparser, faster — the same brand promise ("speed of compute") expressed as *instrument density* rather than *marketing warmth*. The teal accent and the wordmark are the only brand carryover; everything else is stripped to operator-first. This is intentional and should be stated in the case study: **GrowthOS operationalizes Corgi's speed, it does not replicate its marketing.**

---

## 17. Build recommendation (senior designer to engineer)

1. **Build Overview first as a static-but-data-backed prototype.** Wire `summary.json` + `acquisition_data.csv` directly; no backend in MVP. Get the insight panel and the campaign drawer right before anything animates.
2. **Progressive enhancement:** KPI cards → channel bars → funnel → trend → drawer. Each is independently shippable.
3. **Defer:** Export, custom date ranges, the full insights list, multi-market. These are controls that signal scale, not MVP features.
4. **The one thing to get perfect:** the insight panel's three-line structure (what → evidence → action) and the campaign drawer's (why → action). If only those two components work, the portfolio already demonstrates the role better than a full generic dashboard would.

---

## 13 (stub). The other three screens — IA only

| Screen | User question | Primary decision | Key components (preview) |
|---|---|---|---|
| **Experiments** | Which test should I scale, continue, or kill? | Continue the enterprise-message test (not significant yet, p=0.21) | Experiment card with control/treatment rates, lift, CI, sample-size warning, decision |
| **Budget** | Where does the next dollar go? | Reallocate ~$3K from Meta prospecting to Google Search, cap Google at ~$4K/week | Budget input, target CAC, constraint sliders, recommended allocation table, marginal-CAC chart |
| **Leads** | Which leads became customers, and what does that say about targeting? | Optimize toward qualified leads, not form submissions | Lead table, quality-score breakdown, sales-outcome feedback loop |

Each gets the same five-part spec (user question, metrics, charts, data required, decision/recommendation) in its own document, in this order: Experiments → Budget → Leads.

---

## Next step

This document defines the Overview screen to build-readiness. The recommended next move is to **build the Overview as a static prototype wired to the real `summary.json`** before speccing Experiments/Budget/Leads — so the insight panel and campaign drawer can be validated against actual data before the architecture is repeated across the other three screens.

Want me to (a) build the Overview prototype now, or (b) spec the Experiments screen next?
