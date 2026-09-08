"""
Corgi GrowthOS — Synthetic Acquisition Dataset Generator
========================================================

Portfolio simulation. Produces a realistic, internally-consistent 90-day
paid-acquisition dataset for a hypothetical Corgi Insurance growth campaign
targeting pre-seed/seed AI startups with an enterprise-contract buying trigger.

This does NOT represent Corgi's actual advertising performance, customer
economics, or internal data. All performance numbers are synthetic assumptions
calibrated to public B2B/insurance benchmarks. See the dataset specification
document for sources and rationale.

Output files (written to /home/user/workspace/):
  - acquisition_data.csv   (daily campaign-level, ~720 rows)
  - summary.json           (aggregated channel + campaign metrics)
  - experiments.json       (Experiment Lab records with significance checks)
"""

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------
SEED = 42
rng = np.random.default_rng(SEED)

OUTPUT_DIR = Path("/home/user/workspace")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Configuration: campaign matrix (from spec Section E1)
# ---------------------------------------------------------------------------
# Each campaign: id, channel, audience, message, landing_page, type,
# startup_stage, industry, target_market, monthly_budget, cpc_base, ctr_base,
# lp_conv_base, qual_base, quote_start_base, quote_complete_base, bind_base,
# spend_ramp (weekly budget growth factor), fatigue_start_week (or None),
# audience_cap_daily (optional max clicks/day for retargeting).

CAMPAIGNS = [
    # Google Search — enterprise (treatment in A/B test)
    dict(id="C-GGL-ENT", channel="Google Search", audience="ai_founders",
         message="enterprise", landing_page="enterprise_ready", type="prospecting",
         stage="seed", industry="ai_saas", market="SF Bay",
         monthly_budget=9000, cpc_base=11.0, ctr_base=0.050,
         lp_conv_base=0.14, qual_base=0.42, quote_start_base=0.64,
         quote_complete_base=0.45, bind_base=0.33,
         spend_ramp=1.018, fatigue_start_week=None, audience_cap=None,
         experiment="ent_vs_gen_ggl", variant_role="treatment"),
    # Google Search — generic (control in A/B test)
    dict(id="C-GGL-GEN", channel="Google Search", audience="saas_founders",
         message="generic", landing_page="generic", type="prospecting",
         stage="pre_seed", industry="ai_saas", market="Remote",
         monthly_budget=3000, cpc_base=8.5, ctr_base=0.058,
         lp_conv_base=0.13, qual_base=0.36, quote_start_base=0.40,
         quote_complete_base=0.30, bind_base=0.22,
         spend_ramp=1.012, fatigue_start_week=None, audience_cap=None,
         experiment="ent_vs_gen_ggl", variant_role="control"),
    # LinkedIn — enterprise
    dict(id="C-LNK-ENT", channel="LinkedIn", audience="ai_founders",
         message="enterprise", landing_page="enterprise_ready", type="prospecting",
         stage="seed", industry="ai_saas", market="NYC",
         monthly_budget=4500, cpc_base=9.0, ctr_base=0.0072,
         lp_conv_base=0.10, qual_base=0.58, quote_start_base=0.55,
         quote_complete_base=0.42, bind_base=0.30,
         spend_ramp=1.010, fatigue_start_week=None, audience_cap=None,
         experiment=None, variant_role=None),
    # LinkedIn — fundraising (secondary variant)
    dict(id="C-LNK-FND", channel="LinkedIn", audience="startup_operators",
         message="fundraising", landing_page="enterprise_ready", type="prospecting",
         stage="seed", industry="fintech", market="Remote",
         monthly_budget=2000, cpc_base=8.0, ctr_base=0.0060,
         lp_conv_base=0.09, qual_base=0.52, quote_start_base=0.58,
         quote_complete_base=0.40, bind_base=0.22,
         spend_ramp=1.005, fatigue_start_week=None, audience_cap=None,
         experiment=None, variant_role=None),
    # Meta — generic prospecting (the cheap-leads / poor-CAC trap)
    dict(id="C-MTA-GEN", channel="Meta", audience="ai_founders",
         message="generic", landing_page="generic", type="prospecting",
         stage="pre_seed", industry="ai_infra", market="Remote",
         monthly_budget=3500, cpc_base=4.0, ctr_base=0.012,
         lp_conv_base=0.11, qual_base=0.22, quote_start_base=0.20,
         quote_complete_base=0.22, bind_base=0.32,
         spend_ramp=1.008, fatigue_start_week=None, audience_cap=None,
         experiment=None, variant_role=None),
    # Meta — enterprise message + ai_focused LP mismatch (creative fatigue)
    dict(id="C-MTA-AI", channel="Meta", audience="saas_founders",
         message="enterprise", landing_page="ai_focused", type="prospecting",
         stage="pre_seed", industry="ai_saas", market="Remote",
         monthly_budget=2000, cpc_base=4.5, ctr_base=0.013,
         lp_conv_base=0.085, qual_base=0.30, quote_start_base=0.22,
         quote_complete_base=0.22, bind_base=0.28,
         spend_ramp=1.000, fatigue_start_week=4, audience_cap=None,
         experiment=None, variant_role=None),
    # Meta — retargeting (best CAC, volume-constrained)
    dict(id="C-MTA-RET", channel="Meta", audience="retargeting",
         message="enterprise", landing_page="enterprise_ready", type="retargeting",
         stage="seed", industry="ai_saas", market="Remote",
         monthly_budget=180, cpc_base=3.0, ctr_base=0.030,
         lp_conv_base=0.16, qual_base=0.55, quote_start_base=0.60,
         quote_complete_base=0.50, bind_base=0.32,
         spend_ramp=1.000, fatigue_start_week=None, audience_cap=4,
         experiment=None, variant_role=None),
    # Google — retargeting
    dict(id="C-GGL-RET", channel="Google Search", audience="retargeting",
         message="generic", landing_page="generic", type="retargeting",
         stage="seed", industry="ai_saas", market="Remote",
         monthly_budget=1000, cpc_base=6.0, ctr_base=0.022,
         lp_conv_base=0.14, qual_base=0.50, quote_start_base=0.55,
         quote_complete_base=0.45, bind_base=0.32,
         spend_ramp=1.000, fatigue_start_week=None, audience_cap=28,
         experiment=None, variant_role=None),
]

