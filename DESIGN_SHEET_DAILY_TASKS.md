# Design Sheet Connection - Daily Task Breakdown

**Duration:** 6 weeks (30 working days)
**Start Date:** TBD
**Objective:** Connect Tech Pack PDF extractor to GC Design Sheet workflow

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
- [ ] Add data migration for existing TechPacks
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
- [ ] Connect Header to API
- [ ] Connect Sketch to API
- [ ] Test image upload flow
- [ ] Fix any bugs
- [ ] Commit and push to git

---

## Week 4: Tabulator Integration + API Endpoints

### Day 16 (Monday) - Tabulator Setup
- [ ] Install `tabulator-tables` + `react-tabulator`
- [ ] Create `SpreadsheetGrid.tsx` wrapper
- [ ] Configure basic options
- [ ] Test with sample data

### Day 17 (Tuesday) - Material Grid
- [ ] Create `DesignSheetMaterial.tsx`
- [ ] Define columns (Type, Description, Location, etc.)
- [ ] Add inline editing
- [ ] Add row selection
- [ ] Add context menu

### Day 18 (Wednesday) - Grid Features
- [ ] Add column visibility toggle
- [ ] Add row grouping by Type
- [ ] Add clipboard paste
- [ ] Add undo/redo
- [ ] Add export to Excel

### Day 19 (Thursday) - API Endpoints
- [ ] Create `DesignSheetView` (GET/PUT)
- [ ] Create `DesignSheetStatusView` (PATCH)
- [ ] Create `FitSpecListCreateView` (GET/POST)
- [ ] Create `JobRequestListCreateView` (GET/POST)
- [ ] Write API tests

### Day 20 (Friday) - Integration
- [ ] Connect Material Grid to API
- [ ] Test inline editing flow
- [ ] Test group by Type
- [ ] Fix any bugs
- [ ] Commit and push to git

---

## Week 5: FitSpec + JobRequest Components

### Day 21 (Monday) - FitSpec Component
- [ ] Create `DesignSheetFitSpecs.tsx`
- [ ] Add tabbed interface (Dev Spec, 1st Fit, 2nd Fit, etc.)
- [ ] Add "New Fit Spec" button
- [ ] Add fit spec form (date, description, notes)
- [ ] Add select tick box

### Day 22 (Tuesday) - FitSpec Images
- [ ] Add image upload to fit spec
- [ ] Add image gallery view
- [ ] Add image delete
- [ ] Add image reorder

### Day 23 (Wednesday) - FitSpec Copy
- [ ] Add "Copy from Base" button
- [ ] Add "Copy from Another Style" button
- [ ] Add copy confirmation dialog
- [ ] Add include/exclude schedule option

### Day 24 (Thursday) - JobRequest Component
- [ ] Create `DesignSheetJobRequests.tsx`
- [ ] Add job request list view
- [ ] Add job request form (type, date, location, quantity)
- [ ] Add allocate to user dropdown
- [ ] Add status badges

### Day 25 (Friday) - Integration
- [ ] Connect FitSpec to API
- [ ] Connect JobRequest to API
- [ ] Test fit spec flow
- [ ] Test job request flow
- [ ] Commit and push to git

---

## Week 6: Print Template + Testing

### Day 26 (Monday) - Print Template
- [ ] Create `DesignSheetPrintPage.tsx`
- [ ] Add header section
- [ ] Add sketch section
- [ ] Add material grid section
- [ ] Add footer (Carmel copyright + timestamp)

### Day 27 (Tuesday) - Print Features
- [ ] Add selective printing (tick boxes)
- [ ] Add print preview
- [ ] Add print area CSS (cream/grey)
- [ ] Add double-sided optimization

### Day 28 (Wednesday) - Unit Tests
- [ ] Write DesignSheet model tests
- [ ] Write FitSpecification model tests
- [ ] Write JobRequest model tests
- [ ] Write API endpoint tests

### Day 29 (Thursday) - Integration Tests
- [ ] Test full design flow (Upload → Extract → View → Edit)
- [ ] Test fit spec flow (Create → Upload Images → Select)
- [ ] Test job request flow (Create → Allocate → Track)
- [ ] Test print flow (Generate → Preview → Print)

### Day 30 (Friday) - Final Polish
- [ ] Fix any remaining bugs
- [ ] Update documentation
- [ ] Update AGENTS.md
- [ ] Commit and push to git
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
