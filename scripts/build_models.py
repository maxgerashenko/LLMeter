#!/usr/bin/env python3
"""Build data/models.csv: the single source of truth for every model on the site, with its tier.

Every page reads tiers from data/models.csv (through docs/assets/models.js); nothing else
computes or types a tier. Run this after changing any input, then scripts/sync-site-data.sh.

Inputs:
  data/long-coding-tasks-*.csv   official scores: one row per model and setting (the tier anchors)
  data/local-test-models.csv     models LLMeter runs locally
  data/local-runtime-results.csv per-task results of those runs
  data/rack-speed-*.csv          models drawn on the Rack pages (must all have a tier here)

Tier rules (articles/long-coding-tiers-local-models.md, articles/local-estimated-tiers.md):
  official   open-weights model with a score in the long-coding file: band of its share of Sonnet 5.5
  reference  Claude Sonnet 5.5, the 100% reference (tier "Max")
  estimated  open model run locally but with no official score: its best suite score is placed between
             the two nearest official models with a local run (straight line), then the same bands
  cloud_only closed model: has a share but no tier
  none       known model with neither (not run yet)
"""
import csv, glob, os, re, collections, sys

root = os.path.join(os.path.dirname(__file__), "..")
D = lambda p: os.path.join(root, "data", p)
BANDS = [("t4", "Tier 4", 75), ("t3", "Tier 3", 55), ("t2", "Tier 2", 40), ("t1", "Tier 1", 20), ("t0", "Tier 0", 0)]
REFERENCE = "Claude Sonnet 5.5 (Max)"
W = {"q01": 1, "q02": 1, "q03": 2, "q04": 2, "q05": 2, "q06": 3, "q07": 3, "q08": 3, "q09": 3, "q10": 3}
DEVELOPERS = [("claude", "Anthropic"), ("kimi", "Moonshot AI"), ("glm", "Z.ai"), ("deepseek", "DeepSeek"), ("mimo", "Xiaomi"),
              ("mistral", "Mistral AI"), ("step", "StepFun"), ("minimax", "MiniMax"), ("qwen", "Alibaba Qwen"),
              ("nemotron", "NVIDIA"), ("gpt-oss", "OpenAI"), ("gemma", "Google"), ("granite", "IBM")]

# "Qwen3.8 27B + draft Llama 3.2 1B" is the same model as "Qwen3.8 27B"
base = lambda n: re.sub(r"\s*\+\s*draft\s.*$", "", n or "", flags=re.I)
# family key: name without draft part and trailing "(setting)", lower-case letters and digits only
fam = lambda n: re.sub(r"[^a-z0-9]", "", re.sub(r"\s*\([^)]*\)\s*$", "", base(n)).lower())
band = lambda p: next(b for b in BANDS if p >= b[2])

def rows(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))

def developer(name):
    n = name.lower()
    return next((d for p, d in DEVELOPERS if n.startswith(p)), "")

official = rows(glob.glob(D("long-coding-tasks-*.csv"))[0])
tests = rows(D("local-test-models.csv"))
results = rows(D("local-runtime-results.csv"))
speeds = rows(glob.glob(D("rack-speed-*.csv"))[0])

out = collections.OrderedDict()   # name -> row
def pct_of(r):
    try: return float(r["pct_of_sonnet_5_5"])
    except ValueError: return None

for r in official:
    p = pct_of(r)
    open_ = r["open_weights"] == "yes"
    if r["model"] == REFERENCE: status, tier = "reference", ("max", "Max")
    elif not open_: status, tier = "cloud_only", None
    elif p is None: status, tier = "none", None
    else: status, tier = "official", band(p)[:2]
    out[r["model"]] = dict(name=r["model"], family=fam(r["model"]), developer=developer(r["model"]), open_weights=r["open_weights"],
        pct_of_sonnet_5_5=("" if p is None else f"{p:g}"), tier_id=tier[0] if tier else "", tier=tier[1] if tier else "",
        tier_status=status, best_suite_score="", anchor_below="", anchor_above="", local_test_ids="", source="long-coding-tasks")

