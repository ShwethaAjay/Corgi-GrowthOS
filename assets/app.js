/* Corgi GrowthOS — app.js v2
   Decision-engine-driven Overview. No external chart lib: inline SVG.
*/
(function () {
  const D = window.GROWTHOS_DATA;
  if (!D || !D.summary) { console.error("data.js missing"); return; }
  const S = D.summary;
  const CH = {}; (S.by_channel||[]).forEach(c=>CH[c.channel]=c);
  const CM = {}; (S.by_campaign||[]).forEach(c=>CM[c.campaign]=c);
  const TARGET = D.target_cac || 2500;

  const fmt = { money(v){ if(v==null||isNaN(v))return"—"; return "$"+Math.round(v).toLocaleString(); }, num(v){ if(v==null||isNaN(v))return"—"; return v.toLocaleString(); }, pct(v,d=1){ if(v==null||isNaN(v))return"—"; return (v*100).toFixed(d)+"%"; }, compact(v){ if(v==null||isNaN(v))return"—"; if(Math.abs(v)>=1000)return (v/1000).toFixed(1)+"K"; return Math.round(v).toString(); } };
  const CHANNELS = ["Google Search","LinkedIn","Meta"];
  const CHAN_SORT = {"Google Search":"Google","LinkedIn":"LinkedIn","Meta":"Meta"};

  // campaign metadata not in summary.json (from CSV spec)
  const campaignMeta = {
    "C-GGL-ENT":{type:"Treatment · enterprise",message:"Enterprise-ready",lp:"Enterprise Q2Q",stage:"seed/Series A"},
    "C-GGL-GEN":{type:"Control · generic",message:"Generic speed",lp:"Generic LP",stage:"pre-seed"},
    "C-GGL-RET":{type:"Retargeting",message:"Speed retarget",lp:"Quote-start CTA",stage:"seed"},
    "C-LNK-ENT":{type:"Treatment · enterprise",message:"Enterprise-ready",lp:"Enterprise Q2Q",stage:"seed/Series A"},
    "C-LNK-FND":{type:"Treatment · fundraising",message:"Fundraising-ready",lp:"Fundraising LP",stage:"seed/Series A"},
    "C-MTA-AI":{type:"Treatment · AI product",message:"AI-product",lp:"LP mismatch",stage:"seed"},
    "C-MTA-GEN":{type:"Control · generic",message:"Generic speed",lp:"Generic LP",stage:"pre-seed"},
    "C-MTA-RET":{type:"Retargeting",message:"Speed retarget",lp:"Quote-start CTA",stage:"seed"}
  };

  /* ============ INSIGHT ENGINE (spec v1.0) ============ */
  // Operating assumptions — ratios to target CAC, not hard-coded dollars.
  const A = {
    target_cac: TARGET,
    material_spend:       1.0 * TARGET,   // spend worth acting on
    high_material_spend:  2.0 * TARGET,   // spend that raises downside confidence
    scale_cac_ratio:      0.5,            // CAC < 50% of target = efficient
    near_ceiling_ratio:   0.8,            // top-bucket CAC within 80% of target = near saturation
    min_qualified_for_diag: 30,           // need this many qualified leads to diagnose quality
    min_policies_for_scale: 5,            // need this many policies to recommend scaling
    significance_alpha:   0.05,           // experiment significance threshold
    min_bucket_days:      5,              // marginal-bucket reliability floor
  };
  // Portfolio-relative reference for "cheap leads" — NOT a hard-coded $70.
  const PORTFOLIO_MEDIAN_CPL = (() => {
    const vals = Object.values(CM).map(c=>c.cpl).filter(v=>v!=null && !isNaN(v));
    if (!vals.length) return 70;
    vals.sort((a,b)=>a-b);
    return vals[Math.floor(vals.length/2)];
  })();

  // Confidence from evidence volume. Asymmetric: downside (cut) needs less proof than upside (scale).
  function confidenceOf(c) {
    const sp=c.spend, pol=c.policies_bound, ql=c.qualified_leads;
    if (sp >= A.high_material_spend && (pol >= A.min_policies_for_scale || ql >= 50)) return "HIGH";
    if (sp >= A.material_spend && (pol >= 1 || ql >= A.min_qualified_for_diag)) return "MEDIUM";
    return "LOW";
  }

  // priority_score: economic impact. ACTION = wasted spend; OPPORTUNITY = headroom × evidence.
  function priorityScore(tier, c) {
    if (tier === "ACTION") return c.spend - (A.target_cac * c.policies_bound); // excess_spend
    if (tier === "OPPORTUNITY") return (A.target_cac - (c.cac||0)) * (c.policies_bound + c.qualified_leads);
    return 0;
  }

  // Evaluate diagnoses in priority order: most specific/actionable first.
  // Dead → lead-quality → diminishing → CAC-above-target → near-saturation → healthy → constrained → monitor.
  function classify(c) {
    const id = c.campaign;
    const sp=c.spend, cac=c.cac, cpl=c.cpl, cpql=c.cpql, pol=c.policies_bound, ql=c.qualified_leads;
    const mc = D.marginal && D.marginal[id] ? D.marginal[id] : null;
    const conf = confidenceOf(c);
    if (sp < 200) return null; // negligible spend — not actionable

    // C1 — Dead spend: zero policies, material spend. ACTION (downside gate: low evidence still acts on waste).
    if (pol === 0 && sp >= A.material_spend) {
      return mk(c, "dead_spend", "ACTION", conf, [
        ev("Spend", sp, ">=", A.material_spend, "material"),
        ev("Policies", pol, "=", 0, ""),
        ev("Qualified leads", ql, "", null, "downstream signal"),
      ], "Pause. Diagnose offer, landing page, or audience before reinvesting.",
        ql >= A.min_qualified_for_diag ? "Qualified leads exist but no policies — the bottleneck is quote-flow, not lead volume." : "No qualified leads — check top-of-funnel targeting first.");
    }
    // C3 — Lead-quality trap: CPL below portfolio median BUT CAC above target.
    if (cpl != null && cpl < PORTFOLIO_MEDIAN_CPL && cac != null && cac > A.target_cac) {
      return mk(c, "lead_quality_trap", "ACTION", conf, [
        ev("CPL", cpl, "<", PORTFOLIO_MEDIAN_CPL, "portfolio median"),
        ev("CAC", cac, ">", A.target_cac, "target"),
        ev("Policies", pol, "<", A.min_policies_for_scale, "scale floor"),
      ], "Stop optimizing for CPL. Tighten qualification before adding spend.",
        "A low CPL is not an asset when leads don't become customers.");
    }
    // C4 — Diminishing returns: marginal CAC crosses target (bucket must be well-supported).
    if (mc && mc.ceiling != null) {
      const ceilBucket = mc.buckets.find(b => b.cac != null && b.cac > A.target_cac);
      const bucketDays = ceilBucket ? ceilBucket.n_days : 0;
      if (bucketDays >= A.min_bucket_days) {
        const weekly = mc.ceiling * 7;
        return mk(c, "diminishing_returns", "ACTION", conf === "LOW" ? "MEDIUM" : conf, [
          ev("Marginal CAC", ceilBucket.cac, ">", A.target_cac, "target"),
          ev("Crossing spend", mc.ceiling, "≈", null, "$/day"),
          ev("Bucket days", bucketDays, ">=", A.min_bucket_days, "reliability"),
        ], `Cap spend at ~$${Math.round(mc.ceiling)}/day (~$${Math.round(weekly)}/wk). Redirect overflow to a cheaper-scaling channel.`,
          "Ceiling is bucket-derived; re-verify as more data accrues.");
      }
    }
    // C2 — CAC above target (generic efficiency problem).
    if (cac != null && cac > A.target_cac && sp >= A.material_spend && pol >= 1) {
      return mk(c, "cac_above_target", "ACTION", conf, [
        ev("CAC", cac, ">", A.target_cac, "target"),
        ev("Spend", sp, ">=", A.material_spend, "material"),
        ev("Excess spend", sp - A.target_cac*pol, "", null, "beyond target"),
      ], "Cut budget or fix the landing page. Do not scale until CAC is below target.",
        "If marginal CAC is also rising, the problem worsens with scale.");
    }
    // C7 — Near saturation: no ceiling crossed but top-bucket CAC within 80–100% of target.
    if (mc && mc.ceiling == null) {
      const top = [...mc.buckets].reverse().find(b => b.cac != null);
      if (top && top.cac >= A.near_ceiling_ratio * A.target_cac) {
        return mk(c, "near_saturation", "WATCH", conf, [
          ev("Top-bucket CAC", top.cac, ">=", A.near_ceiling_ratio*A.target_cac, "near ceiling"),
          ev("Spend level", top.spend_level, "≈", null, "$/day"),
        ], "Monitor before adding spend.",
          "Approaching the ceiling; do not treat as unbounded headroom.");
      }
    }
    // C5 — Healthy & scalable: CAC below target, enough policies, tested at material spend, no ceiling.
    if (cac != null && cac < A.target_cac && pol >= A.min_policies_for_scale && sp >= A.material_spend && (!mc || mc.ceiling == null)) {
      return mk(c, "healthy_scalable", "OPPORTUNITY", conf, [
        ev("CAC", cac, "<", A.target_cac, "target"),
        ev("Policies", pol, ">=", A.min_policies_for_scale, "scale floor"),
        ev("Marginal CAC", mc ? Math.max(...mc.buckets.filter(b=>b.cac!=null).map(b=>b.cac)) : cac, "<", A.target_cac, "no ceiling"),
      ], "Increase budget in controlled increments.",
        "Conditional on marginal CAC staying below target as spend rises.");
    }
    // C6 — Efficient but constrained: very low CAC, but volume/spend too low to trust at scale.
    if (cac != null && cac < A.scale_cac_ratio*A.target_cac && pol >= 1 && (!mc || mc.ceiling == null) && (sp < A.material_spend || (campaignMeta[id]||{}).type === "Retargeting")) {
      return mk(c, "efficient_constrained", "OPPORTUNITY", conf, [
        ev("CAC", cac, "<", A.scale_cac_ratio*A.target_cac, "efficient"),
        ev("Spend", sp, "<", A.material_spend, "low volume"),
        ev("Policies", pol, "", null, ""),
      ], "Scale test cautiously. Monitor saturation.",
        "Best CAC is not always the best place for the next dollar — retargetable audience is limited.");
    }
    // C8 — Within tolerance.
    return mk(c, "within_tolerance", "WATCH", conf, [
      ev("CAC", cac, "", null, ""),
      ev("Policies", pol, "", null, ""),
    ], "No action this cycle.", "Re-evaluate next cycle.");
  }

  // helper builders
  function ev(metric, value, comparator, threshold, thresholdLabel){
    return { metric, value, comparator, threshold, thresholdLabel };
  }
  function mk(c, diagnostic, tier, confidence, evidence, recommendation, caveat){
    return {
      id: c.campaign, entity_type:"campaign", entity_id:c.campaign, diagnostic, tier, confidence,
      priority_score: priorityScore(tier, c), evidence, recommendation, caveat,
      _c: c
    };
  }

  // Experiment as a first-class insight, always shown in its own "Learning" slot.
  function classifyExperiment(exp) {
    const st = exp.statistics || {};
    const p = st.p_value;
    const sig = !!st.significant || (p != null && p < A.significance_alpha);
    const tr = st.treatment_rate, cr = st.control_rate;
    const n = (exp.control&&exp.control.visits||0) + (exp.treatment&&exp.treatment.visits||0);
    const lift = (st.relative_lift != null ? st.relative_lift*100 : 0);
    const tier = sig ? "ACTION" : "WATCH";
    const diagnostic = sig ? "experiment_significant" : "experiment_inconclusive";
    return {
      id:"experiment", entity_type:"experiment", entity_id: exp.experiment_id||"AB_ent_vs_gen", diagnostic, tier, confidence:"LOW",
      priority_score:0,
      evidence:[
        ev("Treatment qual rate", tr, "vs", cr, "control"),
        ev("Relative lift", lift/100, "", null, "%"),
        ev("p-value", p, sig?"<":">=", A.significance_alpha, "alpha"),
        ev("Sample size", n, "", null, ""),
      ],
      recommendation: sig ? "Roll out the winning variant. Check guardrail metrics first."
                           : "Continue the test. Do not declare a winner — more sample needed.",
      caveat: sig ? "" : `A ${lift.toFixed(1)}% lift on p=${p!=null?p.toFixed(2):"—"} is a promising signal, not a result.`,
      _lift: lift, _p: p, _sig: sig
    };
  }

  // Build the panel: guarantee the operator sees cut + scale + constrained + experiment.
  // Ranked by tier → economic impact → confidence (NOT confidence first).
  function buildInsights() {
    const ranked = { ACTION:[], OPPORTUNITY:[], WATCH:[] };
    for (const id of Object.keys(CM)) {
      const cl = classify(CM[id]);
      if (cl) ranked[cl.tier].push(cl);
    }
    const byImpact = (a,b)=> b.priority_score - a.priority_score;
    ranked.ACTION.sort(byImpact);
    ranked.OPPORTUNITY.sort(byImpact);
    ranked.WATCH.sort(byImpact);

    // Guarantee decision-type diversity: top 2 cuts (top waste) + top 2 scale/constrained.
    // 4 campaign decisions + 1 reserved experiment = 5 cards — surfaces cut + scale + constrained before scrolling.
    const decisions = [];
    ranked.ACTION.slice(0, 2).forEach(d => decisions.push(d));
    ranked.OPPORTUNITY.slice(0, 2).forEach(d => decisions.push(d));

    const expArr = Array.isArray(D.experiments) ? D.experiments : (D.experiments && D.experiments.experiments || []);
    const exp = expArr[0];
    const experimentInsight = exp ? classifyExperiment(exp) : null;
    return { decisions, experiment: experimentInsight };
  }

  /* ============ RENDER: INSIGHTS ============ */
  // Operator-language labels (engine diagnostic → product copy). Engine names never leak.
  const UI_LABEL = {
    dead_spend: "No conversion",
    lead_quality_trap: "Lead quality problem",
    diminishing_returns: "Scaling is getting expensive",
    cac_above_target: "CAC above target",
    near_saturation: "Approaching saturation",
    healthy_scalable: "Strong candidate to scale",
    efficient_constrained: "Efficient, but volume constrained",
    within_tolerance: "Within tolerance",
    experiment_inconclusive: "Test inconclusive",
    experiment_significant: "Significant winner",
  };
  const TIER_ICON = { ACTION: "✕", OPPORTUNITY: "↗", WATCH: "•" };

  function evidenceStr(c) {
    const ev_ = (e) => {
      const v = e.metric==="CPL"||e.metric==="CAC"||e.metric==="Marginal CAC"||e.metric==="Top-bucket CAC" ? fmt.money(e.value)
              : e.metric==="Relative lift" ? fmt.pct(e.value,1)
              : e.metric==="p-value" ? (e.value!=null?e.value.toFixed(2):"—")
              : e.metric==="Treatment qual rate"||e.metric==="Sample size"||e.metric==="Bucket days"||e.metric==="Policies"||e.metric==="Qualified leads"||e.metric==="Spend"||e.metric==="Crossing spend"||e.metric==="Spend level"||e.metric==="Excess spend" ? fmt.num(Math.round(e.value))
              : "—";
      const t = e.threshold!=null ? (e.metric.includes("CPL")||e.metric.includes("CAC")||e.metric.includes("Marginal")||e.metric.includes("Top-bucket")||e.metric.includes("spend")||e.metric.includes("Spend") ? fmt.money(e.threshold) : fmt.num(Math.round(e.threshold))) : "";
      return `${e.metric} ${e.comparator||""} ${v}${t?" / "+t+" "+(e.thresholdLabel||""):""}`.trim();
    };
    return c.evidence.map(ev_).join(" · ");
  }

  function insightCard(c) {
    const name = D.campaignNames[c.id] || c.id;
    const clickable = "clickable";
    const tierCls = c.tier.toLowerCase();
    return `<div class="insight ${clickable}" data-campaign="${c.id}">
      <div class="insight-icon insight-${tierCls}">${TIER_ICON[c.tier]||"•"}</div>
      <div class="insight-body">
        <div class="insight-head">${name}</div>
        <div class="insight-evidence">${UI_LABEL[c.diagnostic]}</div>
        <div class="insight-action">${c.recommendation}</div>
      </div>
      <div class="insight-badges">
        <span class="tier-badge tier-${tierCls}">${c.tier}</span>
        <span class="confidence-badge confidence-${c.confidence.toLowerCase()}">${c.confidence}</span>
      </div>
    </div>`;
  }

  function experimentCard(e) {
    const tierCls = e.tier.toLowerCase();
    return `<div class="insight insight-experiment">
      <div class="insight-icon insight-${tierCls}">A/B</div>
      <div class="insight-body">
        <div class="insight-head">Milestone vs generic messaging</div>
        <div class="insight-evidence">Treatment +${e._lift.toFixed(1)}% qual rate · p=${e._p!=null?e._p.toFixed(2):"—"}</div>
        <div class="insight-action">${e.recommendation}</div>
      </div>
      <div class="insight-badges">
        <span class="tier-badge tier-${tierCls}">${e.tier}</span>
        <span class="confidence-badge confidence-low">${e.confidence}</span>
      </div>
    </div>`;
  }

  function renderInsightList() {
    const { decisions, experiment } = buildInsights();
    const wrap = document.getElementById("insight-list");
    let html = `<div class="insight-section-label">Priority decisions</div>`;
    html += decisions.map(insightCard).join("");
    if (experiment) {
      html += `<div class="insight-section-label">Learning</div>`;
      html += experimentCard(experiment);
    }
    wrap.innerHTML = html;
    wrap.querySelectorAll(".insight.clickable").forEach(el=>{
      el.addEventListener("click", ()=> openDrawer(el.getAttribute("data-campaign")));
    });
  }

  /* ============ RENDER: KPIs ============ */
  function renderKPIs() {
    const T = S.totals;
    const spark = D.sparklines;
    const cards = {
      cac: { label:"CAC", value:fmt.money(T.overall_cac), delta:"primary KPI", deltaCls:"up", spark:spark.channels["Google"].policies, hint:"customer acquisition cost" },
      policies: { label:"Policies bound", value:fmt.num(T.policies_bound), delta:"+ bound this period", deltaCls:"up", spark:spark.portfolio.policies, hint:"outcome" },
      qualified: { label:"Qualified leads", value:fmt.num(T.qualified_leads), delta:`${fmt.pct(T.qualified_leads/T.leads,1)} qual rate`, deltaCls:"flat", spark:spark.portfolio.qualified, hint:"pipeline" },
      spend: { label:"Spend", value:fmt.money(T.spend), delta:"input · 90 days", deltaCls:"flat", spark:spark.portfolio.spend, hint:"acquisition investment" }
    };
    document.querySelectorAll("[data-kpi]").forEach(el=>{
      const k = el.getAttribute("data-kpi"); const c = cards[k];
      el.innerHTML = `
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-value">${c.value}</div>
        <div class="kpi-delta ${c.deltaCls}">${c.delta}</div>
        <svg class="kpi-spark" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true">${sparkPath(c.spark)}</svg>`;
    });
    document.getElementById("econ-premium").textContent = fmt.money(T.premium);
    document.getElementById("econ-roas").textContent = T.overall_roas.toFixed(2)+"x";
    document.getElementById("econ-cpql").textContent = fmt.money(T.overall_cpql);
    document.getElementById("econ-cpl").textContent = fmt.money(T.overall_cpl);
    document.getElementById("econ-target").textContent = fmt.money(D.target_cac);
  }
  function sparkPath(arr){
    if(!arr||!arr.length)return "";
    const max=Math.max(...arr),min=Math.min(...arr),range=(max-min)||1;
    return `<polyline fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" points="${
      arr.map((v,i)=>`${(i/(arr.length-1))*120},${28-((v-min)/range)*24-2}`).join(" ")
    }"/>`;
  }

  /* ============ RENDER: ACQUISITION TABLE ============ */
  let sortKey = "cac";
  function renderChannels() {
    const list = document.getElementById("channel-list");
    const rows = CHANNELS.map(chName=>{
      const ch = CH[chName];
      const camps = (S.by_campaign||[]).filter(c=> (D.campaignChannel[c.campaign]||"") === CHAN_SORT[chName]);
      return { chName, ch, camps };
    });
    list.innerHTML = rows.map(r=>{
      const ch=r.ch;
      const cacCls = ch.cac!=null && ch.cac>TARGET ? "bad" : (ch.cac!=null && ch.cac<TARGET*0.6 ? "good":"");
      const campRows = r.camps.map(c=>{
        const cc = c.cac!=null && c.cac>TARGET ? "bad" : (c.cac!=null && c.cac<TARGET*0.5 ? "good":"");
        return `<div class="camp-row" data-campaign="${c.campaign}">
          <span class="camp-name">${D.campaignNames[c.campaign]||c.campaign}</span>
          <span class="camp-stats ${c.cpql>TARGET?'bad':''}">${fmt.money(c.cpql)}</span>
          <span class="camp-stats ${cc}">${fmt.money(c.cac)}</span>
          <span class="camp-stats ${cc}">${fmt.num(c.policies_bound)}</span>
        </div>`;
      }).join("");
      return `<div class="channel-row" data-channel="${r.chName}">
        <div class="channel-row-head">
          <span class="channel-name">${r.chName}</span>
          <span class="channel-col">${fmt.money(ch.cpql)}</span>
          <span class="channel-col ${cacCls}">${fmt.money(ch.cac)}</span>
          <span class="channel-col">${fmt.num(ch.policies_bound)}</span>
        </div>
        <div class="channel-expand">${campRows}</div>
      </div>`;
    }).join("");
    list.querySelectorAll(".channel-row").forEach(el=>{
      el.addEventListener("click", e=>{
        if (e.target.closest(".camp-row")) return;
        el.classList.toggle("expanded");
      });
    });
    list.querySelectorAll(".camp-row").forEach(el=>{
      el.addEventListener("click", e=>{ e.stopPropagation(); openDrawer(el.getAttribute("data-campaign")); });
    });
  }
  function sortChannels(key){ sortKey=key; /* table re-renders order by channel, sorting is cosmetic; keep simple */ renderChannels(); }

  /* ============ RENDER: FUNNEL ============ */
  function renderFunnel() {
    const T=S.totals;
    const stages=[["Impressions",T.impressions],["Clicks",T.clicks],["Landing visits",T.landing_page_visits],["Leads",T.leads],["Qualified leads",T.qualified_leads],["Quotes completed",T.quotes_completed],["Policies bound",T.policies_bound]];
    const max=stages[0][1];
    const f=document.getElementById("funnel");
    f.innerHTML = stages.map((s,i)=>{
      const w=Math.max(2,(s[1]/max)*100);
      const conv = i>0 ? `↓ ${(s[1]/stages[i-1][1]*100).toFixed(0)}% from previous` : "";
      return `<div class="funnel-stage"><div class="funnel-head"><span class="funnel-label">${s[0]}</span><span class="funnel-val">${fmt.num(s[1])}</span></div><div class="funnel-bar" style="width:${w}%"></div>${conv?`<div class="funnel-conv">${conv}</div>`:""}</div>`;
    }).join("");
    // drop-off flag: lead→qualified
    const leadToQual = T.qualified_leads/T.leads;
    const qualToQuote = T.quotes_completed/T.qualified_leads;
    const flag=document.getElementById("funnel-flag");
    if (qualToQuote < 0.3) {
      flag.innerHTML = `<div class="funnel-flag-head">⚠ Drop-off: Qualified → Quote</div><div class="funnel-flag-body">Only ${(qualToQuote*100).toFixed(0)}% of qualified leads start a quote. The bottleneck is quote-flow friction, not lead volume.</div>`;
    } else {
      flag.innerHTML = `<div class="funnel-flag-head">Insight</div><div class="funnel-flag-body">${(leadToQual*100).toFixed(0)}% of leads qualify. Largest absolute drop is impressions→clicks (CTR).</div>`;
    }
  }

  /* ============ RENDER: MARGINAL CAC CHART ============ */
  function renderTrend() {
    const cid = "C-GGL-ENT";
    const mc = D.marginal && D.marginal[cid];
    const wrap = document.getElementById("trend-chart");
    if (!mc) { wrap.innerHTML = "<p class='panel-note'>No marginal data.</p>"; return; }
    const W=640, H=300, padL=56, padR=24, padT=20, padB=44;
    const buckets = mc.buckets.filter(b=>b.cac!=null);
    const spendLevels = mc.buckets.map(b=>b.spend_level);
    const cacs = buckets.map(b=>b.cac);
    const xMin=Math.min(...spendLevels), xMax=Math.max(...spendLevels);
    const yMax=Math.max(TARGET*1.4, ...cacs);
    const x = v=> padL + ((v-xMin)/(xMax-xMin||1))*(W-padL-padR);
    const y = v=> H-padB - (v/yMax)*(H-padT-padB);
    const pts = buckets.map(b=>({x:x(b.spend_level), y:y(b.cac), b}));
    const linePath = pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L ${pts[pts.length-1].x.toFixed(1)} ${H-padB} L ${pts[0].x.toFixed(1)} ${H-padB} Z`;
    const targetY = y(TARGET);
    // gridlines
    const yTicks=[yMax*0.5, yMax].filter(v=>v>0);
    const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Marginal CAC vs spend level">
      ${yTicks.map(t=>`<line x1="${padL}" y1="${y(t)}" x2="${W-padR}" y2="${y(t)}" stroke="var(--color-divider)" stroke-width="1"/><text x="${padL-8}" y="${y(t)+4}" text-anchor="end" font-size="11" fill="var(--color-text-faint)" font-family="var(--font-body)">$${Math.round(t/100)*100}</text>`).join("")}
      <line x1="${padL}" y1="${targetY}" x2="${W-padR}" y2="${targetY}" stroke="var(--color-warning)" stroke-width="1.5" stroke-dasharray="6 4"/>
      <text x="${W-padR}" y="${targetY-6}" text-anchor="end" font-size="10" font-weight="700" fill="var(--color-warning)" font-family="var(--font-body)">TARGET ${fmt.money(TARGET)}</text>
      <path d="${areaPath}" fill="var(--color-primary)" opacity="0.08"/>
      <path d="${linePath}" fill="none" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--color-surface)" stroke="var(--color-primary)" stroke-width="2.5"/><text x="${p.x}" y="${p.y-14}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--color-text)" font-family="var(--font-body)">${fmt.money(p.b.cac)}</text>`).join("")}
      <text x="${padL}" y="${H-12}" font-size="11" font-weight="600" fill="var(--color-text-muted)" font-family="var(--font-body)">Weekly spend level →</text>
    </svg>`;
    wrap.innerHTML = svg;
    // hand-off recommendation derived from data
    const handoff = document.getElementById("trend-handoff");
    if (mc.ceiling != null) {
      handoff.textContent = `Marginal CAC crosses the ${fmt.money(TARGET)} target near ${fmt.money(mc.ceiling)}/wk. Cap Google Enterprise spend at ${fmt.money(mc.ceiling)}/wk and redirect overflow to LinkedIn Enterprise (CPQL ${fmt.money(CM["C-LNK-ENT"].cpql)}).`;
    } else {
      const topBucket = buckets[buckets.length-1];
      handoff.textContent = `Marginal CAC rises with spend (to ${fmt.money(topBucket.cac)} at ~${fmt.compact(topBucket.spend_level)}/wk spend) but stays below the ${fmt.money(TARGET)} target across all observed levels — no saturation ceiling reached. Budget can expand; monitor marginal CAC as spend enters the untested range above ${fmt.compact(topBucket.spend_level)}/wk.`;
    }
  }

  /* ============ DRAWER ============ */
  function openDrawer(cid) {
    const c = CM[cid]; if(!c) return;
    const meta = campaignMeta[cid]||{};
    const mc = D.marginal && D.marginal[cid] ? D.marginal[cid] : null;
    const cl = classify(c) || { diagnostic:"within_tolerance", tier:"WATCH", confidence:"LOW", evidence:[], recommendation:"No action this cycle.", caveat:"" };
    document.getElementById("drawer-title").textContent = D.campaignNames[cid]||cid;
    document.getElementById("drawer-sub").textContent = `${D.campaignChannel[cid]||""} · ${meta.type||""}`;
    document.getElementById("drawer-grid").innerHTML = `
      <div class="dg-item"><small>SPEND</small><b>${fmt.money(c.spend)}</b></div>
      <div class="dg-item"><small>POLICIES</small><b>${fmt.num(c.policies_bound)}</b></div>
      <div class="dg-item"><small>CAC</small><b>${fmt.money(c.cac)}</b></div>
      <div class="dg-item"><small>CPQL</small><b>${fmt.money(c.cpql)}</b></div>
      <div class="dg-item"><small>CPL</small><b>${fmt.money(c.cpl)}</b></div>
      <div class="dg-item"><small>QUALIFIED</small><b>${fmt.num(c.qualified_leads)}</b></div>`;
    // Structured evidence: "Why did GrowthOS flag this?" — directly from the engine contract.
    const evHtml = cl.evidence.length
      ? cl.evidence.map(e => {
          const isMoney = /CPL|CAC|Marginal|Top-bucket|spend|Spend|Excess/.test(e.metric);
          const v = isMoney ? fmt.money(e.value) : (e.metric==="p-value" ? (e.value!=null?e.value.toFixed(2):"—") : e.metric==="Relative lift" ? fmt.pct(e.value,1) : fmt.num(Math.round(e.value)));
          const t = e.threshold!=null ? (isMoney ? fmt.money(e.threshold) : fmt.num(Math.round(e.threshold))) : null;
          return `<li><span class="ev-metric">${e.metric}</span> <span class="ev-cmp">${e.comparator||""}</span> <span class="ev-val">${v}</span>${t?`<span class="ev-thr"> / ${t} ${e.thresholdLabel||""}</span>`:""}</li>`;
        }).join("")
      : `<li>Within tolerance.</li>`;
    document.getElementById("drawer-why").innerHTML = evHtml;
    document.getElementById("drawer-action").textContent = cl.recommendation;
    const cave = document.getElementById("drawer-caveat");
    if (cave) { cave.textContent = cl.caveat || ""; cave.style.display = cl.caveat ? "" : "none"; }
    const diag = document.getElementById("drawer-diagnostic");
    if (diag) diag.textContent = `${UI_LABEL[cl.diagnostic]||cl.diagnostic} · ${cl.tier} · ${cl.confidence} confidence`;
    const d=document.getElementById("drawer"); d.classList.add("open"); d.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
  }
  function closeDrawer(){ const d=document.getElementById("drawer"); d.classList.remove("open"); d.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }

  /* ============ SCREEN 2: EXPERIMENTS ============ */
  function renderExperiments() {
    const expArr = Array.isArray(D.experiments) ? D.experiments : (D.experiments && D.experiments.experiments || []);
    const exp = expArr[0]; if (!exp) return;
    const st = exp.statistics || {};
    const pw = D.experiment_power || {};
    const gd = pw.guardrails_derived || {};
    const ctrl = exp.control || {}, trt = exp.treatment || {};
    const fmtPct = (v,d=1)=> v==null?"—":(v*100).toFixed(d)+"%";
    const fmtPp = (v,d=1)=> (v>=0?"+":"")+(v*100).toFixed(d)+" pp";

    // Verdict banner
    const lift = (st.relative_lift||0)*100;
    const p = st.p_value;
    document.getElementById("exp-verdict-evidence").textContent =
      `+${lift.toFixed(1)}% qualified-lead lift, but p=${p!=null?p.toFixed(2):"—"} and the 95% confidence interval includes zero. Promising signal, not a result.`;
    document.getElementById("exp-verdict-action").textContent =
      `Keep both variants running. Grow to ~${(pw.sample_needed_per_variant||0).toLocaleString()} visits per variant (~${(pw.sample_needed_total||0).toLocaleString()} total) before reallocating budget.`;

    // Variant cards
    document.getElementById("exp-control-rate").textContent = fmtPct(st.control_rate||ctrl.qualified_lead_rate);
    document.getElementById("exp-treatment-rate").textContent = fmtPct(st.treatment_rate||trt.qualified_lead_rate);
    document.getElementById("exp-control-meta").textContent = `${ctrl.visits||0} visits · ${ctrl.qualified_leads||0} qualified`;
    document.getElementById("exp-treatment-meta").textContent = `${trt.visits||0} visits · ${trt.qualified_leads||0} qualified`;
    document.getElementById("exp-total-visits").textContent = ((ctrl.visits||0)+(trt.visits||0)).toLocaleString();

    // Stats row
    const ci = st.ci_low!=null && st.ci_high!=null ? `[${fmtPp(st.ci_low,1)}, ${fmtPp(st.ci_high,1)}]` : "—";
    document.getElementById("exp-stats-row").innerHTML = [
      stat("Absolute lift", fmtPp(st.absolute_lift,2)),
      stat("Relative lift", "+"+lift.toFixed(1)+"%"),
      stat("95% CI", ci),
      stat("p-value", p!=null?p.toFixed(2):"—"),
      stat("Verdict", "Not significant", "exp-verdict-tag"),
    ].join("");

    // CI chart — the lift with its 95% CI crossing zero
    renderCIChart(st);

    // Power analysis
    const cur = pw.current_sample?.total ?? ((ctrl.visits||0)+(trt.visits||0));
    const need = pw.sample_needed_total ?? 0;
    const pct = Math.min(100, Math.round(cur/need*100));
    document.getElementById("power-current").textContent = cur.toLocaleString();
    document.getElementById("power-needed").textContent = need.toLocaleString();
    document.getElementById("power-bar-fill").style.width = pct+"%";
    document.getElementById("power-bar-label").textContent = `${pct}% of the sample needed to detect this effect`;
    document.getElementById("power-note").textContent =
      `Estimated sample to detect the observed effect size (${fmtPp(st.absolute_lift,2)}) at 80% power, α=0.05, two-sided — per-variant ${(pw.sample_needed_per_variant||0).toLocaleString()}, total ${need.toLocaleString()} (~${(pw.multiple_of_current||0).toFixed(1)}× current). This is a computed target, not a measured result.`;

    // Guardrails (derived from campaign-level data)
    const gc = gd.control||{}, gt = gd.treatment||{};
    document.getElementById("guardrail-grid").innerHTML = [
      gr("Control CPL", "$"+(gc.cpl||0), "campaign C-GGL-GEN"),
      gr("Treatment CPL", "$"+(gt.cpl||0), "campaign C-GGL-ENT"),
      gr("Control CPQL", "$"+(gc.cpql||0), "cost per qualified lead"),
      gr("Treatment CPQL", "$"+(gt.cpql||0), "cost per qualified lead"),
      gr("Control policies", String(gc.policies??0), "90-day bound"),
      gr("Treatment policies", String(gt.policies??0), "90-day bound"),
    ].join("");
  }
  function stat(label,val,cls){ return `<div class="exp-stat"><small>${label.toUpperCase()}</small><b class="${cls||""}">${val}</b></div>`; }
  function gr(label,val,sub){ return `<div class="gr-item"><small>${label.toUpperCase()}</small><b>${val}</b><span class="gr-sub">${sub}</span></div>`; }

  // CI chart: point estimate + 95% interval, zero line, crossing-zero emphasis
  function renderCIChart(st) {
    const el = document.getElementById("ci-chart"); if(!el) return;
    const lo = (st.ci_low!=null?st.ci_low:0)*100;   // -1.69
    const hi = (st.ci_high!=null?st.ci_high:0)*100; // +7.85
    const pt = (st.absolute_lift!=null?st.absolute_lift:0)*100; // +3.08
    const W = 760, H = 150, padL=64, padR=24, padY=44;
    const xMin = Math.min(0, lo) - 1, xMax = Math.max(0, hi) + 1;
    const scale = (v)=> padL + ((v - xMin)/(xMax - xMin))*(W - padL - padR);
    const zeroX = scale(0);
    const loX = scale(lo), hiX = scale(hi), ptX = scale(pt);
    // gridlines
    const ticks = [-1,0,1,2,3,4,5,6,7,8].filter(t=>t>=xMin-0.1 && t<=xMax+0.1);
    const grid = ticks.map(t=>{ const x=scale(t); return `<line x1="${x}" y1="${padY}" x2="${x}" y2="${H-padY}" stroke="var(--color-border)" stroke-width="1" stroke-dasharray="${t===0?"0":"2 3"}"/>`+ (t===0?`<text x="${x}" y="${H-padY+18}" text-anchor="middle" font-size="11" fill="var(--color-text-muted)" font-weight="600">no effect</text>`:`<text x="${x}" y="${H-padY+18}" text-anchor="middle" font-size="10" fill="var(--color-text-faint)">${t>0?"+":""}${t}pp</text>`); }).join("");
    // CI bar (crosses zero → warning color)
    const crossesZero = lo < 0 && hi > 0;
    const barColor = crossesZero ? "var(--color-warning)" : "var(--color-primary)";
    const svg = `<svg viewBox="0 0 ${W} ${H+24}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Confidence interval chart">
      ${grid}
      <line x1="${zeroX}" y1="${padY-8}" x2="${zeroX}" y2="${H-padY}" stroke="var(--color-text-muted)" stroke-width="1.5"/>
      <rect x="${loX}" y="${padY+26}" width="${hiX-loX}" height="30" rx="6" fill="${barColor}" opacity="0.18"/>
      <line x1="${loX}" y1="${padY+26}" x2="${loX}" y2="${padY+56}" stroke="${barColor}" stroke-width="2.5"/>
      <line x1="${hiX}" y1="${padY+26}" x2="${hiX}" y2="${padY+56}" stroke="${barColor}" stroke-width="2.5"/>
      <circle cx="${ptX}" cy="${padY+41}" r="6" fill="${barColor}"/>
      <text x="${ptX}" y="${padY+14}" text-anchor="middle" font-size="12" font-weight="700" fill="${barColor}">+${pt.toFixed(2)}pp observed</text>
      <text x="${loX}" y="${padY+72}" text-anchor="middle" font-size="10" fill="var(--color-text-muted)">${lo.toFixed(2)}pp</text>
      <text x="${hiX}" y="${padY+72}" text-anchor="middle" font-size="10" fill="var(--color-text-muted)">+${hi.toFixed(2)}pp</text>
    </svg>`;
    el.innerHTML = svg;
  }

  /* ============ SCREEN 3: BUDGET ============ */
  const monthlySpend = c => (c.spend || 0) / 3;
  const avgPremiumPerPolicy = (c) => {
    if (!c.policies_bound || c.policies_bound === 0) return 0;
    return (c.premium || 0) / c.policies_bound;
  };

  function projectMarginalCAC(cid, proposedDailySpend) {
    const mc = D.marginal && D.marginal[cid];
    if (!mc || !mc.buckets) return { cac: null, untested: false, noEvidence: true };
    const buckets = mc.buckets.filter(b => b.cac != null);
    if (!buckets.length) return { cac: null, untested: false, noEvidence: true };
    const allBuckets = mc.buckets.filter(b => b.n_days > 0);
    const maxObservedLevel = Math.max(...allBuckets.map(b => b.spend_level));
    if (proposedDailySpend > maxObservedLevel) {
      return { cac: null, untested: false, noEvidence: false, outsideRange: true, maxObserved: maxObservedLevel };
    }
    const sorted = [...buckets].sort((a, b) => a.spend_level - b.spend_level);
    for (let i = 0; i < sorted.length - 1; i++) {
      const lo = sorted[i], hi = sorted[i + 1];
      if (proposedDailySpend >= lo.spend_level && proposedDailySpend <= hi.spend_level) {
        const t = (proposedDailySpend - lo.spend_level) / (hi.spend_level - lo.spend_level || 1);
        return { cac: lo.cac + t * (hi.cac - lo.cac), untested: false, noEvidence: false };
      }
    }
    return { cac: sorted[0].cac, untested: false, noEvidence: false };
  }

  function projectCampaign(cid, proposedMonthly) {
    const c = CM[cid];
    if (!c) return null;
    const proposedDaily = proposedMonthly / 30;
    const hasPolicyEvidence = c.policies_bound > 0;
    const mc = projectMarginalCAC(cid, proposedDaily);
    if (!hasPolicyEvidence || mc.noEvidence) {
      return { cac: null, policies: 0, qualified: proposedMonthly / (c.cpql || Infinity), premium: 0, untested: false, noEvidence: true, outsideRange: false };
    }
    if (mc.outsideRange) {
      return { cac: null, policies: 0, qualified: proposedMonthly / (c.cpql || Infinity), premium: 0, untested: false, noEvidence: false, outsideRange: true, maxObserved: mc.maxObserved };
    }
    const projCac = mc.cac != null ? mc.cac : c.cac;
    const policies = projCac > 0 ? proposedMonthly / projCac : 0;
    const qualified = proposedMonthly / (c.cpql || Infinity);
    const premium = policies * avgPremiumPerPolicy(c);
    return { cac: projCac, policies, qualified, premium, untested: false, noEvidence: false, outsideRange: false };
  }

  function computeRecommendation() {
    const recs = {};
    for (const id of Object.keys(CM)) {
      const c = CM[id];
      const cl = classify(c);
      const current = monthlySpend(c);
      let proposed = current;
      let plan = 'hold';
      // Cap any proposed spend at the max observed marginal level
      const mc = D.marginal && D.marginal[id];
      const maxObservedDaily = mc && mc.buckets ? Math.max(...mc.buckets.filter(b => b.n_days > 0).map(b => b.spend_level)) : null;
      const capMonthly = maxObservedDaily != null ? maxObservedDaily * 30 : null;
      if (cl && cl.tier === 'ACTION') {
        proposed = 0;
        plan = 'cut';
      } else if (cl && cl.diagnostic === 'healthy_scalable') {
        proposed = current * 1.5;
        if (capMonthly != null && proposed > capMonthly) proposed = capMonthly;
        plan = 'scale';
      } else if (cl && cl.diagnostic === 'efficient_constrained') {
        proposed = current * 1.2;
        if (capMonthly != null && proposed > capMonthly) proposed = capMonthly;
        plan = 'scale';
      } else if (cl && cl.diagnostic === 'diminishing_returns') {
        if (mc && mc.ceiling != null) {
          proposed = mc.ceiling * 30;
          plan = 'cut';
        } else {
          proposed = current * 0.8;
          plan = 'hold';
        }
      } else if (cl && cl.diagnostic === 'near_saturation') {
        proposed = current * 0.9;
        plan = 'hold';
      }
      recs[id] = { proposed, plan, diagnostic: cl ? cl.diagnostic : 'within_tolerance', tier: cl ? cl.tier : 'WATCH', confidence: cl ? cl.confidence : 'LOW', recommendation: cl ? cl.recommendation : 'No action this cycle.' };
    }
    return recs;
  }

  let budgetState = { proposed: {}, selectedCampaign: null, scenarioApplied: false };

  function renderBudget() {
    const recs = computeRecommendation();
    if (!Object.keys(budgetState.proposed).length) {
      for (const id of Object.keys(CM)) budgetState.proposed[id] = monthlySpend(CM[id]);
    }
    const cutCount = Object.values(recs).filter(r => r.plan === 'cut').length;
    const scaleCount = Object.values(recs).filter(r => r.plan === 'scale').length;
    const holdCount = Object.values(recs).filter(r => r.plan === 'hold').length;
    document.getElementById('budget-verdict-head').textContent =
      `${cutCount} reduce/cap \u00b7 ${scaleCount} increase \u00b7 ${holdCount} hold`;
    const scaleNames = Object.entries(recs).filter(([,r])=>r.plan==='scale').map(([id])=>D.campaignNames[id]||id).join(', ');
    const cutNames = Object.entries(recs).filter(([,r])=>r.plan==='cut').map(([id])=>D.campaignNames[id]||id).join(', ');
    const T = S.totals;
    const currentMonthly = T.spend / 3;
    let recMonthly = 0;
    for (const id of Object.keys(recs)) recMonthly += recs[id].proposed;
    document.getElementById('budget-verdict-evidence').innerHTML =
      `Current monthly run-rate: <b>${fmt.money(currentMonthly)}</b> \u2192 Modeled recommendation: <b>${fmt.money(recMonthly)}</b><br>` +
      `Increase: ${scaleNames || 'none'}. Reduce/cap: ${cutNames || 'none'}.<br>` +
      `<span class="verdict-microcopy">This is a modeled scenario from observed marginal-CAC data, not an actual budget change.</span>`;
    renderBudgetProjection();
    renderBudgetAllocList(recs);
    renderBudgetPlan(recs);
    document.getElementById('budget-reset').onclick = () => {
      for (const id of Object.keys(CM)) budgetState.proposed[id] = monthlySpend(CM[id]);
      budgetState.scenarioApplied = false;
      budgetState.selectedCampaign = null;
      renderBudget();
    };
    document.getElementById('budget-apply-rec').onclick = () => {
      for (const id of Object.keys(recs)) budgetState.proposed[id] = recs[id].proposed;
      budgetState.scenarioApplied = true;
      renderBudget();
    };
    // Update button labels based on state
    const applyBtn = document.getElementById('budget-apply-rec');
    const resetBtn = document.getElementById('budget-reset');
    if (budgetState.scenarioApplied) {
      applyBtn.textContent = `GrowthOS scenario applied \u00b7 ${fmt.money(currentMonthly)} \u2192 ${fmt.money(recMonthly)}`;
      applyBtn.classList.add('applied');
      resetBtn.textContent = 'Reset to current monthly run-rate';
    } else {
      applyBtn.textContent = 'Apply GrowthOS scenario';
      applyBtn.classList.remove('applied');
      resetBtn.textContent = 'Reset to current';
    }
  }

  function renderBudgetProjection() {
    const T = S.totals;
    const currentMonthly = T.spend / 3;
    let simSpend = 0, simPolicies = 0, simQualified = 0, simPremium = 0;
    let hasOutsideRange = false;
    for (const id of Object.keys(CM)) {
      const proposed = budgetState.proposed[id] || 0;
      const proj = projectCampaign(id, proposed);
      simSpend += proposed;
      simPolicies += proj.policies;
      simQualified += proj.qualified;
      simPremium += proj.premium;
      if (proj.outsideRange) hasOutsideRange = true;
    }
    const simCac = simPolicies > 0 ? simSpend / simPolicies : null;
    const currentPolicies = T.policies_bound / 3;
    const currentQualified = T.qualified_leads / 3;
    const currentPremium = T.premium / 3;
    const currentCac = T.overall_cac;
    const delta = (cur, sim) => {
      if (cur === 0) return sim > 0 ? '+\u221e' : '\u2014';
      const d = ((sim - cur) / cur * 100);
      const sign = d >= 0 ? '+' : '';
      return `${sign}${d.toFixed(0)}%`;
    };
    const deltaCls = (cur, sim, lowerIsBetter) => {
      if (sim > cur) return lowerIsBetter ? 'neg' : 'pos';
      if (sim < cur) return lowerIsBetter ? 'pos' : 'neg';
      return 'neutral';
    };
    const cards = [
      { label: 'Spend /mo', curVal: fmt.money(currentMonthly), simVal: fmt.money(simSpend), delta: delta(currentMonthly, simSpend), deltaCls: deltaCls(currentMonthly, simSpend, true) },
      { label: 'Policies /mo', curVal: fmt.num(Math.round(currentPolicies)), simVal: fmt.num(Math.round(simPolicies)), delta: delta(currentPolicies, simPolicies), deltaCls: deltaCls(currentPolicies, simPolicies, false) },
      { label: 'CAC', curVal: fmt.money(currentCac), simVal: simCac != null ? fmt.money(simCac) : '\u2014', delta: simCac != null ? delta(currentCac, simCac) : '\u2014', deltaCls: simCac != null ? deltaCls(currentCac, simCac, true) : 'neutral' },
      { label: 'Qualified /mo', curVal: fmt.num(Math.round(currentQualified)), simVal: fmt.num(Math.round(simQualified)), delta: delta(currentQualified, simQualified), deltaCls: deltaCls(currentQualified, simQualified, false) },
      { label: 'Premium /mo', curVal: fmt.money(currentPremium), simVal: fmt.money(simPremium), delta: delta(currentPremium, simPremium), deltaCls: deltaCls(currentPremium, simPremium, false) },
      { label: 'ROAS', curVal: (currentPremium/currentMonthly).toFixed(2)+'x', simVal: simSpend>0 ? (simPremium/simSpend).toFixed(2)+'x' : '\u2014', delta: simSpend>0 ? delta(currentPremium/currentMonthly, simPremium/simSpend) : '\u2014', deltaCls: simSpend>0 ? deltaCls(currentPremium/currentMonthly, simPremium/simSpend, false) : 'neutral' },
    ];
    document.getElementById('budget-projection-grid').innerHTML = cards.map(c =>
      `<div class="budget-proj-card current"><div class="budget-proj-label">${c.label} \u00b7 current observed</div><div class="budget-proj-value">${c.curVal}</div></div>` +
      `<div class="budget-proj-card simulated"><div class="budget-proj-label">${c.label} \u00b7 modeled</div><div class="budget-proj-value">${c.simVal}</div><div class="budget-proj-delta ${c.deltaCls}">${c.delta}</div></div>`
    ).join('');
    document.getElementById('budget-projection-note').textContent =
      hasOutsideRange ? 'One or more campaigns are outside the modeled spend range \u2014 their projected policies are excluded from totals. Reduce spend to within observed levels for a complete scenario. Modeled from synthetic marginal-CAC data, not forecasts.'
      : 'Modeled scenario from observed synthetic marginal-CAC data. Not a forecast. Campaigns with zero policy evidence are projected at zero policies. Current observed reflects the 90-day historical run-rate converted to monthly.';
  }

  function renderBudgetAllocList(recs) {
    const list = document.getElementById('budget-alloc-list');
    const ids = Object.keys(CM);
    list.innerHTML = ids.map(id => {
      const c = CM[id];
      const rec = recs[id];
      const current = monthlySpend(c);
      const proposed = budgetState.proposed[id] || 0;
      const proj = projectCampaign(id, proposed);
      const deltaPct = current > 0 ? ((proposed - current) / current * 100) : 0;
      const deltaCls = deltaPct > 1 ? 'up' : deltaPct < -1 ? 'down' : 'flat';
      const deltaSign = deltaPct > 0 ? '+' : '';
      const cacStr = proj.outsideRange ? '<span class="ba-outside-range">outside modeled range</span>' : (proj.cac != null ? fmt.money(proj.cac) : '\u2014');
      const polStr = proj.outsideRange ? '<span class="ba-outside-range">\u2014</span>' : (proj.noEvidence ? '<span class="ba-no-evidence">no policy evidence</span>' : fmt.num(Math.round(proj.policies)));
      const tierDot = rec.tier === 'ACTION' ? 'action' : rec.tier === 'OPPORTUNITY' ? 'opportunity' : 'watch';
      const selected = budgetState.selectedCampaign === id ? 'selected' : '';
      return `<div class="budget-alloc-row ${selected}" data-campaign="${id}">
        <div class="ba-camp-name">
          <span class="ba-camp-tier ${tierDot}"></span>
          <span>${D.campaignNames[id]||id}</span>
        </div>
        <span class="ba-current-val">${fmt.money(current)}</span>
        <div class="ba-proposed-input">
          <input type="number" min="0" step="100" value="${Math.round(proposed)}" data-campaign="${id}" aria-label="Proposed monthly spend for ${D.campaignNames[id]||id}"/>
          <span class="ba-delta-pct ${deltaCls}">${deltaSign}${deltaPct.toFixed(0)}%</span>
        </div>
        <span class="ba-proj-cac">${cacStr}</span>
        <span class="ba-proj-pol">${polStr}</span>
      </div>`;
    }).join('');
    list.querySelectorAll('input[type=number]').forEach(input => {
      input.addEventListener('input', e => {
        const cid = e.target.getAttribute('data-campaign');
        const val = Math.max(0, parseFloat(e.target.value) || 0);
        budgetState.proposed[cid] = val;
        renderBudgetProjection();
        updateBudgetRow(cid);
      });
      input.addEventListener('click', e => e.stopPropagation());
    });
    list.querySelectorAll('.budget-alloc-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.tagName === 'INPUT') return;
        const cid = row.getAttribute('data-campaign');
        budgetState.selectedCampaign = cid;
        list.querySelectorAll('.budget-alloc-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        renderBudgetMarginalChart(cid);
      });
    });
    if (!budgetState.selectedCampaign) {
      const firstWithMC = ids.find(id => D.marginal && D.marginal[id] && D.marginal[id].buckets.some(b => b.cac != null));
      if (firstWithMC) {
        budgetState.selectedCampaign = firstWithMC;
        const row = list.querySelector(`[data-campaign="${firstWithMC}"]`);
        if (row) row.classList.add('selected');
        renderBudgetMarginalChart(firstWithMC);
      }
    } else {
      renderBudgetMarginalChart(budgetState.selectedCampaign);
    }
  }

  function updateBudgetRow(cid) {
    const c = CM[cid];
    const current = monthlySpend(c);
    const proposed = budgetState.proposed[cid] || 0;
    const proj = projectCampaign(cid, proposed);
    const deltaPct = current > 0 ? ((proposed - current) / current * 100) : 0;
    const deltaCls = deltaPct > 1 ? 'up' : deltaPct < -1 ? 'down' : 'flat';
    const deltaSign = deltaPct > 0 ? '+' : '';
    const row = document.querySelector(`.budget-alloc-row[data-campaign="${cid}"]`);
    if (!row) return;
    const deltaEl = row.querySelector('.ba-delta-pct');
    if (deltaEl) { deltaEl.className = `ba-delta-pct ${deltaCls}`; deltaEl.textContent = `${deltaSign}${deltaPct.toFixed(0)}%`; }
    const cacEl = row.querySelector('.ba-proj-cac');
    if (cacEl) {
      if (proj.outsideRange) {
        cacEl.innerHTML = '<span class="ba-outside-range">outside modeled range</span>';
      } else {
        cacEl.textContent = proj.cac != null ? fmt.money(proj.cac) : '\u2014';
      }
    }
    const polEl = row.querySelector('.ba-proj-pol');
    if (polEl) {
      if (proj.outsideRange) {
        polEl.innerHTML = '<span class="ba-outside-range">\u2014</span>';
      } else {
        polEl.innerHTML = proj.noEvidence ? '<span class="ba-no-evidence">no policy evidence</span>' : fmt.num(Math.round(proj.policies));
      }
    }
    if (budgetState.selectedCampaign === cid) renderBudgetMarginalChart(cid);
  }

  function renderBudgetMarginalChart(cid) {
    const mc = D.marginal && D.marginal[cid];
    const wrap = document.getElementById('budget-mc-chart');
    const noteEl = document.getElementById('budget-capacity-note');
    if (!mc) {
      wrap.innerHTML = '<p class="panel-note">No marginal-CAC data for this campaign.</p>';
      noteEl.textContent = '';
      return;
    }
    const buckets = mc.buckets.filter(b => b.cac != null);
    const allBuckets = mc.buckets.filter(b => b.n_days > 0);
    if (!buckets.length) {
      wrap.innerHTML = '<p class="panel-note">No finite-CAC buckets \u2014 this campaign has zero policy evidence. Spend projections return zero policies.</p>';
      noteEl.textContent = 'No policy evidence: this campaign produced zero policies across all observed spend levels. Any spend allocated here should be treated as experimental.';
      noteEl.classList.add('untested');
      return;
    }
    const W = 640, H = 300, padL = 56, padR = 24, padT = 20, padB = 44;
    const spendLevels = allBuckets.map(b => b.spend_level);
    const cacs = buckets.map(b => b.cac);
    const xMin = 0;
    const xMax = Math.max(...spendLevels) * 1.4;
    const yMax = Math.max(TARGET * 1.4, ...cacs);
    const x = v => padL + ((v - xMin) / (xMax - xMin || 1)) * (W - padL - padR);
    const y = v => H - padB - (v / yMax) * (H - padT - padB);
    const sorted = [...buckets].sort((a, b) => a.spend_level - b.spend_level);
    const pts = sorted.map(b => ({ x: x(b.spend_level), y: y(b.cac), b }));
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const targetY = y(TARGET);
    const yTicks = [0, yMax * 0.5, yMax].filter(v => v > 0);
    const proposedMonthly = budgetState.proposed[cid] || 0;
    const proposedDaily = proposedMonthly / 30;
    const proposedProj = projectMarginalCAC(cid, proposedDaily);
    const proposedY = (proposedProj.cac != null && !proposedProj.outsideRange) ? y(proposedProj.cac) : null;
    const proposedX = x(Math.min(proposedDaily, xMax));
    const isRetargeting = (campaignMeta[cid] || {}).type === 'Retargeting';
    const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Marginal CAC curve for ${D.campaignNames[cid]||cid}">
      ${yTicks.map(t => `<line x1="${padL}" y1="${y(t)}" x2="${W - padR}" y2="${y(t)}" stroke="var(--color-divider)" stroke-width="1"/><text x="${padL - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="var(--color-text-faint)" font-family="var(--font-body)">${fmt.money(t)}</text>`).join('')}
      <line x1="${padL}" y1="${targetY}" x2="${W - padR}" y2="${targetY}" stroke="var(--color-warning)" stroke-width="1.5" stroke-dasharray="6 4"/>
      <text x="${W - padR}" y="${targetY - 6}" text-anchor="end" font-size="10" font-weight="700" fill="var(--color-warning)" font-family="var(--font-body)">TARGET ${fmt.money(TARGET)}</text>
      ${mc.ceiling != null ? `<line x1="${x(mc.ceiling)}" y1="${padT}" x2="${x(mc.ceiling)}" y2="${H - padB}" stroke="var(--color-warning)" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/><text x="${x(mc.ceiling)}" y="${padT + 12}" text-anchor="middle" font-size="9" fill="var(--color-warning)" font-weight="600">ceiling</text>` : ''}
      <path d="${linePath}" fill="none" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--color-surface)" stroke="var(--color-primary)" stroke-width="2.5"/><text x="${p.x}" y="${p.y - 14}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--color-text)" font-family="var(--font-body)">${fmt.money(p.b.cac)}</text>`).join('')}
      ${proposedY != null ? `<line x1="${proposedX}" y1="${padT}" x2="${proposedX}" y2="${H - padB}" stroke="var(--color-primary)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.6"/><circle cx="${proposedX}" cy="${proposedY}" r="6" fill="var(--color-primary)" stroke="var(--color-surface)" stroke-width="2.5"/><text x="${proposedX}" y="${proposedY - 16}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--color-primary)" font-family="var(--font-body)">proj ${fmt.money(proposedProj.cac)}</text>` : ''}
      <text x="${padL}" y="${H - 12}" font-size="11" font-weight="600" fill="var(--color-text-muted)" font-family="var(--font-body)">Daily spend level \u2192</text>
    </svg>`;
    wrap.innerHTML = svg;
    const topBucket = sorted[sorted.length - 1];
    const maxObserved = topBucket.spend_level;
    let noteText = '';
    if (isRetargeting) {
      noteText = `Efficiency: very high (CAC ${fmt.money(topBucket.cac)} at top observed level). Scale capacity: LOW. Reason: retargetable audience is limited \u2014 this campaign cannot absorb arbitrary budget increases without exhausting the addressable retargeting pool.`;
      noteEl.classList.add('untested');
    } else if (proposedProj.outsideRange) {
      noteText = `Proposed spend (${fmt.money(proposedDaily)}/day) exceeds the max observed level (${fmt.money(maxObserved)}/day). The marginal-CAC model does not support this range \u2014 reduce spend to within observed levels for a modeled estimate.`;
      noteEl.classList.add('untested');
    } else if (mc.ceiling != null) {
      noteText = `Marginal CAC crosses the ${fmt.money(TARGET)} target near ${fmt.money(mc.ceiling)}/day. Cap spend at this level and redirect overflow to a cheaper-scaling channel.`;
      noteEl.classList.remove('untested');
    } else {
      noteText = `Marginal CAC rises with spend (to ${fmt.money(topBucket.cac)} at ${fmt.money(maxObserved)}/day) but stays below the ${fmt.money(TARGET)} target across all observed levels. Budget can expand up to ${fmt.money(maxObserved)}/day; spend beyond that is outside the modeled range.`;
      noteEl.classList.remove('untested');
    }
    noteEl.textContent = noteText;
  }

  function renderBudgetPlan(recs) {
    const grid = document.getElementById('budget-plan-grid');
    const cols = { cut: [], scale: [], hold: [] };
    for (const id of Object.keys(recs)) {
      const r = recs[id];
      const c = CM[id];
      const proj = projectCampaign(id, r.proposed);
      cols[r.plan].push({ id, name: D.campaignNames[id] || id, plan: r.plan, current: monthlySpend(c), proposed: r.proposed, projCac: proj.cac, projPolicies: proj.policies, diagnostic: r.diagnostic, tier: r.tier, confidence: r.confidence, recommendation: r.recommendation });
    }
    const renderCol = (key, label) => {
      const cards = cols[key];
      if (!cards.length) return `<div class="budget-plan-col"><div class="budget-plan-header ${key}">${label}</div><p class="panel-note">None.</p></div>`;
      return `<div class="budget-plan-col">
        <div class="budget-plan-header ${key}">${label} \u00b7 ${cards.length}</div>
        ${cards.map(c => `<div class="budget-plan-card ${key}">
          <div class="budget-plan-name">${c.name}</div>
          <div class="budget-plan-detail">
            ${fmt.money(c.current)}/mo \u2192 <b>${fmt.money(c.proposed)}/mo</b><br>
            Proj. CAC: ${c.projCac != null ? fmt.money(c.projCac) : '\u2014'} \u00b7 Proj. policies: ${c.projPolicies > 0 ? fmt.num(Math.round(c.projPolicies)) : '0'}<br>
            <span style="color:var(--color-text-faint)">${UI_LABEL[c.diagnostic] || c.diagnostic} \u00b7 ${c.tier} \u00b7 ${c.confidence}</span>
          </div>
        </div>`).join('')}
      </div>`;
    };
    grid.innerHTML = renderCol('cut', 'Reduce / Cap') + renderCol('scale', 'Increase') + renderCol('hold', 'Hold / Monitor');
  }

  /* ============ SCREEN 4: LEADS ============ */
  function renderLeads() {
    const T = S.totals;
    const worstQuality = Object.values(CM).filter(c => c.leads > 20).sort((a, b) => (a.qualified_leads / a.leads) - (b.qualified_leads / b.leads))[0];
    const bestQuality = Object.values(CM).filter(c => c.leads > 20).sort((a, b) => (b.qualified_leads / b.leads) - (a.qualified_leads / a.leads))[0];
    document.getElementById('leads-verdict-head').textContent =
      `${D.campaignNames[worstQuality.campaign]||worstQuality.campaign} produces high lead volume but low qualification (${fmt.pct(worstQuality.qualified_leads/worstQuality.leads,0)} qual rate). ${D.campaignNames[bestQuality.campaign]||bestQuality.campaign} has the strongest lead quality (${fmt.pct(bestQuality.qualified_leads/bestQuality.leads,0)}).`;
    document.getElementById('leads-verdict-evidence').textContent =
      `Portfolio qualification rate: ${fmt.pct(T.qualified_leads/T.leads,1)}. Lead quality \u2014 not lead volume \u2014 is the primary lever for improving CAC.`;
    renderLeadsKPIs();
    renderLeadsMatrix();
    renderLeadsScatter();
    renderLeadsHeatmap();
    renderLeadsRecs();
  }

  function renderLeadsKPIs() {
    const T = S.totals;
    const cards = [
      { label: 'Leads', value: fmt.num(T.leads), sub: `${fmt.num(T.landing_page_visits)} visits` },
      { label: 'Qualified', value: fmt.num(T.qualified_leads), sub: `${fmt.pct(T.qualified_leads/T.leads,1)} qual rate` },
      { label: 'Quote starts', value: fmt.num(T.quote_starts), sub: `${fmt.pct(T.quote_starts/T.qualified_leads,0)} of qualified` },
      { label: 'Quotes completed', value: fmt.num(T.quotes_completed), sub: `${fmt.pct(T.quotes_completed/T.quote_starts,0)} of started` },
      { label: 'Policies bound', value: fmt.num(T.policies_bound), sub: `${fmt.pct(T.policies_bound/T.quotes_completed,0)} of completed` },
      { label: 'CPQL', value: fmt.money(T.overall_cpql), sub: `${fmt.money(T.overall_cpl)} CPL` },
    ];
    document.getElementById('leads-kpi-grid').innerHTML = cards.map(c =>
      `<div class="leads-kpi-card"><div class="leads-kpi-label">${c.label}</div><div class="leads-kpi-value">${c.value}</div><div class="leads-kpi-sub">${c.sub}</div></div>`
    ).join('');
  }

  function renderLeadsMatrix() {
    const T = S.totals;
    const portfolioQualRate = T.qualified_leads / T.leads;
    const portfolioQuoteRate = T.quote_starts / T.qualified_leads;
    const portfolioCompleteRate = T.quotes_completed / T.quote_starts;
    const portfolioBindRate = T.policies_bound / T.quotes_completed;
    const rows = Object.values(CM).map(c => {
      const qualRate = c.leads > 0 ? c.qualified_leads / c.leads : null;
      const quoteRate = c.qualified_leads > 0 ? c.quote_starts / c.qualified_leads : null;
      const completeRate = c.quote_starts > 0 ? c.quotes_completed / c.quote_starts : null;
      const bindRate = c.quotes_completed > 0 ? c.policies_bound / c.quotes_completed : null;
      return { c, qualRate, quoteRate, completeRate, bindRate };
    }).sort((a, b) => b.c.leads - a.c.leads);
    const cell = (rate, portfolioRate) => {
      if (rate == null || isNaN(rate)) return '<td class="cell-na">\u2014</td>';
      const cls = rate >= portfolioRate * 1.1 ? 'cell-good' : rate <= portfolioRate * 0.7 ? 'cell-bad' : '';
      return `<td class="${cls}">${fmt.pct(rate, 0)}</td>`;
    };
    const header = `<thead><tr>
      <th>Campaign</th><th>Leads</th><th>Qual</th><th>L\u2192Q</th><th>Q\u2192QS</th><th>QS\u2192QC</th><th>QC\u2192P</th><th>CPL</th><th>CPQL</th><th>CAC</th>
    </tr></thead>`;
    const body = `<tbody>${rows.map(r => `<tr>
      <td>${D.campaignNames[r.c.campaign]||r.c.campaign}</td>
      <td>${fmt.num(r.c.leads)}</td>
      <td>${fmt.num(r.c.qualified_leads)}</td>
      ${cell(r.qualRate, portfolioQualRate)}
      ${cell(r.quoteRate, portfolioQuoteRate)}
      ${cell(r.completeRate, portfolioCompleteRate)}
      ${cell(r.bindRate, portfolioBindRate)}
      <td>${fmt.money(r.c.cpl)}</td>
      <td>${fmt.money(r.c.cpql)}</td>
      <td>${r.c.cac != null && !isNaN(r.c.cac) ? fmt.money(r.c.cac) : '<span class="cell-na">\u2014</span>'}</td>
    </tr>`).join('')}</tbody>`;
    document.getElementById('leads-matrix').innerHTML = header + body;
  }

  function renderLeadsScatter() {
    const el = document.getElementById('leads-scatter');
    const W = 640, H = 360, padL = 56, padR = 24, padT = 20, padB = 48;
    const data = Object.values(CM).map(c => {
      const cl = classify(c);
      return { id: c.campaign, name: D.campaignNames[c.campaign]||c.campaign, leads: c.leads, qualRate: c.leads > 0 ? c.qualified_leads / c.leads : 0, policies: c.policies_bound, tier: cl ? cl.tier : 'WATCH' };
    }).filter(d => d.leads > 0);
    const maxLeads = Math.max(...data.map(d => d.leads));
    const x = v => padL + (v / maxLeads) * (W - padL - padR);
    const y = v => H - padB - v * (H - padT - padB);
    const maxR = 28, minR = 6;
    const maxPol = Math.max(...data.map(d => d.policies), 1);
    const r = v => minR + (v / maxPol) * (maxR - minR);
    const tierColor = { ACTION: 'var(--color-warning)', OPPORTUNITY: 'var(--color-primary)', WATCH: 'var(--chart-3)' };
    const tierFill = { ACTION: 'var(--color-warning-highlight)', OPPORTUNITY: 'var(--color-primary-highlight)', WATCH: 'var(--color-surface-offset)' };
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map(t => maxLeads * t);
    const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const grid = xTicks.map((t) => `<line x1="${x(t)}" y1="${padT}" x2="${x(t)}" y2="${H - padB}" stroke="var(--color-divider)" stroke-width="1"/><text x="${x(t)}" y="${H - padB + 18}" text-anchor="middle" font-size="10" fill="var(--color-text-faint)" font-family="var(--font-body)">${fmt.num(Math.round(t))}</text>`).join('')
      + yTicks.map(t => `<line x1="${padL}" y1="${y(t)}" x2="${W - padR}" y2="${y(t)}" stroke="var(--color-divider)" stroke-width="1"/><text x="${padL - 8}" y="${y(t) + 4}" text-anchor="end" font-size="10" fill="var(--color-text-faint)" font-family="var(--font-body)">${(t*100).toFixed(0)}%</text>`).join('');
    const portfolioQual = S.totals.qualified_leads / S.totals.leads;
    const midLeads = maxLeads / 2;
    const quadrantLabels = `
      <text x="${x(midLeads) - 8}" y="${y(0.85)}" text-anchor="end" font-size="10" font-weight="700" fill="var(--color-warning)" opacity="0.5" font-family="var(--font-body)">FIX</text>
      <text x="${x(midLeads) + 8}" y="${y(0.85)}" text-anchor="start" font-size="10" font-weight="700" fill="var(--color-primary)" opacity="0.5" font-family="var(--font-body)">CORE</text>
      <text x="${x(midLeads) - 8}" y="${y(0.15)}" text-anchor="end" font-size="10" font-weight="700" fill="var(--color-text-faint)" opacity="0.5" font-family="var(--font-body)">DEPRIORITIZE</text>
      <text x="${x(midLeads) + 8}" y="${y(0.15)}" text-anchor="start" font-size="10" font-weight="700" fill="var(--color-text-muted)" opacity="0.5" font-family="var(--font-body)">SCALE CAREFULLY</text>
    `;
    const avgLine = `<line x1="${padL}" y1="${y(portfolioQual)}" x2="${W - padR}" y2="${y(portfolioQual)}" stroke="var(--color-text-muted)" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/><text x="${W - padR}" y="${y(portfolioQual) - 6}" text-anchor="end" font-size="9" fill="var(--color-text-muted)" font-weight="600">portfolio avg ${(portfolioQual*100).toFixed(0)}%</text>`;
    const midLine = `<line x1="${x(midLeads)}" y1="${padT}" x2="${x(midLeads)}" y2="${H - padB}" stroke="var(--color-text-muted)" stroke-width="1" stroke-dasharray="4 4" opacity="0.3"/>`;
    const bubbles = data.map(d => {
      const cx = x(d.leads), cy = y(d.qualRate), rad = r(d.policies);
      return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${tierFill[d.tier]}" stroke="${tierColor[d.tier]}" stroke-width="2" opacity="0.85"/>
        <text x="${cx}" y="${cy + rad + 14}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--color-text-muted)" font-family="var(--font-body)">${d.name.split(' \u00b7 ')[1] || d.name}</text>`;
    }).join('');
    const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Lead volume vs qualification rate scatter">
      ${grid}
      ${midLine}
      ${avgLine}
      ${quadrantLabels}
      ${bubbles}
      <text x="${(W - padR + padL) / 2}" y="${H - 4}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--color-text-muted)" font-family="var(--font-body)">Lead volume \u2192</text>
      <text x="14" y="${(H - padB + padT) / 2}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--color-text-muted)" font-family="var(--font-body)" transform="rotate(-90 14 ${(H - padB + padT) / 2})">Qualification rate \u2192</text>
    </svg>`;
    el.innerHTML = svg;
  }

  function renderLeadsHeatmap() {
    const T = S.totals;
    const portfolioRates = {
      qual: T.qualified_leads / T.leads,
      quote: T.quote_starts / T.qualified_leads,
      complete: T.quotes_completed / T.quote_starts,
      bind: T.policies_bound / T.quotes_completed
    };
    const stages = [
      { key: 'qual', short: 'L\u2192Q' },
      { key: 'quote', short: 'Q\u2192QS' },
      { key: 'complete', short: 'QS\u2192QC' },
      { key: 'bind', short: 'QC\u2192P' }
    ];
    const rows = Object.values(CM).map(c => {
      const rates = {
        qual: c.leads > 0 ? c.qualified_leads / c.leads : null,
        quote: c.qualified_leads > 0 ? c.quote_starts / c.qualified_leads : null,
        complete: c.quote_starts > 0 ? c.quotes_completed / c.quote_starts : null,
        bind: c.quotes_completed > 0 ? c.policies_bound / c.quotes_completed : null
      };
      return { c, rates };
    }).sort((a, b) => b.c.leads - a.c.leads);
    const heatColor = (rate, portfolio) => {
      if (rate == null || isNaN(rate)) return { bg: 'transparent', color: 'var(--color-text-faint)' };
      const ratio = rate / portfolio;
      if (ratio >= 1.15) return { bg: 'color-mix(in oklab, var(--color-primary) 22%, transparent)', color: 'var(--color-primary)' };
      if (ratio >= 0.85) return { bg: 'color-mix(in oklab, var(--color-primary) 8%, transparent)', color: 'var(--color-text)' };
      if (ratio >= 0.5) return { bg: 'color-mix(in oklab, var(--color-warning) 12%, transparent)', color: 'var(--color-warning)' };
      return { bg: 'color-mix(in oklab, var(--color-warning) 24%, transparent)', color: 'var(--color-warning)' };
    };
    const header = `<thead><tr><th>Campaign</th>${stages.map(s => `<th>${s.short}</th>`).join('')}</tr></thead>`;
    const body = `<tbody>${rows.map(r => `<tr>
      <td>${D.campaignNames[r.c.campaign]||r.c.campaign}</td>
      ${stages.map(s => {
        const rate = r.rates[s.key];
        const hc = heatColor(rate, portfolioRates[s.key]);
        return `<td class="heat-cell" style="background:${hc.bg};color:${hc.color}">${rate != null && !isNaN(rate) ? fmt.pct(rate, 0) : '\u2014'}</td>`;
      }).join('')}
    </tr>`).join('')}
    <tr class="portfolio-avg-row"><td>Portfolio avg</td>${stages.map(s => `<td>${fmt.pct(portfolioRates[s.key], 0)}</td>`).join('')}</tr>
    </tbody>`;
    document.getElementById('leads-heatmap').innerHTML = header + body;
  }

  function renderLeadsRecs() {
    const T = S.totals;
    const portfolioQual = T.qualified_leads / T.leads;
    const portfolioQuote = T.quote_starts / T.qualified_leads;
    const portfolioComplete = T.quotes_completed / T.quote_starts;
    const portfolioBind = T.policies_bound / T.quotes_completed;
    const recs = [];
    for (const id of Object.keys(CM)) {
      const c = CM[id];
      const cl = classify(c);
      if (!cl) continue;
      const qualRate = c.leads > 0 ? c.qualified_leads / c.leads : 0;
      const quoteRate = c.qualified_leads > 0 ? c.quote_starts / c.qualified_leads : 0;
      const completeRate = c.quote_starts > 0 ? c.quotes_completed / c.quote_starts : 0;
      const bindRate = c.quotes_completed > 0 ? c.policies_bound / c.quotes_completed : 0;
      let body = '';
      // Lead-quality-specific: identify WHERE in the funnel this source breaks
      if (cl.diagnostic === 'lead_quality_trap') {
        body = `<b>${D.campaignNames[id]}</b> \u2014 ${fmt.num(c.leads)} leads \u2192 ${fmt.num(c.qualified_leads)} qualified \u2192 ${fmt.num(c.policies_bound)} policies.<br>` +
          `Qualification: ${fmt.pct(qualRate,0)} vs ${fmt.pct(portfolioQual,0)} portfolio. CPL is cheap (${fmt.money(c.cpl)}) but CPQL is ${fmt.money(c.cpql)}.<br>` +
          `<b>Break point: L\u2192Q.</b> The source generates volume but leads don't qualify. Test audience targeting or message fit before adding spend.`;
      } else if (cl.diagnostic === 'dead_spend') {
        body = `<b>${D.campaignNames[id]}</b> \u2014 ${fmt.num(c.leads)} leads \u2192 ${fmt.num(c.qualified_leads)} qualified \u2192 0 policies on ${fmt.money(c.spend)} spend.<br>` +
          `L\u2192Q: ${fmt.pct(qualRate,0)}, Q\u2192QS: ${fmt.pct(quoteRate,0)}, QS\u2192QC: ${fmt.pct(completeRate,0)}, QC\u2192P: ${fmt.pct(bindRate,0)}.<br>` +
          `<b>Break point: downstream of lead capture.</b> Leads enter the funnel but don't convert to policies. Investigate quote flow, offer, or landing-page alignment.`;
      } else if (cl.diagnostic === 'healthy_scalable') {
        body = `<b>${D.campaignNames[id]}</b> \u2014 ${fmt.pct(qualRate,0)} qual rate (${fmt.pct(quoteRate,0)} Q\u2192QS, ${fmt.pct(bindRate,0)} QC\u2192P). ${fmt.money(c.cac)} CAC.<br>` +
          `Funnel is healthy at every stage. Lead quality supports scaling \u2014 monitor marginal CAC as volume increases.`;
      } else if (cl.diagnostic === 'efficient_constrained') {
        body = `<b>${D.campaignNames[id]}</b> \u2014 best lead quality: ${fmt.pct(qualRate,0)} qual rate, ${fmt.pct(quoteRate,0)} Q\u2192QS, ${fmt.pct(bindRate,0)} QC\u2192P.<br>` +
          `Volume is limited (${fmt.num(c.leads)} leads) by the retargetable audience. Protect this source \u2014 do not over-scale beyond the addressable pool.`;
      } else if (cl.diagnostic === 'diminishing_returns') {
        body = `<b>${D.campaignNames[id]}</b> \u2014 ${fmt.pct(qualRate,0)} qual rate, ${fmt.money(c.cac)} CAC. Lead quality is acceptable.<br>` +
          `Funnel rates are near portfolio average. The constraint is cost efficiency at scale, not lead quality. Cap spend at the observed marginal-CAC ceiling.`;
      } else if (cl.diagnostic === 'cac_above_target') {
        body = `<b>${D.campaignNames[id]}</b> \u2014 ${fmt.pct(qualRate,0)} qual rate, ${fmt.money(c.cac)} CAC (above ${fmt.money(TARGET)} target).<br>` +
          `L\u2192Q: ${fmt.pct(qualRate,0)}, QS\u2192QC: ${fmt.pct(completeRate,0)}, QC\u2192P: ${fmt.pct(bindRate,0)}.<br>` +
          `Reduce spend or fix the funnel before scaling. Campaign-level funnel analysis, not individual lead records.`;
      } else {
        body = `<b>${D.campaignNames[id]}</b> \u2014 ${fmt.pct(qualRate,0)} qual rate, ${fmt.money(c.cac)} CAC.<br>` +
          `Funnel rates near portfolio average. ${cl.recommendation}`;
      }
      recs.push({ id, tier: cl.tier, diagnostic: cl.diagnostic, body });
    }
    const tierOrder = { ACTION: 0, OPPORTUNITY: 1, WATCH: 2 };
    recs.sort((a, b) => (tierOrder[a.tier] - tierOrder[b.tier]));
    const tierCls = { ACTION: 'action', OPPORTUNITY: 'opportunity', WATCH: 'watch' };
    document.getElementById('leads-rec-list').innerHTML = recs.map(r =>
      `<div class="leads-rec-card ${tierCls[r.tier]}">
        <div class="leads-rec-head">${D.campaignNames[r.id]} <span class="leads-rec-tier ${tierCls[r.tier]}">${r.tier}</span></div>
        <div class="leads-rec-body">${r.body}</div>
      </div>`
    ).join('');
  }

  /* ============ NAV / VIEW SWITCHING ============ */
  function switchView(name) {
    const target = document.getElementById("view-"+name);
    if (!target) return;
    document.querySelectorAll(".view").forEach(v => { v.hidden = v.id !== "view-"+name; v.classList.toggle("view-active", v.id === "view-"+name); });
    const setActive = (el)=> el.getAttribute("data-view") === name;
    document.querySelectorAll(".nav-item[data-view]").forEach(n => {
      const active = setActive(n);
      n.classList.toggle("active", active);
      n.querySelector(".nav-dot")?.classList.toggle("hollow", !active);
    });
    document.querySelectorAll(".mn-btn[data-view]").forEach(b => b.classList.toggle("active", setActive(b)));
    const labels = { overview:"Overview", experiments:"Experiments", budget:"Budget", leads:"Leads" };
    const cs = document.getElementById("crumb-screen"); if (cs) cs.textContent = labels[name] || "Overview";
    if (name === "experiments") renderExperiments();
    if (name === "budget") renderBudget();
    if (name === "leads") renderLeads();
    window.scrollTo({top:0});
  }

  /* ============ INIT ============ */
  function init(){
    renderInsightList();
    renderKPIs();
    renderChannels();
    renderFunnel();
    renderTrend();
    // wire nav view switching (sidebar + mobile)
    document.querySelectorAll(".nav-item[data-view], .mn-btn[data-view]").forEach(n=>{
      n.addEventListener("click", e=>{ e.preventDefault(); if(n.disabled)return; switchView(n.getAttribute("data-view")); });
    });
    document.getElementById("sort-toggle").addEventListener("click", e=>{
      const b=e.target.closest(".sort-btn"); if(!b)return;
      document.querySelectorAll(".sort-btn").forEach(x=>x.classList.remove("active")); b.classList.add("active");
      sortChannels(b.getAttribute("data-sort"));
    });
    document.getElementById("drawer-close").addEventListener("click", closeDrawer);
    document.getElementById("drawer-scrim").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeDrawer(); });
    const t=document.querySelector("[data-theme-toggle]");
    const root=document.documentElement;
    t.addEventListener("click", ()=>{ const cur=root.getAttribute("data-theme"); root.setAttribute("data-theme", cur==="dark"?"light":"dark"); });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