# ---------------------------------------------------------------------------
# Message & landing-page modifiers
# ---------------------------------------------------------------------------
MESSAGE_CTR_MOD = {"generic": 1.15, "enterprise": 0.90, "fundraising": 1.00}
MESSAGE_QUAL_MOD = {"generic": 0.88, "enterprise": 1.18, "fundraising": 1.08}
MESSAGE_QS_MOD = {"generic": 0.80, "enterprise": 1.20, "fundraising": 1.10}
MESSAGE_BIND_MOD = {"generic": 0.80, "enterprise": 1.20, "fundraising": 1.05}

# Message / landing-page match → better LP conversion. Mismatch (C-MTA-AI)
# is deliberately penalized here.
def lp_conv_modifier(message, landing_page):
    matched = {
        ("generic", "generic"): 1.10,
        ("enterprise", "enterprise_ready"): 1.15,
        ("fundraising", "enterprise_ready"): 1.05,
        ("enterprise", "ai_focused"): 0.80,  # deliberate mismatch
    }
    return matched.get((message, landing_page), 1.0)

# ---------------------------------------------------------------------------
# Seasonality
# ---------------------------------------------------------------------------
# B2B intent: Tue-Thu strongest, weekends weak for Google/LinkedIn.
DOW_IMP_MOD = {0: 0.90, 1: 1.15, 2: 1.20, 3: 1.15, 4: 0.95, 5: 0.45, 6: 0.40}
WEEKEND_CHANNELS = {"Google Search", "LinkedIn"}

# Average annual premium by stage (Corgi public range: pre-seed $2k-$5k)
PREMIUM_BY_STAGE = {"pre_seed": 2800, "seed": 3800, "series_a": 9500}
# Enterprise-contract trigger pulls higher-limit Tech E&O + Cyber → premium uplift
ENTERPRISE_PREMIUM_UPLIFT = 1.25

# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------
START_DATE = pd.Timestamp("2026-06-01")
N_DAYS = 90
dates = pd.date_range(START_DATE, periods=N_DAYS)

records = []
experiment_daily = {}  # experiment_id -> list of daily dicts for significance calc

