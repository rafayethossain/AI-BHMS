# the target buying-house reference Feature Catalog

> [!IMPORTANT]
> **SUPERSEDED — HISTORICAL REFERENCE ONLY (2026-08-03).** Kept for requirement intent and
> target-vs-BHMS comparison. Active tracking moved to [`master-backlog.md`](../master-backlog.md)
> Part 2 (`RQ-###` requirements, workflow-ordered).

> **Source**: target manual 19-01-21 (48 pages)
> **Extracted**: 2026-07-30

---

## 1. Design Management (target Pages 17-26, 43-44)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Design List with image thumbnails | Grid view with main sketch or range photo toggle; list view option | Style list page — no image thumbnails |
| Style creation from template | Select garment type, base style (with include annotations/notes toggle), block reference | Style CRUD standalone, no copy-from-template |
| Design sheet annotations | Text boxes attached to sketch areas; cream/grey print areas | No annotation system |
| Main/Range design images | Right-click: set as design/range image; drag-drop; camera upload; resize | Tech pack upload but no per-image role system |
| "Not Sold" analysis | Quarterly report of styles by samples not sold, using Job Queue filtering | No unsold styles analysis |
| Design review workflow | Check block references; sales/design directors constant review | Basic approval workflow exists |

### Gap Score: 6/10 (BHMS has basics but misses image management, annotations, unsold analysis)

---

## 2. Specification Management (target Pages 20-22, 36-38)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Fit Specs (Dev Spec → 1st Fit → 2nd Fit → ...) | Tabbed multi-fit specifications with ticked "current" selection | No fit spec system at all |
| Spec versioning | Copy from base/development/previous fit or from another style number | Style versioning exists but no measurement/spec data |
| Fit notes with images | Notes tab + images tab per fit; brief notes + detailed in design area | No fit tracking |
| Measurement spec | Dev Spec with key measurements | No measurement model |

### Gap Score: 1/10 (Almost entirely missing from BHMS)

---

## 3. Design Costings (target Pages 22-24)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Multiple costing versions | Multiple cost sheets per style, tick to select live one | Costing versions exist |
| Size/width column | Required for costing schedule accuracy | Not present in current costing |
| 8 cost categories | Every line item belongs to 1 of 8 categories | Cost categories exist but not standardized |
| Consumption from costing | Costing schedule pulled through to FN costing sheet | BOM-to-costing exists |
| Pattern amendments → new costing | Mandatory: pattern amendment MUST trigger new costing | No such workflow enforcement |
| Patterned fabric options | 4 additional options for patterned fabric costing | Not present |
| Single-size watermark | Overlay on image when costing is single-size | Not present |
| Size ratio input | Required for each costing update | Not present |

### Gap Score: 5/10 (Basic costing exists, missing fabric pattern options, size/width, size ratio, watermark)

---

## 4. Job Request / Job Queue (target Pages 24, 38)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Job types (Pattern, Sample, 3D, Mini-marker) | Drop-down single/multi-job selection | Not present |
| Work location assignment | Select factory/work location | Factory model exists, no job routing |
| Person allocation | Assign to specific person | Not present |
| Job queue (non-dynamic table + reporting tool) | Two views: original queue + dynamic reporting | Not present |
| Job request per design | Job Request tab at bottom of design sheet | Not present |
| History per style | See all job requests for a style | Not present |

### Gap Score: 0/10 (Not implemented at all in BHMS)

---

## 5. File Number / Order Management (target Pages 27-31)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| FN (File Number) system | Auto-issued on status change → Live; country suffix (VN/SL/R) | FileOpening exists with FO-XXXX; no country suffix |
| Order raising validation | Validates: costing tab, breakdown tab, fabric tab before issuing FN | Basic validation exists |
| Critical info validation | Error messages at bottom of page listing all issues | Messages exist |
| Quick lead time orders | Yellow risk setting marks order across all screens | No such feature |
| Repeats | Create repeat from original FN; all departments must approve | No repeat order feature |
| Stock fabric management | Separate FN with "stock fabric" description; fabric photo; meter tracking | No stock fabric system |
| Sales confirmation | 48-hour dispute window; automatic acceptance | Not implemented |
| Contract received date | Track when contracts received; query if >5 months delivery | Not present |
| Completion date management | Based on fabric arrival; not a "send by" date | T&A exists, different logic |

### Gap Score: 6/10 (File opening/PO exist, missing repeats, stock fabric, quick lead time, sales confirmation)

---

## 6. Costing Sheet — Order Level (target Pages 31-32)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| 8 cost categories | Standardized categories for reconciliation | Not standardized |
| 5 costing sheet types | By factory location (SL, VN, etc.), selectable+live tick | Costing sheets exist |
| "Additional" change rows | Prefix "Additional" + original description for cost variances | No change tracking like this |
| Dgn rating (reference) | Pulled from design sheet, read-only reference | Rating exists |
| Exchange rate for landed orders | USD→GBP conversion | Not present |
| Approved by + date columns | Every additional cost line tracked | Approval exists but not at line-item level |

