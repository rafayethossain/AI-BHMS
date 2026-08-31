# Design Sheet ↔ Tech Pack Connection Plan

**Project:** AI-BHMS
**Objective:** Connect the existing Tech Pack PDF extractor to the GC Design Sheet workflow
**Status:** PLANNING

---

## 1. Current State Analysis

### 1.1 What Exists (Tech Pack Pipeline)

```
Buyer PDF → Extract → Excel → Edit → Import → Style + BOM
```

| Component | File | Status |
|-----------|------|--------|
| **PDF Parser** | `techpack/pdf_parser.py` (433 lines) | ✅ Complete |
| **Excel Export** | `techpack/excel_export.py` (159 lines) | ✅ Complete |
| **Excel Import** | `techpack/excel_import.py` (203 lines) | ✅ Complete |
| **Import Service** | `techpack/import_service.py` (158 lines) | ✅ Complete |
| **StyleTechPack Model** | `merchandising/models.py:867-955` | ✅ Complete |
| **BOMItem Fields** | `merchandising/models.py:557-560` | ✅ Complete |
| **API Endpoints** | `merchandising/views.py:190-310` | ✅ Complete |
| **Frontend Wizard** | `TechPackImportWizardPage.tsx` (259 lines) | ✅ Complete |
| **Tests** | 6 test files, ~110 tests | ✅ Complete |

### 1.2 What's Missing (GC Design Sheet)

| GC Feature | Current State | Gap |
|------------|---------------|-----|
| **Design Sheet View** | No standalone view | Need `DesignSheetPage.tsx` |
| **Image/Sketch** | `sketch` field is CharField (text only) | Need image upload + display |
| **Annotations** | Not supported | Need overlay component |
| **Fit Specifications** | Not connected | Need `FitSpecification` model + UI |
| **Job Requests** | Not connected | Need `JobRequest` model + UI |
| **Status Workflow** | `StyleTechPack.status` exists but not exposed | Need UI + transitions |
| **Notes System** | `note` field exists but no initials/date | Need enhanced notes |
| **Block Reference** | `block` field exists | Need block management |
| **Multiple Costings** | Not connected | Need costing link |
| **Tabulator Grid** | Not used for design sheet | Need grid component |
| **Print Layout** | Not implemented | Need print template |

---

## 2. Architecture: How They Connect

### 2.1 Data Flow (After Connection)

```
Buyer PDF (CCL Design Sheet)
    │
    ▼  [POST /styles/techpack/extract/]
StyleTechPackParser.parse()
    │
    ▼
TechPackDocument (DTO)
    ├── design_info: 14 header fields
    └── bom_rows: 8 columns each
    │
    ▼  [StyleTechPack created]
    │
    ▼  [User clicks "View Design Sheet"]
    │
DesignSheetPage.tsx
    │
    ├── Header Section (from StyleTechPack fields)
    │   ├── Issue Date, Block, Based On
    │   ├── Designer, Pattern Cutter, Issuer
    │   ├── Customer, Style Number, Size
    │   ├── Cloth Code, Description
    │   └── Status (New → Rejected/Closed/Archived)
    │
    ├── Image Section (NEW)
    │   ├── Sketch upload (from PDF or manual)
    │   ├── Annotations overlay
    │   └── Other photos gallery
    │
    ├── Material Grid (Tabulator - from BOMItem)
    │   ├── Type, Description/Code
    │   ├── Location, Supplier
    │   ├── Colour, Width/Size
    │   ├── Qty, Match
    │   └── Editable inline
    │
    ├── Fit Specifications (NEW)
    │   ├── Dev Spec
    │   ├── 1st Fit, 2nd Fit, etc.
    │   └── Copy from base/another style
    │
    ├── Job Requests (NEW)
    │   ├── Pattern, Sample, Mini Marker
    │   ├── Required by date
    │   └── Status tracking
    │
    └── Notes (Enhanced)
        ├── Summary notes
        ├── Initials + Date
        └── Rich text editing
```

### 2.2 Model Relationships