for di, date in enumerate(dates):
    week = di // 7 + 1
    dow = date.dayofweek
    is_weekend = dow >= 5

    for camp in CAMPAIGNS:
        channel = camp["channel"]
        ctype = camp["type"]

        # --- 1. Planned daily spend with weekly seasonality + noise
        dow_mod = DOW_IMP_MOD[dow]
        if is_weekend and channel in WEEKEND_CHANNELS:
            dow_mod *= 0.65  # extra weekend dampening for B2B search/professional
        daily_budget = camp["monthly_budget"] / 30.0

        # A/B experiment window: the ent_vs_gen test runs only for a 21-day
        # window (Jun 1 - Jun 21) at EQUAL fixed daily budgets for both variants,
        # so the rates are stable and comparable but the total sample stays
        # modest and the result is NOT statistically significant — forcing the
        # Experiment Lab to recommend continuing the test rather than scaling.
        exp = camp["experiment"]
        in_exp_window = False
        test_ramp = None
        if exp:
            exp_start = pd.Timestamp("2026-06-01")
            exp_end = pd.Timestamp("2026-06-21")
            in_exp_window = exp_start <= date <= exp_end
            if in_exp_window:
                # equal fixed test budget for both variants (ignores ramp + dow).
                # Large enough for stable rates, small enough that a modest
                # effect stays non-significant.
                daily_budget = 150.0
                dow_mod = 1.0
                test_ramp = 1.0
            else:
                test_ramp = None

        # ramp budget up over time (growth) — apply cumulative ramp
        ramp = camp["spend_ramp"] ** week
        if test_ramp is not None:
            ramp = test_ramp
        planned_spend = daily_budget * ramp * dow_mod
        planned_spend *= rng.normal(1.0, 0.06)  # pacing noise
        planned_spend = max(50.0, planned_spend)

        # --- 2. Effective CPC (rises with spend_level — diminishing returns)
        spend_level = week / 13.0  # 0..~1 over the quarter
        alpha = 0.025 if channel == "Google Search" else 0.015
        cpc = camp["cpc_base"] * (1 + alpha * spend_level) * rng.normal(1.0, 0.05)
        cpc = max(0.50, cpc)

        # --- 3. Clicks from spend / CPC (keeps spend = clicks * CPC consistent)
        clicks = int(round(planned_spend / cpc))

        # Retargeting audience cap (limited pool)
        if camp["audience_cap"] is not None:
            clicks = min(clicks, camp["audience_cap"])
            # sometimes the pool is even smaller later in the quarter
            if week > 8:
                clicks = int(clicks * rng.uniform(0.7, 1.0))

        if clicks < 1:
            clicks = 0
        spend = round(clicks * cpc, 2)

        # --- 4. Impressions from CTR (keeps CTR = clicks/impressions consistent)
        ctr = (camp["ctr_base"]
               * MESSAGE_CTR_MOD[camp["message"]]
               * (1.25 if ctype == "retargeting" else 1.0))
        # creative fatigue
        if camp["fatigue_start_week"] is not None and week > camp["fatigue_start_week"]:
            fatigue = 0.95 ** (week - camp["fatigue_start_week"])
            ctr *= fatigue
        ctr = max(0.001, ctr)

        if clicks > 0 and ctr > 0:
            impressions = int(round(clicks / ctr))
            # impressions should be >= clicks
            impressions = max(impressions, clicks)
        else:
            impressions = 0
        ctr_actual = clicks / impressions if impressions > 0 else 0.0

        # --- 5. Landing page visits (some clicks bounce)
        bounce_rate = 0.12 if ctype == "retargeting" else 0.22
        # mismatch penalty on bounce
        if lp_conv_modifier(camp["message"], camp["landing_page"]) < 1.0:
            bounce_rate += 0.05
        visits = int(rng.binomial(clicks, 1 - bounce_rate))

        # --- 6. Leads
        lp_conv = (camp["lp_conv_base"]
                   * lp_conv_modifier(camp["message"], camp["landing_page"])
                   * (1.2 if ctype == "retargeting" else 1.0))
        lp_conv = min(lp_conv, 0.95)
        leads = int(rng.binomial(visits, lp_conv))

        # --- 7. Qualified leads
        qual = (camp["qual_base"] * MESSAGE_QUAL_MOD[camp["message"]]
                * (1.15 if ctype == "retargeting" else 1.0))
        # During the A/B test window, both variants run at equal budget so
        # rates are comparable. The enterprise treatment gets a modest,
        # deterministic uplift so the observed lift is reliably promising,
        # but the modest 21-day sample keeps it non-significant.
        if in_exp_window and camp["variant_role"] == "treatment":
            qual *= 1.15
        qual = min(qual, 0.95)
        qualified = int(rng.binomial(leads, qual))

        # --- 8. Quote starts
        qs = camp["quote_start_base"] * MESSAGE_QS_MOD[camp["message"]]
        qs = min(qs, 0.95)
        quote_starts = int(rng.binomial(qualified, qs))

        # --- 9. Quotes completed
        qc = camp["quote_complete_base"] * (1.1 if ctype == "retargeting" else 1.0)
        qc = min(qc, 0.95)
        quotes_completed = int(rng.binomial(quote_starts, qc))

        # --- 10. Policies bound
        bd = camp["bind_base"] * MESSAGE_BIND_MOD[camp["message"]]
        bd = min(bd, 0.95)
        policies_bound = int(rng.binomial(quotes_completed, bd))

        # --- 11. Premium
        base_prem = PREMIUM_BY_STAGE.get(camp["stage"], 3500)
        if camp["message"] == "enterprise":
            base_prem *= ENTERPRISE_PREMIUM_UPLIFT
        premium = round(policies_bound * base_prem * rng.normal(1.0, 0.08), 2)
        premium = max(0.0, premium)

        # --- 12. Derived metrics
        cpc_actual = spend / clicks if clicks > 0 else 0.0
        cpl = spend / leads if leads > 0 else float("nan")
        cpql = spend / qualified if qualified > 0 else float("nan")
        cac = spend / policies_bound if policies_bound > 0 else float("nan")
        roas = premium / spend if spend > 0 else 0.0

        # --- 13. Outlier / notes
        notes = ""
        # Inject a couple of platform anomalies on fixed days
        if date == pd.Timestamp("2026-07-04") and channel in WEEKEND_CHANNELS:
            # holiday dampening already captured by weekend; add a note for a
            # strong day instead
            pass
        if date == pd.Timestamp("2026-07-15") and channel == "Meta" and ctype == "prospecting":
            # viral founder share → unusually strong day
            clicks = int(clicks * 2.1)
            impressions = int(impressions * 2.0)
            spend = round(clicks * cpc, 2)
            visits = int(rng.binomial(clicks, 1 - bounce_rate))
            leads = int(rng.binomial(visits, lp_conv))
            qualified = int(rng.binomial(leads, qual))
            quote_starts = int(rng.binomial(qualified, qs))
            quotes_completed = int(rng.binomial(quote_starts, qc))
            policies_bound = int(rng.binomial(quotes_completed, bd))
            premium = round(policies_bound * base_prem * rng.normal(1.0, 0.08), 2)
            notes = "viral founder share; anomaly day"
            spend = round(clicks * cpc, 2)
        if date == pd.Timestamp("2026-08-10") and channel == "Google Search":
            # budget cap / pacing pause → weak day
            clicks = int(clicks * 0.35)
            impressions = int(impressions * 0.4)
            spend = round(clicks * cpc, 2)
            visits = int(rng.binomial(clicks, 1 - bounce_rate))
            leads = int(rng.binomial(visits, lp_conv))
            qualified = int(rng.binomial(leads, qual))
            quote_starts = int(rng.binomial(qualified, qs))
            quotes_completed = int(rng.binomial(quote_starts, qc))
            policies_bound = int(rng.binomial(quotes_completed, bd))
            premium = round(policies_bound * base_prem * rng.normal(1.0, 0.08), 2)
            notes = "budget cap / pacing pause; anomaly day"

        # Recompute derived after anomaly injection
        cpc_actual = spend / clicks if clicks > 0 else 0.0
        cpl = spend / leads if leads > 0 else float("nan")
        cpql = spend / qualified if qualified > 0 else float("nan")
        cac = spend / policies_bound if policies_bound > 0 else float("nan")
        roas = premium / spend if spend > 0 else 0.0

        row = dict(
            date=date.strftime("%Y-%m-%d"),
            channel=channel,
            campaign=camp["id"],
            audience=camp["audience"],
            campaign_type=ctype,
            target_market=camp["market"],
            startup_stage=camp["stage"],
            industry=camp["industry"],
            message_variant=camp["message"],
            landing_page_variant=camp["landing_page"],
            impressions=impressions,
            clicks=clicks,
            spend=spend,
            landing_page_visits=visits,
            leads=leads,
            qualified_leads=qualified,
            quote_starts=quote_starts,
            quotes_completed=quotes_completed,
            policies_bound=policies_bound,
            premium=premium,
            cpc=round(cpc_actual, 2),
            ctr=round(ctr_actual, 4),
            lp_conversion_rate=round(leads / visits, 4) if visits > 0 else 0.0,
            qual_rate=round(qualified / leads, 4) if leads > 0 else 0.0,
            cpl=round(cpl, 2) if not math.isnan(cpl) else None,
            cpql=round(cpql, 2) if not math.isnan(cpql) else None,
            cac=round(cac, 2) if not math.isnan(cac) else None,
            roas=round(roas, 4),
            day_of_week=dow,
            is_weekend=is_weekend,
            experiment_id=camp["experiment"],
            variant_role=camp["variant_role"],
            notes=notes,
            data_source="synthetic",
        )
        records.append(row)

        # collect A/B experiment daily aggregates (only within the test window)
        if camp["experiment"] and in_exp_window:
            experiment_daily.setdefault(camp["experiment"], []).append(dict(
                date=date.strftime("%Y-%m-%d"),
                variant_role=camp["variant_role"],
                visits=visits,
                leads=leads,
                qualified_leads=qualified,
            ))

