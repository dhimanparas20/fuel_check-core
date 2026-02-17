from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

User = get_user_model()


def round_to_2_decimals(value):
    """Round a value to 2 decimal places."""
    if value is None:
        return None
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


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
    current_mileage = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0.0,
        validators=[MinValueValidator(0), MaxValueValidator(999)],
    )
    total_kms_driven = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.0, blank=True, null=True
    )
    fuel_type = models.CharField(max_length=10, choices=FUEL_TYPE_CHOICES)
    last_service_date = models.DateField(blank=True, null=True)
    average_mileage = models.DecimalField(
        max_digits=6, decimal_places=2, default=0.0, blank=True, null=True
    )
    fuel_tank_capacity = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    money_used = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
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

    def recalculate_stats(self):
        """Recalculate all vehicle stats based on transactions."""
        from django.db.models import Sum

        txns = self.txns.all()

        # Calculate total_kms_driven (sum of all kms_driven)
        total_kms = txns.filter(kms_driven__isnull=False).aggregate(
            total=models.Sum("kms_driven")
        )["total"]
        self.total_kms_driven = (
            Decimal(str(total_kms)) if total_kms else Decimal("0.00")
        )

        # Calculate money_used (sum of all amounts)
        total_money = txns.aggregate(total=models.Sum("amount"))["total"]
        self.money_used = total_money if total_money else Decimal("0.00")

        # Calculate current_mileage from latest transaction with valid mileage
        latest_txn = (
            txns.filter(current_mileage__isnull=False).order_by("-created_at").first()
        )
        if latest_txn:
            self.current_mileage = latest_txn.current_mileage

        # Calculate average_mileage
        valid_txns = txns.filter(
            fuel_qty__gt=0, kms_driven__gt=0, current_mileage__isnull=False
        )

        # Prefer full-tank txns for average calculation
        full_txns = valid_txns.filter(tank_fully_filled=True)
        if full_txns.exists():
            avg = sum(t.kms_driven / t.fuel_qty for t in full_txns) / full_txns.count()
            self.average_mileage = Decimal(str(round_to_2_decimals(avg)))
        elif valid_txns.exists():
            # Fallback to all valid txns if no full tank txns
            avg = (
                sum(t.kms_driven / t.fuel_qty for t in valid_txns) / valid_txns.count()
            )
            self.average_mileage = Decimal(str(round_to_2_decimals(avg)))
        else:
            self.average_mileage = Decimal("0.00")

        self.save(
            update_fields=[
                "total_kms_driven",
                "money_used",
                "current_mileage",
                "average_mileage",
            ]
        )


class Txn(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="txns")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="txns")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    fuel_qty = models.DecimalField(max_digits=8, decimal_places=2)
    kms_driven = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.0, blank=True, null=True
    )
    current_mileage = models.DecimalField(
        max_digits=6, decimal_places=2, blank=True, null=True
    )
    tank_fully_filled = models.BooleanField(default=False)
    location = models.CharField(max_length=255, blank=True, null=True)
    txn_date = models.DateField(
        blank=True,
        null=True,
        help_text="Date of the transaction (optional, defaults to today)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Txn for {self.vehicle.regno} on {self.created_at.strftime('%Y-%m-%d')}"

    def save(self, *args, **kwargs):
        # Auto-calculate current_mileage only if tank is fully filled
        if (
            self.tank_fully_filled
            and self.fuel_qty
            and self.kms_driven
            and self.kms_driven > 0
            and self.fuel_qty > 0
        ):
            mileage = self.kms_driven / self.fuel_qty
            self.current_mileage = Decimal(str(round_to_2_decimals(mileage)))
        else:
            self.current_mileage = None

        super().save(*args, **kwargs)

        # Recalculate vehicle stats after saving
        self.vehicle.recalculate_stats()

    def delete(self, *args, **kwargs):
        vehicle = self.vehicle
        super().delete(*args, **kwargs)
        # Recalculate vehicle stats after deletion
        vehicle.recalculate_stats()
