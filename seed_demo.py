import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenancy.models import Tenant
from apps.tenancy.context import tenant_context
from apps.role_builder.presets import seed_starter_roles
from apps.users.models import TenantUser
from apps.finance.defaults import seed_chart_of_accounts
from apps.finance.models import Account, Payment
from apps.parties.models import Party
from apps.catalog.models import Category, Item
from apps.inventory.models import Warehouse, StockItem
from apps.purchasing.models import PurchaseOrder, PurchaseOrderItem
from apps.sales.models import SalesInvoice, SalesInvoiceItem
from apps.module_builder.models import ModuleDefinition, FieldDefinition, DynamicRecord

User = get_user_model()

def run_seed():
    print("=== Starting Generic Multi-Business ERP Demo Seeder ===")

    # -------------------------------------------------------------
    # 1. Superuser
    # -------------------------------------------------------------
    super_admin, created = User.objects.get_or_create(
        email='superadmin@platform.erp',
        defaults={'first_name': 'Platform', 'last_name': 'Admin', 'is_staff': True, 'is_superuser': True}
    )
    if created:
        super_admin.set_password('SuperAdmin2026!')
        super_admin.save()
        print("Created SuperAdmin user: superadmin@platform.erp")

    # =============================================================
    # TENANT 1: Apex Retail Gear (Retail & Distribution)
    # =============================================================
    print("\n--- Seeding Tenant 1: Apex Retail Gear (Retail/Distribution) ---")
    t1, _ = Tenant.objects.get_or_create(
        subdomain='apex-retail',
        defaults={
            'name': 'Apex Retail Gear',
            'currency': 'Rs.',
            'timezone': 'America/New_York',
            'plan': 'enterprise',
            'enabled_modules': [
                'catalog', 'inventory', 'parties', 'purchasing',
                'sales', 'finance', 'reports', 'notifications',
                'role_builder', 'module_builder', 'extensions'
            ]
        }
    )

    with tenant_context(t1):
        roles1 = seed_starter_roles(t1)
        seed_chart_of_accounts(t1)

        # Users for Tenant 1
        u_owner, _ = User.objects.get_or_create(
            email='admin@apexretail.com',
            defaults={'first_name': 'Alex', 'last_name': 'Vance'}
        )
        u_owner.set_password('ApexPass123!')
        u_owner.save()
        TenantUser.objects.get_or_create(tenant=t1, user=u_owner, defaults={'role': roles1['Owner'], 'is_tenant_admin': True})

        u_sales, _ = User.objects.get_or_create(
            email='sales@apexretail.com',
            defaults={'first_name': 'Sarah', 'last_name': 'Miller'}
        )
        u_sales.set_password('ApexPass123!')
        u_sales.save()
        TenantUser.objects.get_or_create(tenant=t1, user=u_sales, defaults={'role': roles1['Sales']})

        u_wh, _ = User.objects.get_or_create(
            email='warehouse@apexretail.com',
            defaults={'first_name': 'Bill', 'last_name': 'Tanner'}
        )
        u_wh.set_password('ApexPass123!')
        u_wh.save()
        TenantUser.objects.get_or_create(tenant=t1, user=u_wh, defaults={'role': roles1['Warehouse']})

        # Warehouses
        wh_main, _ = Warehouse.objects.get_or_create(
            tenant=t1, code='WH-MAIN',
            defaults={'name': 'Central Distribution Hub', 'address': '100 Industrial Parkway, NJ'}
        )
        wh_store, _ = Warehouse.objects.get_or_create(
            tenant=t1, code='WH-STORE',
            defaults={'name': 'Retail Flagship Store', 'address': '450 5th Avenue, NY'}
        )

        # Catalog: Physical items with stock tracking
        cat_outdoor, _ = Category.objects.get_or_create(tenant=t1, slug='outdoor-gear', defaults={'name': 'Outdoor Gear'})
        item_tent, _ = Item.objects.get_or_create(
            tenant=t1, sku='ROOF-TENT-01',
            defaults={
                'name': 'Expedition Roof Tent 4-Person',
                'type': Item.TYPE_GOODS,
                'is_stock_tracked': True,
                'category': cat_outdoor,
                'selling_price': Decimal('1250.00'),
                'cost_price': Decimal('750.00'),
                'unit_of_measure': 'unit',
                'custom_attributes': {'fabric': '300D Ripstop', 'weight_kg': 65}
            }
        )
        item_kit, _ = Item.objects.get_or_create(
            tenant=t1, sku='RECOV-KIT-02',
            defaults={
                'name': 'Heavy Duty Recovery Strap Kit',
                'type': Item.TYPE_GOODS,
                'is_stock_tracked': True,
                'category': cat_outdoor,
                'selling_price': Decimal('120.00'),
                'cost_price': Decimal('55.00'),
                'unit_of_measure': 'kit',
                'custom_attributes': {'max_load_tons': 12}
            }
        )

        # Parties
        supp_overland, _ = Party.objects.get_or_create(
            tenant=t1, code='SUPP-001',
            defaults={
                'name': 'Overland Gear Global Inc.',
                'type': Party.TYPE_SUPPLIER,
                'email': 'orders@overlandgear.com',
                'tax_id': 'US-99281726'
            }
        )
        cust_pacific, _ = Party.objects.get_or_create(
            tenant=t1, code='CUST-001',
            defaults={
                'name': 'Pacific Offroad Adventures',
                'type': Party.TYPE_CUSTOMER,
                'email': 'fleet@pacificoffroad.com',
                'tax_id': 'US-11029384'
            }
        )

        # Purchase Order: Buy 10 Tents and 25 Kits -> Receive and Post
        po, _ = PurchaseOrder.objects.get_or_create(
            tenant=t1, order_number='PO-2026-001',
            defaults={'supplier': supp_overland, 'warehouse': wh_main, 'notes': 'Spring initial stock order'}
        )
        if not po.items.exists():
            PurchaseOrderItem.objects.create(
                tenant=t1, order=po, item=item_tent, quantity=Decimal('10.0000'), unit_price=Decimal('750.00')
            )
            PurchaseOrderItem.objects.create(
                tenant=t1, order=po, item=item_kit, quantity=Decimal('25.0000'), unit_price=Decimal('55.00')
            )
            po.recalculate_totals()
            po.receive_and_post()
            print(f"PO-2026-001 received. Stock added to {wh_main.name}. AP Bill posted to ledger.")

        # Sales Invoice: Sell 2 Tents to Pacific Offroad Adventures
        inv, _ = SalesInvoice.objects.get_or_create(
            tenant=t1, invoice_number='INV-2026-001',
            defaults={'customer': cust_pacific, 'warehouse': wh_main, 'notes': 'Fleet upgrade phase 1'}
        )
        if not inv.items.exists():
            SalesInvoiceItem.objects.create(
                tenant=t1, invoice=inv, item=item_tent, quantity=Decimal('2.0000'), unit_price=Decimal('1250.00')
            )
            inv.recalculate_totals()
            inv.confirm_and_post()
            print(f"INV-2026-001 posted. Stock deducted from {wh_main.name}. AR posted to ledger.")

        # Partial Payment from Customer
        if not Payment.objects.filter(tenant=t1, payment_number='PAY-2026-001').exists():
            Payment.record_payment(
                tenant=t1,
                payment_number='PAY-2026-001',
                party=cust_pacific,
                payment_type=Payment.TYPE_INBOUND,
                amount=Decimal('1500.00'),
                payment_method=Payment.METHOD_BANK,
                reference='WIRE-TXN-8849',
                notes='Partial settlement for INV-2026-001'
            )
            print("Recorded customer payment of $1,500.00. Party balance updated.")

        # Low-Code Module Builder: Vehicle Fleet
        fleet_mod, _ = ModuleDefinition.objects.get_or_create(
            tenant=t1, slug='vehicle-fleet',
            defaults={
                'name': 'Vehicle Fleet',
                'display_name': 'Delivery Fleet & Trucks',
                'description': 'Tracking company delivery vans and cargo trucks',
                'icon': 'truck'
            }
        )
        FieldDefinition.objects.get_or_create(
            tenant=t1, module=fleet_mod, field_name='license_plate',
            defaults={'label': 'License Plate', 'field_type': FieldDefinition.TYPE_TEXT, 'is_required': True, 'order': 1}
        )
        FieldDefinition.objects.get_or_create(
            tenant=t1, module=fleet_mod, field_name='vehicle_model',
            defaults={'label': 'Vehicle Model', 'field_type': FieldDefinition.TYPE_TEXT, 'is_required': True, 'order': 2}
        )
        FieldDefinition.objects.get_or_create(
            tenant=t1, module=fleet_mod, field_name='fuel_type',
            defaults={'label': 'Fuel Type', 'field_type': FieldDefinition.TYPE_DROPDOWN, 'options': ['Diesel', 'Electric', 'Hybrid'], 'order': 3}
        )
        DynamicRecord.objects.get_or_create(
            tenant=t1, module=fleet_mod,
            data={'license_plate': 'NY-TRK-7842', 'vehicle_model': 'Ford Transit Cargo 350', 'fuel_type': 'Diesel'}
        )
        print("Created low-code module 'Vehicle Fleet' with dynamic record.")

    # =============================================================
    # TENANT 2: Nexus Advisory Group (Services / Consulting)
    # =============================================================
    print("\n--- Seeding Tenant 2: Nexus Advisory Group (Services Consultancy) ---")
    t2, _ = Tenant.objects.get_or_create(
        subdomain='nexus-advisory',
        defaults={
            'name': 'Nexus Advisory Group',
            'currency': 'Rs.',
            'timezone': 'Europe/Stockholm',
            'plan': 'growth',
            'enabled_modules': [
                'catalog', 'parties', 'sales', 'finance',
                'reports', 'notifications', 'role_builder', 'module_builder'
                # Notice: inventory is completely omitted!
            ]
        }
    )

    with tenant_context(t2):
        roles2 = seed_starter_roles(t2)
        seed_chart_of_accounts(t2)

        u_partner, _ = User.objects.get_or_create(
            email='partner@nexusadvisory.com',
            defaults={'first_name': 'Elena', 'last_name': 'Rostova'}
        )
        u_partner.set_password('NexusPass123!')
        u_partner.save()
        TenantUser.objects.get_or_create(tenant=t2, user=u_partner, defaults={'role': roles2['Owner'], 'is_tenant_admin': True})

        u_fin2, _ = User.objects.get_or_create(
            email='finance@nexusadvisory.com',
            defaults={'first_name': 'Marcus', 'last_name': 'Lind'}
        )
        u_fin2.set_password('NexusPass123!')
        u_fin2.save()
        TenantUser.objects.get_or_create(tenant=t2, user=u_fin2, defaults={'role': roles2['Finance']})


        # Catalog: Pure service items (is_stock_tracked = False)
        cat_consulting, _ = Category.objects.get_or_create(tenant=t2, slug='consulting', defaults={'name': 'Strategic Advisory'})
        item_hourly, _ = Item.objects.get_or_create(
            tenant=t2, sku='CONS-HOURLY',
            defaults={
                'name': 'Senior Strategy Consulting',
                'type': Item.TYPE_SERVICE,
                'is_stock_tracked': False,
                'category': cat_consulting,
                'selling_price': Decimal('250.00'),
                'cost_price': Decimal('0.00'),
                'unit_of_measure': 'hours',
                'custom_attributes': {'seniority': 'Partner', 'practice': 'Digital Transformation'}
            }
        )
        item_retainer, _ = Item.objects.get_or_create(
            tenant=t2, sku='RET-MONTHLY',
            defaults={
                'name': 'Executive Technology Advisory Retainer',
                'type': Item.TYPE_SERVICE,
                'is_stock_tracked': False,
                'category': cat_consulting,
                'selling_price': Decimal('5000.00'),
                'cost_price': Decimal('0.00'),
                'unit_of_measure': 'month',
                'custom_attributes': {'sla': '24h guaranteed callback'}
            }
        )

        # Parties
        cust_nordic, _ = Party.objects.get_or_create(
            tenant=t2, code='NORDIC-01',
            defaults={
                'name': 'Nordic FinTech Corp',
                'type': Party.TYPE_CUSTOMER,
                'email': 'cfo@nordicfintech.se',
                'tax_id': 'SE-5566778899'
            }
        )

        # Sales Invoice for Consulting Services: 40 hrs @ €250 + 1 Retainer @ €5,000 = €15,000
        inv2, _ = SalesInvoice.objects.get_or_create(
            tenant=t2, invoice_number='INV-NEXUS-101',
            defaults={'customer': cust_nordic, 'notes': 'Q1 Digital Banking Strategy & Execution'}
        )
        if not inv2.items.exists():
            SalesInvoiceItem.objects.create(
                tenant=t2, invoice=inv2, item=item_hourly, quantity=Decimal('40.0000'), unit_price=Decimal('250.00')
            )
            SalesInvoiceItem.objects.create(
                tenant=t2, invoice=inv2, item=item_retainer, quantity=Decimal('1.0000'), unit_price=Decimal('5000.00')
            )
            inv2.recalculate_totals()
            inv2.confirm_and_post()
            print(f"INV-NEXUS-101 posted. Stock movements bypassed completely! AR posted: €{inv2.total_amount}.")

        # Full Payment Settlement
        if not Payment.objects.filter(tenant=t2, payment_number='PAY-NEXUS-101').exists():
            Payment.record_payment(
                tenant=t2,
                payment_number='PAY-NEXUS-101',
                party=cust_nordic,
                payment_type=Payment.TYPE_INBOUND,
                amount=Decimal('15000.00'),
                payment_method=Payment.METHOD_BANK,
                reference='SEPA-TRANSFER-9901',
                notes='Full settlement of INV-NEXUS-101'
            )
            print("Recorded full payment settlement of €15,000.00 via SEPA.")

        # Low-Code Module Builder: Service Tickets
        ticket_mod, _ = ModuleDefinition.objects.get_or_create(
            tenant=t2, slug='service-tickets',
            defaults={
                'name': 'Service Tickets',
                'display_name': 'Client Advisory Tickets',
                'description': 'Advisory requests and deliverables',
                'icon': 'life-buoy'
            }
        )
        FieldDefinition.objects.get_or_create(
            tenant=t2, module=ticket_mod, field_name='ticket_title',
            defaults={'label': 'Ticket Title', 'field_type': FieldDefinition.TYPE_TEXT, 'is_required': True, 'order': 1}
        )
        FieldDefinition.objects.get_or_create(
            tenant=t2, module=ticket_mod, field_name='priority',
            defaults={'label': 'Priority', 'field_type': FieldDefinition.TYPE_DROPDOWN, 'options': ['Low', 'Medium', 'High', 'Urgent'], 'order': 2}
        )
        FieldDefinition.objects.get_or_create(
            tenant=t2, module=ticket_mod, field_name='allocated_hours',
            defaults={'label': 'Allocated Hours', 'field_type': FieldDefinition.TYPE_NUMBER, 'order': 3}
        )
        DynamicRecord.objects.get_or_create(
            tenant=t2, module=ticket_mod,
            data={'ticket_title': 'Cloud Migration Audit', 'priority': 'High', 'allocated_hours': '16.5'}
        )
        # Invoice Templates for Tenant 2
        from apps.sales.models import InvoiceTemplate
        InvoiceTemplate.objects.get_or_create(
            tenant=t2, name='Professional Advisory Invoice',
            defaults={
                'is_default': True,
                'description': 'Clean layout tailored for professional consulting and advisory retainers',
                'config': {
                    'header': {
                        'company_name': 'Nexus Advisory Group',
                        'company_address': 'Herengracht 450, Amsterdam / DIFC Dubai',
                        'tax_id': 'VAT / TRN: NL899123456B01',
                        'number_prefix': 'INV-{year}-{seq}'
                    },
                    'party': {
                        'show_tax_id': True,
                        'show_ship_to': False,
                        'show_phone': True
                    },
                    'line_items': {
                        'show_sku': False,
                        'show_discount': True,
                        'show_tax': True
                    },
                    'totals': {
                        'amount_in_words': True,
                        'show_subtotal': True,
                        'show_tax_breakdown': True
                    },
                    'footer': {
                        'terms': 'Payment due within 14 days of presentation.\nAll advisory deliverables subject to service SLA agreement.',
                        'bank_details': 'Bank: ING Corporate Banking\nIBAN: NL91INGB0001234567\nBIC: INGBNL2A',
                        'signature_block': True,
                        'custom_notes': 'Thank you for partnering with Nexus Advisory Group.'
                    },
                    'styling': {
                        'accent_color': '#1E5FBF',
                        'font_family': 'Helvetica',
                        'show_borders': True,
                        'logo_placement': 'left'
                    }
                }
            }
        )

    with tenant_context(t1):
        from apps.sales.models import InvoiceTemplate
        InvoiceTemplate.objects.get_or_create(
            tenant=t1, name='Standard Commercial Invoice',
            defaults={
                'is_default': True,
                'description': 'Full itemized tax invoice with SKU and shipping address',
                'config': {
                    'header': {
                        'company_name': 'Apex Retail Gear',
                        'company_address': '450 Industrial Parkway, Sector 12\nKarachi / Mumbai',
                        'tax_id': 'GSTIN / NTN: 27AABCA1234A1Z5',
                        'number_prefix': 'INV-{year}-{seq}'
                    },
                    'party': {
                        'show_tax_id': True,
                        'show_ship_to': True,
                        'show_phone': True
                    },
                    'line_items': {
                        'show_sku': True,
                        'show_discount': True,
                        'show_tax': True
                    },
                    'totals': {
                        'amount_in_words': True,
                        'show_subtotal': True,
                        'show_tax_breakdown': True
                    },
                    'footer': {
                        'terms': 'Goods once dispatched cannot be returned without Return Merchandise Authorization (RMA).\nInterest @ 1.5% per month charged on overdue balances.',
                        'bank_details': 'Bank: Standard Chartered Commercial\nA/C No: 01089291001\nIFSC/SWIFT: SCBL00021',
                        'signature_block': True,
                        'custom_notes': 'Authorized signature required on goods receipt.'
                    },
                    'styling': {
                        'accent_color': '#1E5FBF',
                        'font_family': 'Helvetica',
                        'show_borders': True,
                        'logo_placement': 'left'
                    }
                }
            }
        )
        InvoiceTemplate.objects.get_or_create(
            tenant=t1, name='Retail Simplified Slip',
            defaults={
                'is_default': False,
                'description': 'Compact format for counter sales and fast retail checkout',
                'config': {
                    'header': {
                        'company_name': 'Apex Retail Gear — Store #1',
                        'company_address': 'Main Commercial Mall, Ground Level',
                        'tax_id': 'GSTIN: 27AABCA1234A1Z5',
                        'number_prefix': 'POS-{seq}'
                    },
                    'party': {
                        'show_tax_id': False,
                        'show_ship_to': False,
                        'show_phone': False
                    },
                    'line_items': {
                        'show_sku': False,
                        'show_discount': True,
                        'show_tax': True
                    },
                    'totals': {
                        'amount_in_words': False,
                        'show_subtotal': True,
                        'show_tax_breakdown': True
                    },
                    'footer': {
                        'terms': 'Retain slip for 7-day exchange.\nNo refund on promotional items.',
                        'bank_details': 'UPI / POS / Cash Counter Receipt',
                        'signature_block': False,
                        'custom_notes': 'Thank you for shopping with Apex!'
                    },
                    'styling': {
                        'accent_color': '#1E5FBF',
                        'font_family': 'Helvetica',
                        'show_borders': False,
                        'logo_placement': 'center'
                    }
                }
            }
        )

    print("\n=== Seeding completed successfully for both demo tenants! ===")


if __name__ == '__main__':
    run_seed()