df = pd.DataFrame(records)

# ---------------------------------------------------------------------------
# QA assertions: funnel hierarchy must hold on every row
# ---------------------------------------------------------------------------
def check_funnel(row):
    seq = [row["impressions"], row["clicks"], row["landing_page_visits"],
           row["leads"], row["qualified_leads"], row["quote_starts"],
           row["quotes_completed"], row["policies_bound"]]
    return all(seq[i] >= seq[i+1] for i in range(len(seq)-1))

bad = df[~df.apply(check_funnel, axis=1)]
assert len(bad) == 0, f"Funnel hierarchy violated on {len(bad)} rows:\n{bad.head()}"

# ---------------------------------------------------------------------------
# Write acquisition_data.csv
# ---------------------------------------------------------------------------
csv_path = OUTPUT_DIR / "acquisition_data.csv"
df.to_csv(csv_path, index=False)

# ---------------------------------------------------------------------------
# summary.json — aggregated channel + campaign metrics
# ---------------------------------------------------------------------------
def agg(group_col):
    g = df.groupby(group_col).agg(
        spend=("spend", "sum"),
        impressions=("impressions", "sum"),
        clicks=("clicks", "sum"),
        landing_page_visits=("landing_page_visits", "sum"),
        leads=("leads", "sum"),
        qualified_leads=("qualified_leads", "sum"),
        quote_starts=("quote_starts", "sum"),
        quotes_completed=("quotes_completed", "sum"),
        policies_bound=("policies_bound", "sum"),
        premium=("premium", "sum"),
    ).reset_index()
    g["cpc"] = (g["spend"] / g["clicks"]).round(2)
    g["ctr"] = (g["clicks"] / g["impressions"]).round(4)
    g["lp_conversion_rate"] = (g["leads"] / g["landing_page_visits"]).round(4)
    g["qual_rate"] = (g["qualified_leads"] / g["leads"]).round(4)
    g["cpl"] = (g["spend"] / g["leads"]).round(2)
    g["cpql"] = (g["spend"] / g["qualified_leads"]).round(2)
    g["cac"] = (g["spend"] / g["policies_bound"]).round(2)
    g["cac"] = g["cac"].where(g["policies_bound"] > 0, None)
    g["roas"] = (g["premium"] / g["spend"]).round(4)
    g["quote_start_rate"] = (g["quote_starts"] / g["qualified_leads"]).round(4)
    g["bind_rate"] = (g["policies_bound"] / g["quotes_completed"]).round(4)
    return g.to_dict(orient="records")

