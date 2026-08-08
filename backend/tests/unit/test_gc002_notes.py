"""
Tests for GC-002: Standardized Notes System.
"""
import pytest
from django.db import models
from apps.core.models import Note


@pytest.mark.django_db
class TestNoteAbstractModel:
    """Note is abstract — test via a concrete model."""

    def test_note_has_author_text_timestamps(self, tenant, user):
        from apps.merchandising.models import FileOpeningNote, Style, FileOpening
        from apps.setup.models import Buyer, Factory
        buyer = Buyer.objects.create(tenant=tenant, code="BUY001", name="Test Buyer")
        factory = Factory.objects.create(tenant=tenant, code="FAC001", name="Test Factory")
        style = Style.objects.create(
            tenant=tenant, style_number="STY001", name="Test Style",
            buyer=buyer, created_by=user
        )
        version = pytest.importorskip("apps.merchandising.models").StyleVersion.objects.create(
            tenant=tenant, style=style, version_number=1, created_by=user
        )
        fo = FileOpening.objects.create(
            tenant=tenant, file_number="FO-00001", style=style,
            style_version=version, buyer=buyer, factory=factory,
            file_date="2025-01-01", created_by=user
        )
        note = FileOpeningNote.objects.create(
            tenant=tenant, file_opening=fo,
            text="This is a test note for the file opening.",
            created_by=user, author=user,
        )
        assert note.text == "This is a test note for the file opening."
        assert note.author == user
        assert note.created_by == user
        assert note.is_active is True
        assert note.created_at is not None

    def test_note_soft_delete(self, tenant, user):
        from apps.merchandising.models import FileOpeningNote, Style, FileOpening
        from apps.setup.models import Buyer, Factory
        buyer = Buyer.objects.create(tenant=tenant, code="BUY002", name="Test Buyer 2")
        factory = Factory.objects.create(tenant=tenant, code="FAC002", name="Test Factory 2")
        style = Style.objects.create(
            tenant=tenant, style_number="STY002", name="Test Style 2",
            buyer=buyer, created_by=user
        )
        version = pytest.importorskip("apps.merchandising.models").StyleVersion.objects.create(
            tenant=tenant, style=style, version_number=1, created_by=user
        )
        fo = FileOpening.objects.create(
            tenant=tenant, file_number="FO-00002", style=style,
            style_version=version, buyer=buyer, factory=factory,
            file_date="2025-01-01", created_by=user
        )
        note = FileOpeningNote.objects.create(
            tenant=tenant, file_opening=fo,
            text="This note will be soft-deleted.",
            created_by=user, author=user,
        )
        assert note.is_active is True
        note.is_active = False
        note.save()
        assert FileOpeningNote.objects.filter(id=note.id, is_active=False).exists()

    def test_note_ordering(self, tenant, user):
        from apps.merchandising.models import FileOpeningNote, Style, FileOpening
        from apps.setup.models import Buyer, Factory
        buyer = Buyer.objects.create(tenant=tenant, code="BUY003", name="Test Buyer 3")
        factory = Factory.objects.create(tenant=tenant, code="FAC003", name="Test Factory 3")
        style = Style.objects.create(
            tenant=tenant, style_number="STY003", name="Test Style 3",
            buyer=buyer, created_by=user
        )
        version = pytest.importorskip("apps.merchandising.models").StyleVersion.objects.create(
            tenant=tenant, style=style, version_number=1, created_by=user
        )
        fo = FileOpening.objects.create(
            tenant=tenant, file_number="FO-00003", style=style,
            style_version=version, buyer=buyer, factory=factory,
            file_date="2025-01-01", created_by=user
        )
        note1 = FileOpeningNote.objects.create(
            tenant=tenant, file_opening=fo,
            text="First note", created_by=user, author=user,
        )
        note2 = FileOpeningNote.objects.create(
            tenant=tenant, file_opening=fo,
            text="Second note", created_by=user, author=user,
        )
        notes = list(FileOpeningNote.objects.filter(file_opening=fo))
        assert notes == [note2, note1]  # newest first

    def test_note_author_initials_generated(self, tenant, user):
        from apps.merchandising.models import FileOpeningNote, Style, FileOpening
        from apps.setup.models import Buyer, Factory
        buyer = Buyer.objects.create(tenant=tenant, code="BUY004", name="Test Buyer 4")
        factory = Factory.objects.create(tenant=tenant, code="FAC004", name="Test Factory 4")
        style = Style.objects.create(
            tenant=tenant, style_number="STY004", name="Test Style 4",
            buyer=buyer, created_by=user
        )
        version = pytest.importorskip("apps.merchandising.models").StyleVersion.objects.create(
            tenant=tenant, style=style, version_number=1, created_by=user
        )
        fo = FileOpening.objects.create(
            tenant=tenant, file_number="FO-00004", style=style,
            style_version=version, buyer=buyer, factory=factory,
            file_date="2025-01-01", created_by=user
        )
        note = FileOpeningNote.objects.create(
            tenant=tenant, file_opening=fo,
            text="Note with author initials.",
            created_by=user, author=user,
        )
        assert note.author_initials == "TU"


@pytest.mark.django_db
class TestNoteIsAbstract:
    def test_note_cannot_be_instantiated_directly(self):
        from django.db import models
        assert Note._meta.abstract is True
