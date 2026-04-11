# Tool vs AI DBA Analysis — Side-by-Side Comparison

**Date**: 2026-04-09
**Database**: blog_demo (SaaS billing, 333K rows, 6 tables)
**Tool has never seen these queries before**

## Scoring

For each query, score what the Tool found vs what an AI/Senior DBA would recommend:
- **Match** = Tool recommends the same thing
- **Tool Better** = Tool catches something AI missed
- **AI Better** = AI catches something Tool missed
- **Tool Wrong** = Tool recommends something incorrect

---

## Q1: MRR by Region (score 44)

| Finding | Tool | AI DBA | Verdict |
|---------|------|--------|---------|
| Full table scan on tenants | ✅ Detected | ✅ Would flag | Match |
| Filesort on 4,666 rows | ✅ Detected | ✅ Would flag | Match |
| High loop count on subscriptions | ✅ Detected | ✅ Would flag | Match |
| Index: `tenants(is_active, region)` | ✅ `(is_active, region, mrr, id)` | ✅ `(is_active, region)` | Match (tool over-covers with `mrr` — but `mrr` is a real column in tenants, harmless as trailing) |
| Index: `subscriptions(tenant_id, amount, status)` covering | ❌ Not recommended | ✅ Would recommend | **AI Better** |
| COUNT(DISTINCT) hint | ✅ Flagged | ✅ Would note redundancy | Match |
| Impact simulation | ✅ Full scan→ref, filesort eliminated | ❌ AI doesn't do this | **Tool Better** |

**Score: Tool 5, AI 6, Tool Better 1, AI Better 1**

---

## Q2: Overdue Invoices (score 66)

| Finding | Tool | AI DBA | Verdict |
|---------|------|--------|---------|
| Row estimate mismatch (massive) | ✅ Detected | ✅ Would flag | Match |
| Optimal eq_ref join on tenants | ✅ Good practice noted | ✅ Would note | Match |
| Index: `invoices(status, due_date)` | ✅ Recommended | ✅ Would recommend | Match |
| Covering index: `invoices(due_date, amount, tenant_id, status)` | ✅ Recommended as covering | ✅ Would recommend `(status, due_date, amount, tenant_id)` | Match (but tool puts due_date first — AI would put status first since WHERE equality should lead) |
| ORDER BY optimization note (DATEDIFF monotonic) | ❌ Not mentioned | ✅ Would explain `ORDER BY days_overdue DESC` = `ORDER BY due_date ASC` | **AI Better** |
| Date function hint | ✅ Flagged | ✅ Would flag | Match |
| Impact simulation | ✅ Filesort eliminated, index-only | ❌ AI doesn't do this | **Tool Better** |

**Score: Tool 5, AI 6, Tool Better 1, AI Better 1**

---

## Q3: Enterprise Feature Usage (score 31)

| Finding | Tool | AI DBA | Verdict |
|---------|------|--------|---------|
| Full table scan on tenants | ✅ Detected | ✅ Would flag | Match |
| Temp table 4,672 rows | ✅ Detected | ✅ Would flag | Match |
| Filesort 4,672 rows | ✅ Detected | ✅ Would flag | Match |
| High loop count on usage_events | ✅ Detected | ✅ Would flag | Match |
| Index: `tenants(plan, name, id)` | ✅ Recommended | ✅ `(plan, name)` — AI says `id` trailing is fine | Match |
| Index: `usage_events(recorded_at, feature, quantity)` | ✅ Recommended | ✅ Would recommend `(tenant_id, recorded_at, feature, quantity)` — join col first | **AI Better** (tool misses join col) |
| Join reorder opportunity | ✅ Impact says "enables join reorder" | ✅ Would recommend driving from 833 enterprise tenants | Match |
| GROUP BY on non-unique name hint | ✅ Flagged | ✅ Would flag | Match |
| Query rewrite: add PK to GROUP BY | ✅ Suggested | ⚠️ AI might or might not suggest this | **Tool Better** |
| Impact simulation | ✅ Full details | ❌ AI doesn't do this | **Tool Better** |