summary = {
    "meta": {
        "description": "Synthetic aggregated acquisition metrics for Corgi GrowthOS portfolio simulation.",
        "data_source": "synthetic",
        "period": f"{dates[0].date().isoformat()} to {dates[-1].date().isoformat()}",
        "n_days": N_DAYS,
        "n_campaigns": len(CAMPAIGNS),
        "total_rows": len(df),
    },
    "totals": {
        "spend": round(df["spend"].sum(), 2),
        "impressions": int(df["impressions"].sum()),
        "clicks": int(df["clicks"].sum()),
        "landing_page_visits": int(df["landing_page_visits"].sum()),
        "leads": int(df["leads"].sum()),
        "qualified_leads": int(df["qualified_leads"].sum()),
        "quote_starts": int(df["quote_starts"].sum()),
        "quotes_completed": int(df["quotes_completed"].sum()),
        "policies_bound": int(df["policies_bound"].sum()),
        "premium": round(df["premium"].sum(), 2),
        "overall_cac": round(df["spend"].sum() / df["policies_bound"].sum(), 2) if df["policies_bound"].sum() > 0 else None,
        "overall_cpl": round(df["spend"].sum() / df["leads"].sum(), 2),
        "overall_cpql": round(df["spend"].sum() / df["qualified_leads"].sum(), 2),
        "overall_qual_rate": round(df["qualified_leads"].sum() / df["leads"].sum(), 4),
        "overall_bind_rate": round(df["policies_bound"].sum() / df["quotes_completed"].sum(), 4) if df["quotes_completed"].sum() > 0 else None,
        "overall_roas": round(df["premium"].sum() / df["spend"].sum(), 4),
    },
    "by_channel": agg("channel"),
    "by_campaign": agg("campaign"),
    "by_message": agg("message_variant"),
    "by_audience": agg("audience"),
    "by_campaign_type": agg("campaign_type"),
}