```
Style
  │
  ├── tech_pack (FileField) ──────────── Source PDF
  │
  ├── StyleTechPack (1:many)
  │   ├── techpack_number (TP-XXXX)
  │   ├── status (draft/extracted/in_progress/completed)
  │   ├── extracted_data (JSON)
  │   ├── excel_file (FileField)
  │   ├── [14 design-sheet fields]
  │   │
  │   └── DesignSheet (1:1) ←── NEW MODEL
  │       ├── status (new/rejected/closed/archived)
  │       ├── sketch_image (ImageField) ←── NEW
  │       ├── notes (TextField)
  │       ├── notes_initials (CharField)
  │       ├── notes_date (DateTimeField)
  │       │
  │       ├── FitSpecification (1:many) ←── NEW MODEL
  │       │   ├── fit_number (CharField)
  │       │   ├── fit_date (DateField)
  │       │   ├── description (CharField)
  │       │   ├── notes (TextField)
  │       │   ├── is_selected (BooleanField)
  │       │   └── images (1:many)
  │       │
  │       └── JobRequest (1:many) ←── NEW MODEL
  │           ├── job_type (CharField)
  │           ├── required_by (DateField)
  │           ├── work_location (CharField)
  │           ├── no_of_garments (IntegerField)
  │           ├── allocated_to (FK → User)
  │           └── status (pending/in_progress/completed)
  │
  ├── StyleVersion (1:many)
  │   └── BOM (1:1)
  │       └── BOMItem (1:many)
  │           ├── [existing fields]
  │           ├── location ←── from tech pack
  │           ├── colour ←── from tech pack
  │           ├── width_size ←── from tech pack
  │           └── match ←── from tech pack
  │
  └── CostSheet (1:many) ←── Phase 3
      └── CostItem (1:many)
```

---

## 3. Implementation Plan

### Phase 1: Enhance StyleTechPack (Week 1)

**Backend Changes:**

1. **Add image fields to StyleTechPack:**
```python
# apps/merchandising/models.py

class StyleTechPack(models.Model):
    # ... existing fields ...
    
    # NEW: Image fields
    sketch_image = models.ImageField(
        upload_to='techpacks/sketches/', 
        blank=True, null=True
    )
    other_images = models.JSONField(default=list, blank=True)
    
    # NEW: Enhanced notes
    notes_initials = models.CharField(max_length=10, blank=True)
    notes_date = models.DateTimeField(null=True, blank=True)
```

2. **Create DesignSheet model:**
```python
# apps/merchandising/models.py

class DesignSheet(models.Model):
    """Design sheet linked to StyleTechPack"""
    STATUS_CHOICES = [
        ('NEW', 'New'),
        ('REJECTED', 'Rejected'),
        ('CLOSED', 'Closed'),
        ('ARCHIVED', 'Archived'),
    ]
    
    tech_pack = models.OneToOneField(
        StyleTechPack, 
        on_delete=models.CASCADE, 
        related_name='design_sheet'
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='NEW'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class FitSpecification(models.Model):
    """Fit specification for design"""
    design_sheet = models.ForeignKey(
        DesignSheet, 
        on_delete=models.CASCADE, 
        related_name='fit_specs'
    )
    fit_number = models.CharField(max_length=50)
    fit_date = models.DateField()
    description = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    is_selected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class FitImage(models.Model):
    """Images for fit specification"""
    fit_spec = models.ForeignKey(
        FitSpecification, 
        on_delete=models.CASCADE, 
        related_name='images'
    )
    image = models.ImageField(upload_to='fits/')
    caption = models.CharField(max_length=200, blank=True)

class JobRequest(models.Model):
    """Job requests for patterns, samples"""
    JOB_TYPE_CHOICES = [
        ('NEW_PATTERN', 'New Pattern'),
        ('TECH_SAMPLE', 'Technical Sample'),
        ('FIT_SAMPLE', 'Fit Sample'),
        ('MINI_MARKER', 'Mini Marker'),
        ('3D', '3D Sample'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    ]
    
    design_sheet = models.ForeignKey(
        DesignSheet, 
        on_delete=models.CASCADE, 
        related_name='job_requests'
    )
    job_type = models.CharField(max_length=50, choices=JOB_TYPE_CHOICES)
    required_by = models.DateField()
    work_location = models.CharField(max_length=100, blank=True)
    no_of_garments = models.IntegerField(default=1)
    allocated_to = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True, blank=True
    )
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='PENDING'
    )
    created_at = models.DateTimeField(auto_now_add=True)
```

3. **Update import_service.py:**
```python
# After creating Style, also create DesignSheet
def import_style_from_techpack(tenant, user, buyer, doc, techpack):
    # ... existing code ...
    
    # NEW: Create DesignSheet
    design_sheet = DesignSheet.objects.create(
        tech_pack=techpack,
        status='NEW'
    )
    
    return TechPackImportResult(
        # ... existing fields ...
        design_sheet=design_sheet,  # NEW
    )
```

