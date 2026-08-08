from django.contrib import admin
from .models import (
    FabricCategory, HTSCode, FabricSupplier, FabricMill,
    RFQ, RFQLineItem, RFQResponse, RFQResponseItem,
    FabricBooking, FabricOrder,
)


admin.site.register(FabricCategory)
admin.site.register(HTSCode)
admin.site.register(FabricSupplier)
admin.site.register(FabricMill)
admin.site.register(RFQ)
admin.site.register(RFQLineItem)
admin.site.register(RFQResponse)
admin.site.register(RFQResponseItem)
admin.site.register(FabricBooking)
admin.site.register(FabricOrder)
