# Design Sheet Connection - Daily Task Breakdown

**Duration:** 6 weeks (30 working days)
**Start Date:** TBD
**Objective:** Connect Tech Pack PDF extractor to target Design Sheet workflow

---

## Week 1: Enhance StyleTechPack Model

### Day 1 (Monday) - Model Fields
- [x] Add `sketch_image` ImageField to StyleTechPack
- [x] Add `other_images` JSONField to StyleTechPack
- [x] Add `notes_initials` CharField to StyleTechPack
- [x] Add `notes_date` DateTimeField to StyleTechPack
- [x] Create migration `0027_styletechpack_image_fields.py`
- [x] Run migration and verify

### Day 2 (Tuesday) - Serializer Update
- [x] Update `StyleTechPackSerializer` with new fields
- [x] Add `sketch_image_url` computed property
- [x] Add `other_images` handling
- [x] Update `StyleSerializer` to include design sheet link
- [x] Write unit tests for new fields

### Day 3 (Wednesday) - Sketch Upload Endpoint
- [x] Create `TechPackSketchUploadView` (PUT/PATCH)
- [x] Add image validation (size, type)
- [x] Add image resize logic (max 1920px)
- [x] Add thumbnail generation (150x150)
- [x] Write API tests

### Day 4 (Thursday) - Notes Endpoint
- [x] Create `TechPackNotesView` (PUT/PATCH)
- [x] Auto-append initials + date on save
- [x] Validate initials (max 10 chars)
- [x] Write API tests

### Day 5 (Friday) - Integration Testing
- [x] Test sketch upload flow end-to-end
- [x] Test notes update flow end-to-end
- [x] Verify image storage paths
- [ ] Fix any bugs found
- [ ] Commit and push to git

---

## Week 2: Create DesignSheet + FitSpec + JobRequest Models

### Day 6 (Monday) - DesignSheet Model
- [x] Create `DesignSheet` model (status, created_at, updated_at)
- [x] Add OneToOneField to StyleTechPack
- [x] Create migration `0028_designsheet.py`
- [x] Add data migration for existing TechPacks (`0032_designsheet_backfill_data` — get_or_create backfill)
- [x] Write model tests

### Day 7 (Tuesday) - FitSpecification Model
- [x] Create `FitSpecification` model
- [x] Add ForeignKey to DesignSheet
- [x] Create migration `0029_fitspecification.py`
- [x] Write model tests

### Day 8 (Wednesday) - FitImage + JobRequest Models
- [x] Create `FitImage` model
- [x] Create `DesignJobRequest` model
- [x] Create migrations
- [x] Write model tests

### Day 9 (Thursday) - Serializers
- [x] Create `DesignSheetSerializer`
- [x] Create `FitSpecificationSerializer`
- [x] Create `FitImageSerializer`
- [x] Create `DesignJobRequestSerializer`
- [x] Write serializer tests

### Day 10 (Friday) - Import Service Update
- [x] Update `import_style_from_techpack()` to create DesignSheet
- [x] Update `TechPackImportResult` dataclass
- [x] Update import endpoint response
- [x] Write integration tests
- [ ] Commit and push to git

---

## Week 3: DesignSheetPage.tsx + Header + Sketch

### Day 11 (Monday) - Page Structure
- [x] Create `DesignSheetPage.tsx` skeleton
- [x] Add route to `App.tsx`
- [x] Add nav item to `Layout.tsx`
- [x] Create page layout (header, sections)
- [x] Add loading states

### Day 12 (Tuesday) - Header Component
- [x] Create `DesignSheetHeader.tsx`
- [x] Display all 14 design-info fields
- [x] Add status badge (New/Rejected/Closed/Archived)
- [x] Add status change dropdown
- [x] Style with Tailwind

### Day 13 (Wednesday) - Sketch Component
- [x] Create `DesignSheetSketch.tsx`
- [x] Display sketch image (if exists)
- [x] Add image upload button
- [x] Add drag-drop zone
- [x] Add image preview modal

### Day 14 (Thursday) - Sketch Annotations
- [x] Add annotation overlay component
- [x] Add text box annotations
- [x] Add annotation save/load
- [x] Add annotation delete

### Day 15 (Friday) - Integration
- [x] Connect Header to API
- [x] Connect Sketch to API
- [x] Test image upload flow
- [x] Fix any bugs
- [x] Commit (and push - blocked on GitHub re-auth)

