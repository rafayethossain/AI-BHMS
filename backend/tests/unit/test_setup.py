"""
Tests for setup models.
"""
import pytest
from apps.setup.models import (
    Season, ProductCategory, ProductType, ProductDepartment,
    Currency, UOM, Country, PaymentTerms, Department, Designation,
    ColorCode, Buyer, Brand, Factory, Vendor
)


@pytest.mark.django_db
class TestSeason:
    def test_create_season(self, tenant):
        season = Season.objects.create(
            tenant=tenant,
            code="SS24",
            name="Spring Summer 2024",
            status="active"
        )
        assert season.code == "SS24"
        assert season.name == "Spring Summer 2024"

    def test_season_str(self, tenant):
        season = Season.objects.create(
            tenant=tenant,
            code="SS24",
            name="Spring Summer 2024"
        )
        assert str(season) == "SS24 - Spring Summer 2024"


@pytest.mark.django_db
class TestBuyer:
    def test_create_buyer(self, tenant):
        buyer = Buyer.objects.create(
            tenant=tenant,
            code="BUY001",
            name="H&M",
            contact_person="John Doe",
            email="john@hm.com",
            phone="+8801712345678",
            address="Dhaka"
        )
        assert buyer.code == "BUY001"
        assert buyer.name == "H&M"

    def test_buyer_str(self, tenant):
        buyer = Buyer.objects.create(
            tenant=tenant,
            code="BUY001",
            name="H&M"
        )
        assert str(buyer) == "BUY001 - H&M"


@pytest.mark.django_db
class TestBrand:
    def test_create_brand(self, tenant):
        buyer = Buyer.objects.create(
            tenant=tenant,
            code="BUY001",
            name="H&M"
        )
        brand = Brand.objects.create(
            tenant=tenant,
            buyer=buyer,
            code="BR001",
            name="HM Divided",
            status="active"
        )
        assert brand.code == "BR001"
        assert brand.buyer == buyer

    def test_brand_str(self, tenant):
        buyer = Buyer.objects.create(
            tenant=tenant,
            code="BUY001",
            name="H&M"
        )
        brand = Brand.objects.create(
            tenant=tenant,
            buyer=buyer,
            code="BR001",
            name="HM Divided"
        )
        assert str(brand) == "BUY001 - BR001 - HM Divided"


@pytest.mark.django_db
class TestFactory:
    def test_create_factory(self, tenant):
        factory = Factory.objects.create(
            tenant=tenant,
            code="FAC001",
            name="Apex Textile Mills Ltd",
            contact_person="Jane Smith",
            email="jane@apex.com",
            phone="+8801712345679",
            address="Chattogram",
            city="Chattogram",
            capacity=500,
            factory_type="knitting"
        )
        assert factory.code == "FAC001"
        assert factory.name == "Apex Textile Mills Ltd"
        assert factory.capacity == 500

    def test_factory_str(self, tenant):
        factory = Factory.objects.create(
            tenant=tenant,
            code="FAC001",
            name="Apex Textile Mills Ltd"
        )
        assert str(factory) == "FAC001 - Apex Textile Mills Ltd"


@pytest.mark.django_db
class TestCurrency:
    def test_create_currency(self, tenant):
        currency = Currency.objects.create(
            tenant=tenant,
            code="USD",
            name="US Dollar",
            symbol="$",
            is_default=True,
            exchange_rate=110.00
        )
        assert currency.code == "USD"
        assert currency.exchange_rate == 110.00
        assert currency.is_default is True


@pytest.mark.django_db
class TestProductCategory:
    def test_create_category(self, tenant):
        category = ProductCategory.objects.create(
            tenant=tenant,
            code="TSH",
            name="T-Shirt",
            status="active"
        )
        assert category.code == "TSH"
        assert category.name == "T-Shirt"

    def test_category_str(self, tenant):
        category = ProductCategory.objects.create(
            tenant=tenant,
            code="TSH",
            name="T-Shirt"
        )
        assert str(category) == "TSH - T-Shirt"


@pytest.mark.django_db
class TestDepartment:
    def test_create_department(self, tenant):
        dept = Department.objects.create(
            tenant=tenant,
            code="MKT",
            name="Marketing",
            status="active"
        )
        assert dept.code == "MKT"
        assert dept.name == "Marketing"


@pytest.mark.django_db
class TestDesignation:
    def test_create_designation(self, tenant):
        desig = Designation.objects.create(
            tenant=tenant,
            code="MD",
            name="Merchandiser",
            status="active"
        )
        assert desig.code == "MD"
        assert desig.name == "Merchandiser"


@pytest.mark.django_db
class TestPaymentTerms:
    def test_create_payment_terms(self, tenant):
        pt = PaymentTerms.objects.create(
            tenant=tenant,
            code="N30",
            name="Net 30",
            days=30,
            description="Payment due in 30 days",
            status="active"
        )
        assert pt.code == "N30"
        assert pt.days == 30

    def test_payment_terms_str(self, tenant):
        pt = PaymentTerms.objects.create(
            tenant=tenant,
            code="N30",
            name="Net 30",
            days=30
        )
        assert str(pt) == "N30 - Net 30 (30 days)"


@pytest.mark.django_db
class TestUOM:
    def test_create_uom(self, tenant):
        uom = UOM.objects.create(
            tenant=tenant,
            code="PCS",
            name="Pieces",
            status="active"
        )
        assert uom.code == "PCS"
        assert uom.name == "Pieces"


@pytest.mark.django_db
class TestColorCode:
    def test_create_color_code(self, tenant):
        color = ColorCode.objects.create(
            tenant=tenant,
            code="BLK",
            name="Black",
            hex_code="#000000",
            status="active"
        )
        assert color.code == "BLK"
        assert color.hex_code == "#000000"


@pytest.mark.django_db
class TestCountry:
    def test_create_country(self, tenant):
        country = Country.objects.create(
            tenant=tenant,
            code="BGD",
            name="Bangladesh",
            status="active"
        )
        assert country.code == "BGD"
        assert country.name == "Bangladesh"


@pytest.mark.django_db
class TestVendor:
    def test_create_vendor(self, tenant):
        vendor = Vendor.objects.create(
            tenant=tenant,
            code="VEN001",
            name="ABC Yarns Ltd",
            contact_person="Mr. Khan",
            email="khan@abc.com",
            phone="+8801712345680",
            address="Dhaka",
            city="Dhaka"
        )
        assert vendor.code == "VEN001"
        assert vendor.name == "ABC Yarns Ltd"
