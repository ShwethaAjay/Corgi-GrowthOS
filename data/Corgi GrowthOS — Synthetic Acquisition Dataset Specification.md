# Corgi GrowthOS — Synthetic Acquisition Dataset Specification

> **Portfolio simulation.** This document designs a realistic synthetic paid-acquisition dataset for a hypothetical Corgi Insurance growth campaign. It does **not** represent Corgi's actual advertising performance, customer economics, or internal data. All Corgi-specific facts are publicly sourced and cited; all performance numbers are synthetic assumptions calibrated to public B2B/insurance benchmarks.
>
> **What this document is:** a complete **specification** (schema, assumptions, relationships, patterns, and a generation recipe) that you can hand to a Python generator to produce the 90-day `acquisition_data.csv`. It is **not** the generated CSV itself. Section I gives the exact programmatic approach to generate it; say the word and I'll write the generator script and produce the dataset next.

---

## A. Verified Corgi Facts Relevant to Acquisition

All facts below are drawn from Corgi's public website, blog, Y Combinator profile, and credible secondary sources (TechCrunch, Sacra, Crunchbase News). They are **publicly verifiable**, not performance data.

### Company and positioning

- **Founded 2024** by Nico Laqua (CEO/CTO) and Emily Yuan (COO), San Francisco-based. ([Y Combinator](https://www.ycombinator.com/companies/corgi-insurance), [Wikipedia](https://en.wikipedia.org/wiki/Corgi_(insurance_company)))
- **YC batch:** S24 (Spring/Summer 2024). ([TechCrunch](https://techcrunch.com/2026/05/06/insurance-startup-corgi-hits-1-3b-valuation-4-months-after-its-series-a/))
- **Positioning:** "AI-native, full-stack insurance carrier built for startups and technology companies." Direct underwriting (not a broker), modular coverage, instant quoting, same-day binding. ([corgi.insure](https://www.corgi.insure))
- **Core taglines:** "Business Insurance at the Speed of Compute," "built for founders by founders," "from MVP to IPO." ([corgi.insure](https://www.corgi.insure))
- **Differentiation vs. legacy:** Replaces a traditional 2–4 week broker underwriting process with AI-powered instant quotes (under 10 minutes) and same-day binding. ([corgi.insure/startup-insurance](https://www.corgi.insure/startup-insurance))
- **Team size:** ~250 (as of Sept 2026). ([Y Combinator](https://www.ycombinator.com/companies/corgi-insurance))

### Funding and scale

- Emerged from stealth January 2026 with **$108M Seed + Series A** at a $630M valuation, co-led by Y Combinator and Kindred Ventures. ([Sacra](https://sacra.com/c/corgi/), [TechCrunch](https://techcrunch.com/2026/05/06/insurance-startup-corgi-hits-1-3b-valuation-4-months-after-its-series-a/))
- **Series B:** $160M in May 2026 at $1.3B valuation, led by TCV. ([TechCrunch](https://techcrunch.com/2026/05/06/insurance-startup-corgi-hits-1-3b-valuation-4-months-after-its-series-a/))
- **Series B1:** $106M in May 2026 at $2.6B valuation, led by TCV. ([Crunchbase News](https://news.crunchbase.com/ai/biggest-funding-rounds-ai-anthropic-65b-dominates/))
- **Series B extension:** July 2026 at a $4.0B valuation (amount not disclosed). ([Sacra](https://sacra.com/c/corgi/))
- **Total raised:** >$378M primary funding. ([Sacra](https://sacra.com/c/corgi/))
- **Revenue signal:** >$40M annualized premium run-rate as of December 2025 (company figure, corroborated by Sacra). ([Sacra](https://sacra.com/c/corgi/), [Teardown](https://www.teardown.ai/companies/corgi))

### Target customers and stages

Corgi segments its offering by startup stage ([corgi.insure/startup-insurance](https://www.corgi.insure/startup-insurance)):

| Stage | Description | Best for | Key policies |
|---|---|---|---|
| Pre-Seed & Seed | "Core protection for you and your product" | Pre-revenue / seed startups needing basic compliance to hire or lease space | CGL, D&O, Tech E&O, Cyber |
| Series A | "Protect you, your board, and help you close bigger deals" | Startups raising venture capital, signing enterprise contracts, or completing SOC 2 | + Media, EPLI |
| Growth Stage | "Protection for leadership risk, transactions, and scale" | Series B+ with large teams, complex tech, IPO aspirations | + Fiduciary |
| Custom | "Know exactly what you need?" | Fintech, AI, Health-tech with unique risk profiles | Pick any combination |

- Corgi names **Deel** and **Artisan** as customers, and testimonials reference customers serving enterprise clients like Coinbase and SoFi. ([TechCrunch](https://techcrunch.com/2026/05/06/insurance-startup-corgi-hits-1-3b-valuation-4-months-after-its-series-a/), [corgi.insure](https://www.corgi.insure))
- The platform auto-populates application data from a Y Combinator or Crunchbase URL. ([Sacra](https://sacra.com/c/corgi/))

### Products offered

CGL, D&O, Tech & AI Liability (Tech E&O), Cyber Liability, EPLI, Media Liability, Fiduciary Liability, HNOA, plus specialized coverages (Workers' Comp, BOP, Real Estate E&O, Lawyer E&O, Medical Malpractice, R&W, Non-Profit D&O, K&R, Crime, Commercial Umbrella). ([corgi.insure/startup-insurance](https://www.corgi.insure/startup-insurance))

- **Tech & AI Liability** is notable for the chosen segment: "Covers claims alleging your technology products or services failed to perform as intended, causing financial harm to a client." ([corgi.insure](https://www.corgi.insure))

### Buying triggers (publicly stated)

Corgi explicitly ties insurance to urgent business milestones ([corgi.insure](https://www.corgi.insure), [corgi.insure/startup-insurance](https://www.corgi.insure/startup-insurance), [Corgi Blog](https://www.corgi.insure/blog/which-insurance-carrier-helps-startups-meet-soc-2-and-enterprise-vendor-contract-requirements-instantly)):

- Incorporating the company ("Get insurance as soon as you incorporate")
- Raising a funding round ("Most investors require D&O insurance before closing a funding round")
- Joining the cap table / adding board members
- Hiring (first non-founder employee, large-scale hiring)
- Leasing office space (landlord requirements)
- **Signing enterprise contracts** ("Tech E&O / Cyber Liability to satisfy enterprise vendor contracts")
- **Completing SOC 2** ("SOC 2 compliance standards")
- Launching an AI product / commercial deployment
- IPO readiness

### Quote and purchase journey (publicly described)

1. Apply digitally — "apply in minutes," log in with company email or provide a YC/Crunchbase URL for auto-population.
2. Receive an instant AI-powered quote (under 10 minutes; some sources say ~30 seconds for bindable quotes).
3. Review coverage options — choose a pre-set stage package or build a custom policy.
4. Bind coverage — same-day binding; certificate of insurance issued same day.
5. No sales call required for self-serve; a "Book a Demo" path exists for complex cases.
6. Claims handled in-house (full-stack).

([corgi.insure](https://www.corgi.insure), [corgi.insure/startup-insurance](https://www.corgi.insure/startup-insurance), [Teardown](https://www.teardown.ai/companies/corgi), [Sacra](https://sacra.com/c/corgi/))

### Enterprise / customer requirements

- Enterprise procurement teams and SOC 2 auditors require proof of specific coverage (especially Tech E&O and Cyber), often within 48 hours of a deal closing. ([Corgi Blog](https://www.corgi.insure/blog/which-insurance-carrier-helps-startups-meet-soc-2-and-enterprise-vendor-contract-requirements-instantly))
- "Many investors and enterprise customers require specific coverage before signing." ([corgi.insure](https://www.corgi.insure))
- Customer testimonials emphasize closing 7-figure enterprise contracts and same-day certificates. ([corgi.insure](https://www.corgi.insure))

### What Corgi does NOT publicly disclose

- No customer count, policy count, retention, loss ratio, combined ratio, CAC, CPL, channel mix, or ad spend. ([corgi.insure](https://www.corgi.insure), [Sacra](https://sacra.com/c/corgi/))
- No disclosed distribution partnerships, broker network, or embedded-distribution model beyond direct digital sales and advisor support. ([corgi.insure](https://www.corgi.insure))
- Coverage is underwritten by **Technology Risk Retention Group (TRRG)**, a federally chartered risk retention group that is **not rated by AM Best** (roughly 4 in 5 RRGs are unrated); coverage can also be placed through affiliated admitted carriers rated A- or better. ([corgi.insure/startup-insurance](https://www.corgi.insure/startup-insurance))

### Implication for the dataset

Corgi's public positioning strongly supports an acquisition scenario built around **pre-seed/seed AI startups with an enterprise-contract buying trigger**, because:

1. Corgi explicitly serves this stage and segment.
2. Enterprise-contract readiness is a repeatedly emphasized trigger tied directly to Tech E&O, Cyber, and D&O — products Corgi sells.
3. The urgency (48-hour proof-of-coverage requirement) creates a credible reason for founders to act on an ad and complete a quote.
4. Corgi's same-day certificate and instant quote capabilities are a credible conversion lever against that trigger.

---

## B. Industry Benchmark Ranges (with sources)

These are **external benchmarks**, not Corgi data. Ranges reflect B2B SaaS, B2B insurance, and ad-platform data from 2024–2026. Reliability varies; I flag the strongest vs. weakest below.

### B1. Google Search Ads (B2B / SaaS / insurance)

| Metric | Benchmark range | Source |
|---|---|---|
| CPC — B2B SaaS non-brand search | $3.33–$15.36 (median ~$5.34, 2026; up to $15+ for SaaS keywords) | [Firebrand](https://www.firebrand.marketing/2025/02/2024-google-ads-b2b-advertising-benchmarks-from-startups-to-scaleups/), [Kampaio](https://www.kampaio.com/blog/b2b-saas-google-ads-benchmarks-2026) |
| CPC — commercial insurance keywords | $15–$40 | [LeadGen Economy](https://www.leadgen-economy.com/blog/commercial-insurance-leads-b2b-lead-generation/) |
| CTR — B2B SaaS search | 1.30–7.45% (median ~2.86%; AI/ML sector ~7.89%) | [Firebrand](https://www.firebrand.marketing/2025/02/2024-google-ads-b2b-advertising-benchmarks-from-startups-to-scaleups/), [Kampaio](https://www.kampaio.com/blog/b2b-saas-google-ads-benchmarks-2026) |
| CTR — B2B search (Wordstream all-industry) | ~3.17% | [Firebrand](https://www.firebrand.marketing/2025/02/2024-google-ads-b2b-advertising-benchmarks-from-startups-to-scaleups/) |
| CPL — Google Search (insurance) | $100–$250 | [LeadGen Economy](https://www.leadgen-economy.com/blog/commercial-insurance-leads-b2b-lead-generation/) |
| CPL — B2B SaaS search (non-brand) | $87–$1,500+ (SMB ~$87, enterprise $1,500+) | [Kampaio](https://www.kampaio.com/blog/b2b-saas-google-ads-benchmarks-2026), [LinkedIn (Praveen Ravi)](https://www.linkedin.com/pulse/google-ads-benchmarks-b2b-saas-2026-praveen-ravi-lyt3c) |
| Click→demo/trial conversion rate (search) | 3–5% | [Kampaio](https://www.kampaio.com/blog/b2b-saas-google-ads-benchmarks-2026) |

**Assumption for dataset (Google Search):** CPC ~$8–$18 (high-intent insurance + SaaS keywords blend), CTR ~3.5–6%, CPL ~$150–$350. This sits between B2B SaaS general and commercial-insurance-specific ranges, reflecting a niche "AI startup insurance" keyword set with moderate competition.

### B2. LinkedIn Ads (B2B SaaS / insurance)

| Metric | Benchmark range | Source |
|---|---|---|
| CPC — cross-industry average | $5.39–$5.74 (2026); insurance industry $6.62; B2B SaaS $6.04 | [Benchmarketing](https://www.benchmarketing.org/benchmarks/linkedin-ads), [Digital Applied](https://www.digitalapplied.com/blog/linkedin-ads-benchmarks-2026-cpc-ctr-cvr-industry) |
| CTR — sponsored content (cross-industry) | 0.44–0.61%; SaaS ~0.58–0.74% | [The B2B House](https://www.theb2bhouse.com/linkedin-ad-benchmarks/), [Digital Applied](https://www.digitalapplied.com/blog/linkedin-ads-benchmarks-2026-cpc-ctr-cvr-industry) |
| CPM | ~$33.80 | [The B2B House](https://www.theb2bhouse.com/linkedin-ad-benchmarks/) |
| CPL — LinkedIn overall | $87–$94 (2026); insurance-adjacent higher | [Digital Applied](https://www.digitalapplied.com/blog/linkedin-ads-benchmarks-2026-cpc-ctr-cvr-industry) |
| CPL — LinkedIn (insurance vertical) | $125–$300 | [LeadGen Economy](https://www.leadgen-economy.com/blog/commercial-insurance-leads-b2b-lead-generation/) |
| Lead Gen Form conversion rate | ~6.1% (5x off-platform landing pages) | [Digital Applied](https://www.digitalapplied.com/blog/linkedin-ads-benchmarks-2026-cpc-ctr-cvr-industry) |

**Assumption for dataset (LinkedIn):** CPC ~$6–$12, CTR ~0.5–0.9%, CPL ~$200–$450 (founder/CTO targeting is expensive). Strong qualification but low volume and high cost.

### B3. Meta (Facebook/Instagram) Ads (B2B)

| Metric | Benchmark range | Source |
|---|---|---|
| CPC — all-industry average | $0.83–$1.20; B2B services $2–$5; finance/insurance $3–$8 | [PoweredbySearch](https://www.poweredbysearch.com/learn/b2b-saas-meta-facebook-ads-stats/), [Lever Digital](https://www.leverdigital.co.uk/post/12-b2b-meta-ad-stats-you-need-to-know), [LinkedIn (Karthik J)](https://www.linkedin.com/pulse/meta-ads-smart-marketers-ctr-cpc-cpm-roas-explained-karthik-j-itlkc) |
| CTR — all-industry | ~0.9%; B2B/SaaS 0.8–1.5% | [Lever Digital](https://www.leverdigital.co.uk/post/meta-ad-conversion-benchmarks-for-b2b), [LinkedIn (Karthik J)](https://www.linkedin.com/pulse/meta-ads-smart-marketers-ctr-cpc-cpm-roas-explained-karthik-j-itlkc) |
| CPM | ~$14.40 | [Lever Digital](https://www.leverdigital.co.uk/post/meta-ad-conversion-benchmarks-for-b2b) |
| CPL — Meta lead ads (insurance) | $75–$175; landing-page campaigns $100–$225; remarketing $50–$125 | [LeadGen Economy](https://www.leadgen-economy.com/blog/commercial-insurance-leads-b2b-lead-generation/) |
| Landing-page conversion rate (all-industry, Meta) | ~9.21% (but B2B typically lower) | [Lever Digital](https://www.leverdigital.co.uk/post/12-b2b-meta-ad-stats-you-need-to-know) |

**Assumption for dataset (Meta):** CPC ~$2–$6 (B2B insurance audience is pricier than e-commerce but cheaper than LinkedIn), CTR ~0.8–1.4%, CPL ~$90–$200. Cheap leads, weaker downstream quality; retargeting outperforms prospecting on CPA.

### B4. Landing page / funnel conversion benchmarks

| Metric | Benchmark range | Source |
|---|---|---|
| B2B SaaS landing page conversion (session→conversion, all types) | ~1.1% site avg; dedicated landing pages median 3.8% | [SaaSHero](https://www.saashero.net/strategy/b2b-saas-conversion-rate-benchmarks/), [WithDaydream](https://www.withdaydream.com/library/insights/average-landing-page-conversion-rate) |
| Self-serve signup page | 4–10% (best-in-class 12–18%) | [WithDaydream](https://www.withdaydream.com/library/insights/average-landing-page-conversion-rate) |
| Demo/request-a-call page | 1.5–4% (best-in-class 5–7%) | [WithDaydream](https://www.withdaydream.com/library/insights/average-landing-page-conversion-rate) |
| Short form (5–7 fields) conversion | 8–15% | [LeadGen Economy](https://www.leadgen-economy.com/blog/commercial-insurance-leads-b2b-lead-generation/) |
| Long form (12–18 fields) conversion | 3–6% | [LeadGen Economy](https://www.leadgen-economy.com/blog/commercial-insurance-leads-b2b-lead-generation/) |

### B5. Lead qualification and downstream conversion benchmarks

| Metric | Benchmark range | Source |
|---|---|---|
| Lead→MQL conversion (all industries) | ~31% | [Landbase](https://www.landbase.com/blog/lead-qualification-statistics) |
| Lead→MQL conversion (B2B SaaS) | ~39% | [Landbase](https://www.landbase.com/blog/lead-qualification-statistics) |
| MQL→SQL conversion (all industries) | ~13% | [Landbase](https://www.landbase.com/blog/lead-qualification-statistics) |
| Lead→SQL (properly qualified leads) | ~40% conversion of qualified leads | [Landbase](https://www.landbase.com/blog/lead-qualification-statistics) |
| Commercial insurance lead-to-sale conversion | 3–6% (professional liability 2–5%; general liability 4–6%) | [LeadGen Economy](https://www.leadgen-economy.com/blog/commercial-insurance-leads-b2b-lead-generation/) |
| Contact rate for commercial leads (search traffic) | 30–40%; display 20–30% | [LeadGen Economy](https://www.leadgen-economy.com/blog/commercial-insurance-leads-b2b-lead-generation/) |

### B6. Reliability assessment

| Benchmark strength | Metrics | Notes |
|---|---|---|
| **Strongest** | Google CPC/CTR, LinkedIn CPC/CTR, Meta CPC/CTR | Multiple converging sources, large datasets, platform-specific |
| **Strong** | Landing page conversion by page type, lead→MQL rates | Well-studied, B2B-specific |
| **Moderate** | CPL by channel (B2B insurance) | LeadGen Economy is a lead-gen vendor (potential bias toward higher CPL); ranges align with broader B2B SaaS CPL data |
| **Weakest** | B2B insurance CAC, quote-completion rate, policy-bound conversion by channel | No credible public "B2B insurance CAC" benchmark exists; quote-completion varies hugely by product/UX. **The dataset should derive these from connected funnel math, not from a benchmark number.** |

> **Important caveat:** No public source provides Corgi-specific CAC, channel mix, or policy-bound conversion. The dataset's CAC (~$1,500–$5,000 range) is a **synthetic assumption** derived from combining benchmark CPLs with benchmark lead-to-sale conversion rates. It is not a Corgi fact.

### Benchmark-source reliability note

Several benchmark sources in this section are vendor blogs, SEO/marketing publications, or LinkedIn analyst posts rather than peer-reviewed or official platform reports. Treat all figures as **directional ranges**, not definitive values. The CPC/CTR figures for Google, LinkedIn, and Meta are the most reliable (multiple converging sources, large underlying datasets). CPL-by-channel for B2B insurance comes primarily from a single lead-gen vendor (LeadGen Economy) and may be biased upward; it is consistent with broader B2B SaaS CPL ranges, so it is usable as an upper-bound guide. Where a benchmark is weak or single-sourced, the dataset derives the number from connected funnel math rather than from the benchmark directly.

---

## C. Recommended Synthetic Assumptions

> All figures below are **synthetic assumptions for a portfolio simulation**, calibrated to the benchmarks in Section B. They are clearly labeled as assumptions, not Corgi data.

### C1. Scenario framing

- **Advertiser:** Corgi Insurance (hypothetical in-house paid acquisition program)
- **Target segment:** Pre-seed and seed-stage AI startups
- **Primary buying trigger:** Closing an enterprise contract (requires Tech E&O, Cyber, D&O proof, often within 48 hours)
- **Secondary triggers represented in data:** Fundraising, AI product launch
- **Time window:** 90 days (e.g., June 1 – August 29, 2026)
- **Geography:** United States (primary markets: SF Bay, NYC, Austin, remote)
- **Monthly acquisition budget (assumption):** ~$20,000–$25,000/month → ~$63,000–$72,000 over 90 days. This is a plausible early-stage paid-acquisition budget for a startup insurer scaling acquisition, not a Corgi-verified figure.

### C2. Business economics assumptions

| Assumption | Value | Basis / rationale |
|---|---|---|
| Average annual premium per policy (pre-seed/seed AI startup) | $2,000–$5,000 (use ~$3,500 average in dataset) | Corgi publicly states pre-seed/seed startups typically pay $2,000–$5,000/year ([corgi.insure/startup-insurance](https://www.corgi.insure/startup-insurance)) |
| Average annual premium (Series A companies, for comparison) | $5,000–$15,000 | Corgi public statement ([corgi.insure](https://www.corgi.insure)) |
| Target CAC (blended) | ≤ $2,500 | Derived: at ~$3,500 avg premium and a hypothetical ~70%+ first-year loss/expense load, a CAC above ~$3,500 is uneconomic; target well below that |
| Target CAC by channel | Google ≤ $2,000; LinkedIn ≤ $3,000; Meta ≤ $3,500 | Reflects channel-quality differences |
| Acceptable CPQL | ≤ $600 | Roughly 1/4 to 1/3 of target CAC, consistent with ~25–35% qualified-lead→bound conversion |
| Target qualified-lead rate (leads that are qualified) | 25–40% | Anchored to B2B SaaS lead→MQL of ~39% ([Landbase](https://www.landbase.com/blog/lead-qualification-statistics)) |
| Quote-start rate (qualified leads who start a quote) | 45–70% | Corgi's instant-quote UX should drive a higher-than-average quote-start rate |
| Quote-completion rate (quote starts that complete) | 30–55% | Short digital form; completion varies by intent and message fit |
| Policy-bind rate (quote completions that bind) | 20–40% | Commercial insurance lead-to-sale is 3–6% of raw leads ([LeadGen Economy](https://www.leadgen-economy.com/blog/commercial-insurance-leads-b2b-lead-generation/)); given the funnel is qualified→quoted→bound, 20–40% of completed quotes binding is realistic for high-intent, urgent-trigger traffic |
| End-to-end lead→policy conversion | ~3–8% of raw leads | Consistent with commercial insurance benchmarks above |

### C3. Channel role assumptions (behavioral, not Corgi-specific)

| Channel | Role | CPC | CTR | Volume | Lead quality | Downstream strength |
|---|---|---|---|---|---|---|
| Google Search | Capture active intent | High ($8–$18) | High (3.5–6%) | Low–moderate | Strong intent | Best quote-start and bind rates |
| LinkedIn | Reach decision-makers | Highest ($6–$12) | Low (0.5–0.9%) | Low | Strong B2B qualification | Good qualification; expensive per policy |
| Meta | Demand gen + retargeting | Low ($2–$6) | Mod (0.8–1.4%) | High | Weak qualification | Cheap leads, weak downstream; retargeting rescues it |

---

## D. Dataset Schema

### D1. Core daily campaign-level schema (one row per date × channel × campaign × audience × message × landing page)

| Field | Type | Description | Constraints |
|---|---|---|---|
| `date` | date | Calendar date | 90 consecutive days |
| `channel` | string | Google Search / LinkedIn / Meta | one of 3 |
| `campaign` | string | Campaign name | e.g., "AI Founder Enterprise Readiness" |
| `audience` | string | Targeting segment | ai_founders / saas_founders / startup_operators / retargeting |
| `message_variant` | string | Ad message | generic / enterprise / fundraising |
| `landing_page_variant` | string | Landing page version | generic / enterprise_ready / ai_focused |
| `impressions` | int | Ad impressions served | ≥ clicks |
| `clicks` | int | Ad clicks | ≤ impressions |
| `spend` | float | Daily ad spend USD | = clicks × effective CPC (within noise) |
| `landing_page_visits` | int | Sessions reaching the LP | ≤ clicks (some lost to bounce/redirect) |
| `leads` | int | Form submissions | ≤ landing_page_visits |
| `qualified_leads` | int | Leads meeting ICP criteria | ≤ leads |
| `quote_starts` | int | Qualified leads beginning a quote | ≤ qualified_leads |
| `quotes_completed` | int | Quotes fully completed | ≤ quote_starts |
| `policies_bound` | int | Policies bound | ≤ quotes_completed |
| `premium` | float | Bound premium USD | = policies_bound × avg premium (with variance) |

### D2. Recommended additional fields (genuinely useful for acquisition analysis)

| Field | Type | Why it matters |
|---|---|---|
| `campaign_type` | string | prospecting / retargeting — essential because retargeting behaves very differently |
| `target_market` | string | SF Bay / NYC / Austin / Remote — performance varies by market |
| `startup_stage` | string | pre_seed / seed / series_a — segment performance |
| `industry` | string | ai_infra / ai_saas / fintech / healthtech — fit varies |
| `cpc` | float | Derived: spend / clicks; store for convenience |
| `ctr` | float | Derived: clicks / impressions |
| `lp_conversion_rate` | float | Derived: leads / landing_page_visits |
| `qual_rate` | float | Derived: qualified_leads / leads |
| `cpl` | float | Derived: spend / leads |
| `cpql` | float | Derived: spend / qualified_leads |
| `cac` | float | Derived: spend / policies_bound (null-safe: display "—" when 0) |
| `roas` | float | Derived: premium / spend |
| `day_of_week` | int | Derived from date — captures weekly seasonality |
| `is_weekend` | bool | Derived — B2B search volume drops on weekends |
| `experiment_id` | string | Links rows to an experiment in the Experiment Lab |
| `variant_role` | string | control / treatment — for A/B rows |
| `notes` | string | Free text for anomalies (e.g., "budget cap hit", "creative fatigue") |

### D3. Supporting tables (for the full GrowthOS, beyond the daily dataset)

- `campaigns` — campaign_id, name, channel, audience, message, landing_page, status, start_date, end_date, daily_budget
- `ad_variants` — creative_id, campaign_id, message_variant, headline, status
- `experiments` — experiment_id, name, hypothesis, primary_metric, guardrail_metrics, control, treatment, start_date, sample_size_target, status, decision
- `leads` — lead_id, date, channel, campaign, audience, message_variant, landing_page_variant, startup_stage, industry, qualified (bool), quote_started, quote_completed, policy_bound, premium, sales_disposition
- `spend_daily` — date, channel, campaign, spend (for reconciliation)

---

## E. Recommended Campaign Structure

### E1. Campaign matrix (3 channels × 3 landing pages, with focused message variants)

To keep the dataset realistic and analyzable without exploding into too many sparse cells, use a **focused set of campaigns** rather than every combination. The dataset centers on the **primary A/B test (generic vs. enterprise messaging)** and treats the fundraising message as a **secondary/optional variant** used only on one LinkedIn campaign, not as a third fully-crossed variant everywhere.

| Campaign ID | Channel | Audience | Message | Landing page | Type | Role in story |
|---|---|---|---|---|---|---|
| C-GGL-ENT | Google Search | ai_founders | enterprise | enterprise_ready | prospecting | Primary high-intent; strong downstream (treatment) |
| C-GGL-GEN | Google Search | saas_founders | generic | generic | prospecting | Cheap CPL, weaker qualification (control) |
| C-LNK-ENT | LinkedIn | ai_founders | enterprise | enterprise_ready | prospecting | Expensive leads, strong qualification |
| C-LNK-FND | LinkedIn | startup_operators | fundraising | enterprise_ready | prospecting | Secondary variant; low volume, decent quality |
| C-MTA-GEN | Meta | ai_founders | generic | generic | prospecting | High volume, cheap, weak downstream |
| C-MTA-AI | Meta | saas_founders | enterprise | ai_focused | prospecting | "Trap" campaign: looks good on CPL, bad on CAC |
| C-MTA-RET | Meta | retargeting | enterprise | enterprise_ready | retargeting | Best Meta CAC but limited volume |
| C-GGL-RET | Google Search | retargeting | generic | generic | retargeting | Efficient but small |

> **Message scope note:** The primary experiment in the Experiment Lab compares **generic (control)** vs. **enterprise (treatment)** messaging. The **fundraising** message appears on only one campaign (C-LNK-FND) so it can be shown in audience/message analysis without turning the dataset into a sparse 3×3×3 grid. If you want to keep the dataset even simpler, C-LNK-FND can be dropped and the fundraising variant mentioned only as a recommended future test in the case study.

### E2. Message → landing page mapping (campaign continuity)

Maintain message-match between ad and landing page for most campaigns (enterprise ad → enterprise_ready LP), but include **one deliberate mismatch** (C-MTA-AI: enterprise message → ai_focused landing page) to create an analyzable discrepancy — a realistic mistake a growth team would test and debug.

### E3. Budget distribution (starting, before optimization)

| Channel | Starting monthly budget | Share | Notes |
|---|---|---|---|
| Google Search | ~$9,000 | ~40% | Primary intent channel |
| LinkedIn | ~$6,500 | ~29% | Decision-maker reach |
| Meta | ~$5,500 | ~24% | Volume + retargeting |
| (Reserve/test) | ~$1,500 | ~7% | New audiences |
| **Total** | **~$22,500/mo** | 100% | ~$67,500 over 90 days |

---

## F. Recommended Relationships / Correlations Between Variables

> The single most important rule: **the funnel is mathematically connected.** Never generate downstream stages independently of upstream stages.

### F1. Funnel hierarchy (hard constraints)

```
impressions >= clicks >= landing_page_visits >= leads >= qualified_leads >= quote_starts >= quotes_completed >= policies_bound
```

Every row must satisfy this. Generate top-down: impressions → clicks → visits → leads → qualified → quote_starts → completed → bound.

### F2. Channel behavioral profiles (the correlations that make the data interesting)

Each channel has a **base rate profile** that drives the funnel. Express each funnel rate as a base × modifier.

**Google Search:**
- High CTR (active intent), high CPC, low–moderate volume.
- LP conversion (visit→lead): moderate-high (intent traffic converts).
- Qualification rate: high (searchers have a real need).
- Quote-start rate: high (urgency + intent).
- Bind rate: highest.
- **Diminishing returns:** as daily spend increases beyond a threshold, CPC rises (bid competition) and qualification drops (broader keyword matching), so marginal CAC worsens.

**LinkedIn:**
- Low CTR, highest CPC, low volume, but very high qualification rate (precise B2B targeting).
- LP conversion: lower (cold-ish traffic) but the leads that do convert are high quality.
- Quote-start rate: moderate (decision-makers are interested but may not be in an urgent trigger moment).
- Bind rate: moderate–high.
- **Audience sensitivity:** performance varies sharply by audience — ai_founders audience outperforms startup_operators.

**Meta:**
- Moderate CTR, low CPC, high volume.
- LP conversion: low–moderate (broad audience).
- Qualification rate: low (many clicks are curiosity, not need).
- Quote-start rate: low.
- Bind rate: low.
- **Retargeting rescue:** retargeting audience has dramatically better qualification and bind rates than prospecting, with lower CPC — but limited volume (audience pool is small).

### F3. Message variant effects (correlated with qualification, not just CTR)

| Message | CTR effect | LP conversion | Qualification rate | Quote-start | Bind |
|---|---|---|---|---|---|
| generic ("Get startup insurance in minutes.") | Highest CTR (broad appeal) | Moderate | Lowest qualification | Low | Low |
| enterprise ("Be ready for your next enterprise contract.") | Lower CTR (narrower) | Higher | Highest qualification | Highest | Highest |
| fundraising ("Handle insurance before your next raise.") | Moderate | Moderate | High | High | Moderate–high |

**The key insight the data should encode:** generic messaging wins on CTR and CPL but loses on CPQL and CAC. Enterprise messaging wins on downstream economics despite lower top-of-funnel volume. This is the central tension the dashboard should surface.

### F4. Cross-variable correlations to bake in

1. **Spend ↑ → CPC ↑ (within a channel/day):** diminishing returns as auctions saturate. Model marginal CPC rising with daily spend.
2. **Spend ↑ → qualification rate ↓ (slightly):** broader reach dilutes intent.
3. **Retargeting → lower CPC, higher CTR, higher qualification, higher bind** — but volume cap (audience size).
4. **Weekend → impressions and clicks down** for Google and LinkedIn (B2B search behavior); Meta less affected.
5. **Day-of-week seasonality:** Tue–Thu strongest for B2B intent.
6. **Premium correlation:** premium per policy varies by startup_stage (pre_seed lower, seed higher) and coverage breadth (enterprise-contract triggers pull higher-limit Tech E&O + Cyber → higher premium).
7. **Message–landing-page match → higher LP conversion** than mismatched pairs (except where deliberately testing).
8. **Quotes_completed correlates with quote_starts** with a completion-rate that itself correlates with message fit and channel intent.

### F5. Noise model

- Daily random noise of ±5–15% on volume metrics (impressions, clicks, leads) to simulate real ad-platform variance.
- Spend should be relatively stable day-to-day (budgets are set), but CPC varies with auction competition, so spend = clicks × CPC where CPC has daily noise.
- A few outlier days: one unusually strong day and one unusually weak day per channel (e.g., a viral moment, a platform outage, a budget-pacing pause).

---

## G. Example Rows

These illustrate the schema and the connected funnel. Numbers are illustrative, not from any real dataset.

### Row 1 — Google Search, enterprise message, prospecting (strong downstream)

| Field | Value |
|---|---|
| date | 2026-06-03 |
| channel | Google Search |
| campaign | AI Founder Enterprise Readiness |
| audience | ai_founders |
| campaign_type | prospecting |
| target_market | SF Bay |
| startup_stage | seed |
| industry | ai_saas |
| message_variant | enterprise |
| landing_page_variant | enterprise_ready |
| impressions | 4,200 |
| clicks | 210 |
| spend | 2310.00 |
| landing_page_visits | 188 |
| leads | 26 |
| qualified_leads | 14 |
| quote_starts | 9 |
| quotes_completed | 5 |
| policies_bound | 2 |
| premium | 7800.00 |
| cpc | 11.00 |
| ctr | 0.050 |
| cpl | 88.85 |
| cpql | 165.00 |
| cac | 1155.00 |
| roas | 3.38 |
| day_of_week | 3 (Wed) |
| is_weekend | False |

**Story:** expensive clicks but strong downstream — low CAC, good ROAS.

### Row 2 — Meta, generic message, prospecting (cheap leads, poor downstream)

| Field | Value |
|---|---|
| date | 2026-06-03 |
| channel | Meta |
| campaign | AI Founder Demand Gen |
| audience | ai_founders |
| campaign_type | prospecting |
| target_market | Remote |
| startup_stage | pre_seed |
| industry | ai_infra |
| message_variant | generic |
| landing_page_variant | generic |
| impressions | 18,500 |
| clicks | 203 |
| spend | 812.00 |
| landing_page_visits | 168 |
| leads | 19 |
| qualified_leads | 4 |
| quote_starts | 1 |
| quotes_completed | 0 |
| policies_bound | 0 |
| premium | 0.00 |
| cpc | 4.00 |
| ctr | 0.011 |
| cpl | 42.74 |
| cpql | 203.00 |
| cac | — (no policies) |
| roas | 0.00 |
| day_of_week | 3 (Wed) |
| is_weekend | False |

**Story:** lowest CPL in the dataset, but zero policies bound — the "cheap leads, bad customers" trap.

### Row 3 — Meta retargeting (best CAC in the dataset, but volume-constrained)

| Field | Value |
|---|---|
| date | 2026-06-12 |
| channel | Meta |
| campaign | Founder Retargeting |
| audience | retargeting |
| campaign_type | retargeting |
| target_market | Remote |
| startup_stage | seed |
| industry | ai_saas |
| message_variant | enterprise |
| landing_page_variant | enterprise_ready |
| impressions | 3,100 |
| clicks | 93 |
| spend | 279.00 |
| landing_page_visits | 84 |
| leads | 13 |
| qualified_leads | 7 |
| quote_starts | 4 |
| quotes_completed | 2 |
| policies_bound | 1 |
| premium | 3900.00 |
| cpc | 3.00 |
| ctr | 0.030 |
| cpl | 21.46 |
| cpql | 39.86 |
| cac | 279.00 |
| roas | 13.98 |
| day_of_week | 5 (Fri) |
| is_weekend | False |
| notes | small retargeting pool; volume near audience cap |

**Story:** the best CAC and ROAS in the dataset by a clear margin — but only 1 policy from a tiny audience that cannot absorb much more budget. Efficient but not scalable. (Single-day numbers are noisy; the campaign's 90-day aggregate CAC sits higher than this one strong day.)

---

## H. Specific Patterns the Final Dataset Must Contain

The dataset must **require real analysis** and avoid an obvious winner. Bake in these patterns:

### H1. A campaign with excellent CPL but poor CAC
- **Meta generic prospecting (C-MTA-GEN):** lowest CPL in the dataset, but qualification and bind rates so low that CAC is the worst (or near-worst) among channels with any bound policies. Demonstrates "cheap leads ≠ profitable customers."

### H2. A campaign with expensive leads but excellent qualification
- **LinkedIn enterprise (C-LNK-ENT):** high CPL, but the leads that do come through are highly qualified and convert to policies at a strong rate, producing a middling-but-defensible CAC and the best policy quality.

### H3. The best CAC but insufficient volume
- **Meta retargeting (C-MTA-RET):** best CAC and ROAS in the dataset, but the retargeting audience is small — daily volume caps out and cannot absorb more budget. The system should recommend it as efficient but volume-constrained.

### H4. Performance deterioration as spend increases
- **Google Search (C-GGL-ENT):** as daily spend ramps up over the 90 days (budget growth), CPC rises and marginal CAC worsens in the back half. The dashboard should show CAC creeping up in weeks 8–13 even as absolute policy count grows.

### H5. A campaign that initially performs well but declines
- **Meta AI-focused (C-MTA-AI):** strong first 3–4 weeks (fresh creative, algorithm learning), then creative fatigue / audience saturation causes CTR and qualification to decline. CPL rises over time. A realistic "refresh creative" signal.

### H6. Differences between audiences
- LinkedIn ai_founders audience outperforms startup_operators on qualification and bind, even at higher CPC. Shows audience-segment analysis matters.

### H7. Differences between prospecting and retargeting
- On Meta and Google, retargeting has lower CPC, higher CTR, higher qualification, higher bind — but capped volume. Prospect traffic is cheaper per click but worse downstream.

### H8. Day-to-day noise and outlier days
- ±5–15% daily noise; at least one strong outlier day and one weak outlier day per channel, with a `notes` flag explaining the anomaly (e.g., "platform outage", "viral founder share", "budget cap hit").

### H9. Weekend seasonality
- Google and LinkedIn impressions/clicks drop ~25–40% on weekends; Meta less affected.

### H10. An A/B experiment where treatment looks better but sample is too small
- **Experiment:** enterprise message (treatment) vs. generic message (control) on Google Search, ai_founders audience.
- Treatment shows a higher qualified-lead rate (e.g., ~42% vs. ~28%) — a large relative lift.
- **But** the test only ran for a short window with modest sample size, so the confidence interval is wide and the result is **not statistically significant** at 95%.
- The Experiment Lab must show: observed rates, absolute lift, relative lift, confidence interval, a minimum-sample-size warning, and a **decision to continue testing rather than scale**. This demonstrates analytical discipline, not premature optimization.

### H11. A message–landing-page mismatch to debug
- C-MTA-AI pairs an enterprise ad message with an ai_focused landing page. Its LP conversion underperforms matched pairs, giving the dashboard a "fix message continuity" recommendation.

### H12. The central decision the dashboard must force
After all patterns are in, the dataset should make it genuinely non-obvious where the next dollar goes:

- Google scales but marginal CAC is rising.
- LinkedIn is high-quality but expensive and low-volume.
- Meta prospecting is cheap but wasteful.
- Meta retargeting is efficient but saturated.
- The enterprise message wins downstream but needs more sample.

**The defensible recommendation the system should produce** is a nuanced reallocation (e.g., "shift budget from Meta prospecting to Google Search up to the point where marginal CAC hits target, while protecting a retargeting floor and continuing the enterprise-message experiment"), not a simple "Google is best."

---

## I. Programmatic Generation Recommendation

### I1. Approach: top-down connected funnel, not independent random numbers

Generate the dataset with a Python script (NumPy + Pandas) that builds the funnel **top-down and stage-by-stage**, so every downstream count is derived from the upstream count via a rate that depends on channel/audience/message/type. This guarantees all hard constraints in F1 hold.

### I2. Recommended structure of the generator

Generate **top-down from planned spend**, sampling CPC first, then deriving clicks, then inferring impressions from CTR. This keeps spend, clicks, and CPC internally consistent in every row (rather than deriving spend from clicks×CPC and impressions from CPM separately, which can drift apart).

```
For each day in 90 days:
    For each active campaign (from campaign matrix E1):
        1. Determine planned daily spend (budget × pacing factor)
           - apply weekly seasonality + ±noise
        2. Sample effective CPC for the day
           - CPC = cpc_base(channel, campaign_type) × (1 + α × spend_level) × noise
           - spend_level tracks the channel's cumulative ramp (diminishing returns)
        3. clicks = round(planned_spend / CPC)
           - this makes spend = clicks × CPC by construction (reconciled)
        4. impressions = round(clicks / CTR(channel, campaign_type, message))
           - CTR includes channel base rate × message modifier × retargeting boost × fatigue factor
           - this makes CTR = clicks / impressions by construction
        5. landing_page_visits = Binomial(clicks, (1 - bounce_rate(channel, message_lp_match)))
        6. leads = Binomial(landing_page_visits, LP_conversion(channel, campaign_type, message, lp_variant))
        7. qualified_leads = Binomial(leads, qual_rate(channel, audience, message))
        8. quote_starts = Binomial(qualified_leads, quote_start_rate(channel, message))
        9. quotes_completed = Binomial(quote_starts, quote_complete_rate(channel, message))
        10. policies_bound = Binomial(quotes_completed, bind_rate(channel, message, campaign_type))
        11. premium = policies_bound × avg_premium(startup_stage, industry) × noise
        12. Attach derived metrics (cpc, ctr, cpl, cpql, cac, roas)
        13. Flag outliers and add notes
```

The key discipline: **start from spend, derive clicks from CPC, and infer impressions from CTR** — so spend, clicks, CPC, CTR, and impressions are mutually consistent in every row. All downstream stages are then generated with Binomial draws from the immediately-preceding stage, guaranteeing the funnel hierarchy in F1.

### I3. Why Binomial (not Poisson or pure normal)

- Funnel counts are bounded by the stage above (clicks ≤ impressions, leads ≤ visits, etc.). Binomial(n, p) with n = upstream count naturally enforces the hierarchy and produces realistic integer variance.
- For low-probability late-funnel stages (bind rate), Binomial correctly produces many zero days — realistic and analytically important.

### I4. Modeling diminishing returns (H4)

Track a running `spend_level` per channel over the 90 days (budget grows week over week). CPC = `cpc_base × (1 + α × spend_level)` so marginal cost rises as the channel is pushed harder. This makes back-half CAC worse even as volume grows.

### I5. Modeling creative fatigue (H5)

For C-MTA-AI, multiply CTR and qualification by a `fatigue_factor` that starts at 1.0 in weeks 1–4, then decays (e.g., ×0.95 per week) after week 4, simulating audience saturation and creative wear-out.

### I6. Modeling the A/B experiment (H10)

- Split the Google ai_founders enterprise campaign into control (generic) and treatment (enterprise) for a 21-day window.
- Use slightly different underlying rates so treatment shows a real but modest lift.
- **Critically:** keep the sample size modest (small daily budgets during the test) so the confidence interval is wide. Compute and store the CI in the experiment record so the Experiment Lab can show it is not significant.

### I7. Reproducibility and QA

- **Seed everything:** `rng = np.random.default_rng(42)` for full reproducibility.
- **Assert funnel integrity** after generation: for every row, verify `impressions >= clicks >= visits >= leads >= qualified_leads >= quote_starts >= quotes_completed >= policies_bound`. Fail loudly if violated.
- **Reconcile spend:** sum of daily channel spend should match the campaign budget × days (within pacing noise).
- **Null-safe CAC:** compute CAC as `spend / policies_bound` but display "—" (not `Infinity`) when `policies_bound == 0`.
- **Label synthetic:** add a `data_source` column = "synthetic" on every row, and a README note that no Corgi internal data was used.

### I8. Output

- Save as `acquisition_data.csv` (daily campaign-level, ~90 days × 8 campaigns ≈ 720 rows).
- Also produce `summary.json` (aggregated channel metrics) and `experiments.json` for the dashboard.
- All clearly labeled as synthetic.

### I9. Do NOT do these

- Do not generate each funnel stage as an independent random number — this breaks the hierarchy and produces impossible rows (e.g., more policies than leads).
- Do not make the winning channel obvious — the patterns in Section H are the point.
- Do not fabricate Corgi-specific performance claims — the dataset is a simulated scenario, not a representation of Corgi's actual results.
- Do not claim statistical significance for the under-powered experiment.

---

## Summary

This specification gives you everything needed to generate a **realistic, internally consistent, and analytically demanding** synthetic dataset:

- **A.** Publicly verified Corgi facts (segment, triggers, products, quote journey) with citations.
- **B.** External benchmark ranges (CPC, CTR, CPL, conversion, qualification) with sources and a reliability assessment.
- **C.** Clearly-labeled synthetic business-economics assumptions (premium, target CAC, funnel rates).
- **D.** A complete schema with derived metrics and supporting tables.
- **E.** A focused campaign matrix (8 campaigns, not a full 3×3×3 grid) with budget distribution.
- **F.** The variable relationships and correlations that make the data behave like real acquisition.
- **G.** Example rows showing the "cheap-lead trap" and "best-CAC-but-no-volume" patterns.
- **H.** The specific imperfections and patterns that force real growth decisions.
- **I.** A programmatic generation recipe (top-down from spend → CPC → clicks → impressions, Binomial funnel, diminishing returns, creative fatigue, under-powered experiment, reproducibility, QA assertions).

This is a **specification**, not the generated CSV. Following Section I, the next step is to write the Python generator and produce `acquisition_data.csv` plus `summary.json` and `experiments.json`.

The resulting dataset will let your dashboard answer Corgi's core question — **"where should the next dollar go?"** — with genuine analytical tension, not a pre-determined winner.