### Gap Score: 5/10 (Costing exists, missing standardized categories, exchange rates, line-item changes)

---

## 7. Breakdown Tab — HIT Management (target Page 32)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Hit numbers | Unique per color; hit number + color = system key for production | PO items with color/size |
| PO/Customer style number per hit | Each hit gets PO and customer style ref | PO linked to file opening |
| Boxed/Hanging delivery mode | Per-hit setting | Not present |
| Factory transfer | Internal factory transfer recording | Not present |
| Original vs actual delivery date | Original locked on creation; actual modified by planning | PO dates exist, different tracking |
| Delivery type (Sea/Air/Air options) | Default Sea; air options note who pays | Not present |

### Gap Score: 3/10 (PO items exist but misses hit management, delivery modes, factory transfers)

---

## 8. Fabric Management (target Pages 32-35, 40-41, 44-45)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Prime tab (initial planning) | Cannot delete; first planning step | Not present |
| Order colour ref per fabric | Fabric assigned to breakdown colour | Not present |
| Pre-approved supplier list | Drop-down only; finance approval needed for additions | Supplier/Vendor exists |
| Lab dip/strike-off tracking | Required date, actual date, approval date tracked | Not present |
| Bulk approval tracking | Bulk notes, approval date, 10m to production + 2m to sales | Not present |
| Onboard/ETA dates | Tracked, updated by role (sales→merch→planning) | Shipment ETD/ETA exists |
| Consumption: final vs sold | Final consumption (from production) updated separately from rating (sold) | Not present |
| Defect fabric/shortages | Record total unusable, debit tracking, notes | Not present |
| Fabric tolerances | Customer-specific tables (Primark 0-2999m: +/-5%, etc.) | Not present |
| Fabric risk color system | None→Amber→Green→Red based on bulk/dates/clearance | Not present |
| Fabric issue reporting | Monday.com form for factory claims | Not present |
| Fabric utilization | Review at docket stage; final vs actual rating | Not present |
| China office fabric management | Dedicated schedule management role | Not present |
| Fabric schedule roles | Sales→Merch→Planning→Logistics handoff chain | Not present |

### Gap Score: 2/10 (Very little fabric management exists in BHMS)

---

## 9. Trims & Labels Management (target Pages 35-36)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Location on garment | Specify where trim/label goes on garment | BOMItem exists, no location field |
| Pre-approved supplier list | Drop-down only | Vendor exists |
| Schedule columns | Quantity, Delivered, ETA, actual order date, confirmed tick | Not present |
| Status (TBC/Completed) | TBC = appears on Order Manager reports; Completed = hidden | Not present |
| Copy from previous order | Copy labels/trims from another order; choose detail/washcare | Not present |
| Price variance reporting | Format for reporting higher prices to compliance team | Not present |
| USD price must be actual | Must match invoice | Not present |

### Gap Score: 2/10 (Very basic trim tracking, missing schedule, copy, price variance)

---

## 10. Technical Management (target Pages 36-38)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Fit tracking per order | Date + fit number + brief description in Technical tab | Not present |
| Fit spec sheets | Multi-tab: Dev Spec, 1st Fit, 2nd Fit, etc. with tick for current | StyleVersion exists but no spec data |
| Copy spec from other styles | Search style number with letter code; copies ticked spec | Not present |
| Tech pack sending | Minimum 10 days before completion | Tech pack upload exists |
| Critical path management | Production managers daily review using Order Manager | T&A exists |

### Gap Score: 3/10 (Tech pack exists, but fit specs, spec copying, critical path missing)

---

## 11. Booking Schedule (target Pages 39-40, 42)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Weekly schedule updates | Wednesday: 100% sorted; Friday: copy to Directors | Not present |
| Status management | Live→In Work (planning)→Delivered (logistics) | Shipment status exists |
| Risk button/status marker | Changes to cyan on final hit = reconciliation trigger | Status exists, different logic |
| Cut quantity tracking | Daily fill by planner | DailyProduction exists with target/actual |
| Garments ready (fully packed) | Separate column | Not present |
| Booking reference | Logistics: min 14 days before delivery; never blank from 2 weeks pre | Shipment has container/seal numbers |
| Delivery date management | Only merchandiser/management can change | PO dates editable |
| Notes system | Initials + date prefix; responsible for removal | Notes fields exist |
| Gold seal tracking | GS notes + GS approval date by customer technical | Not present |
| Box/Hanging delivery method | Per-order CUSTOMER delivery type | Not present |
| Ex-factory dates + notes | Planner fills, min 14 days before ex-date | Not present |
| Snapshot status presets | Pre-selected status options for consistency | Not present |

### Gap Score: 1/10 (Mostly missing from BHMS)

---