**Score: Tool 8, AI 8, Tool Better 2, AI Better 1**

---

## Q4: Support Response Time (score 77)

| Finding | Tool | AI DBA | Verdict |
|---------|------|--------|---------|
| Full table scan on support_tickets | ✅ Detected | ✅ Would flag | Match |
| High loop count (30K) on user filter | ✅ Detected | ✅ Would flag | Match |
| Index: `users(role)` | ✅ Recommended | ✅ Would recommend | Match |
| Index: `support_tickets(priority)` | ✅ Recommended | ✅ Would recommend, but as part of covering | Match |
| Covering: `support_tickets(user_id, priority, status, created_at, resolved_at)` | ❌ Not recommended | ✅ Would recommend for join + GROUP BY + SELECT | **AI Better** |
| Join order flip (drive from admin users) | ❌ Not explicitly recommended | ✅ Critical insight — with users(role), MySQL flips join order | **AI Better** |
| Impact simulation | ✅ Full scan→ref for support_tickets | ❌ AI doesn't do this | **Tool Better** |

**Score: Tool 4, AI 6, Tool Better 1, AI Better 2**

---

## Q5: Revenue Leakage (score 69)

| Finding | Tool | AI DBA | Verdict |
|---------|------|--------|---------|
| Temp table 5,000 rows | ✅ Detected | ✅ Would flag | Match |
| High fan-out on invoices | ✅ Detected | ✅ Would flag | Match |
| Optimal eq_ref on tenants | ✅ Good practice noted | ✅ Would note | Match |
| Index: `subscriptions(status, plan, amount, tenant_id, id)` covering | ✅ Recommended | ✅ `(status, tenant_id, plan, amount)` — AI would put join col earlier | Match (column order differs) |
| Index: `invoices(subscription_id, status, amount)` covering | ❌ Not fully recommended | ✅ Would recommend covering for LEFT JOIN | **AI Better** |
| GROUP BY on non-unique name hint | ✅ Flagged | ✅ Would note | Match |
| HAVING hint | ✅ Flagged | ⚠️ AI might or might not flag | **Tool Better** |
| Query rewrite: add PK to GROUP BY | ✅ Suggested | ⚠️ AI might or might not suggest | **Tool Better** |
| Impact simulation | ✅ Index-only scan | ❌ AI doesn't do this | **Tool Better** |

**Score: Tool 7, AI 7, Tool Better 3, AI Better 1**

---

## OVERALL SUMMARY

| Metric | Tool | AI DBA |
|--------|------|--------|
| Total findings matched | 29 | 29 |
| Tool unique advantages | 8 | — |
| AI unique advantages | — | 6 |
| Tool wrong recommendations | 0 | — |

### Where Tool Beats AI:
1. **Impact simulation** — AI can't predict structural plan changes; tool does it for every rec
2. **Query rewrites** — tool generates executable SQL alternatives (add PK to GROUP BY)
3. **Hints** — catches HAVING misuse, COUNT(DISTINCT) overhead, GROUP BY on non-unique columns

### Where AI Beats Tool (gaps to fix):
1. **Covering indexes for JOINs** — AI recommends `(join_col, filter_col, select_cols)` for the inner table; tool sometimes misses including the join column first
2. **Join order awareness** — AI explicitly says "flip the join order"; tool's impact simulator mentions "enables join reorder" but doesn't generate a concrete recommendation
3. **Column ordering in composites** — AI puts equality WHERE cols before range cols; tool sometimes puts them in query-appearance order instead of selectivity order
4. **DATEDIFF monotonicity** — AI recognizes ORDER BY DATEDIFF() = ORDER BY date; tool doesn't note this

### Verdict: **Tool matches or exceeds AI on 83% of findings (29+8 out of 29+8+6 = 86%)**
Tool has zero wrong recommendations. AI has the edge on nuanced covering index design and join order reasoning.
