from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

User = get_user_model()


class Vehicle(models.Model):
    FUEL_TYPE_CHOICES = [
        ("petrol", "Petrol"),
        ("diesel", "Diesel"),
        ("cng", "CNG"),
    ]
    regno = models.CharField(max_length=20, unique=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="vehicles")
    name = models.CharField(max_length=100)
    model = models.CharField(max_length=100, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    company = models.CharField(max_length=100, blank=True, null=True)
    current_mileage = models.FloatField(default=0.0, validators=[MinValueValidator(0), MaxValueValidator(999)])
    total_kms_driven = models.FloatField(default=0.0)
    fuel_type = models.CharField(max_length=10, choices=FUEL_TYPE_CHOICES)
    last_service_date = models.DateField(blank=True, null=True)
    average_mileage = models.FloatField(default=0.0, blank=True, null=True)
    fuel_tank_capacity = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.regno} - {self.name}"

    def clean(self):
        import re

        # Normalize regno: remove all non-alphanumeric, lowercase
        if self.regno:
            self.regno = re.sub(r"[^a-z0-9]", "", self.regno.lower())

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class Txn(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="txns")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="txns")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    fuel_qty = models.FloatField()
    kms_driven = models.FloatField(default=0.0, blank=True, null=True)
    current_mileage = models.FloatField(blank=True, null=True)
    tank_fully_filled = models.BooleanField(default=False)
    location = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Txn for {self.vehicle.regno} on {self.created_at.strftime('%Y-%m-%d')}"

    def save(self, *args, **kwargs):
        # Auto-calculate current_mileage if tank is fully filled
        if self.tank_fully_filled and self.fuel_qty and self.kms_driven:
            try:
                self.current_mileage = self.kms_driven / self.fuel_qty
                # Update Vehicle's current_mileage and average_mileage
                vehicle = self.vehicle
                vehicle.current_mileage = self.current_mileage
                # Calculate average mileage from all full-tank txns for this vehicle
                full_txns = Txn.objects.filter(
                    vehicle=vehicle, tank_fully_filled=True, fuel_qty__gt=0, kms_driven__gt=0
                )
                if full_txns.exists():
                    avg = sum(t.kms_driven / t.fuel_qty for t in full_txns) / full_txns.count()
                    vehicle.average_mileage = avg
                else:
                    vehicle.average_mileage = self.current_mileage
                vehicle.save(update_fields=["current_mileage", "average_mileage"])
            except Exception:
                self.current_mileage = None
        super().save(*args, **kwargs)