---

## Week 4: Tabulator Integration + API Endpoints

### Day 16 (Monday) - Tabulator Setup
- [x] Install `tabulator-tables` + `react-tabulator`
- [x] Create `SpreadsheetGrid.tsx` wrapper
- [x] Configure basic options
- [x] Test with sample data

### Day 17 (Tuesday) - Material Grid
- [x] Create `DesignSheetMaterial.tsx`
- [x] Define columns (Type, Description, Location, etc.)
- [x] Add inline editing
- [x] Add row selection
- [x] Add context menu

### Day 18 (Wednesday) - Grid Features
- [x] Add column visibility toggle
- [x] Add row grouping by Type
- [x] Add clipboard paste
- [x] Add undo/redo
- [x] Add export to Excel

### Day 19 (Thursday) - API Endpoints
- [x] Create `DesignSheetView` (GET/PUT) — `DesignSheetViewSet` (superseded the named view; exists since Week 2)
- [x] Create `DesignSheetStatusView` (PATCH) — `transition` action on the ViewSet
- [x] Create `FitSpecListCreateView` (GET/POST) — `fit-specifications` route
- [x] Create `JobRequestListCreateView` (GET/POST) — `create-job` action + job routes
- [x] Write API tests — incl. new `test_design_sheet_material_grid.py` (BOMItem read/write for the grid)

### Day 20 (Friday) - Integration
- [x] Connect Material Grid to API — `material_items` on design-sheet detail + `BOMItem` PATCH/POST/DELETE via adapter (`src/api/materialGrid.ts`)
- [x] Test inline editing flow — API persists edits, optimistic local refresh
- [x] Test group by Type — `groupBy="type"` live (Tabulator groups)
- [x] Fix any bugs
- [ ] Commit and push to git

---

## Week 5: FitSpec + JobRequest Components

### Day 21 (Monday) - FitSpec Component
- [x] Create `DesignSheetFitSpecs.tsx`
- [x] Add tabbed interface (Dev Spec, 1st Fit, 2nd Fit, etc.)
- [x] Add "New Fit Spec" button
- [x] Add fit spec form (date, description, notes)
- [x] Add select tick box

### Day 22 (Tuesday) - FitSpec Images
- [x] Add image upload to fit spec — gallery for selected spec + upload (multipart FormData) + delete + move up/down reorder; live-smoke verified
- [x] Add image gallery view — thumbnails + captions on the selected fit-spec tab
- [x] Add image delete — `deleteFitImage` + PATCH on OrderIndex reorder
- [x] Add image reorder — move-up/move-down with clamped order; verified live

### Day 23 (Wednesday) - FitSpec Copy
- [x] Add "Copy from Base" button — resolves base via `tech_pack.based_on`, copies latest/source selected spec
- [x] Add "Copy from Another Style" button — `DesignSheetViewSet.copy_fit_spec` action + source picker (excludes current sheet)
- [x] Add copy confirmation dialog — copy current selected spec, auto-numbers next label, marks copied spec selected
- [x] Add include/exclude schedule option — `include_images` flag (default true); images copied by default
- [x] Backend `test_design_sheet_fit_spec_copy.py` — 8 tests GREEN; live smoke TP-1002 → TP-1001 verified + cleaned up

### Day 24 (Thursday) - JobRequest Component
- [x] Create `DesignSheetJobRequests.tsx`
- [x] Add job request list view
- [x] Add job request form (type, date, location, quantity)
- [x] Add allocate to user dropdown
- [x] Add status badges

### Day 25 (Friday) - Integration
- [x] Connect FitSpec to API
- [x] Connect JobRequest to API
- [x] Test fit spec flow
- [x] Test job request flow
- [ ] Commit and push to git

---

## Week 6: Print Template + Testing

### Day 26 (Monday) - Print Template
- [x] Create `DesignSheetPrintPage.tsx` — standalone route `/design-sheets/:id/print`, no sidebar (print-clean)
- [x] Add header section — file/style/buyer + full 14-field Design Information table (reuses `DESIGN_INFO_FIELDS`)
- [x] Add sketch section — image or "No sketch uploaded" placeholder
- [x] Add material grid section — static 8-col table (Type…Match) with Qty total row
- [x] Add footer (Carmel copyright + timestamp) — CARMEL APPARELS + printed-at timestamp

