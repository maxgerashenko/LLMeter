#!/usr/bin/env python3
"""Estimate an equivalent tier for local models that have no official tier.

Same logic as docs/assets/runs.js (estimateTiers). Writes data/local-estimated-tiers.csv.
Method: see articles/local-estimated-tiers.md.
"""
import csv, re, os, collections

root = os.path.join(os.path.dirname(__file__), "..")
W = {"q01": 1, "q02": 1, "q03": 2, "q04": 2, "q05": 2, "q06": 3, "q07": 3, "q08": 3, "q09": 3, "q10": 3}
BANDS = [("Tier 4", 75), ("Tier 3", 55), ("Tier 2", 40), ("Tier 1", 20), ("Tier 0", 0)]
norm = lambda n: re.sub(r"[^a-z0-9]", "", re.sub(r"\s*\([^)]*\)\s*$", "", n or "").lower())
band = lambda p: next(b for b, m in BANDS if p >= m)

models = {r["id"]: r["model"] for r in csv.DictReader(open(f"{root}/data/local-test-models.csv"))}
official = {}
for r in csv.DictReader(open(f"{root}/data/long-coding-tasks-2026-11-17.csv")):
    try: p = float(r["pct_of_sonnet_5_5"])
    except ValueError: continue
    k = norm(r["model"]); official[k] = max(p, official.get(k, 0))

# Suite score of each run (date, model, runtime, thinking, parallel); missing tasks count 0.
runs = collections.defaultdict(dict)
for r in csv.DictReader(open(f"{root}/data/local-runtime-results.csv")):
    k = (r["date"], r["model_id"], r["runtime"], r["thinking"], r["parallel"])
    t = r["task_id"].lower()
    if t in W and t not in runs[k]:
        s = float(r["score"] or 0); runs[k][t] = s / 100 if s > 1 else s
best = {}
for (d, mid, *_), tasks in runs.items():
    sc = 100 * sum(W[t] * v for t, v in tasks.items()) / 23
    name = models.get(mid, mid)
    if sc > best.get(name, -1): best[name] = sc

anchors = sorted((s, official[norm(n)], n) for n, s in best.items() if norm(n) in official)
rows = []
for n, s in best.items():
    if norm(n) in official: continue
    lo = max((a for a in anchors if a[0] <= s), key=lambda a: a[0], default=None)
    hi = min((a for a in anchors if a[0] >= s), key=lambda a: a[0], default=None)
    if lo and hi and hi[0] > lo[0]:
        p = lo[1] + (hi[1] - lo[1]) * (s - lo[0]) / (hi[0] - lo[0])
    else:
        p = (lo or hi)[1]
    rows.append([n, round(s, 1), round(p, 1), band(p) + "*", lo[2] if lo else "", hi[2] if hi else ""])
rows.sort(key=lambda r: -r[2])
with open(f"{root}/data/local-estimated-tiers.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["model", "best_suite_score", "estimated_pct_of_sonnet_5_5", "estimated_tier", "anchor_below", "anchor_above"])
    w.writerows(rows)
print(open(f"{root}/data/local-estimated-tiers.csv").read())