# Best suite score of each run (date, model, runtime, thinking, parallel); missing tasks count 0.
names = {r["id"]: r["model"] for r in tests}
runs = collections.defaultdict(dict)
for r in results:
    k = (r["date"], r["model_id"], r["runtime"], r["thinking"], r["parallel"])
    t = r["task_id"].lower()
    if t in W and t not in runs[k]:
        s = float(r["score"] or 0); runs[k][t] = s / 100 if s > 1 else s
best = {}
for (d, mid, *_), tasks in runs.items():
    sc = 100 * sum(W[t] * v for t, v in tasks.items()) / 23
    n = base(names.get(mid, mid))
    if sc > best.get(n, -1): best[n] = sc

# Local test models: attach to an official family, or add a new (estimated / none) model.
ids = collections.defaultdict(list)
for r in tests: ids[fam(r["model"])].append(r["id"])
dev = {fam(r["model"]): re.sub(r"\s*\(.*$", "", r["developer"]) for r in tests}
best_by_fam = {fam(n): (n, s) for n, s in best.items()}
off_best = {}   # family -> best official pct (anchors use the best row of a family)
for n, o in out.items():
    if o["pct_of_sonnet_5_5"] != "" and o["tier_status"] in ("official", "reference"):
        off_best[o["family"]] = max(off_best.get(o["family"], 0), float(o["pct_of_sonnet_5_5"]))

anchors = sorted((s, off_best[fam(n)], n) for n, s in best.items() if fam(n) in off_best)
for r in tests:
    n = base(r["model"]); f = fam(n)
    if f in dev and not out.get(n) and not any(o["family"] == f for o in out.values()):
        out[n] = dict(name=n, family=f, developer=developer(n) or dev[f], open_weights="yes", pct_of_sonnet_5_5="", tier_id="", tier="",
            tier_status="none", best_suite_score="", anchor_below="", anchor_above="", local_test_ids="", source="local-test-models")
for o in out.values():
    o["local_test_ids"] = " ".join(ids.get(o["family"], []))
    o["developer"] = o["developer"] or dev.get(o["family"], "")
    if o["family"] in best_by_fam: o["best_suite_score"] = f"{best_by_fam[o['family']][1]:.1f}"
    if o["tier_status"] == "none" and o["family"] in best_by_fam and o["family"] not in off_best:
        n, s = best_by_fam[o["family"]]
        lo = max((a for a in anchors if a[0] <= s), key=lambda a: a[0], default=None)
        hi = min((a for a in anchors if a[0] >= s), key=lambda a: a[0], default=None)
        if lo and hi and hi[0] > lo[0]: p = lo[1] + (hi[1] - lo[1]) * (s - lo[0]) / (hi[0] - lo[0])
        elif lo or hi: p = (lo or hi)[1]
        else: continue
        b = band(p)
        o.update(pct_of_sonnet_5_5=f"{p:.2f}", tier_id=b[0], tier=b[1], tier_status="estimated",
                 anchor_below=lo[2] if lo else "", anchor_above=hi[2] if hi else "")

# Every model drawn on the Rack pages must be here with a tier (their tier comes from this file, not from the rack data).
missing = sorted({r["model"] for r in speeds if not (out.get(r["model"]) or {}).get("tier_id")})
if missing:
    sys.exit("rack-speed models without a tier in models.csv: %s" % missing)

cols = ["name", "family", "developer", "open_weights", "pct_of_sonnet_5_5", "tier_id", "tier", "tier_status", "best_suite_score",
        "anchor_below", "anchor_above", "local_test_ids", "source"]
with open(D("models.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, cols); w.writeheader(); w.writerows(out.values())
print(f"Wrote data/models.csv: {len(out)} models")
c = collections.Counter(o["tier_status"] for o in out.values()); print(dict(c))
