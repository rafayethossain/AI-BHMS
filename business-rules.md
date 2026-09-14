# Business Rules
# BHMS - Buying House Management System

---

## Table of Contents

1. [Order Management Rules](#1-order-management-rules)
2. [T&A Rules](#2-ta-rules)
3. [Costing Rules](#3-costing-rules)
4. [Commercial & LC Rules](#4-commercial--lc-rules)
5. [Procurement Rules](#5-procurement-rules)
6. [Inventory Rules](#6-inventory-rules)
7. [Production Rules](#7-production-rules)
8. [Quality Rules](#8-quality-rules)
9. [Logistics Rules](#9-logistics-rules)
10. [Finance Rules](#10-finance-rules)

---

## 1. Style & Order Management Rules

### 1.1 Style Management

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| STL-001 | Style must have unique style number | System | Block |
| STL-002 | Style version must be incremented on significant change | System | Auto |
| STL-003 | Style must be linked to buyer | System | Block |
| STL-004 | Style must have product category and type | System | Block |
| STL-005 | Style version history must be maintained | System | Auto |

### 1.2 File Opening

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| FO-001 | File opening must be linked to a Style version | System | Block |
| FO-002 | File opening must have buyer details | System | Block |
| FO-003 | Multiple file openings allowed per style | System | Allow |
| FO-004 | File opening generates unique file number | System | Auto |
| FO-005 | File opening must specify factory | System | Block |

### 1.3 Purchase Order (PO)

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| PO-001 | PO must be linked to a file opening | System | Block |
| PO-002 | Multiple POs allowed per file opening | System | Allow |
| PO-003 | Each PO can have different destination | System | Allow |
| PO-004 | Each PO can have different delivery date | System | Allow |
| PO-005 | PO quantity must be greater than zero | System | Block |
| PO-006 | PO price must be greater than zero | System | Block |
| PO-007 | PO currency must match file opening currency | System | Auto-fill |
| PO-008 | PO delivery date must be at least 30 days from PO date | System | Warning |

### 1.4 PO Status

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| PO-010 | PO status can only move forward | System | Block |
| PO-011 | Cancelled PO cannot be reactivated | System | Block |
| PO-012 | PO can be cancelled only if status is "Open" or "Confirmed" | System | Block |
| PO-013 | PO confirmation requires manager approval | Workflow | Alert |
| PO-014 | Completed PO cannot be modified | System | Block |

### 1.5 PO Amendment

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| PO-020 | Amendment requires reason documentation | Form | Required |
| PO-021 | Quantity reduction >10% requires buyer approval | Workflow | Alert |
| PO-022 | Price change requires commercial approval | Workflow | Alert |
| PO-023 | Delivery date extension >7 days requires director approval | Workflow | Alert |
| PO-024 | All amendments are logged with audit trail | System | Auto |
| PO-025 | Destination change requires commercial approval | Workflow | Alert |

---

## 2. T&A Rules

### 2.1 T&A Generation

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| TA-001 | T&A is auto-generated from confirmed order | System | Auto |
| TA-002 | T&A milestones are calculated from delivery date | System | Auto |
| TA-003 | Critical path must be defined | System | Block |
| TA-004 | Each milestone must have an assigned owner | Form | Required |

### 2.2 T&A Monitoring

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| TA-010 | Alert sent 3 days before milestone due date | System | Email/SMS |
| TA-011 | Alert sent on milestone due date | System | Email/SMS |
| TA-012 | Escalation sent 1 day after missed milestone | System | Alert |
| TA-013 | Critical path delay escalates to Director | Workflow | Alert |
| TA-014 | T&A status updated daily from factory | Integration | Auto |

### 2.3 T&A Modification

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| TA-020 | Milestone date change requires approval | Workflow | Alert |
| TA-021 | Critical path modification requires Director approval | Workflow | Alert |
| TA-022 | All changes logged with reason | System | Auto |

---

## 3. Costing Rules

### 3.1 Cost Calculation

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| CS-001 | Costing must be based on BOM | System | Block |
| CS-002 | Yield must be calculated from BOM | System | Auto |
| CS-003 | Fabric cost = (Consumption × Rate) + Waste% | System | Auto |
| CS-004 | CM cost must be approved by commercial | Workflow | Required |
| CS-005 | Overhead must be allocated per order | System | Auto |

### 3.2 Costing Approval

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| CS-010 | Costing below target price requires Director approval | Workflow | Alert |
| CS-011 | Costing above target price requires MD approval | Workflow | Alert |
| CS-012 | Costing version must be incremented on change | System | Auto |
| CS-013 | Previous costings must be archived | System | Auto |
| CS-014 | Final costing requires commercial sign-off | Workflow | Required |

### 3.3 Yield Rules

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| CS-020 | Fabric yield cannot exceed 100% | System | Block |
| CS-021 | Trim yield must be calculated per piece | System | Auto |
| CS-022 | Waste% must be within buyer-approved limits | System | Warning |
| CS-023 | Yield changes require version update | System | Auto |

### 3.4 Design Costing Price Ladder

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| CS-030 | Discount is applied to the **selling price**, not the base cost | System | Auto |
| CS-031 | Overhead is applied to **total cost** as (origin % + UK %) | System | Auto |
| CS-032 | Base cost = total cost + discount amount + overhead amount | System | Auto |
| CS-033 | Margin = selling price − base cost (can be negative) | System | Auto |
| CS-034 | Landed cost = total cost × exchange rate | System | Auto |
| CS-035 | Ladder is recomputed on every `save()` from source fields | System | Auto |
| CS-036 | PO costing snapshots the ladder fields at `prepare_po_costing` time (frozen, not live-linked) | System | Auto |
| CS-037 | PO-level totals = per-piece ladder × PO quantity | System | Auto |
| CS-038 | PO costing with no ladder set carries only `total_cost` | System | Auto |

---

## 4. Commercial & LC Rules

### 4.1 Master LC

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| LC-001 | Master LC cannot exceed order value | System | Block |
| LC-002 | LC must have valid expiry date | System | Block |
| LC-003 | LC amount must match PI amount | System | Warning |
| LC-004 | LC amendment requires commercial approval | Workflow | Required |
| LC-005 | LC must be received within 15 days of order confirmation | System | Alert |

### 4.2 Back-to-Back LC

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| LC-010 | B2B LC cannot exceed Master LC balance | System | Block |
| LC-011 | B2B LC must reference Master LC | Form | Required |
| LC-012 | B2B LC quantity must be within Master LC tolerance | System | Warning |
| LC-013 | B2B LC expiry must be before Master LC expiry | System | Block |

### 4.3 LC Utilization

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| LC-020 | Utilization calculated from shipment value | System | Auto |
| LC-021 | Over-utilization requires commercial approval | Workflow | Alert |
| LC-022 | Under-utilization alert at 90% expiry | System | Alert |
| LC-023 | LC balance must be reconciled monthly | System | Report |

---

## 5. Procurement Rules

### 5.1 Purchase Order

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| PO-001 | PO must reference approved order | System | Block |
| PO-002 | PO quantity must match requirement | System | Block |
| PO-003 | PO price must match quoted price | System | Warning |
| PO-004 | PO requires commercial approval | Workflow | Required |
| PO-005 | PO must have delivery schedule | Form | Required |

### 5.2 Material Tracking

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| PO-010 | Material received must match PO quantity | System | Warning |
| PO-011 | Material quality must pass inspection | System | Block |
| PO-012 | Returns require reason documentation | Form | Required |
| PO-013 | Shortage must be reported within 24 hours | System | Alert |

---

## 6. Inventory Rules

### 6.1 Goods Receive

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| INV-001 | GR must reference PO | System | Block |
| INV-002 | Quantity must match PO within tolerance | System | Warning |
| INV-003 | Quality must be inspected before receive | System | Block |
| INV-004 | GR triggers stock update | System | Auto |

### 6.2 Goods Issue

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| INV-010 | Issue must have valid requisition | System | Block |
| INV-011 | Issue quantity cannot exceed available stock | System | Block |
| INV-012 | Issue triggers stock update | System | Auto |
| INV-013 | Issue requires manager approval if value > threshold | Workflow | Required |

### 6.3 Virtual Stock

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| INV-020 | Virtual stock allocated against order | System | Auto |
| INV-021 | Allocation cannot exceed available stock | System | Block |
| INV-022 | Reallocation requires approval | Workflow | Required |
| INV-023 | Virtual stock released on order completion/cancellation | System | Auto |

---

## 7. Production Rules

### 7.1 Production Planning

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| PRD-001 | Plan must be based on confirmed order | System | Block |
| PRD-002 | Plan must consider factory capacity | System | Warning |
| PRD-003 | Plan must align with T&A milestones | System | Warning |
| PRD-004 | Plan requires production manager approval | Workflow | Required |

### 7.2 Production Monitoring

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| PRD-010 | Daily production must be reported | System | Required |
| PRD-011 | Efficiency must be calculated daily | System | Auto |
| PRD-012 | DHU must be calculated hourly | System | Auto |
| PRD-013 | Efficiency below threshold triggers alert | System | Alert |
| PRD-014 | Production must match T&A targets | System | Warning |

---

## 8. Quality Rules

### 8.1 Inspection

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| QA-001 | Inspection must follow AQL standards | System | Required |
| QA-002 | Inspection must be done at defined stages | Workflow | Required |
| QA-003 | Failed inspection blocks shipment | System | Block |
| QA-004 | Corrective action required for defects | System | Required |

### 8.2 Compliance

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| QA-010 | Factory compliance must be valid | System | Block |
| QA-011 | Expired compliance blocks new orders | System | Block |
| QA-012 | Compliance renewal tracked | System | Alert |
| QA-013 | Buyer-specific compliance enforced | System | Block |

---

## 9. Logistics Rules

### 9.1 Shipment

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| SHP-001 | Shipment quantity cannot exceed order quantity | System | Block |
| SHP-002 | Shipment must have complete documentation | System | Block |
| SHP-003 | Shipment booking requires commercial approval | Workflow | Required |
| SHP-004 | Shipment must be tracked end-to-end | System | Auto |

### 9.2 Documentation

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| SHP-010 | Packing list must match shipment quantity | System | Block |
| SHP-011 | Invoice must match LC terms | System | Block |
| SHP-012 | BL must be issued within 3 days of shipment | System | Alert |
| SHP-013 | All documents archived | System | Auto |

---

## 10. Finance Rules

### 10.1 Payments

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| FIN-001 | Payment must have valid approval | Workflow | Required |
| FIN-002 | Payment must be reconciled with invoice | System | Block |
| FIN-003 | Payment terms enforced | System | Warning |
| FIN-004 | Late payment alerts generated | System | Alert |

### 10.2 Cost Allocation

| Rule ID | Rule | Validation | Action |
|---------|------|------------|--------|
| FIN-010 | Overhead allocated proportionally | System | Auto |
| FIN-011 | Cost center must be defined | Form | Required |
| FIN-012 | Profitability calculated per order | System | Auto |
| FIN-013 | Monthly reconciliation required | System | Report |

---

*This document should be reviewed and approved by business stakeholders before development.*