### Phase 2: Frontend Design Sheet View (Week 2-3)

**New Files:**
```
frontend/src/pages/
├── DesignSheetPage.tsx          # Main design sheet view
├── DesignSheetHeader.tsx        # Header section component
├── DesignSheetSketch.tsx        # Image/sketch section
├── DesignSheetMaterial.tsx      # Tabulator grid for BOM
├── DesignSheetFitSpecs.tsx      # Fit specifications tabs
├── DesignSheetJobRequests.tsx   # Job request queue
└── DesignSheetNotes.tsx         # Notes with initials/date
```

**DesignSheetPage.tsx Structure:**
```tsx
import { ReactTabulator } from 'react-tabulator';

function DesignSheetPage() {
  const { techPackId } = useParams();
  const [techPack, setTechPack] = useState<StyleTechPack>();
  const [designSheet, setDesignSheet] = useState<DesignSheet>();
  const [fitSpecs, setFitSpecs] = useState<FitSpecification[]>([]);
  const [jobRequests, setJobRequests] = useState<JobRequest[]>([]);
  
  return (
    <div className="design-sheet">
      {/* Header Section */}
      <DesignSheetHeader 
        techPack={techPack}
        onStatusChange={handleStatusChange}
      />
      
      {/* Sketch/Image Section */}
      <DesignSheetSketch
        sketchImage={techPack?.sketch_image}
        otherImages={techPack?.other_images}
        onImageUpload={handleImageUpload}
        onAnnotationAdd={handleAnnotationAdd}
      />
      
      {/* Material Grid (Tabulator) */}
      <DesignSheetMaterial
        bomItems={techPack?.extracted_data?.bom_rows}
        onItemEdit={handleItemEdit}
        onItemAdd={handleItemAdd}
        onItemDelete={handleItemDelete}
      />
      
      {/* Fit Specifications */}
      <DesignSheetFitSpecs
        fitSpecs={fitSpecs}
        onFitSpecAdd={handleFitSpecAdd}
        onFitSpecSelect={handleFitSpecSelect}
      />
      
      {/* Job Requests */}
      <DesignSheetJobRequests
        jobRequests={jobRequests}
        onJobRequestAdd={handleJobRequestAdd}
      />
      
      {/* Notes */}
      <DesignSheetNotes
        notes={techPack?.note}
        initials={techPack?.notes_initials}
        date={techPack?.notes_date}
        onNotesUpdate={handleNotesUpdate}
      />
    </div>
  );
}
```

### Phase 3: Tabulator Integration (Week 3-4)

**Material Grid Component:**
```tsx
// DesignSheetMaterial.tsx

import { ReactTabulator } from 'react-tabulator';
import 'tabulator-tables/dist/css/tabulator.min.css';

const materialColumns = [
  { 
    title: "*", 
    formatter: "rowSelection", 
    hozAlign: "center", 
    headerSort: false,
    width: 40 
  },
  { 
    title: "Type", 
    field: "type", 
    editor: "input",
    headerTooltip: "Item type (Cloth, Trims, Labels, etc.)" 
  },
  { 
    title: "Description/Code", 
    field: "description_code", 
    editor: "input",
    width: 250 
  },
  { 
    title: "Location", 
    field: "location", 
    editor: "input" 
  },
  { 
    title: "Supplier", 
    field: "supplier", 
    editor: "input" 
  },
  { 
    title: "Colour", 
    field: "colour", 
    editor: "input" 
  },
  { 
    title: "W/Size", 
    field: "width_size", 
    editor: "input" 
  },
  { 
    title: "Qty", 
    field: "qty", 
    editor: "number",
    formatter: "number",
    bottomCalc: "sum" 
  },
  { 
    title: "Match", 
    field: "match", 
    editor: "input" 
  },
];

function DesignSheetMaterial({ bomItems, onItemEdit, onItemAdd, onItemDelete }) {
  const tableRef = useRef(null);
  
  const options = {
    layout: "fitColumns",
    reactiveData: true,
    selectable: true,
    clipboard: true,
    clipboardPaste: true,
    groupBy: "type",
    headerMenu: [
      {
        label: "Show/Hide Columns",
        action: function(e, column) {
          column.toggle();
        }
      }
    ],
    rowContextMenu: [
      {
        label: "Add Row",
        action: function(e, row) {
          onItemAdd();
        }
      },
      {
        label: "Delete Row",
        action: function(e, row) {
          onItemDelete(row.getData().id);
        }
      },
      {
        label: "Copy Row",
        action: function(e, row) {
          onItemAdd(row.getData());
        }
      }
    ],
  };
  
  return (
    <div className="material-grid">
      <div className="grid-header">
        <h3>Material Breakdown</h3>
        <button onClick={() => onItemAdd()}>+ Add Item</button>
      </div>
      <ReactTabulator
        ref={tableRef}
        data={bomItems}
        columns={materialColumns}
        options={options}
        cellEdited={(cell) => onItemEdit(cell.getData())}
      />
    </div>
  );
}
```