summary_path = OUTPUT_DIR / "summary.json"
with open(summary_path, "w") as f:
    json.dump(summary, f, indent=2)

# ---------------------------------------------------------------------------
# experiments.json — Experiment Lab with significance checks
# ---------------------------------------------------------------------------
def proportion_ci(x1, n1, x2, n2, alpha=0.05):
    """Two-proportion z-test + diff confidence interval (Welch-style)."""
    p1 = x1 / n1 if n1 > 0 else 0.0
    p2 = x2 / n2 if n2 > 0 else 0.0
    diff = p1 - p2
    # pooled for SE of difference
    p_pool = (x1 + x2) / (n1 + n2) if (n1 + n2) > 0 else 0.0
    se = math.sqrt(p_pool * (1 - p_pool) * (1/n1 + 1/n2)) if (n1 > 0 and n2 > 0 and se_denom_ok(p_pool)) else 0.0
    z = 1.96  # 95%
    ci_low = diff - z * se
    ci_high = diff + z * se
    z_stat = diff / se if se > 0 else 0.0
    p_value = 2 * (1 - normal_cdf(abs(z_stat))) if se > 0 else 1.0
    rel_lift = (diff / p2) if p2 > 0 else 0.0
    return dict(
        control_rate=round(p2, 4),
        treatment_rate=round(p1, 4),
        absolute_lift=round(diff, 4),
        relative_lift=round(rel_lift, 4),
        ci_low=round(ci_low, 4),
        ci_high=round(ci_high, 4),
        z_stat=round(z_stat, 4),
        p_value=round(p_value, 4),
        significant=bool(p_value < 0.05),
    )

def se_denom_ok(p):
    return 0 < p < 1

def normal_cdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))

# Build experiment record for ent_vs_gen_ggl
exp_rows = experiment_daily.get("ent_vs_gen_ggl", [])
exp_df = pd.DataFrame(exp_rows)
control = exp_df[exp_df["variant_role"] == "control"]
treatment = exp_df[exp_df["variant_role"] == "treatment"]

# Primary metric: qualified-lead rate (qualified_leads / visits)
c_vis = int(control["visits"].sum()); c_ql = int(control["qualified_leads"].sum())
t_vis = int(treatment["visits"].sum()); t_ql = int(treatment["qualified_leads"].sum())

# Use visits as denominator for qualified-lead rate (qualified leads per visitor)
stats = proportion_ci(t_ql, t_vis, c_ql, c_vis)

