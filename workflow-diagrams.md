# Workflow Diagrams
# BHMS - Buying House Management System

---

## Table of Contents

1. [Order Lifecycle](#1-order-lifecycle)
2. [T&A Process](#2-ta-process)
3. [Costing Workflow](#3-costing-workflow)
4. [Procurement Workflow](#4-procurement-workflow)
5. [Commercial Workflow](#5-commercial-workflow)
6. [Shipment Workflow](#6-shipment-workflow)
7. [Production Workflow](#7-production-workflow)
8. [Approval Workflow](#8-approval-workflow)

---

## 1. Order Lifecycle (Style → File Opening → PO)

```mermaid
flowchart TD
    A[Buyer Inquiry] --> B[Create/Select Style]
    B --> C[Style Versioning]
    C --> D[Style Approval]
    D --> E[Create File Opening]
    E --> F[Link to Style Version]
    F --> G[Create Purchase Order 1]
    G --> H[Create Purchase Order 2]
    G --> I[Create Purchase Order 3]
    H --> J[PO 1: Destination A]
    I --> K[PO 2: Destination B]
    G --> L[PO 3: Destination C]
    J --> M[Costing per PO]
    K --> M
    L --> M
    M --> N{Costing Approved?}
    N -->|No| O[Revise Costing]
    O --> M
    N -->|Yes| P[Confirm POs]
    P --> Q[Generate T&A per PO]
    Q --> R[Sourcing]
    R --> S[Procurement]
    S --> T[Production]
    T --> U[Quality Check]
    U --> V{Passed?}
    V -->|No| W[Rejection/Rework]
    W --> T
    V -->|Yes| X[Shipment]
    X --> Y[Document Preparation]
    Y --> Z[Dispatch]
    Z --> AA[Delivery Confirmation]
    AA --> AB[Invoice & Payment]
    AB --> AC[PO Complete]
```

### Style-Version-File-PO Hierarchy

```mermaid
flowchart TD
    A[Style Master] --> B[Version 1]
    A --> C[Version 2]
    A --> D[Version 3]
    B --> E[File Opening 1]
    B --> F[File Opening 2]
    C --> G[File Opening 3]
    E --> H[PO 1.1]
    E --> I[PO 1.2]
    F --> J[PO 2.1]
    G --> K[PO 3.1]
    G --> L[PO 3.2]
    G --> M[PO 3.3]
    H --> N[Destination: USA]
    I --> O[Destination: UK]
    J --> P[Destination: Germany]
    K --> Q[Destination: France]
    L --> R[Destination: Italy]
    M --> S[Destination: Spain]
```

---

## 2. T&A Process (Per PO)

```mermaid
flowchart TD
    A[PO Confirmed] --> B[Generate T&A]
    B --> C[Set Milestones]
    C --> D[Assign Owners]
    D --> E[Monitor Progress]
    E --> F{On Track?}
    F -->|Yes| G[Continue]
    F -->|No| H[Escalate]
    H --> I[Take Corrective Action]
    I --> E
    G --> J{All Milestones Complete?}
    J -->|No| E
    J -->|Yes| K[T&A Complete]
    K --> L[Ship Ready]
```

### T&A Milestones (Per PO)

```mermaid
flowchart LR
    A[PO Confirmed] --> B[Pattern Making]
    B --> C[Fabric Sourcing]
    C --> D[Sample Development]
    D --> E[Lab Dip Approval]
    E --> F[Bulk Fabric Order]
    F --> G[Trim Sourcing]
    G --> H[Production Planning]
    H --> I[Production Start]
    I --> J[Quality Inspection]
    J --> K[Packing]
    K --> L[Shipment Ready]
```

### T&A Timeline (Multiple POs per Style)

```mermaid
gantt
    title T&A Timeline - Style ABC
    dateFormat  YYYY-MM-DD
    section Style ABC - V1
    Pattern Making        :a1, 2024-01-01, 7d
    Fabric Sourcing       :a2, after a1, 14d
    Sample Development    :a3, after a2, 10d
    section File Opening 1
    PO 1.1 (USA)         :b1, 2024-01-15, 30d
    PO 1.2 (UK)          :b2, 2024-01-20, 35d
    section File Opening 2
    PO 2.1 (Germany)     :c1, 2024-02-01, 25d
```

---

## 3. Costing Workflow

```mermaid
flowchart TD
    A[Style Selected] --> B[Get BOM]
    B --> C[Calculate Fabric Cost]
    C --> D[Calculate Trim Cost]
    D --> E[Calculate CM Cost]
    E --> F[Add Overhead]
    F --> G[Calculate Total]
    G --> H[Add Margin]
    H --> I{Within Target?}
    I -->|Yes| J[Submit for Approval]
    I -->|No| K[Revise Costing]
    K --> L[Negotiate with Factory]
    L --> M{Revised Accepted?}
    M -->|No| K
    M -->|Yes| J
    J --> N{Approved?}
    N -->|No| O[Return for Revision]
    O --> K
    N -->|Yes| P[Costing Finalized]
    P --> Q[Version Locked]
```

---

## 4. Procurement Workflow

```mermaid
flowchart TD
    A[Material Requirement] --> B[Create PR]
    B --> C[Send RFQ to Vendors]
    C --> D[Receive Quotes]
    D --> E[Compare Quotes]
    E --> F[Select Vendor]
    F --> G[Create PO]
    G --> H[PO Approval]
    H --> I[Send to Vendor]
    I --> J[Track Delivery]
    J --> K{Received?}
    K -->|No| J
    K -->|Yes| L[Quality Check]
    L --> M{Passed?}
    M -->|No| N[Return/Reject]
    M -->|Yes| O[Goods Receive]
    O --> P[Update Stock]
```

---

## 5. Commercial Workflow

```mermaid
flowchart TD
    A[Order Confirmed] --> B[Create PI]
    B --> C[Send to Buyer]
    C --> D[Buyer Confirms]
    D --> E[Receive Master LC]
    E --> F{LC Matches PI?}
    F -->|No| G[Request Amendment]
    G --> E
    F -->|Yes| H[Accept LC]
    H --> I[Create B2B LC]
    I --> J[Send to Vendor]
    J --> K[Track Utilization]
    K --> L{Fully Utilized?}
    L -->|No| K
    L -->|Yes| M[LC Complete]
    M --> N[Reconcile]
```

---

## 6. Shipment Workflow

```mermaid
flowchart TD
    A[Order Ready] --> B[Booking Request]
    B --> C[Select Freight Forwarder]
    C --> D[Confirm Booking]
    D --> E[Prepare Documents]
    E --> F[Packing List]
    F --> G[Commercial Invoice]
    G --> H[Other Documents]
    H --> I[Factory Loading]
    I --> J[Container Stuffing]
    J --> K[Gate In]
    K --> L[Vessel Loading]
    L --> M[ETD Confirmed]
    M --> N[Track Shipment]
    N --> O{ETA Reached?}
    O -->|No| N
    O -->|Yes| P[Port Arrival]
    P --> Q[Customs Clearance]
    Q --> R[Delivery]
```

---

## 7. Production Workflow

```mermaid
flowchart TD
    A[Production Plan] --> B[Line Assignment]
    B --> C[Cutting]
    C --> D[Sewing]
    D --> E[Finishing]
    E --> F[Quality Check]
    F --> G{Passed?}
    G -->|No| H[Defect Marking]
    H --> I[Repair/Rework]
    I --> F
    G -->|Yes| J[Pressing/Ironing]
    J --> K[Labeling]
    K --> L[Packing]
    L --> M[Final Inspection]
    M --> N{AQL Passed?}
    N -->|No| O[Re-inspection]
    O --> M
    N -->|Yes| P[Ready for Shipment]
```

### Daily Production Reporting

```mermaid
flowchart TD
    A[Start of Day] --> B[Line Setup]
    B --> C[Production Starts]
    C --> D[Hourly Count]
    D --> E[Calculate Efficiency]
    E --> F{Efficiency OK?}
    F -->|No| G[Identify Issues]
    G --> H[Take Action]
    H --> D
    F -->|Yes| D
    D --> I[End of Day]
    I --> J[Daily Report]
    J --> K[Update Dashboard]
```

---

## 8. Approval Workflow

```mermaid
flowchart TD
    A[Request Submitted] --> B{Level 1 Approval}
    B -->|Approved| C{Level 2 Required?}
    B -->|Rejected| D[Return with Comments]
    C -->|No| E[Approved]
    C -->|Yes| F{Level 2 Approval}
    F -->|Approved| G{Level 3 Required?}
    F -->|Rejected| D
    G -->|No| E
    G -->|Yes| H{Level 3 Approval}
    H -->|Approved| E
    H -->|Rejected| D
    D --> I[Revise & Resubmit]
    I --> A
```

### Approval Matrix

```mermaid
flowchart LR
    subgraph "Approval Levels"
        A[Merchandiser] -->|Submit| B[Merchandising Manager]
        B -->|Approve| C[Merchandising Director]
        C -->|Approve| D[Commercial Director]
        D -->|Approve| E[MD/CEO]
    end
```

---

## 9. Quality Inspection Flow

```mermaid
flowchart TD
    A[Inspection Requested] --> B[Schedule Inspection]
    B --> C[Select Sample]
    C --> D[Inspect Items]
    D --> E[Record Defects]
    E --> F[Calculate AQL]
    F --> G{Pass?}
    G -->|Yes| H[Issue Pass Certificate]
    H --> I[Proceed to Next Stage]
    G -->|No| J[Issue Fail Report]
    J --> K[Corrective Action Required]
    K --> L[Factory Implements Fix]
    L --> M[Re-inspection]
    M --> D
```

---

## 10. Document Flow

```mermaid
flowchart TD
    A[Order] --> B[PI]
    A --> C[LC]
    A --> D[PO]
    B --> E[Buyer Confirmation]
    C --> F[Bank Acceptance]
    D --> G[Vendor Acknowledgment]
    E --> H[Production Start]
    F --> H
    G --> H
    H --> I[Packing List]
    H --> J[Invoice]
    H --> K[BL]
    H --> L[Certificate]
    I --> M[Shipment]
    J --> M
    K --> M
    L --> M
    M --> N[Document Set Complete]
    N --> O[Bank Submission]
    O --> P[Payment Received]
```

---

*These diagrams should be reviewed by Business Analyst and Solution Architect before implementation.*