### Phase 4: API Endpoints (Week 4)

**New Endpoints:**
```python
# apps/merchandising/urls.py

urlpatterns = [
    # ... existing patterns ...
    
    # Design Sheet
    path('styles/<int:pk>/design-sheet/', 
         DesignSheetView.as_view()),
    path('styles/<int:pk>/design-sheet/status/', 
         DesignSheetStatusView.as_view()),
    
    # Fit Specifications
    path('design-sheets/<int:pk>/fit-specs/', 
         FitSpecListCreateView.as_view()),
    path('fit-specs/<int:pk>/', 
         FitSpecDetailView.as_view()),
    path('fit-specs/<int:pk>/images/', 
         FitSpecImageListCreateView.as_view()),
    
    # Job Requests
    path('design-sheets/<int:pk>/job-requests/', 
         JobRequestListCreateView.as_view()),
    path('job-requests/<int:pk>/', 
         JobRequestDetailView.as_view()),
    
    # Sketch Upload
    path('techpacks/<int:pk>/sketch/', 
         TechPackSketchUploadView.as_view()),
    
    # Notes
    path('techpacks/<int:pk>/notes/', 
         TechPackNotesView.as_view()),
]
```

**Views:**
```python
# apps/merchandising/views.py

class DesignSheetView(RetrieveUpdateAPIView):
    """Get/Update design sheet linked to tech pack"""
    queryset = DesignSheet.objects.all()
    serializer_class = DesignSheetSerializer
    
    def get_object(self):
        tech_pack = get_object_or_404(
            StyleTechPack, 
            pk=self.kwargs['pk']
        )
        return tech_pack.design_sheet

class FitSpecListCreateView(ListCreateAPIView):
    """List/Create fit specifications"""
    serializer_class = FitSpecificationSerializer
    
    def get_queryset(self):
        return FitSpecification.objects.filter(
            design_sheet__tech_pack__pk=self.kwargs['pk']
        )
    
    def perform_create(self, serializer):
        design_sheet = DesignSheet.objects.get(
            tech_pack__pk=self.kwargs['pk']
        )
        serializer.save(design_sheet=design_sheet)

class JobRequestListCreateView(ListCreateAPIView):
    """List/Create job requests"""
    serializer_class = JobRequestSerializer
    
    def get_queryset(self):
        return JobRequest.objects.filter(
            design_sheet__tech_pack__pk=self.kwargs['pk']
        )
    
    def perform_create(self, serializer):
        design_sheet = DesignSheet.objects.get(
            tech_pack__pk=self.kwargs['pk']
        )
        serializer.save(design_sheet=design_sheet)
```

### Phase 5: Print Template (Week 5)

**Print Layout:**
```tsx
// DesignSheetPrintPage.tsx

function DesignSheetPrintPage() {
  return (
    <div className="print-layout">
      {/* Header */}
      <div className="print-header">
        <h1>CCL DESIGN SHEET</h1>
        <div className="header-grid">
          <div>Issue Date: {data.issue_date}</div>
          <div>Block: {data.block}</div>
          <div>Designer: {data.designer}</div>
          <div>Size: {data.size}</div>
          <div>Style Number: {data.style_number}</div>
          <div>Based on: {data.based_on}</div>
          <div>Patt Cutter: {data.pattern_cutter}</div>
          <div>Description: {data.description}</div>
          <div>Issuer: {data.issuer}</div>
          <div>Customer: {data.customer}</div>
          <div>Cloth Code: {data.cloth_code}</div>
        </div>
      </div>
      
      {/* Sketch */}
      <div className="print-sketch">
        {data.sketch_image && (
          <img src={data.sketch_image} alt="Sketch" />
        )}
      </div>
      
      {/* Material Grid */}
      <div className="print-material">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Description/Code</th>
              <th>Location</th>
              <th>Supplier</th>
              <th>Colour</th>
              <th>W/Size</th>
              <th>Qty</th>
              <th>Match</th>
            </tr>
          </thead>
          <tbody>
            {data.bom_items.map(item => (
              <tr key={item.id}>
                <td>{item.type}</td>
                <td>{item.description_code}</td>
                <td>{item.location}</td>
                <td>{item.supplier}</td>
                <td>{item.colour}</td>
                <td>{item.width_size}</td>
                <td>{item.qty}</td>
                <td>{item.match}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer */}
      <div className="print-footer">
        Carmel Clothing Copyright ©2022
        -Printed {new Date().toLocaleString()}
        By {currentUser.name}
      </div>
    </div>
  );
}
```