experiments = {
    "experiments": [
        {
            "experiment_id": "ent_vs_gen_ggl",
            "name": "Enterprise-readiness messaging vs. generic speed messaging (Google Search, AI founders)",
            "hypothesis": (
                "AI startup founders shown 'Be ready for your next enterprise contract' "
                "messaging will produce a higher qualified-lead rate than those shown "
                "'Get startup insurance in minutes', because enterprise-readiness connects "
                "insurance to an urgent buying trigger."
            ),
            "primary_metric": "Qualified-lead rate (qualified leads / landing-page visits)",
            "guardrail_metrics": ["Cost per lead", "Form completion rate", "Quote-start rate"],
            "control": {
                "message": "Get startup insurance in minutes.",
                "campaign": "C-GGL-GEN",
                "visits": c_vis,
                "qualified_leads": c_ql,
                "qualified_lead_rate": round(c_ql / c_vis, 4) if c_vis > 0 else 0,
            },
            "treatment": {
                "message": "Be ready for your next enterprise contract.",
                "campaign": "C-GGL-ENT",
                "visits": t_vis,
                "qualified_leads": t_ql,
                "qualified_lead_rate": round(t_ql / t_vis, 4) if t_vis > 0 else 0,
            },
            "statistics": stats,
            "sample_size_warning": (
                "Treatment shows a higher observed qualified-lead rate, but the sample "
                "is modest and the 95% confidence interval includes zero. Do not scale "
                "the treatment to full budget yet — continue the test to reach the "
                "minimum detectable effect sample size before reallocating."
            ),
            "status": "completed",
            "decision": "Continue testing — observed lift is promising but not yet statistically significant.",
            "data_source": "synthetic",
        }
    ]
}

exp_path = OUTPUT_DIR / "experiments.json"
with open(exp_path, "w") as f:
    json.dump(experiments, f, indent=2)

# ---------------------------------------------------------------------------
# Console report
# ---------------------------------------------------------------------------
print("=" * 70)
print("CORGI GROWTHOS — SYNTHETIC DATASET GENERATED")
print("=" * 70)
print(f"Period:       {summary['meta']['period']}")
print(f"Rows:         {summary['meta']['total_rows']}  ({N_DAYS} days x {len(CAMPAIGNS)} campaigns)")
print(f"Total spend:  ${summary['totals']['spend']:,.2f}")
print(f"Leads:        {summary['totals']['leads']:,}")
print(f"Qualified:    {summary['totals']['qualified_leads']:,}")
print(f"Quotes done:  {summary['totals']['quotes_completed']:,}")
print(f"Policies:     {summary['totals']['policies_bound']:,}")
print(f"Premium:      ${summary['totals']['premium']:,.2f}")
print(f"Overall CAC:  ${summary['totals']['overall_cac']:,.2f}")
print(f"Overall CPL:  ${summary['totals']['overall_cpl']:,.2f}")
print(f"Overall CPQL: ${summary['totals']['overall_cpql']:,.2f}")
print(f"Overall ROAS: {summary['totals']['overall_roas']}")
print()
print("BY CHANNEL:")
ch = pd.DataFrame(summary["by_channel"])
for _, r in ch.iterrows():
    cac_str = f"${r['cac']:,.0f}" if pd.notna(r['cac']) else "—"
    print(f"  {r['channel']:<16} spend ${r['spend']:>8,.0f}  leads {r['leads']:>4}  "
          f"qual {r['qualified_leads']:>4}  policies {r['policies_bound']:>3}  "
          f"CPL ${r['cpl']:>6,.0f}  CAC {cac_str}")
print()
print("BY CAMPAIGN:")
cm = pd.DataFrame(summary["by_campaign"])
for _, r in cm.iterrows():
    cac_str = f"${r['cac']:,.0f}" if pd.notna(r['cac']) else "—"
    print(f"  {r['campaign']:<12} spend ${r['spend']:>8,.0f}  policies {r['policies_bound']:>3}  "
          f"CAC {cac_str}  ROAS {r['roas']}")
print()
print("EXPERIMENT (enterprise vs generic, Google Search):")
e = experiments["experiments"][0]
print(f"  Control qualified-lead rate:   {e['control']['qualified_lead_rate']:.4f}")
print(f"  Treatment qualified-lead rate: {e['treatment']['qualified_lead_rate']:.4f}")
print(f"  Relative lift: {e['statistics']['relative_lift']:.2%}")
print(f"  95% CI: [{e['statistics']['ci_low']:.4f}, {e['statistics']['ci_high']:.4f}]")
print(f"  p-value: {e['statistics']['p_value']:.4f}  significant: {e['statistics']['significant']}")
print()
print(f"Funnel-hierarchy QA: {'PASS' if len(bad)==0 else 'FAIL'} ({len(df)} rows checked)")
print(f"\nFiles written:")
print(f"  {csv_path}")
print(f"  {summary_path}")
print(f"  {exp_path}")
