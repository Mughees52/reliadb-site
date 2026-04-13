# EXPLAIN Analyzer — Visualization & Rules Upgrade Plan

**Created:** 2026-04-13
**Competitor analyzed:** Tabularis (https://tabularis.dev)

## Visualization Upgrades (PlanTree.vue)

### 1. Add Minimap (HIGH)
- Small overview panel in bottom-right corner (150x100px)
- Shows full tree in miniature with a viewport rectangle
- Click/drag the rectangle to navigate large trees
- Use d3 to render a simplified version of the tree at tiny scale

### 2. Add Zoom Control Buttons (MEDIUM)
- +/- buttons and "Fit" button in bottom-left corner (above highlight switcher)
- Fit button: resets zoom to show entire tree
- +/- buttons: increment/decrement zoom by 0.25x

### 3. Node Background Fill Gradient (HIGH)
- Instead of just a top color bar, fill the entire node rect with a very subtle tint
- Good nodes (const, eq_ref): light green fill (#f0fff4)
- Warning nodes (filesort, temp): light amber fill (#fffbeb)
- Critical nodes (ALL, unindexed join): light red fill (#fef2f2)
- Currently only the border and top bar show severity — the fill makes bottlenecks more visually obvious at a glance

### 4. Edge Arrow Markers (LOW)
- Add small arrow markers at the target end of each edge
- Shows data flow direction more clearly

### 5. Animated Edge Flow (LOW)
- Dashed stroke-dasharray animation on edges showing data flow direction
- Only on the currently selected node's incoming/outgoing edges

## New Rules (46 → 62)

### Critical (1 new)
| Rule | Detection |
|------|-----------|
| `largeSortBufferSpill` | `extra` contains "filesort_on_disk" or Sort_merge_passes > 0 |

### Warning (8 new)
| Rule | Detection |
|------|-----------|
| `implicitTypeConversion` | Query hint: WHERE varchar_col = numeric_literal |
| `likeLeadingWildcard` | Query hint: LIKE '%pattern' (leading wildcard) |
| `derivedTableMaterialized` | selectType = DERIVED and rows > 5000 |
| `unionInsteadOfUnionAll` | selectType = UNION RESULT with temp table |
| `indexSkipScanInefficient` | Skip scan with rows > 10000 (reading too many prefix groups) |
| `deepNestedJoin` | Tree depth > 5 with all join nodes |
| `hashJoinFallback` | Hash join detected but no index available (forced fallback) |
| `backwardIndexScanLarge` | extra contains "Backward index scan" and rows > 1000 |

### Info (4 new)
| Rule | Detection |
|------|-----------|
| `orConditionMultipleColumns` | Query hint: WHERE col1=x OR col2=y (no single index covers both) |
| `redundantDistinctWithGroupBy` | Query hint: SELECT DISTINCT ... GROUP BY same columns |
| `backwardIndexScan` | extra contains "Backward index scan" (less efficient than forward) |
| `autoIncrementGap` | extra contains "Auto increment gap" |

### Good (3 new)
| Rule | Detection |
|------|-----------|
| `selectCountStar` | COUNT(*) with type=index and Using index |
| `looseScanOptimization` | extra contains "LooseScan" or "Using index for skip scan" |
| `parallelScanDetected` | operation contains "Parallel" |

## Implementation Order

### Session 1: Visualization ✓ DONE
1. ✓ Node background fill gradient (severity-tinted card backgrounds)
2. ✓ Zoom control buttons (+/−/Fit in bottom-right)
3. ✓ Minimap navigation (canvas-based, click to pan)

### Session 2: Rules ✓ DONE
1. ✓ Critical + Warning rules (9 new)
2. ✓ Info + Good rules (7 new)
3. Test suite — manual testing via dev server

## Files to Edit
- `tools/explain/src/components/PlanTree.vue` — visualization
- `tools/explain/src/analysis/rules.ts` — new rules
- `tools/explain/src/analysis/query-hints.ts` — new query patterns
- `tools/explain/tests/test-queries.ts` — new test cases