### Day 27 (Tuesday) - Print Features
- [x] Add selective printing (tick boxes) — per-item FitSpec + material tick boxes; none ticked ⇒ print ALL, any ticked ⇒ print only ticked (target behaviour)
- [x] Add print preview — toolbard Preview/Exit-Preview toggle (hides Print trigger while previewing)
- [x] Add print area CSS (cream/grey) — cream printable sheet (`#f8f3e6`) surrounded by grey no-print gutter; `@page` A4 rules
- [x] Add double-sided optimization — `@media print` `break-inside: avoid` on sections so pages stay clean when printed double-sided

### Day 28 (Wednesday) - Unit Tests
- [x] DesignSheet model tests — `test_design_sheet.py` (29): default status/annotations, `__str__`, one-sheet-per-techpack, `transition_to` workflow incl. reopen + invalid rejection, cascades, tenant isolation
- [x] FitSpecification model tests — new: `__str__` format, ordering by `fit_number`, same number allowed across sheets, selection (`is_selected`) independence per sheet
- [x] FitImage model tests — new: `__str__` includes fit number, ordering by `order` field
- [x] DesignJobRequest model tests — new: `__str__` (job type + techpack), type/status choices, ordering by `required_by` DESC, `allocated_to` SET_NULL on user delete
- [x] API endpoint tests — full design-sheet backend subset GREEN: `test_design_sheet.py` + `test_design_sheet_api.py` + `test_design_sheet_material_grid.py` + `test_design_sheet_fit_spec_copy.py` = 63 passed

### Day 29 (Thursday) - Integration Tests
- [x] Integration — intro flow: sketch upload → notes (initials/date) → create sheet → annotations → transition → full detail
- [x] Integration — fit spec flow: create specs → upload/reorder images → select current (single-selection) → sheet detail reflects it
- [x] Integration — copy flow: selected spec + images copied onto child techpack via `based_on`; follow-up copy without images lands as next label
- [x] Integration — job request flow: create → allocate (with name) → in_progress → completed → sheet detail carries final state
- [x] Integration — cross-tenant copy refused (404 under tenant isolation); `select` keeps single current (DB constraint)
- [x] New `backend/tests/unit/test_design_sheet_e2e_flows.py` (6 journey tests) — GREEN
- [x] `is_selected` single-selection now enforced at DB: partial `UniqueConstraint` migration `0033_fitspecification_unique_selected_fit_spec_per_design_sheet.py`, pre-migration violation check clean, applied to dev DB

### Day 30 (Friday) - Final Polish (target gap closure)
- [x] Copy fit spec with annotations — `include_annotations` flag on `copy_fit_spec`; target gets fresh-UUID annotations; 2 new tests
- [x] Mandatory issuer/designer guard — `transition` returns 400 when moving out of New without `issuer`+`designer`; 3 new API tests; E2E intro flow updated
- [x] Design sheet `season` + `style_id` — serializer fields (source `tech_pack.style`), DesignSheet TS interface, Season row added to `DESIGN_INFO_FIELDS` (header + print)
- [x] Design Images gallery frontend — new `DesignSheetImages.tsx` (upload, role select, set-main via context menu, role change, delete, image/list toggle, range-only filter) wired into `DesignSheetPage`; 10 new component tests
- [x] Copy-from-base dialog — include-annotations checkbox (two-step confirm); 3 new tests
- [x] Fit spec description inline editing — editable on selected tab + Save; 2 new tests
- [x] Full sweep GREEN — backend design-sheet subset 92 passed; frontend 12 files / 113 tests; `tsc -b` exit 0; lint 0 errors
- [ ] Update AGENTS.md (not present in repo)
- [ ] Commit and push to git (push blocked — GitHub re-auth needed)
- [ ] Deploy to dev environment

---

## Summary

| Week | Focus | Days | Key Deliverables |
|------|-------|------|------------------|
| 1 | Model Enhancement | 5 | Image fields, notes, upload endpoints |
| 2 | New Models | 5 | DesignSheet, FitSpec, JobRequest |
| 3 | Frontend Views | 5 | DesignSheetPage, Header, Sketch |
| 4 | Tabulator + API | 5 | Material Grid, API endpoints |
| 5 | FitSpec + JobRequest | 5 | FitSpec tabs, JobRequest queue |
| 6 | Print + Testing | 5 | Print template, tests |

**Total: 30 working days**

---

*Document Version: 1.0*
*Created: August 27, 2026*
*Author: AI Chief of Staff*
