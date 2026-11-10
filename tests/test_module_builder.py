import pytest
from django.core.exceptions import ValidationError
from apps.tenancy.models import Tenant
from apps.tenancy.context import tenant_context
from apps.module_builder.models import ModuleDefinition, FieldDefinition, DynamicRecord
from apps.module_builder.serializers import DynamicRecordSerializer

@pytest.mark.django_db
def test_low_code_module_builder_crud_and_validation():
    tenant = Tenant.objects.create(name="Custom Works", subdomain="custom-works", plan="enterprise")

    with tenant_context(tenant):
        # 1. Tenant admin creates a new module definition
        module = ModuleDefinition.objects.create(
            name="Machinery Maintenance",
            slug="machinery-maintenance",
            display_name="Machinery Maintenance Logs",
            icon="tool"
        )

        # 2. Add fields
        f_machine = FieldDefinition.objects.create(
            module=module,
            field_name="machine_id",
            label="Machine Serial / ID",
            field_type=FieldDefinition.TYPE_TEXT,
            is_required=True
        )
        f_status = FieldDefinition.objects.create(
            module=module,
            field_name="condition",
            label="Condition",
            field_type=FieldDefinition.TYPE_DROPDOWN,
            options=["Operational", "Needs Service", "Broken"],
            is_required=True
        )
        f_cost = FieldDefinition.objects.create(
            module=module,
            field_name="repair_cost",
            label="Repair Cost",
            field_type=FieldDefinition.TYPE_NUMBER,
            is_required=False
        )

        # 3. Create valid dynamic record
        record = DynamicRecord.objects.create(
            module=module,
            data={
                "machine_id": "CNC-LATHE-440",
                "condition": "Operational",
                "repair_cost": "150.00"
            }
        )
        assert record.id is not None
        assert record.data["machine_id"] == "CNC-LATHE-440"

        # 4. Creating invalid record (missing required field) raises ValidationError
        with pytest.raises(ValidationError):
            DynamicRecord.objects.create(
                module=module,
                data={
                    "condition": "Operational"  # machine_id missing
                }
            )

        # 5. Invalid dropdown option raises ValidationError
        with pytest.raises(ValidationError):
            DynamicRecord.objects.create(
                module=module,
                data={
                    "machine_id": "PRESS-10",
                    "condition": "Exploded"  # Not in ["Operational", "Needs Service", "Broken"]
                }
            )