## 12. Fabric Schedule (target Pages 40-41)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Lab dip/strike-off approval | Sales+merch responsible; must have approved dates | Not present |
| Bulk approval | Planning team chases and updates | Not present |
| Onboard/arrival by role | Sales→(dip approval)→Merchandising→(bulk approval)→Planning→Logistics | Not present |
| Paperwork/clearance | Logistics manages clearance dates | Not present |
| China office role | Specific team for schedule management | Not present |

### Gap Score: 0/10 (Not implemented at all)

---

## 13. Order Manager — Critical Path (target Pages 42-43)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Customer-level summary | Overview by customer; ordered by completion date | Reporting exists |
| Risk indicators | Fabric/Labels/Trims/Technical per-order risk colors | No risk indicator system |
| Status markers | Sealed, fabric in factory, trims on schedule | Status exists |
| 2 orders per page print | Double-sided printing format | Not present |
| Weekly critical path review | Production managers + planning + technical | Not present |

### Gap Score: 3/10 (Basic reporting, no risk color system, no critical path management)

---

## 14. Quality Control (target Page 44)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| QC via Monday.com | PP→Final AQL tracking | Inspection exists |
| Weekly AQL reports | Monday STSU meetings | Quality dashboard exists |
| AQL pass rate reporting | Example report referenced | Basic AQL calculation exists |

### Gap Score: 7/10 (Quality module is relatively strong; missing Monday.com integration)

---

## 15. Dockets & Reconciliation (target Pages 38, 44-45)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Contract pricing on docket | Saved centrally: price, date raised, delivery date | Not present |
| Fabric over 200m handling | Docket sent to sales for direction | Not present |
| Final hit reconciliation | Quantity vs docket; >20 units short = debit | Not present |
| Shipping paperwork vs ordered | Compare shipped qty vs ordered; calculate producible garments | Not present |
| Fabric utilization analysis | Monthly report to Directors; 10 days of following month | Not present |
| Damaged/unusable meters tracking | Input into specific field | Not present |

### Gap Score: 0/10 (Not implemented at all)

---

## 16. Debits Management (target Page 44)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Pro forma debits | Raised when issue confirmed; formalized later | Not present |
| Compliance email workflow | Debits sent from compliance@ with CC chain | Not present |
| Over-tolerance fabric debits | Auto debit for >5%/2% over tolerance | Not present |
| Senior finance management | Debits managed by senior finance team | Not present |

### Gap Score: 0/10 (Not implemented at all)

---

## 17. Invoice Approval (target Page 44)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Fabric/trimmings invoice review | Quantity/Date/Price vs target data | Not present |
| Over-tolerance debits | Raised on invoice mismatch | Not present |
| Auto-approvals | Future integration between target and accounts package | Not present |

### Gap Score: 0/10 (Not implemented at all)

---

## 18. Communication & Teams Integration (target Pages 45-46)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Teams channels per customer | Sub-groups within Mini-Markers VN team | Not present |
| Email vs Teams policy | "Do not be an email warrior, use Teams" | Not present |
| Job request→Teams follow-up | Communication after job request done via Teams | Not present |

### Gap Score: N/A (Org policy, not software feature)

---

## 19. Compliance Internal Audit (target Pages 46-47)

| Feature | target Implementation | BHMS Equivalent |
|---------|-------------------|-----------------|
| Weekly order review | All orders from 1st July 2020; weekly from Aug 24 | AuditLog exists |
| 10 key review items | Fabric paperwork, mini-marker efficiency, dockets, utilization, invoices, ratings, trims, final hits | Partial coverage |
| Efficiency rate monitoring | Mini-marker efficiency >85% | Not present |
| 3-warning policy | Out of date → 2 warnings → possible dismissal | Not present |

### Gap Score: 2/10 (AuditLog exists but no compliance/audit workflow)

---

## Overall target Feature Coverage Summary

| Domain | target Score | BHMS Score | Gap Level |
|--------|----------|------------|-----------|
| Design Management | 10 | 6 | Medium |
| Specification/Fit Management | 10 | 1 | **Critical** |
| Design Costings | 10 | 5 | High |
| Job Request/Queue | 10 | 0 | **Critical** |
| File Number / Order Management | 10 | 6 | Medium |
| Order-Level Costing Sheet | 10 | 5 | High |
| HIT/Breakdown Management | 10 | 3 | **Critical** |
| Fabric Management | 10 | 2 | **Critical** |
| Trims & Labels | 10 | 2 | **Critical** |
| Technical/Fit Management | 10 | 3 | **Critical** |
| Booking Schedule | 10 | 1 | **Critical** |
| Fabric Schedule | 10 | 0 | **Critical** |
| Order Manager / Critical Path | 10 | 3 | **Critical** |
| Quality Control | 10 | 7 | Low |
| Dockets & Reconciliation | 10 | 0 | **Critical** |
| Debits Management | 10 | 0 | **Critical** |
| Invoice Approval | 10 | 0 | **Critical** |
| Compliance Audit | 10 | 2 | **Critical** |
| **TOTAL** | **180** | **46** | **74% gap** |
