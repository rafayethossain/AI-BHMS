# BHMS target Feature Analysis

> [!IMPORTANT]
> **SUPERSEDED — HISTORICAL REFERENCE ONLY (2026-08-03).** The "target gap" framing is retired.
> All gap items are now **BHMS requirements** with `RQ-###` IDs and are tracked in
> [`master-backlog.md`](../master-backlog.md) Part 2, ordered chronologically by business workflow.
> Use this folder for **requirement intent** (what the legacy target system did) and for the
> BHMS-equivalent comparison. Do not use sprint/phase numbers from these docs for planning.

> **Generated**: 2026-07-30
> **Source**: target manual 19-01-21 (48 pages)

## Files

| File | Description |
|------|-------------|
| `01-feature-catalog.md` | Complete feature breakdown of target with BHMS comparison scores |
| `02-gap-analysis-bhms-vs-target.md` | Prioritized gap matrix (P0-P3) with BCG impact matrix and model impact |
| `manual-extracted.txt` | Raw extracted text from target PDF (48 pages) |

## Executive Summary

- **target features identified**: 50+ across 19 domains
- **Current BHMS coverage**: ~26% (46/180 score)
- **Critical gaps (P0)**: 6 areas — Fabric Mgmt, Trims/Labels, Hit Mgmt, Booking Schedule, Spec/Fit Mgmt, Job Queue
- **Implementation effort**: 9 sprints (18 weeks), 30 stories, ~189 story points
- **Strategy**: Net-new models first, extend existing with nullable fields, TDD for everything
- **Risk**: Zero breaking changes — all new features are additive