---

## 4. Updated Roadmap Integration

### 4.1 Phase Mapping

| Roadmap Phase | Design Sheet Tasks | Tech Pack Connection |
|---------------|-------------------|---------------------|
| **Phase 1** | Foundation & Grid System | Tabulator setup, context menus |
| **Phase 2** | Design Management | DesignSheet model, image upload, fit specs |
| **Phase 3** | Costing System | Cost sheet links to design sheet |
| **Phase 4** | Order Management | FN links to design sheet |
| **Phase 5** | Material Booking | BOM from tech pack feeds booking |
| **Phase 6** | Scheduling & Reports | Design sheet status in reports |
| **Phase 7** | Integration & Polish | Print templates, audit trail |

### 4.2 Feature Checklist Update

**B.1 Design Management (47 features) → Tech Pack Connection:**

| # | Feature | Tech Pack Connection | Status |
|---|---------|---------------------|--------|
| 1 | Style creation with auto-generated code | ✅ `import_style_from_techpack()` | DONE |
| 2 | Design sheet with all fields | ✅ `StyleTechPack` has 14 fields | PARTIAL |
| 3 | Image gallery (list/image toggle) | ❌ Need image upload | TODO |
| 4 | Main design image | ❌ Need `sketch_image` field | TODO |
| 5 | Range photo | ❌ Need `other_images` JSON | TODO |
| 6 | Sample photos | ❌ Need image gallery | TODO |
| 7 | Text box annotations | ❌ Need overlay component | TODO |
| 8 | Right-click context menu on images | ❌ Need context menu | TODO |
| 9 | Image resize, set as design/range | ❌ Need image operations | TODO |
| 10 | Other Photos tab | ❌ Need tab component | TODO |
| 11 | Print area (cream/grey) | ❌ Need print CSS | TODO |
| 12 | Block reference management | ✅ `block` field exists | DONE |
| 13 | Season field | ❌ Need to add field | TODO |
| 14 | Issuer and Designer (mandatory) | ✅ `issuer`, `designer` fields | DONE |
| 15 | Status workflow | ❌ Need DesignSheet model | TODO |
| 16 | Mandatory field validation | ❌ Need validation logic | TODO |
| 17 | Style relationship | ❌ Need `based_on` link | TODO |
| 18 | Include/exclude annotations on copy | ❌ Need copy logic | TODO |
| 19 | Fit Specifications (multiple) | ❌ Need FitSpecification model | TODO |
| 20 | Copy from base/development sheet | ❌ Need copy API | TODO |
| 21 | Copy from another style number | ❌ Need copy API | TODO |
| 22 | Include/exclude schedule from spec | ❌ Need schedule link | TODO |
| 23 | Selected specification tick box | ❌ Need `is_selected` field | TODO |
| 24 | Tab description editing | ❌ Need UI | TODO |
| 25 | Design Costings (multiple versions) | ❌ Phase 3 | TODO |
| 26-47 | [Other features] | ❌ Phase 3-7 | TODO |

---

## 5. Migration Plan

### 5.1 New Migrations Required

| # | Migration | Purpose |
|---|-----------|---------|
| 1 | `0027_styletechpack_image_fields.py` | Add `sketch_image`, `other_images`, `notes_initials`, `notes_date` |
| 2 | `0028_designsheet.py` | Create `DesignSheet` model |
| 3 | `0029_fitspecification.py` | Create `FitSpecification` + `FitImage` models |
| 4 | `0030_jobrequest.py` | Create `JobRequest` model |

### 5.2 Data Migration

