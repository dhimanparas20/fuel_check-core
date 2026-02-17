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
    owner = models.OneToOneField(User, on_delete=models.CASCADE, related_name="vehicle")
    name = models.CharField(max_length=100)
    model = models.CharField(max_length=100, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    company = models.CharField(max_length=100, blank=True, null=True)
    current_mileage = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(999)])
    total_kms_driven = models.FloatField()
    fuel_type = models.CharField(max_length=10, choices=FUEL_TYPE_CHOICES)
    last_service_date = models.DateField(blank=True, null=True)
    average_mileage = models.FloatField(blank=True, null=True)
    chasis_no = models.CharField(max_length=50, blank=True, null=True)
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
    tank_fully_filled = models.BooleanField(default=False)
    location = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Txn for {self.vehicle.regno} on {self.created_at.strftime('%Y-%m-%d')}"
