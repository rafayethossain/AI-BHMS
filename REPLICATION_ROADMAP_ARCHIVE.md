# the target buying-house reference Replication Roadmap

**Project:** AI-BHMS (AI-Buying House Management System)
**Objective:** 100% replicate the target buying-house reference reference solution features
**Client Feedback Date:** August 27, 2026
**Status:** PLANNING

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Reference Solution Analysis](#2-reference-solution-analysis)
3. [Gap Analysis: Current BHMS vs target](#3-gap-analysis)
4. [Excel Library Recommendation](#4-excel-library-recommendation)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [Phase 1: Design Sheet](#6-phase-1-design-sheet)
7. [Phase 2: Costing]( #7-phase-2-costing)
8. [Phase 3: PO Confirmation](#8-phase-3-po-confirmation)
9. [Phase 4: Booking](#9-phase-4-booking)
10. [Technical Architecture](#10-technical-architecture)
11. [UI/UX Behavior (target-Specific)](#11-uiux-behavior-target-specific)
12. [Print & Export System](#12-print--export-system)
13. [Search & Filter System](#13-search--filter-system)
14. [Business Rules Engine](#14-business-rules-engine)
15. [Risk Management System](#15-risk-management-system)
16. [Scheduling System](#16-scheduling-system)
17. [Reconciliation System](#17-reconciliation-system)
18. [Repeat & Split Orders](#18-repeat--split-orders)
19. [Stock Fabric](#19-stock-fabric)
20. [Audit Trail](#20-audit-trail)
21. [Risk Assessment](#21-risk-assessment)
22. [Appendix A: target Terminology Mapping](#appendix-a-target-terminology-mapping)
23. [Appendix B: Complete Feature Checklist](#appendix-b-complete-feature-checklist)
24. [Appendix C: Database Migration Plan](#appendix-c-database-migration-plan)
25. [Appendix D: Testing Strategy](#appendix-d-testing-strategy)
26. [Appendix E: Tech Pack Connection Plan](#appendix-e-tech-pack-connection-plan)

---

## 1. Executive Summary

### Client Requirement
The client wants to replicate the **the target buying-house reference** system used by Carmel Clothing (UK-based buying house). The system is Excel-centric and serves as the backbone for:
- Design management
- Costing preparation
- Order management (File Numbers/FN)
- Material booking (Fabric, Trims, Labels)
- Production tracking
- Risk management

### Key Insight
> "The system should feel like Excel-based interfaces but more than Excel. Most clients are used to Excel-based systems, so a drastic change would be problematic."

### Workflow Priority
1. **Design Sheet** → Upload, Create, Print
2. **Costing** → Preparation, Approval, Export
3. **PO Confirmation** → Order Creation, Breakdown
4. **Booking** → Fabric, Trims, Labels

### Comprehensive Coverage
This roadmap now covers **286 features** across 7 implementation phases, addressing all gaps identified in the target manual analysis. The previous version covered only ~7% of target functionality; this update brings coverage to **100%**.

---

## 2. Reference Solution Analysis

### 2.1 Files Analyzed

| File | Type | Purpose |
|------|------|---------|
| `Target Manual 19-01-21.docx` | Word Doc | Complete target system manual (797 paragraphs) |
| `20830-B.xlsx` | Excel | Cost Report with 3 sheets (Costing, Label, Trims & Lining) |
| `Fabric booking format.xls` | Excel | Fabric booking order template |
| `trims booking format.xlsx` | Excel | Trims and accessories booking template |
| `file BD CMPT update 14-08.xlsx` | Excel | CMPT (Cut Make Pack Trim) summary with 4 sheets |

### 2.2 target System Architecture

```
the target buying-house reference
├── Design Tab
│   ├── Style Creation (unique style code)
│   ├── Design Sheet (sketches, annotations)
│   ├── Sample Photos
│   ├── Sample Spec (Dev Spec, Fit Specs)
│   ├── Design Costings (multiple versions)
│   ├── Job Requests (patterns, samples)
│   ├── Other Photos
│   └── File Share (virtual folder)
│
├── Order Tab (File Numbers - FN)
│   ├── Order Details
│   ├── Costing Tab (from Design Costing)
│   ├── Breakdown Tab (hits, colors, quantities)
│   ├── Fabric Tab (Prime + additional fabrics)
│   ├── Trims Tab
│   ├── Label Tab
│   ├── Technical Tab (fits, sealing)
│   └── Notes
│
├── Reports
│   ├── Booking Schedule
│   ├── Fabric Schedule
│   ├── Order Manager
│   └── Custom Reports
│
└── Risk Assessment
    ├── Fabric Risk (Green/Amber/Yellow/Red)
    ├── Trims Risk
    ├── Label Risk
    └── Technical Risk
```

### 2.3 Key target Features to Replicate

#### Design Management
- **Style Creation**: Unique style code generation
- **Design Sheet**: Sketch upload, annotations, text boxes
- **Multiple Images**: Main design image, range photo, sample photos
- **Fit Specifications**: Dev Spec, multiple fit iterations (1st fit, 2nd fit...)
- **Block References**: Reusable pattern blocks
- **Job Requests**: Pattern, sample, 3D requests

#### Costing System
- **Multiple Costing Versions**: Design costing, order costing
- **8 Cost Categories**: Fabric, Trims, Labels, CMPT, etc.
- **Cost Sheets**: Sri Lankan, Vietnamese, Bangladesh variants
- **Risk Rating**: Per-item risk assessment
- **Consumption Calculation**: Based on size/width/ratio
- **Budget vs Actual**: Cost tracking

#### Order Management
- **File Number (FN)**: Unique order identifier (e.g., 20830-B)
- **Status Workflow**: New → Available → Live → In Work → Delivered
- **Breakdown Tab**: Hits, colors, quantities, delivery dates
- **Box/Hanging**: Delivery method tracking
- **Repeat Orders**: Copy from existing FN

#### Booking System
- **Fabric Booking**: Supplier, mill, description, composition, weight, width
- **Trims Booking**: Item, type, code, color, supplier, quantity, price
- **Label Booking**: Print type, description, location, supplier, quantities
- **Status Tracking**: TBC → Confirmed → Completed
- **Date Management**: Order date, ETA, actual date

#### Risk Assessment
- **4 Risk Areas**: Fabric, Trims, Labels, Technical
- **Color Coding**: Green (low), Amber (medium), Yellow (flag), Red (critical)
- **Overall Risk**: Highest individual risk determines overall

#### Reporting
- **Booking Schedule**: Weekly planning view
- **Fabric Schedule**: Fabric tracking
- **Order Manager**: Order summary view
- **Export to Excel**: All reports exportable
- **Selective Printing**: Print specific items or all

---

## 3. Gap Analysis

### 3.1 Current BHMS Features vs target Requirements

| Feature | Current BHMS | target Reference | Gap |
|---------|-------------|--------------|-----|
| **Design Management** | Basic styles with sketches | Full design sheet with annotations, fit specs, job requests | MAJOR |
| **Costing** | Basic BOM/Costing | Multi-version costing, 8 categories, risk rating | MAJOR |
| **Order Management** | PO-based | FN-based with breakdown tabs | MAJOR |
| **Booking** | Basic shipment | Fabric/Trims/Labels booking with status | MAJOR |
| **Risk Assessment** | None | 4-area risk with color coding | NEW |
| **Excel-like Interface** | Standard forms | Spreadsheet-style grids | MAJOR |
| **Print System** | Basic | Selective printing, print preview | MODERATE |
| **File Sharing** | None | Virtual folder per style/FN | NEW |
| **Job Requests** | None | Pattern/sample request queue | NEW |

### 3.2 Critical Differences

1. **Data Model**: target uses File Numbers (FN) tied to Styles; BHMS uses POs
2. **Interface**: target is spreadsheet-heavy; BHMS is form-based
3. **Workflow**: target has linear progression; BHMS is modular
4. **Risk Management**: target has integrated risk; BHMS has none
5. **Reporting**: target focuses on booking schedules; BHMS on dashboards

---

## 4. Excel Library Recommendation

### 4.1 Options Evaluated

| Library | Size | Features | React 19 | Excel I/O | Formulas | Maturity | Verdict |
|---------|------|----------|----------|-----------|----------|----------|---------|
| **Tabulator** | ~300KB | Virtual scroll, Excel I/O, multi-sheet, grouping | ✅ | ✅ (SheetJS) | Column calcs | 10+ years | **RECOMMENDED** |
| `@polycyphers/spreadsheet` | ~500KB | Virtual scroll, Excel I/O, formulas, multi-sheet | ✅ | ✅ (ExcelJS) | 70+ functions | Newer | Good alternative |
| `OGrid` | 44-61KB gzip | Sorting, filtering, editing, formulas | ✅ | Via plugin | 159 | Newer | Good alternative |

### 4.2 Recommendation: Tabulator

**Why Tabulator?**
1. **Mature & Battle-tested**: 10+ years, 170K+ weekly downloads
2. **Zero Dependencies**: Core library has no external deps
3. **React Support**: `react-tabulator` wrapper available
4. **Spreadsheet Mode**: Multi-sheet tabs built-in
5. **Excel Import/Export**: Via SheetJS library
6. **Virtual DOM**: Handles large datasets efficiently
7. **Clipboard**: Copy/paste like Excel
8. **History**: Undo/redo built-in
9. **Print Styling**: Custom print layouts
10. **Grouping**: Group rows by any field
11. **Context Menus**: Right-click menus
12. **Input Validation**: Validate before saving
13. **Row Selection**: Single/multi-row selection
14. **Touch Support**: Mobile-friendly
15. **MIT License**: Free for commercial use

**Key Architecture Decision:**
Calculations (formulas) are handled in the **Django backend**. The frontend displays calculated results. This is simpler, more maintainable, and matches the target reference workflow.

**Installation:**
```bash
npm install tabulator-tables react-tabulator
```

**Usage Example:**
```tsx
import { ReactTabulator } from 'react-tabulator';
import 'tabulator-tables/dist/css/tabulator.min.css';
import 'react-tabulator/lib/styles.css';

const designSheetColumns = [
  { title: "Type", field: "type", editor: "input" },
  { title: "Name", field: "name", editor: "input" },
  { title: "Rating", field: "rating", editor: "input" },
  { title: "Price", field: "price", editor: "input", formatter: "money" },
  { title: "Total", field: "total", formatter: "money", bottomCalc: "sum" },
];

function DesignSheet({ data, onCellEdited }) {
  return (
    <ReactTabulator
      data={data}
      columns={designSheetColumns}
      layout="fitColumns"
      reactiveData={true}
      cellEdited={(cell) => onCellEdited(cell.getData())}
    />
  );
}
```

**Dependencies (for Excel I/O):**
```bash
npm install xlsx  # SheetJS for Excel import/export
```

---

## 5. Implementation Roadmap

### 5.1 Phase Overview

```
Phase 1: Foundation & Grid System (Weeks 1-4)
    ↓
Phase 2: Design Management (Weeks 5-10)
    ↓
Phase 3: Costing System (Weeks 11-16)
    ↓
Phase 4: Order Management (Weeks 17-22)
    ↓
Phase 5: Material Booking (Weeks 23-28)
    ↓
Phase 6: Scheduling & Reports (Weeks 29-34)
    ↓
Phase 7: Integration & Polish (Weeks 35-40)
```

### 5.2 Detailed Timeline

| Phase | Duration | Deliverables | Priority |
|-------|----------|--------------|----------|
| **Phase 1** | 4 weeks | Tabulator grid, context menus, search, grouping, print system | CRITICAL |
| **Phase 2** | 6 weeks | Design sheet, images, fit specs, job requests, file share | HIGH |
| **Phase 3** | 6 weeks | Multi-version costing, 8 categories, risk rating, tolerances | HIGH |
| **Phase 4** | 6 weeks | FN system, breakdown, status workflow, repeat/split orders | HIGH |
| **Phase 5** | 6 weeks | Fabric/Trims/Labels booking, copy functions, risk progression | HIGH |
| **Phase 6** | 6 weeks | Booking schedule, fabric schedule, order manager, reports | MEDIUM |
| **Phase 7** | 6 weeks | Integration, testing, audit trail, stock fabric, polish | MEDIUM |

---

## 6. Phase 1: Design Sheet

### 6.0 Tech Pack Connection (ALREADY IMPLEMENTED)

**Existing Pipeline:**
```
Buyer PDF (CCL Design Sheet)
    │
    ▼  [POST /styles/techpack/extract/]
StyleTechPackParser.parse()          ← pdfplumber, 433 lines
    │
    ▼
TechPackDocument (DTO)
    ├── design_info: 14 header fields
    └── bom_rows: 8 columns each
    │
    ▼  [StyleTechPack created]
    │
    ▼  [write_techpack_workbook()]
    │
.xlsx workbook (Design Information + BOM sheets)
    │
    ▼  [User edits in Excel]
    │
    ▼  [POST /styles/techpack/import/]
parse_techpack_workbook()            ← openpyxl, 203 lines
    │
    ▼
import_style_from_techpack()         ← atomic transaction
    │
    ▼
Style + StyleVersion + StyleItems + BOM + BOMItems
```

**What's Complete:**
| Component | File | Lines | Tests |
|-----------|------|-------|-------|
| PDF Parser | `techpack/pdf_parser.py` | 433 | ~20 |
| Excel Export | `techpack/excel_export.py` | 159 | ~16 |
| Excel Import | `techpack/excel_import.py` | 203 | ~18 |
| Import Service | `techpack/import_service.py` | 158 | - |
| StyleTechPack Model | `merchandising/models.py:867-955` | 89 | ~19 |
| BOMItem Fields | `merchandising/models.py:557-560` | 4 | ~8 |
| API Endpoints | `merchandising/views.py:190-310` | 120 | ~28 |
| Frontend Wizard | `TechPackImportWizardPage.tsx` | 259 | - |
| **TOTAL** | | **~1,425** | **~110** |

**What Needs Connection (Phase 2):**
1. Design Sheet view (standalone page)
2. Image/sketch upload
3. Fit specifications
4. Job requests
5. Status workflow
6. Notes with initials/date
7. Tabulator grid for material breakdown
8. Print template

**Connection Plan:** See `DESIGN_SHEET_CONNECTION_PLAN.md`

### 6.1 Objectives
- Create Design Sheet with Excel-like interface
- Enable style creation with unique codes
- Support image upload and annotations
- Implement fit specifications
- Add print functionality

### 6.2 Backend Changes

#### New Models
```python
# apps/merchandising/models.py

class DesignSheet(models.Model):
    """Design sheet for style development"""
    style = models.OneToOneField(Style, on_delete=models.CASCADE, related_name='design_sheet')
    block_reference = models.CharField(max_length=100, blank=True)
    garment_type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    issuer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    designer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='designed_styles')
    season = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class DesignImage(models.Model):
    """Images attached to design sheet"""
    design_sheet = models.ForeignKey(DesignSheet, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='designs/')
    image_type = models.CharField(max_length=20, choices=[
        ('MAIN', 'Main Design'),
        ('RANGE', 'Range Photo'),
        ('SAMPLE', 'Sample Photo'),
        ('FIT', 'Fit Image'),
    ])
    caption = models.CharField(max_length=200, blank=True)
    is_main = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

class FitSpecification(models.Model):
    """Fit specification for design"""
    design_sheet = models.ForeignKey(DesignSheet, on_delete=models.CASCADE, related_name='fit_specs')
    fit_number = models.CharField(max_length=50)  # e.g., "1st Fit", "2nd Fit"
    fit_date = models.DateField()
    description = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    is_selected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class FitImage(models.Model):
    """Images for fit specification"""
    fit_spec = models.ForeignKey(FitSpecification, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='fits/')
    caption = models.CharField(max_length=200, blank=True)

class JobRequest(models.Model):
    """Job requests for patterns, samples"""
    design_sheet = models.ForeignKey(DesignSheet, on_delete=models.CASCADE, related_name='job_requests')
    job_type = models.CharField(max_length=50, choices=[
        ('NEW_PATTERN', 'New Pattern'),
        ('TECH_SAMPLE', 'Technical Sample'),
        ('FIT_SAMPLE', 'Fit Sample'),
        ('MINI_MARKER', 'Mini Marker'),
        ('3D', '3D Sample'),
    ])
    required_by = models.DateField()
    work_location = models.CharField(max_length=100, blank=True)
    no_of_garments = models.IntegerField(default=1)
    allocated_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=[
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    ], default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
```

### 6.3 Frontend Components

#### New Pages
```
frontend/src/pages/
├── DesignSheetPage.tsx          # Main design sheet view
├── DesignListPage.tsx           # List of all designs
├── FitSpecPage.tsx              # Fit specification management
├── JobRequestPage.tsx           # Job request queue
└── DesignPrintPage.tsx          # Print preview
```

#### New Components
```
frontend/src/components/
├── SpreadsheetGrid.tsx          # Excel-like grid wrapper
├── DesignSheetEditor.tsx        # Design sheet spreadsheet
├── ImageUploader.tsx            # Image upload with drag-drop
├── AnnotationOverlay.tsx        # Image annotations
├── FitSpecTabs.tsx              # Tabbed fit specifications
└── PrintPreview.tsx             # Print preview component
```

### 6.4 API Endpoints

```python
# apps/merchandising/urls.py

urlpatterns = [
    # Design Sheet
    path('design-sheets/', DesignSheetListCreateView.as_view()),
    path('design-sheets/<int:pk>/', DesignSheetDetailView.as_view()),
    path('design-sheets/<int:pk>/images/', DesignImageListCreateView.as_view()),
    path('design-sheets/<int:pk>/fit-specs/', FitSpecListCreateView.as_view()),
    path('design-sheets/<int:pk>/job-requests/', JobRequestListCreateView.as_view()),
    
    # Style Code Generation
    path('styles/generate-code/', StyleCodeGenerateView.as_view()),
    
    # Print
    path('design-sheets/<int:pk>/print/', DesignSheetPrintView.as_view()),
]
```

### 6.5 Acceptance Criteria

- [ ] User can create new style with auto-generated code
- [ ] Design sheet displays in Excel-like grid format
- [ ] User can upload multiple images (main, range, sample)
- [ ] User can add annotations to images
- [ ] User can create multiple fit specifications
- [ ] User can request jobs (pattern, sample)
- [ ] User can print design sheet with selective content
- [ ] User can export design sheet to Excel

---

## 7. Phase 2: Costing

### 7.1 Objectives
- Implement multi-version costing system
- Support 8 cost categories
- Enable risk rating per item
- Add budget vs actual tracking
- Support multiple cost sheet variants

### 7.2 Backend Changes

#### New Models
```python
# apps/merchandising/models.py

class CostSheet(models.Model):
    """Costing sheet for design/order"""
    design_sheet = models.ForeignKey(DesignSheet, on_delete=models.CASCADE, related_name='cost_sheets')
    version = models.CharField(max_length=50)  # e.g., "1st Costing", "2nd Costing"
    sheet_type = models.CharField(max_length=50, choices=[
        ('DESIGN', 'Design Costing'),
        ('ORDER', 'Order Costing'),
    ])
    country_variant = models.CharField(max_length=50, choices=[
        ('BD', 'Bangladesh'),
        ('SL', 'Sri Lanka'),
        ('VN', 'Vietnam'),
        ('CN', 'China'),
    ])
    make_price = models.DecimalField(max_digits=10, decimal_places=2)
    contract_selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, default=1)
    is_confirmed = models.BooleanField(default=False)
    is_selected = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class CostItem(models.Model):
    """Individual cost line item"""
    cost_sheet = models.ForeignKey(CostSheet, on_delete=models.CASCADE, related_name='items')
    category = models.CharField(max_length=50, choices=[
        ('FABRIC', 'Fabric'),
        ('TRIMS', 'Trims'),
        ('LABELS', 'Labels'),
        ('LINING', 'Lining'),
        ('INTERFACING', 'Interfacing'),
        ('CMPT', 'Cut Make Pack Trim'),
        ('OTHER', 'Other'),
        ('OVERHEAD', 'Overhead'),
    ])
    item_type = models.CharField(max_length=50)  # e.g., "Cloth", "Trims", "Other"
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=200, blank=True)
    rating = models.DecimalField(max_digits=10, decimal_places=2)  # Consumption
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    budgeted_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    actual_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    risk_rating = models.CharField(max_length=20, choices=[
        ('NONE', 'No Color'),
        ('GREEN', 'Green'),
        ('AMBER', 'Amber'),
        ('YELLOW', 'Yellow'),
        ('RED', 'Red'),
    ], default='NONE')
    notes = models.TextField(blank=True)
    order = models.IntegerField(default=0)

class CostSummary(models.Model):
    """Cost summary calculations"""
    cost_sheet = models.OneToOneField(CostSheet, on_delete=models.CASCADE, related_name='summary')
    fabric_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    trims_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    labels_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cmpt_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    profit_loss = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    profit_loss_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
```

### 7.3 Frontend Components

#### New Pages
```
frontend/src/pages/
├── CostSheetPage.tsx             # Main costing spreadsheet
├── CostSheetListPage.tsx         # List of cost sheets
├── CostComparisonPage.tsx        # Compare cost versions
└── CostPrintPage.tsx             # Print cost sheet
```

### 7.4 API Endpoints

```python
urlpatterns = [
    # Cost Sheets
    path('cost-sheets/', CostSheetListCreateView.as_view()),
    path('cost-sheets/<int:pk>/', CostSheetDetailView.as_view()),
    path('cost-sheets/<int:pk>/items/', CostItemListCreateView.as_view()),
    path('cost-sheets/<int:pk>/summary/', CostSummaryView.as_view()),
    path('cost-sheets/<int:pk>/approve/', CostSheetApproveView.as_view()),
    
    # Cost Comparison
    path('designs/<int:pk>/cost-comparison/', CostComparisonView.as_view()),
]
```

### 7.5 Acceptance Criteria

- [ ] User can create multiple costing versions
- [ ] Cost sheet displays in Excel-like grid
- [ ] User can add items with 8 categories
- [ ] System calculates totals automatically
- [ ] User can set risk rating per item
- [ ] User can compare cost versions side-by-side
- [ ] User can approve/reject costing
- [ ] User can export cost sheet to Excel
- [ ] User can print cost sheet

---

## 8. Phase 3: PO Confirmation

### 8.1 Objectives
- Implement File Number (FN) system
- Create order with breakdown tabs
- Link to design sheet and costing
- Add status workflow

### 8.2 Backend Changes

#### New Models
```python
# apps/merchandising/models.py

class FileNumber(models.Model):
    """File Number (FN) - Order identifier"""
    file_number = models.CharField(max_length=20, unique=True)  # e.g., "20830-B"
    style = models.ForeignKey(Style, on_delete=models.CASCADE, related_name='file_numbers')
    customer = models.ForeignKey('setup.Buyer', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=[
        ('NEW', 'New'),
        ('AVAILABLE', 'Available'),
        ('LIVE', 'Live'),
        ('IN_WORK', 'In Work'),
        ('DELIVERED', 'Delivered'),
        ('HOLD', 'Hold'),
        ('CANCELLED', 'Cancelled'),
        ('ARCHIVED', 'Archived'),
    ], default='NEW')
    origin = models.CharField(max_length=5, choices=[
        ('UK', 'UK'),
        ('EU', 'EU'),
    ])
    completed_date = models.DateField(null=True, blank=True)
    actual_completed_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class OrderBreakdown(models.Model):
    """Order breakdown (hits, colors, quantities)"""
    file_number = models.ForeignKey(FileNumber, on_delete=models.CASCADE, related_name='breakdowns')
    hit_number = models.IntegerField()
    color = models.CharField(max_length=100)
    po_number = models.CharField(max_length=100, blank=True)
    customer_style = models.CharField(max_length=100, blank=True)
    box_or_hanging = models.CharField(max_length=20, choices=[
        ('BOX', 'Boxed'),
        ('HANGING', 'Hanging'),
    ])
    quantity = models.IntegerField()
    delivery_date = models.DateField()
    delivery_type = models.CharField(max_length=20, choices=[
        ('SEA', 'Sea'),
        ('AIR', 'Air'),
        ('AIR_FREIGHT', 'Air Freight Prepaid'),
        ('AIR_COLLECT', 'Air Freight Collect'),
    ], default='SEA')
    factory = models.ForeignKey('setup.Factory', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('LIVE', 'Live'),
        ('IN_WORK', 'In Work'),
        ('DELIVERED', 'Delivered'),
    ], default='LIVE')

class OrderCosting(models.Model):
    """Costing linked to order"""
    file_number = models.OneToOneField(FileNumber, on_delete=models.CASCADE, related_name='order_costing')
    cost_sheet = models.ForeignKey(CostSheet, on_delete=models.CASCADE)
    make_price = models.DecimalField(max_digits=10, decimal_places=2)
    contract_selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_confirmed = models.BooleanField(default=False)
```

### 8.3 Frontend Components

#### New Pages
```
frontend/src/pages/
├── OrderListPage.tsx             # List of all orders (FN)
├── OrderDetailPage.tsx           # Order detail with tabs
├── OrderBreakdownPage.tsx        # Breakdown spreadsheet
├── OrderCreatePage.tsx           # Create new order
└── OrderPrintPage.tsx            # Print order
```

### 8.4 API Endpoints

```python
urlpatterns = [
    # File Numbers
    path('file-numbers/', FileNumberListCreateView.as_view()),
    path('file-numbers/<int:pk>/', FileNumberDetailView.as_view()),
    path('file-numbers/<int:pk>/breakdowns/', OrderBreakdownListCreateView.as_view()),
    path('file-numbers/<int:pk>/costing/', OrderCostingView.as_view()),
    path('file-numbers/<int:pk>/status/', OrderStatusUpdateView.as_view()),
    
    # Order Creation
    path('orders/create-from-design/', OrderCreateFromDesignView.as_view()),
    path('orders/create-repeat/', OrderCreateRepeatView.as_view()),
]
```

### 8.5 Acceptance Criteria

- [ ] System generates unique File Number (FN)
- [ ] User can create order from design sheet
- [ ] Order shows breakdown with hits/colors/quantities
- [ ] User can update order status workflow
- [ ] User can create repeat orders
- [ ] Order links to design sheet and costing
- [ ] User can print order summary

---

## 9. Phase 4: Booking

### 9.1 Objectives
- Implement Fabric booking
- Implement Trims booking
- Implement Labels booking
- Add status tracking
- Support Excel-like interface

### 9.2 Backend Changes

#### New Models
```python
# apps/merchandising/models.py

class FabricBooking(models.Model):
    """Fabric booking for order"""
    file_number = models.ForeignKey(FileNumber, on_delete=models.CASCADE, related_name='fabric_bookings')
    tab_name = models.CharField(max_length=100, default='Prime')  # Prime, 2nd Hit, etc.
    color_ref = models.CharField(max_length=100, blank=True)  # Orders Colour Ref
    supplier = models.ForeignKey('setup.Supplier', on_delete=models.SET_NULL, null=True)
    mill = models.CharField(max_length=200, blank=True)
    description = models.CharField(max_length=200)
    color = models.CharField(max_length=100)
    composition = models.CharField(max_length=200, blank=True)
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cuttable_width = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    order_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    delivered_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lab_dip_required_date = models.DateField(null=True, blank=True)
    lab_dip_actual_date = models.DateField(null=True, blank=True)
    lab_dip_approved = models.BooleanField(default=False)
    onboard_date = models.DateField(null=True, blank=True)
    eta_date = models.DateField(null=True, blank=True)
    actual_arrival_date = models.DateField(null=True, blank=True)
    bulk_approved = models.BooleanField(default=False)
    bulk_approval_date = models.DateField(null=True, blank=True)
    consumption = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    factory_allocation = models.ForeignKey('setup.Factory', on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('TBC', 'TBC'),
        ('CONFIRMED', 'Confirmed'),
        ('COMPLETED', 'Completed'),
    ], default='TBC')
    risk_rating = models.CharField(max_length=20, choices=[
        ('NONE', 'No Color'),
        ('GREEN', 'Green'),
        ('AMBER', 'Amber'),
        ('YELLOW', 'Yellow'),
        ('RED', 'Red'),
    ], default='NONE')
    notes = models.TextField(blank=True)
    defect_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    defect_notes = models.TextField(blank=True)

class TrimsBooking(models.Model):
    """Trims booking for order"""
    file_number = models.ForeignKey(FileNumber, on_delete=models.CASCADE, related_name='trims_bookings')
    item_description = models.CharField(max_length=200)
    item_type = models.CharField(max_length=50, choices=[
        ('TRIMS', 'Trims'),
        ('LINING', 'Lining'),
        ('INTERFACING', 'Interfacing'),
        ('MONTRIMS', 'Montrims'),
    ])
    code = models.CharField(max_length=100, blank=True)
    color = models.CharField(max_length=100)
    supplier = models.ForeignKey('setup.Supplier', on_delete=models.SET_NULL, null=True)
    ratio = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    quantity = models.IntegerField()
    delivered_quantity = models.IntegerField(default=0)
    stock_quantity = models.IntegerField(default=0)
    order_date = models.DateField(null=True, blank=True)
    eta_date = models.DateField(null=True, blank=True)
    actual_date = models.DateField(null=True, blank=True)
    confirmed = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=[
        ('TBC', 'TBC'),
        ('CONFIRMED', 'Confirmed'),
        ('COMPLETED', 'Completed'),
    ], default='TBC')
    risk_rating = models.CharField(max_length=20, choices=[
        ('NONE', 'No Color'),
        ('GREEN', 'Green'),
        ('AMBER', 'Amber'),
        ('YELLOW', 'Yellow'),
        ('RED', 'Red'),
    ], default='NONE')
    notes = models.TextField(blank=True)
    location_on_garment = models.CharField(max_length=200, blank=True)

class LabelBooking(models.Model):
    """Label booking for order"""
    file_number = models.ForeignKey(FileNumber, on_delete=models.CASCADE, related_name='label_bookings')
    print_type = models.CharField(max_length=50)  # MAIN LABEL, CARE LABEL, etc.
    description = models.CharField(max_length=200)
    location_on_garment = models.CharField(max_length=200, blank=True)
    ref = models.CharField(max_length=100, blank=True)
    colour = models.CharField(max_length=100, blank=True)
    supplier = models.ForeignKey('setup.Supplier', on_delete=models.SET_NULL, null=True)
    quantity = models.IntegerField()
    delivered_quantity = models.IntegerField(default=0)
    stock_quantity = models.IntegerField(default=0)
    ordered_quantity = models.IntegerField(default=0)
    eta_date = models.DateField(null=True, blank=True)
    actual_date = models.DateField(null=True, blank=True)
    confirmed = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=[
        ('TBC', 'TBC'),
        ('CONFIRMED', 'Confirmed'),
        ('COMPLETED', 'Completed'),
    ], default='TBC')
    risk_rating = models.CharField(max_length=20, choices=[
        ('NONE', 'No Color'),
        ('GREEN', 'Green'),
        ('AMBER', 'Amber'),
        ('YELLOW', 'Yellow'),
        ('RED', 'Red'),
    ], default='NONE')
    notes = models.TextField(blank=True)
    invoice_reference = models.CharField(max_length=200, blank=True)
```

### 9.3 Frontend Components

#### New Pages
```
frontend/src/pages/
├── FabricBookingPage.tsx         # Fabric booking spreadsheet
├── TrimsBookingPage.tsx          # Trims booking spreadsheet
├── LabelBookingPage.tsx          # Label booking spreadsheet
├── BookingSchedulePage.tsx       # Booking schedule view
└── BookingPrintPage.tsx          # Print booking
```

### 9.4 API Endpoints

```python
urlpatterns = [
    # Fabric Booking
    path('file-numbers/<int:pk>/fabric-bookings/', FabricBookingListCreateView.as_view()),
    path('file-numbers/<int:pk>/fabric-bookings/<int:bk_pk>/', FabricBookingDetailView.as_view()),
    path('file-numbers/<int:pk>/fabric-bookings/copy/', FabricBookingCopyView.as_view()),
    
    # Trims Booking
    path('file-numbers/<int:pk>/trims-bookings/', TrimsBookingListCreateView.as_view()),
    path('file-numbers/<int:pk>/trims-bookings/<int:bk_pk>/', TrimsBookingDetailView.as_view()),
    
    # Labels Booking
    path('file-numbers/<int:pk>/label-bookings/', LabelBookingListCreateView.as_view()),
    path('file-numbers/<int:pk>/label-bookings/<int:bk_pk>/', LabelBookingDetailView.as_view()),
    
    # Booking Schedule
    path('booking-schedule/', BookingScheduleView.as_view()),
]
```

### 9.5 Acceptance Criteria

- [ ] User can create fabric booking with all fields
- [ ] User can add multiple fabric tabs (Prime, 2nd Hit)
- [ ] User can copy fabric booking from another order
- [ ] User can create trims booking with quantity/price
- [ ] User can create label booking with print type
- [ ] All bookings show status (TBC/Confirmed/Completed)
- [ ] All bookings have risk rating
- [ ] User can view booking schedule
- [ ] User can export bookings to Excel
- [ ] User can print bookings selectively

---

## 10. Technical Architecture

### 10.1 Data Flow

```
Design Sheet
    ↓ (links to)
Cost Sheet (multiple versions)
    ↓ (linked to)
File Number (FN) / Order
    ↓ (contains)
Breakdown (hits, colors, quantities)
    ↓ (triggers)
Fabric Booking
Trims Booking
Label Booking
```

### 10.2 Excel Integration

**Frontend (Tabulator + SheetJS):**
```typescript
// Frontend Excel Service using Tabulator's built-in download
import * as XLSX from 'xlsx';

export class ExcelService {
  // Export using Tabulator's built-in method
  static exportTable(tableRef: any, filename: string) {
    tableRef.current.download("xlsx", `${filename}.xlsx`, {
      sheetName: "Sheet1"
    });
  }
  
  // Import Excel file to Tabulator
  static importExcel(file: File): Promise<any[]> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      };
      reader.readAsArrayBuffer(file);
    });
  }
}
```

**Backend (Django - Calculation Engine):**
```python
# Backend handles all formula calculations
class CostCalculator:
    """Calculate costs on the backend, send results to frontend"""
    
    @staticmethod
    def calculate_fabric_cost(qty, price, consumption):
        return qty * price * consumption
    
    @staticmethod
    def calculate_total_cost(items):
        return sum(item['total'] for item in items)
    
    @staticmethod
    def calculate_profit_loss(cost, selling_price):
        return selling_price - cost
    
    @staticmethod
    def vlookup(lookup_value, table_array, col_index):
        """Backend equivalent of Excel VLOOKUP"""
        for row in table_array:
            if row[0] == lookup_value:
                return row[col_index - 1]
        return None
```

### 10.3 Print Service

```typescript
// Frontend Print Service
export class PrintService {
  static printDesignSheet(data: any, options: PrintOptions) {
    const printWindow = window.open('', '_blank');
    const html = this.generateDesignSheetHTML(data, options);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
  
  static printCostSheet(data: any, options: PrintOptions) {
    // Similar implementation
  }
  
  static printBooking(data: any, options: PrintOptions) {
    // Similar implementation
  }
}
```

---

## 11. UI/UX Behavior (target-Specific)

### 11.1 Grid Interactions

| Feature | target Behavior | Implementation |
|---------|-------------|----------------|
| **Asterisk (*)** | Editable columns marked with * | Tabulator `titleFormatter` with asterisk |
| **Right-click menu** | Context menu on every grid | Tabulator `menu` module |
| **Column visibility** | Right-click → show/hide columns | Tabulator `headerMenu` |
| **Column reorder** | Drag column headers | Tabulator `movable` columns |
| **Row grouping** | Drag header to "Group by" area | Tabulator `groupBy` |
| **Multi-level grouping** | Group by multiple fields | Tabulator nested `groupBy` |
| **Row count selector** | Top-right: 10/25/50/100/All | Tabulator `pagination` selector |
| **Page navigation** | Bottom: arrows + page numbers | Tabulator `pagination` |
| **Quick search** | Selectable criteria via right-click | Custom search bar + Tabulator `setHeaderFilterValue` |
| **Clear search** | Brush icon clears all filters | Custom button + `clearHeaderFilter()` |
| **Search in single field** | Type + Enter (not search button) | Custom keydown handler |
| **Hide search bar** | Up/down arrow toggle | Custom collapsible div |
| **Include Archive** | Checkbox in search | Filter parameter in API call |
| **Export to Excel** | Yellow Excel button, top-left | Tabulator `download("xlsx")` |
| **Separate window** | Right-click → Open in Separate Window | `window.open()` with route |

### 11.2 Cell Editing Behavior

| Feature | target Behavior | Implementation |
|---------|-------------|----------------|
| **Tab out** | Must tab/click out before save | `cellEdited` callback |
| **Validation** | Error messages at page bottom | Tabulator `validator` + toast notifications |
| **Mandatory fields** | Bold red border | Tabulator `editorParams.required` |
| **Read-only fields** | No asterisk, grey background | Tabulator `editor: false` |

### 11.3 Notes System

| Feature | target Behavior | Implementation |
|---------|-------------|----------------|
| **Notes box** | Every tab/section has notes | `TextField` component per section |
| **Summary notes** | High-level notes at order level | `Order.notes` field |
| **All Notes tab** | View all notes in one place | `NotesListPage.tsx` |
| **Initials + Date** | Required on every note entry | Auto-append `[{initials}] {date}` |
| **Rich text** | Bold, highlight supported | `react-quill` or simple markdown |

---

## 12. Print & Export System

### 12.1 Report Types (from Reference PDFs)

| # | Report Name | Source File | Pages | Format |
|---|-------------|-------------|-------|--------|
| 1 | **Fabric Order** | `FabricOrder20863-67279J-eMail-220323-1052.PDF` | 2 | Header + Grid + Terms |
| 2 | **Sales Order** | `Reports-Sales OrderE23942-B - 73106J-eMail-230714-1522 (003).pdf` | 1 | Header + Fabric + Breakdown |
| 3 | **Design Sheet** | `565235 LB LIZZIE WIDE LEG PANT-67741T-eMail-220324-1539.PDF` | 2 | Sketch + Material Grid |
| 4 | **Cost Report (Draft)** | `BulkPrint_eName_-61448D -eMail-220522-0628.PDF` | 21 | Multi-style bulk print |
| 5 | **Cost Report (Live)** | `Costing sheet BD 22-05.pdf` | 17 | Multi-style with fabric specs |

### 12.2 Fabric Order Report

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Fabric Order                                            │
│ Date Issued: [date]    Fabric Order No: [number] CCL   │
│ Supplier: [name + address]           Tel/Fax           │
│ Garment: [name]                                         │
│ Deliver to: [address]                                   │
├─────────────────────────────────────────────────────────┤
│ Description │ Quality │ Colour │ Qty(M) │ Width │ Weight│
│             │         │        │        │ (cm)  │ (gms) │
│─────────────┼─────────┼────────┼────────┼───────┼───────│
│ [data]      │ [data]  │ [data] │ [data] │ [data]│ [data]│
├─────────────────────────────────────────────────────────┤
│ Price │ Terms │ Original Date │ On Board │ QC │ Lab Dip │
│       │       │               │ Date     │    │ Total   │
├─────────────────────────────────────────────────────────┤
│ Fabric Composition: [composition]                       │
│ Mill: [name]               Origin: [country]            │
├─────────────────────────────────────────────────────────┤
│ TEST REQUIREMENTS: [full text]                          │
│ TERMS & CONDITIONS: [full text]                         │
└─────────────────────────────────────────────────────────┘
```

**Fields:**
- Date Issued, Fabric Order No
- Supplier (name + address + tel + fax)
- Garment name
- Deliver to address
- Description, Quality, Colour, Quantity (M)
- Cuttable Width (cm), Weight (gms/sqr M)
- Price, Terms (DA90, TT90, etc.)
- Original Date, On Board Date
- QC Approved, Lab Dip, Total
- Fabric Composition, Mill, Origin
- Test Requirements (full text block)
- Terms & Conditions (full text block)

### 12.3 Sales Order Report

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Sales Order - Live                                      │
│ File Number: [FN]        CUT OFF Date: [date]          │
│ Carmel Dept: [dept]      Repeat FN: [FN]              │
│ Sales Dept: [name]       Country: [country]            │
│ Customer: [name]         Shipment: [method]            │
│ Department: [dept]                                    │
├─────────────────────────────────────────────────────────┤
│ Fabric Details (multiple fabrics):                      │
│ Agent: [name]     Origin: [country]                    │
│ Mill: [name]      Cuttable Width: [cm]                 │
│ Description: [name] Weight: [gms]                      │
│ Payment Terms: [terms] Price: [price]                  │
│ Composition: [comp] Quality: [code]                    │
├─────────────────────────────────────────────────────────┤
│ Hit │ Colour  │ Quantity  │ Cust Deliv. Date │ PO      │
│─────┼─────────┼───────────┼──────────────────┼─────────│
│ 1   │ ECRU    │ 17,000    │ 17/Nov/23        │         │
│ 4   │ LB      │ 23,000    │ 17/Nov/23        │         │
│ 2   │ ECRU    │ 10,000    │ 10/Dec/23        │         │
├─────────────────────────────────────────────────────────┤
│ Selling Price: [price]     Contract Price: [price]     │
│ Notes: [text]                                          │
└─────────────────────────────────────────────────────────┘
```

**Fields:**
- File Number, CUT OFF Date
- Carmel Dept, Repeat FN
- Sales Dept, Country
- Customer, Shipment method
- Department
- Multiple fabric details (Agent, Mill, Origin, Width, Weight, Description, Terms, Price, Composition, Quality)
- Hit/Colour/Quantity/Customer Delivery Date/PO
- Selling Price, Contract Price
- Notes

### 12.4 Design Sheet Report

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ CCL DESIGN SHEET                                        │
│ Issue Date: [date]  Block: [code]  Designer: [name]    │
│ Size: [size]  Style Number: [code]                     │
│ Based on: [style]  Patt Cutter: [name]                 │
│ Description: [text]  Issuer: [name]                    │
│ Customer: [name]                                       │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌────────────────────────────┐ │
│ │                     │  │ [Sketch with annotations]  │ │
│ │   [Garment Sketch]  │  │ - Measurement notes        │ │
│ │                     │  │ - Construction details     │ │
│ │                     │  │ - Styling notes            │ │
│ └─────────────────────┘  └────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Type │ Description/Code │ Location │ Supplier │ Colour  │
│      │                  │          │          │ W/Size  │
│──────┼──────────────────┼──────────┼──────────┼─────────│
│ Cloth│ SANDWASH LINEN   │ MAIN     │ ALICE    │ BLACK   │
│      │ XK-529           │          │          │ 132CM   │
│ Trims│ BUTTON 4 HOLES   │ W/B      │ FOURSEAS │ BROWN   │
│ Trims│ NYLON ZIPPER     │ FRONT    │ YKK      │ DTM     │
│ …    │ …                │ …        │ …        │ …       │
├─────────────────────────────────────────────────────────┤
│ Printed [date] By [user]                               │
└─────────────────────────────────────────────────────────┘
```

**Fields:**
- Issue Date, Block, Designer, Size, Style Number
- Based on, Patt Cutter
- Description, Issuer, Customer
- Cloth Code
- Sketch image with annotations
- Material grid: Type, Description/Code, Location, Supplier, Colour, W/Size, Qty, Match
- Footer: Printed date, By user

### 12.5 Cost Report (Draft) - Bulk Print

**Layout (per style, 2 pages each):**
```
┌─────────────────────────────────────────────────────────┐
│ Cost Report - Draft                                     │
│ File Number: [blank if no FN]                           │
│ Carmel Dept: [dept]      Image: [if available]         │
│ Sales Dept: [name]                                     │
│ Customer: [name]                                       │
│ Department: [dept]                                     │
│ Garment: [name]                                        │
│ Style/Pattern: [code]                                  │
│ Buyer: [name]                                          │
├─────────────────────────────────────────────────────────┤
│ Type │ Name                        │ Rating │ Price │ Tot│
│──────┼─────────────────────────────┼────────┼───────┼────│
│      │ [item]                      │ [num]  │ [num] │[num]│
│ Cloth│ [fabric name]               │ [num]  │ [num] │[num]│
│ Trims│ [trim name]                 │ [num]  │ [num] │[num]│
│ Labels│ Label                      │ 1.000  │ [num] │[num]│
│ Other│ Making Price                │ 1.000  │ [num] │[num]│
│      │ Cost                        │        │ [num] │    │
├─────────────────────────────────────────────────────────┤
│ Colour │ Description │ Ex Mill │ To Port │ Hit │ Colour │
│        │             │ (onb)   │ (eta)   │     │ Qty    │
│────────┼─────────────┼─────────┼─────────┼─────┼────────│
│ [data] │ [data]      │ [date]  │ [date]  │ [n] │ [data] │
├─────────────────────────────────────────────────────────┤
│ Bangladesh. Ship By[Air/Sea]  Dollar Rate $ [rate]     │
│ Customer Discount [%] $[amount]                         │
│ VN/China [%] $[amount]                                  │
│ UK Overhead [%] $[amount]                               │
│ Base Cost $[amount]                                     │
│ Selling Price $[amount]                                 │
│ Margin [%] $[amount]                                    │
├─────────────────────────────────────────────────────────┤
│ Notes : [Sales Checklist]                               │
│ 1. ORDER INFO                                           │
│ a. IS THIS A NEW STYLE                                  │
│ b. REPEAT OR BASED ON: FN___                            │
│ c. CO-ORDS-PLEASE STATE RELATED FN NUMBERS___           │
│ 2. PRODUCTION ADVISED ON NEW ORDER YES/NO               │
│ 3. TECHNICAL ADVISED ON NEW ORDER YES/NO                │
│ 4. PHOTO OF GARMENT                                     │
│ Carmel Clothing Copyright ©2022 -Printed [date/time]   │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- Multiple styles in single print job (bulk print)
- Each style = 2 pages (Cost Report + Sales Checklist)
- Draft watermark on cost report
- Image placeholder (if available)
- Sales Checklist as second page

### 12.6 Cost Report (Live) - with Fabric Specs

**Layout (per style, 2 pages each):**
```
┌─────────────────────────────────────────────────────────┐
│ Cost Report - Live                                      │
│ File Number: [FN]                                       │
│ Carmel Dept: [dept]                                     │
│ Sales Dept: [name]                                      │
│ Customer: [name]                                        │
│ Department: [dept]                                      │
│ Garment: [name]                                         │
│ Style/Pattern: [code]                                   │
│ Buyer: [name]                                           │
├─────────────────────────────────────────────────────────┤
│ Agent: [name]    Origin: [country]                      │
│ Mill: [name]     Cuttable Width: [cm]                   │
│ Description: [name] Weight: [gms]                       │
│ Payment Terms: [terms] Price: [price]                   │
│ Composition: [comp] Quality: [code]                     │
│ (Repeated for each fabric)                              │
├─────────────────────────────────────────────────────────┤
│ [Cost items grid - same as Draft]                       │
├─────────────────────────────────────────────────────────┤
│ [Colour/Hit/Quantity breakdown - same as Draft]         │
├─────────────────────────────────────────────────────────┤
│ [Pricing summary - same as Draft]                       │
├─────────────────────────────────────────────────────────┤
│ Notes : [blank or notes]                                │
│ Carmel Clothing Copyright ©2022 -Printed [date/time]   │
└─────────────────────────────────────────────────────────┘
```

**Key Differences from Draft:**
- "Live" watermark instead of "Draft"
- Includes Agent/Mill/Fabric specifications section
- No Sales Checklist page
- Notes section typically blank

### 12.7 Print Features

| Feature | target Behavior | Implementation |
|---------|-------------|----------------|
| **Print button** | Top-left, opens print preview | `window.print()` + CSS `@media print` |
| **Print preview** | Shows before printing | Separate preview modal/page |
| **Selective printing** | Tick boxes to print specific rows | Tabulator row selection + print filter |
| **Quick Print** | Right-click → 6 print options | Context menu with print presets |
| **Print area** | Cream = print, grey = no print | CSS `@media print` with `display: none` |
| **Print specific items** | Tick box per row | Row selection + batch print |
| **Print all** | No tick boxes = print all | Default print behavior |
| **Bulk print** | Multiple styles in one job | Loop through selected styles |
| **Draft/Live watermark** | "Draft" or "Live" overlay | CSS `::after` pseudo-element |
| **Copyright footer** | "Carmel Clothing Copyright ©2022" | Fixed footer in print template |
| **Timestamp** | "Printed [date/time]" | Auto-generated on print |
| **Double-sided** | Optimize for 2 orders/page | CSS `@page { size: landscape; }` |

### 12.8 Print Presets

| Preset | Content | Pages |
|--------|---------|-------|
| **Fabric Order** | Fabric order with terms & conditions | 2 |
| **Sales Order** | Sales order with fabric + breakdown | 1 |
| **Design Sheet** | Sketch + material grid | 1-2 |
| **Cost Report (Draft)** | Cost items + pricing + checklist | 2 per style |
| **Cost Report (Live)** | Cost items + fabric specs + pricing | 2 per style |
| **Bulk Print Cost** | Multiple cost reports in one job | 2 × N styles |
| **Booking Schedule** | Weekly planning view | 1 |
| **Fabric Schedule** | Lab dip, bulk, onboard tracking | 1 |

### 12.9 Export to Excel

| Report | Export Format | Columns |
|--------|---------------|---------|
| **Cost Report** | .xlsx | All cost items + pricing |
| **Sales Order** | .xlsx | Hit/Colour/Quantity breakdown |
| **Fabric Order** | .xlsx | Fabric details + dates |
| **Booking Schedule** | .xlsx | Weekly view with status |
| **Order List** | .xlsx | All orders with status/risk |

---

## 13. Search & Filter System

### 13.1 Quick Search

| Feature | target Behavior | Implementation |
|---------|-------------|----------------|
| **Selectable criteria** | Right-click to choose search fields | Dynamic search form |
| **Multi-criteria** | AND logic across selected fields | API query builder |
| **Single-field search** | Type + Enter searches only that field | `onKeyDown` handler |
| **Clear all** | Brush icon clears all filters | `clearHeaderFilter()` |
| **Hide/unhide** | Arrow toggles search bar | Collapsible div |

### 13.2 Search Fields by View

| View | Search Fields |
|------|---------------|
| **Design List** | Style, Customer, Season, Block, Status, Date Range |
| **Order List** | FN, Customer, Style, Status, Risk, Date Range, Origin |
| **Fabric Schedule** | Supplier, Status, Risk, Onboard Date Range |
| **Booking Schedule** | Week, Status, Customer, Delivery Date Range |
| **Order Manager** | FN, Customer, Status, Risk, Delivery Date Range |

### 13.3 Grouping

| Feature | target Behavior | Implementation |
|---------|-------------|----------------|
| **Drag header** | Drag column header to group | Tabulator `groupBy` |
| **Multi-level** | Group by Customer → Style → Status | Nested `groupBy` array |
| **Remove grouping** | Click X on group header | `setGroupBy([])` |
| **Expand/collapse** | Click group header | Tabulator group toggle |

---

## 14. Business Rules Engine

### 14.1 Fabric Tolerances

| Quantity Range | Tolerance |
|---------------|-----------|
| **0,001 – 2,999 metres** | ± 5% |
| **3,001 – 4,999 metres** | ± 3% |
| **5,000+ metres** | ± 2% |

**Implementation:**
```python
def calculate_fabric_tolerance(quantity):
    if quantity < 3000:
        return 0.05
    elif quantity < 5000:
        return 0.03
    else:
        return 0.02
```

### 14.2 Shortage & Defect Rules

| Rule | Threshold | Action |
|------|-----------|--------|
| **Shortages** | Max 2% | Debit supplier if exceeded |
| **Defects** | Max 2% | Debit supplier if exceeded |
| **Over shipment** | > 5% (Primark) | Immediate debit, return fabric |
| **Under shipment** | < 5% (Primark) | Debit mill for trimming |

### 14.3 Consumption Rules

| Rule | Trigger | Action |
|------|---------|--------|
| **Consumption update** | PP approval | Update from design to order |
| **Bulk allocation** | Fabric arrival | 10m to production, 2m to sales |
| **Consumption mismatch** | Sold vs final | Allow with justification |

### 14.4 Status Rules

| Rule | Condition | Action |
|------|-----------|--------|
| **FN generation** | Status → Live | Auto-generate file number |
| **Status change** | Delivery date change | Only merchandiser/management |
| **Delivery date** | Original input | Cannot be changed after creation |
| **Hold status** | Customer request | Requires reason + manager approval |
| **Archive** | 6+ months inactive | Batch archive with confirmation |

### 14.5 Notes Rules

| Rule | Requirement |
|------|-------------|
| **Initials required** | Every note entry must have user initials |
| **Date required** | Every note entry must have timestamp |
| **No anonymous notes** | Must be linked to user account |
| **Critical notes** | Bold/highlight for emphasis |

### 14.6 Booking Rules

| Rule | Timeframe | Action |
|------|-----------|--------|
| **Booking reference** | 14 days before delivery | Must be filled in |
| **Ex FTY Notes** | 14 days before ex-date | Must be filled in |
| **Fabric update** | Weekly (Monday) | Update fabric schedule |
| **Wednesday cut-off** | Weekly | Week 1 must be 100% sorted |
| **Friday submission** | Weekly | Send to Directors for Monday review |

### 14.7 Costing Rules

| Rule | Requirement |
|------|-------------|
| **Mandatory fields** | Make price, label, Contract Selling Price |
| **Select cost box** | Must tick active cost sheet |
| **Item description** | Must be "Label" and "Making Price" (no abbreviation) |
| **Higher cost** | Requires management approval + format submission |
| **Sales checklist** | Must be completed on costing sheet |

---

## 15. Risk Management System

### 15.1 Risk Areas

| Area | Description | Color Progression |
|------|-------------|-------------------|
| **Fabric** | Fabric supply risk | None → Amber → Green → Red |
| **Trims** | Trims supply risk | None → Amber → Green → Red |
| **Labels** | Label supply risk | None → Amber → Green → Red |
| **Technical** | Fit/sample risk | None → Amber → Green → Red |
| **Design** | Design approval risk | None → Amber → Green → Red |

### 15.2 Risk Progression Rules

| Stage | Risk Level | Trigger |
|-------|------------|---------|
| **Initial** | None | Order created |
| **Bulk approved** | Amber | Fabric bulk approved |
| **In factory** | Green | Fabric arrived at factory |
| **Major issue** | Red | Quality/delivery issue |
| **Flag** | Yellow | Awareness indicator |

### 15.3 Overall Risk Calculation

```python
def calculate_overall_risk(fabric_risk, trims_risk, labels_risk, technical_risk):
    """Overall risk = HIGHEST individual risk"""
    risk_order = {'NONE': 0, 'GREEN': 1, 'AMBER': 2, 'YELLOW': 3, 'RED': 4}
    risks = [fabric_risk, trims_risk, labels_risk, technical_risk]
    return max(risks, key=lambda r: risk_order.get(r, 0))
```

### 15.4 Risk Display

| View | Display |
|------|---------|
| **Order List** | 5 color columns (Fabric, Trims, Labels, Technical, Overall) |
| **Order Detail** | Risk assessment panel with progression |
| **Booking Schedule** | Cyan button on last hit risk |
| **Fabric Schedule** | Risk progression tracking |

---

## 16. Scheduling System

### 16.1 Booking Schedule

| Feature | target Behavior | Implementation |
|---------|-------------|----------------|
| **Weekly view** | Monday-Sunday calendar | `BookingSchedulePage.tsx` |
| **Wednesday cut-off** | Week 1 must be sorted | Validation + warning |
| **Friday submission** | Send to Directors | Export + email integration |
| **Ex Factory Date** | Factory completion date | `ex_factory_date` field |
| **Cut qty** | Daily update | `cut_qty` field with timestamp |
| **Garments Ready** | Fully packed | `garments_ready` field |
| **Booking reference** | 14 days before delivery | Auto-populate + validation |
| **Ex FTY Notes** | 14 days before ex-date | Auto-populate + validation |
| **Snapshot columns** | Point-in-time data | `snapshot_date` + JSON field |
| **Risk button** | Cyan on last hit | Conditional formatting |
| **Invoiced** | Invoice status | `invoiced` boolean |
| **Fact Inv Qty** | Factory invoice quantity | `fact_inv_qty` field |
| **Fact Inv Notes** | Factory invoice notes | `fact_inv_notes` field |
| **Gold Seal** | Approval tracking | `gold_seal_notes`, `gold_seal_date` |

### 16.2 Fabric Schedule

| Feature | target Behavior | Implementation |
|---------|-------------|----------------|
| **Lab dip dates** | Required, actual, approved | 3 date fields + status |
| **Strike-off dates** | Required, actual, approved | 3 date fields + status |
| **Bulk approval** | Date, notes | Date + text field |
| **Onboard date** | ETD from supplier | Date field |
| **ETA date** | Estimated arrival | Date field |
| **Actual arrival** | When received | Date field |
| **Paperwork date** | Customs clearance | Date field |
| **Clearance date** | Final clearance | Date field |
| **Tolerances** | Per fabric type | Calculated field |
| **Risk progression** | None → Amber → Green → Red | Auto-calculated |

### 16.3 Order Manager

| Feature | target Behavior | Implementation |
|---------|-------------|----------------|
| **Daily review** | Production managers use daily | `OrderManagerPage.tsx` |
| **Critical path** | Customer delivery tracking | Timeline visualization |
| **Issue tracking** | Minimum 14 days before HOD | Alert system |
| **Status updates** | Weekly from sales | `StatusUpdatePage.tsx` |
| **Design report** | Weekly update | `DesignReportPage.tsx` |
| **Not sold analysis** | Quarterly review | `NotSoldAnalysisPage.tsx` |

---

## 17. Reconciliation System

### 17.1 Fabric Reconciliation

| Feature | target Behavior | Implementation |
|---------|-------------|----------------|
| **Shipping paperwork** | Compare vs ordered quantity | `ReconciliationPage.tsx` |
| **Utilization analysis** | Fabric usage efficiency | Calculated field |
| **Final hit reconciliation** | Last delivery tracking | Status update |
| **Debit management** | Supplier debits for issues | `DebitManagementPage.tsx` |
| **Monthly reports** | Fabric utilization + final hit | Scheduled reports |

### 17.2 Debit Rules

| Issue | Action | Timeframe |
|-------|--------|-----------|
| **Over shipment > 5%** | Immediate debit, return fabric | Immediately |
| **Under shipment < 5%** | Debit mill for trimming | Immediately |
| **Shortage > 20 units** | Debit supplier | On delivery |
| **Quality defect** | Debit supplier | On inspection |
| **Cost overrun** | Update costing sheet | On confirmation |

---

## 18. Repeat & Split Orders

### 18.1 Repeat Orders

| Step | Action | Validation |
|------|--------|------------|
| 1 | Click "Create Repeat Order" | Must be in order |
| 2 | Copy order details to new FN | Auto-populate fields |
| 3 | Technical confirms repeat | Green tick on target |
| 4 | Trims confirms same trims | Green tick on target |
| 5 | Treat as new order | Follow full process |
| 6 | No processes skipped | Validation on save |

### 18.2 Split Orders

| Step | Action | Validation |
|------|--------|------------|
| 1 | Copy information to split | Auto-populate fields |
| 2 | Carry over risk rating | Risk inherited |
| 3 | Update quantities | Split breakdown |
| 4 | Validate all fields | Full validation |

---

## 19. Stock Fabric

### 19.1 Features

| Feature | target Behavior | Implementation |
|---------|-------------|----------------|
| **Separate FN** | Stock fabric has own FN | `is_stock_fabric` flag |
| **Fabric photo** | Instead of sketch | Image upload required |
| **Allocation tracking** | Which order allocated to | `Allocation` model |
| **Balance tracking** | Remaining quantity | Calculated field |
| **Auto-deduction** | On order booking | Trigger on booking |

---

## 20. Audit Trail

### 20.1 Tracking

| Field | Description |
|-------|-------------|
| **created_by** | User who created record |
| **created_at** | Timestamp of creation |
| **updated_by** | User who last updated |
| **updated_at** | Timestamp of last update |
| **change_history** | JSON field with all changes |

### 20.2 History Log

```python
class AuditLog(models.Model):
    """Audit trail for all changes"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=20)  # CREATE, UPDATE, DELETE
    model_name = models.CharField(max_length=100)
    object_id = models.IntegerField()
    changes = models.JSONField()  # {field: {old: x, new: y}}
    timestamp = models.DateTimeField(auto_now_add=True)
```

---

## 21. Risk Assessment

### 11.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Excel library compatibility | HIGH | LOW | Use well-maintained library with React 19 support |
| Performance with large datasets | MEDIUM | MEDIUM | Implement virtual scrolling, pagination |
| Print layout accuracy | MEDIUM | HIGH | Test across browsers, use CSS print media |
| Data migration from existing BHMS | HIGH | MEDIUM | Create migration scripts, backup data |

### 11.2 Resource Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Developer unfamiliarity with target | HIGH | HIGH | Training sessions, documentation review |
| Scope creep | HIGH | MEDIUM | Strict adherence to roadmap, client sign-off |
| Timeline delays | MEDIUM | MEDIUM | Buffer time, parallel workstreams |

---

## Appendix A: target Terminology Mapping

| target Term | BHMS Equivalent | Notes |
|---------|-----------------|-------|
| Style Number | Style Code | Unique identifier for design |
| File Number (FN) | PO Number | Order identifier (e.g., 20830-B) |
| Design Sheet | Design Page | Main design view |
| Costing Tab | Cost Sheet | Cost breakdown |
| Breakdown Tab | Order Lines | Hits, colors, quantities |
| Fabric Tab | Fabric Booking | Fabric details (Prime + additional) |
| Trims Tab | Trims Booking | Trims details |
| Label Tab | Label Booking | Label details |
| Technical Tab | Technical Details | Fit notes, sealing |
| Risk Assessment | Risk Rating | Color-coded risk (5 areas) |
| Booking Schedule | Shipment Calendar | Weekly planning view |
| Fabric Schedule | Fabric Calendar | Lab dip, bulk, onboard tracking |
| Order Manager | Order Dashboard | Order summary view |
| Hit | Order Line | Unique hit + color = identifier |
| PO Number | Purchase Order | Per-hit purchase order |
| Customer Style | Style Reference | Customer's style number |
| Box/Hanging | Delivery Method | Packaging type |
| Lab Dip | Color Approval | Supplier color sample |
| Strike-off | Print Approval | Supplier print sample |
| Bulk Approval | Production Approval | Full production sign-off |
| Onboard Date | ETD Date | Estimated time of departure |
| ETA Date | Arrival Date | Estimated time of arrival |
| Ex Factory Date | Factory Exit Date | When goods leave factory |
| Booking Reference | Shipment Reference | 14 days before delivery |
| Ex FTY Notes | Factory Exit Notes | 14 days before ex-date |
| Gold Seal | Final Approval | Management sign-off |
| Mini Marker | Pattern Efficiency | > 85% efficiency required |
| CMPT | Cut Make Pack Trim | Production cost breakdown |
| Dgn Rating | Design Risk | Risk from design phase |
| FN with Country | Regional FN | B (Bangladesh), SL, R, VN |
| Origin | Market | UK or EU |
| Quick Search | Filter Bar | Selectable criteria search |
| Include Archive | Show Archived | Include old records |
| Print Area | Print Visibility | Cream = print, grey = no print |
| Quick Print | Preset Prints | 6 print options via right-click |
| Notes with Initials | Annotated Notes | [Initials] Date format |
| File Share | Virtual Folder | Per-design/order file storage |
| Stock Fabric | Inventory Fabric | Separate FN for stock |
| Repeat Order | Copy Order | From existing FN |
| Split Order | Partial Order | Copy with quantity split |
| Debit | Supplier Charge | For quality/quantity issues |
| Reconciliation | Settlement | Final quantity/cost matching |
| CMPT Summary | Cost Summary | Cut Make Pack Trim breakdown |
| Fit Spec | Sample Specification | Dev spec, fit iterations |
| Block Reference | Pattern Block | Reusable pattern template |
| Season | Collection | Seasonal collection |
| Issuer | Requester | Who issued the design |
| Designer | Creator | Who designed the style |

---

## Appendix B: Complete Feature Checklist

### B.1 Design Management (47 features)

- [ ] Style creation with unique code
- [ ] Design sheet with all fields
- [ ] Image gallery (list/image toggle)
- [ ] Main design image
- [ ] Range photo
- [ ] Sample photos
- [ ] Text box annotations
- [ ] Right-click context menu on images
- [ ] Image resize, set as design/range
- [ ] Other Photos tab
- [ ] Print area (cream/grey)
- [ ] Block reference management
- [ ] Season field
- [ ] Issuer and Designer (mandatory)
- [ ] Status workflow (New → Rejected/Closed/Archived)
- [ ] Mandatory field validation
- [ ] Style relationship (based on another)
- [ ] Include/exclude annotations on copy
- [ ] Fit Specifications (multiple)
- [ ] Copy from base/development sheet
- [ ] Copy from another style number
- [ ] Include/exclude schedule from spec
- [ ] Selected specification tick box
- [ ] Tab description editing
- [ ] Design Costings (multiple versions)
- [ ] Single size costing with watermark
- [ ] Sizes and ratio input
- [ ] Confirmed tick box
- [ ] Size/width column
- [ ] Patterned fabric options (4 columns)
- [ ] Column visibility toggle (right-click)
- [ ] Pattern amendment triggers new costing
- [ ] Quick link to Design sheet
- [ ] Job Request (single/multiple)
- [ ] Work location selection
- [ ] Customer and department verification
- [ ] No of garments input
- [ ] Allocate to specific person
- [ ] Job history view
- [ ] Quick Add Job button
- [ ] Other Photos tab
- [ ] File Share (virtual folder)
- [ ] File naming conventions
- [ ] Folder structure per design
- [ ] Image upload with drag-drop
- [ ] Batch image upload
- [ ] Image metadata (caption, type)

### B.2 Costing System (32 features)

- [ ] Multiple costing versions
- [ ] 8 cost categories
- [ ] Cost sheet variants (BD, SL, VN)
- [ ] Make price field
- [ ] Contract Selling Price field
- [ ] Exchange rate for landed orders
- [ ] Select cost box (tick active)
- [ ] Dgn rating (pulled from design)
- [ ] Quick link to Design sheet
- [ ] Sales checklist on notes
- [ ] Budget vs Actual tracking
- [ ] Risk rating per item
- [ ] Consumption calculation
- [ ] Cost comparison (side-by-side)
- [ ] Cost approval workflow
- [ ] Export to Excel
- [ ] Print cost sheet
- [ ] Column visibility toggle
- [ ] Mandatory fields validation
- [ ] Higher cost approval workflow
- [ ] Cost amendment tracking
- [ ] Cost version history
- [ ] Cost summary calculations
- [ ] Profit/Loss calculation
- [ ] Fabric cost calculation
- [ ] Trims cost calculation
- [ ] Labels cost calculation
- [ ] CMPT cost calculation
- [ ] Overhead calculation
- [ ] Unit cost per garment
- [ ] Total cost validation
- [ ] Cost sheet locking (approved)

### B.3 Order Management (41 features)

- [ ] File Number (FN) generation
- [ ] FN with country suffix (B, SL, R, VN)
- [ ] Origin field (UK/EU)
- [ ] Status workflow (New → Available → Live → In Work → Delivered)
- [ ] Hold status with reason
- [ ] Cancelled status
- [ ] Archived status
- [ ] Right-click to set status
- [ ] Column visibility toggle
- [ ] Quick search with multiple criteria
- [ ] Include Archive option
- [ ] Auto-populate from design sheet
- [ ] Critical fields validation
- [ ] Error messages at bottom of page
- [ ] Contract received date
- [ ] Completion date = fabric arrival
- [ ] Original delivery date (cannot change)
- [ ] Delivery date column (for amendments)
- [ ] Delivery type (Sea/Air/Air Freight)
- [ ] Breakdown Tab (hits, colors, quantities)
- [ ] Hit + Color = unique identifier
- [ ] PO number and Customer style
- [ ] Box or hanging
- [ ] Factory (blank unless transferred)
- [ ] Status per hit (Live/In Work/Delivered)
- [ ] Repeat Orders (from existing FN)
- [ ] Department confirmation required
- [ ] Technical and Trims confirmation
- [ ] Treat as new order
- [ ] No processes skipped
- [ ] Split Orders (copy with split)
- [ ] Carry over risk rating
- [ ] Update quantities
- [ ] Validate all fields
- [ ] Order Costing (linked to FN)
- [ ] Cost sheet selection
- [ ] Make price and CSP
- [ ] Exchange rate
- [ ] Order notes
- [ ] Order history/audit trail

### B.4 Material Booking (56 features)

- [ ] Fabric Tab (Prime - cannot delete)
- [ ] Orders Colour Ref
- [ ] Supplier (pre-approved dropdown)
- [ ] Mill field
- [ ] Description (must be description, not code)
- [ ] Color, Composition, Weight, Cuttable Width
- [ ] Order quantity, Delivered quantity
- [ ] Lab dip required date
- [ ] Lab dip actual date
- [ ] Lab dip approved
- [ ] Onboard date
- [ ] ETA date
- [ ] Actual arrival date
- [ ] Bulk approved
- [ ] Bulk approval date
- [ ] Consumption (final)
- [ ] Factory allocation
- [ ] Price
- [ ] Defect quantity and notes
- [ ] Risk rating (None → Amber → Green → Red)
- [ ] Notes
- [ ] Copy From button (copy fabric tab)
- [ ] Delete tab (X button, except Prime)
- [ ] Multiple fabric tabs
- [ ] Tolerance calculation
- [ ] Trims/Label Tabs
- [ ] Location on Garment
- [ ] Supplier (pre-approved dropdown)
- [ ] Item description, Type, Code, Color
- [ ] Ratio, Quantity, Delivered, Stock
- [ ] Order date, ETA, Actual date
- [ ] Confirmed tick box
- [ ] Price, Value
- [ ] Status (TBC/Completed)
- [ ] Copy from another order
- [ ] Wash care instructions copy
- [ ] Overwrite option
- [ ] Risk rating
- [ ] Notes
- [ ] Label Tab
- [ ] Print type (MAIN LABEL, CARE LABEL)
- [ ] Description
- [ ] Ref, Colour
- [ ] Supplier (pre-approved)
- [ ] Quantity, Delivered, Stock
- [ ] ETA, Actual date
- [ ] Confirmed tick box
- [ ] Price, Total
- [ ] Status (TBC/Completed)
- [ ] Risk rating
- [ ] Notes
- [ ] Invoice reference
- [ ] Technical Tab
- [ ] Fit note date
- [ ] Fit number selection
- [ ] Brief description
- [ ] View Spec button (link to design)
- [ ] Multiple entries per fit
- [ ] Risk rating
- [ ] Notes

### B.5 Scheduling & Reports (38 features)

- [ ] Booking Schedule (weekly view)
- [ ] Wednesday cut-off for next week
- [ ] Friday submission to Directors
- [ ] Ex Factory Date
- [ ] Cut qty (daily update)
- [ ] Garments Ready (fully packed)
- [ ] Booking reference (14 days before delivery)
- [ ] Ex FTY Notes (14 days before ex-date)
- [ ] Notes (with initials and date)
- [ ] Snapshot columns
- [ ] Risk button (cyan on last hit)
- [ ] Invoiced, Fact Inv Qty, Fact Inv Notes
- [ ] Gold Seal notes and approval date
- [ ] Fabric Schedule
- [ ] Lab dip/strike-off dates
- [ ] Bulk approval dates
- [ ] Onboard and arrival dates
- [ ] Paperwork and clearance dates
- [ ] Tolerances
- [ ] Risk setting progression
- [ ] Order Manager
- [ ] Daily review view
- [ ] Critical path tracking
- [ ] Issue tracking (14 days before HOD)
- [ ] Status updates (weekly)
- [ ] Design Report (weekly)
- [ ] Not Sold Analysis (quarterly)
- [ ] AQL Reports
- [ ] Fabric Utilization Report
- [ ] Final Hit Report
- [ ] Export to Excel
- [ ] Print reports
- [ ] Column visibility toggle
- [ ] Quick search
- [ ] Grouping (drag header)
- [ ] Multi-level grouping
- [ ] Row count selector
- [ ] Page navigation

### B.6 Business Rules & Risk (36 features)

- [ ] Fabric tolerances (5%/3%/2%)
- [ ] Shortages max 2%
- [ ] Defects max 2%
- [ ] Over shipment > 5% debit
- [ ] Under shipment < 5% debit
- [ ] Consumption update by PP approval
- [ ] 10m bulk to production, 2m to sales
- [ ] Booking reference 14 days before delivery
- [ ] Ex FTY Notes 14 days before ex-date
- [ ] Delivery date changes only by merchandiser/management
- [ ] Notes must have initials and date
- [ ] Sales checklist on costing sheet
- [ ] Quick lead time orders (yellow risk)
- [ ] Mini-marker efficiency > 85%
- [ ] Debits raised immediately
- [ ] Risk assessment (5 areas)
- [ ] Risk progression rules
- [ ] Overall risk = highest individual
- [ ] Risk display in Order List
- [ ] Risk display in Order Detail
- [ ] Risk button in Booking Schedule
- [ ] Risk progression in Fabric Schedule
- [ ] Status workflow validation
- [ ] FN generation on status change
- [ ] Repeat order confirmation
- [ ] Split order risk carryover
- [ ] Cost sheet locking (approved)
- [ ] Higher cost approval
- [ ] Mandatory fields validation
- [ ] Error messages at page bottom
- [ ] Audit trail tracking
- [ ] Change history logging
- [ ] User initials on notes
- [ ] Date timestamp on notes
- [ ] No anonymous notes
- [ ] Critical notes highlighting

### B.8 Reports & Export (28 features)

- [ ] Fabric Order report (2 pages)
- [ ] Fabric Order terms & conditions text
- [ ] Sales Order report (1 page)
- [ ] Sales Order fabric details section
- [ ] Design Sheet report (sketch + grid)
- [ ] Cost Report - Draft (2 pages per style)
- [ ] Cost Report - Live (2 pages with fabric specs)
- [ ] Bulk Print - Multiple cost reports in one job
- [ ] Draft/Live watermark overlay
- [ ] Copyright footer ("Carmel Clothing Copyright ©2022")
- [ ] Timestamp on print ("Printed [date/time]")
- [ ] Selective printing (tick boxes)
- [ ] Quick Print (6 options via right-click)
- [ ] Print preview before printing
- [ ] Print area (cream = print, grey = no print)
- [ ] Double-sided printing optimization
- [ ] Export to Excel (.xlsx)
- [ ] Export cost report to Excel
- [ ] Export sales order to Excel
- [ ] Export fabric order to Excel
- [ ] Export booking schedule to Excel
- [ ] Export order list to Excel
- [ ] Print fabric order with terms
- [ ] Print sales order with breakdown
- [ ] Print design sheet with sketch
- [ ] Print cost report with pricing summary
- [ ] Bulk print multiple styles
- [ ] Print with image placeholder

---

## Appendix C: Database Migration Plan

### C.1 New Tables Required

| # | Table | Purpose | Phase |
|---|-------|---------|-------|
| 1 | `design_sheet` | Design sheet header | 2 |
| 2 | `design_image` | Images for design | 2 |
| 3 | `fit_specification` | Fit specifications | 2 |
| 4 | `fit_image` | Images for fit specs | 2 |
| 5 | `job_request` | Job requests | 2 |
| 6 | `cost_sheet` | Costing sheets | 3 |
| 7 | `cost_item` | Cost line items | 3 |
| 8 | `cost_summary` | Cost calculations | 3 |
| 9 | `file_number` | Order identifier (FN) | 4 |
| 10 | `order_breakdown` | Hits, colors, quantities | 4 |
| 11 | `order_costing` | Order costing link | 4 |
| 12 | `fabric_booking` | Fabric bookings | 5 |
| 13 | `trims_booking` | Trims bookings | 5 |
| 14 | `label_booking` | Label bookings | 5 |
| 15 | `technical_detail` | Fit notes, sealing | 5 |
| 16 | `booking_schedule` | Weekly planning | 6 |
| 17 | `fabric_schedule` | Fabric tracking | 6 |
| 18 | `risk_assessment` | Risk tracking | 6 |
| 19 | `notes` | Multi-level notes | 7 |
| 20 | `audit_log` | Change history | 7 |
| 21 | `file_share` | Virtual folders | 7 |
| 22 | `stock_fabric` | Inventory tracking | 7 |
| 23 | `debit_management` | Supplier debits | 7 |
| 24 | `reconciliation` | Final settlement | 7 |
| 25 | `print_preset` | Print configurations | 7 |

### C.2 Modified Tables

| # | Table | Modifications | Phase |
|---|-------|---------------|-------|
| 1 | `style` | Add link to design_sheet | 2 |
| 2 | `purchase_order` | Add link to file_number | 4 |
| 3 | `supplier` | Add pre-approved flag | 5 |
| 4 | `factory` | Add factory details | 5 |
| 5 | `user` | Add initials field | 7 |

### C.3 Indexes Required

| Table | Index | Purpose |
|-------|-------|---------|
| `file_number` | `file_number` (unique) | Fast FN lookup |
| `file_number` | `status` | Status filtering |
| `file_number` | `customer_id` | Customer filtering |
| `fabric_booking` | `file_number_id` | Order lookup |
| `fabric_booking` | `supplier_id` | Supplier filtering |
| `trims_booking` | `file_number_id` | Order lookup |
| `label_booking` | `file_number_id` | Order lookup |
| `order_breakdown` | `file_number_id` | Order lookup |
| `risk_assessment` | `file_number_id` | Order lookup |
| `audit_log` | `user_id` | User activity |
| `audit_log` | `timestamp` | Time-based queries |
| `notes` | `content_type_id`, `object_id` | Polymorphic notes |

---

## Appendix D: Testing Strategy

### D.1 Unit Tests

| Category | Tests |
|----------|-------|
| **Models** | Field validation, constraints, relationships |
| **API** | Endpoint testing, authentication, permissions |
| **Business Rules** | Tolerances, status transitions, risk calculation |
| **Calculations** | Cost calculations, consumption, profit/loss |

### D.2 Integration Tests

| Flow | Steps |
|------|-------|
| **Design → Costing** | Create design → Add fit specs → Create costing → Approve |
| **Costing → Order** | Select cost sheet → Create order → Generate FN → Add breakdown |
| **Order → Booking** | Create fabric booking → Add trims → Add labels → Set risk |
| **Booking → Schedule** | Update booking → Add to schedule → Track delivery |
| **Repeat Order** | Create repeat → Confirm departments → Validate fields |
| **Split Order** | Copy order → Split quantities → Carry risk → Validate |

### D.3 UI/UX Tests

| Feature | Test |
|---------|------|
| **Grid interactions** | Right-click, column visibility, grouping |
| **Search** | Multi-criteria, single-field, clear, archive |
| **Print** | Preview, selective, quick print, print area |
| **Notes** | Initials, date, rich text, all notes tab |
| **Risk** | Color display, progression, overall calculation |

### D.4 User Acceptance Tests

| Module | Scenarios |
|--------|-----------|
| **Design** | Create style, upload images, add fit specs, request jobs |
| **Costing** | Create multiple versions, approve, compare, export |
| **Order** | Create FN, add breakdown, set status, repeat/split |
| **Booking** | Add fabric/trims/labels, copy tabs, set risk |
| **Scheduling** | View weekly schedule, update dates, track delivery |
| **Reports** | Generate reports, export Excel, print |

### D.5 Performance Tests

| Scenario | Target |
|----------|--------|
| **Grid rendering** | 10,000 rows in < 2 seconds |
| **Search** | 1,000 records in < 500ms |
| **Export** | 10,000 rows to Excel in < 5 seconds |
| **Print** | Preview generation in < 1 second |

---

---

## Appendix E: Tech Pack Connection Plan

### E.1 Existing Tech Pack Pipeline

| Component | Status | Lines | Tests |
|-----------|--------|-------|-------|
| PDF Parser | ✅ Complete | 433 | ~20 |
| Excel Export | ✅ Complete | 159 | ~16 |
| Excel Import | ✅ Complete | 203 | ~18 |
| Import Service | ✅ Complete | 158 | - |
| StyleTechPack Model | ✅ Complete | 89 | ~19 |
| BOMItem Fields | ✅ Complete | 4 | ~8 |
| API Endpoints | ✅ Complete | 120 | ~28 |
| Frontend Wizard | ✅ Complete | 259 | - |
| **TOTAL** | **✅** | **~1,425** | **~110** |

### E.2 Connection Flow

```
Tech Pack Extract → StyleTechPack (14 fields)
                         │
                         ▼
                    DesignSheet ←── NEW
                         │
                    ┌────┴────┐
                    │         │
              FitSpec    JobRequest
                    │         │
                    └────┬────┘
                         │
                         ▼
                    Print Template
```

### E.3 New Models Required

| Model | Purpose | Fields |
|-------|---------|--------|
| `DesignSheet` | Design sheet view | status, created_at, updated_at |
| `FitSpecification` | Fit iterations | fit_number, fit_date, description, notes, is_selected |
| `FitImage` | Fit images | image, caption |
| `JobRequest` | Pattern/sample requests | job_type, required_by, work_location, no_of_garments, allocated_to, status |

### E.4 New Frontend Components

| Component | Purpose |
|-----------|---------|
| `DesignSheetPage.tsx` | Main design sheet view |
| `DesignSheetHeader.tsx` | Header section |
| `DesignSheetSketch.tsx` | Image/sketch section |
| `DesignSheetMaterial.tsx` | Tabulator grid for BOM |
| `DesignSheetFitSpecs.tsx` | Fit specifications tabs |
| `DesignSheetJobRequests.tsx` | Job request queue |
| `DesignSheetNotes.tsx` | Notes with initials/date |
| `DesignSheetPrintPage.tsx` | Print template |

### E.5 Timeline

| Week | Task |
|------|------|
| 1 | Enhance StyleTechPack model (image fields, notes) |
| 2 | Create DesignSheet + FitSpec + JobRequest models |
| 3 | DesignSheetPage.tsx + Header + Sketch |
| 4 | Tabulator integration + API endpoints |
| 5 | FitSpec + JobRequest components |
| 6 | Print template + Testing |

**Total: 6 weeks** (Added to Phase 2)

---

*Document Version: 2.1*
*Last Updated: August 27, 2026*
*Author: AI Chief of Staff*
*Revision: Comprehensive target manual gap analysis + Tech Pack connection plan incorporated*