```python
# Migration 0028: Create DesignSheet for existing TechPacks

def create_design_sheets(apps, schema_editor):
    StyleTechPack = apps.get_model('merchandising', 'StyleTechPack')
    DesignSheet = apps.get_model('merchandising', 'DesignSheet')
    
    for techpack in StyleTechPack.objects.all():
        DesignSheet.objects.get_or_create(
            tech_pack=techpack,
            defaults={'status': 'NEW'}
        )
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

> **Aligned to implementation (2026-08-30).** File names/counts reflect the
> actual suite; documented intent is preserved. Run (from `backend/`):
> `python -m pytest tests/unit/test_design_sheet*.py tests/unit/test_fit_spec.py tests/unit/test_job_request.py`
>
> **2026-08-31:** +30→ design-sheet model/rules tests (30 in file), new
> `test_design_sheet_e2e_flows.py` (6 journey tests), and migration
> `0033_fitspecification_unique_selected_fit_spec_per_design_sheet.py`
> (partial `UniqueConstraint` — one selected fit spec per design sheet
> enforced at the DB, not just the `select` endpoint).
>
> **2026-08-31 (GC gap closure):** `test_design_sheet_api.py` →25
> (transition issuer/designer guard, `season`/`style_id` on detail),
> `test_design_sheet_fit_spec_copy.py` →10 (annotations include flag).
> Full design-sheet subset **92 passed**. Frontend: new
> `DesignSheetImages.tsx` gallery (10 tests), copy-from-base annotations
> checkbox, fit-spec description inline editing → full suite **12 files /
> 113 tests**, `tsc -b` clean, lint 0 errors.

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `test_design_sheet.py` | 30 | DesignSheet model, status transitions (`transition_to`), related cascades, FitSpec/FitImage/DesignJobRequest model rules, one-selected-per-sheet constraint |
| `test_design_sheet_api.py` | 25 | DesignSheet / fit-spec / job / sketch / notes API; mandatory issuer+designer transition guard; `season` + `style_id` on detail |
| `test_design_sheet_material_grid.py` | 5 | Material Breakdown grid API flow (`material_items`, BOMItem PATCH/POST) |
| `test_design_sheet_fit_spec_copy.py` | 10 | `copy-fit-spec` action: selected-source copy, base (`based_on`) resolution, images include/exclude, annotations include/exclude, fallbacks, 400 cases |
| `test_design_sheet_e2e_flows.py` | 6 | Journey-level API flows: intro (sketch→notes→sheet→annotations→transition), fit-spec lifecycle + images + selection, copy-from-base (±images), job allocate/status, cross-tenant refusal, DB-enforced single selection |
| `test_fit_spec.py` | 16 | FitSpec CRUD, selection, image upload |
| `test_job_request.py` | 14 | DesignJobRequest CRUD, status transitions |
| `test_design_costing.py` | 22 | Design sheet costings |
| `test_design_image.py` | 16 | Design image gallery / operations |

### 6.2 Integration Tests

| Flow | Steps |
|------|-------|
| **Extract → Design Sheet** | Upload PDF → Extract → View Design Sheet → Verify all fields |
| **Design Sheet → Fit Specs** | Create fit spec → Upload images → Select spec |
| **Design Sheet → Job Request** | Create job request → Allocate → Track status |
| **Design Sheet → Print** | Generate print preview → Verify layout |

### 6.3 E2E Tests

| Scenario | Steps |
|----------|-------|
| **Full Design Flow** | Upload PDF → Extract → View Design Sheet → Add Fit Specs → Request Jobs → Print |
| **Edit and Re-import** | Extract → Download Excel → Edit → Re-import → Verify changes |

---

## 7. Timeline

| Week | Task | Deliverable |
|------|------|-------------|
| **Week 1** | Enhance StyleTechPack model | Image fields, notes enhancement |
| **Week 2** | Create DesignSheet + FitSpec + JobRequest models | Migrations, serializers |
| **Week 3** | DesignSheetPage.tsx + Header + Sketch | Frontend views |
| **Week 4** | Tabulator integration + API endpoints | Grid component, API |
| **Week 5** | FitSpec + JobRequest components | Tab components |
| **Week 6** | Print template + Testing | Print layout, tests |

**Total: 6 weeks** (Added to Phase 2 of roadmap)

---

## 8. Dependencies

| Dependency | Required For | Status |
|------------|--------------|--------|
| `tabulator-tables` | Material grid | ✅ Planned in Phase 1 |
| `react-tabulator` | React wrapper | ✅ Planned in Phase 1 |
| `xlsx` (SheetJS) | Excel I/O | ✅ Already used |
| `openpyxl` | Excel generation | ✅ Already used |
| `pdfplumber` | PDF extraction | ✅ Already used |
| `Pillow` | Image processing | ✅ Already installed |
| `django-filter` | API filtering | ✅ Already installed |

---

*Document Version: 1.0*
*Created: August 27, 2026*
*Author: AI Chief of Staff*
