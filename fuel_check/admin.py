from django.contrib import admin
from .models import Vehicle, Txn

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('regno', 'owner', 'name', 'model', 'color', 'company', 'fuel_type', 'created_at', 'updated_at')
    list_filter = ('fuel_type', 'company', 'color', 'created_at', 'updated_at')
    search_fields = ('regno', 'name', 'model', 'company', 'owner__username')
    ordering = ('-created_at',)

@admin.register(Txn)
class TxnAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'owner', 'amount', 'fuel_qty', 'tank_fully_filled', 'location', 'created_at', 'updated_at')
    list_filter = ('tank_fully_filled', 'created_at', 'updated_at', 'location')
    search_fields = ('vehicle__regno', 'owner__username', 'location')
    ordering = ('-created_at',)
