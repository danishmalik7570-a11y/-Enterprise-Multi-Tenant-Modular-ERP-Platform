<div align="center">

# 🏢 Enterprise Multi-Tenant Modular ERP Platform

**A modern, business-agnostic Enterprise Resource Planning (ERP) platform built with Django REST Framework, FastAPI, PostgreSQL, Celery, and React 18 / TypeScript.**

[![Python Version](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.14-blue?logo=python&logoColor=white)](#prerequisites)
[![Django](https://img.shields.io/badge/Django-5.1%20%2B-092E20?logo=django&logoColor=white)](#architecture-overview)
[![FastAPI](https://img.shields.io/badge/FastAPI-Async%20Layer-009688?logo=fastapi&logoColor=white)](#fastapi-async-services)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql&logoColor=white)](#database-setup)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](#frontend-architecture)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](#frontend-architecture)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)](#frontend-architecture)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#license)

[Key Features](#key-features) •
[Architecture](#architecture-overview) •
[Quick Start](#quick-start-guide) •
[Demo Credentials](#demo-credentials--sample-tenants) •
[API Reference](#api-documentation) •
[Testing](#running-tests)

---

</div>

## 📖 Table of Contents

- [Overview & Value Proposition](#-overview--value-proposition)
- [Architecture Overview](#-architecture-overview)
- [Key Features & Modules](#-key-features--modules)
  - [1. Tenancy & Isolation](#1-tenancy--data-isolation)
  - [2. User Management & Role Builder (RBAC)](#2-user-management--dynamic-role-builder-rbac)
  - [3. Product & Service Catalog](#3-product--service-catalog)
  - [4. Multi-Warehouse Inventory Management](#4-multi-warehouse-inventory-management)
  - [5. Purchasing & Procurement](#5-purchasing--procurement)
  - [6. Sales & Interactive Invoice Builder](#6-sales--interactive-invoice-builder)
  - [7. Double-Entry General Ledger & Finance](#7-double-entry-general-ledger--finance)
  - [8. Low-Code / Dynamic Module Builder](#8-low-code--dynamic-module-builder)
  - [9. High-Concurrency FastAPI Async Services](#9-high-concurrency-fastapi-async-services)
  - [10. Reporting Hub & Notifications](#10-reporting-hub--notifications)
- [Repository File Structure](#-repository-file-structure)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [1. Clone and Prepare Virtual Environment](#1-clone-and-prepare-virtual-environment)
  - [2. Configure Environment Variables](#2-configure-environment-variables)
  - [3. Database Initialization & Migrations](#3-database-initialization--migrations)
  - [4. Seed Multi-Business Demo Data](#4-seed-multi-business-demo-data)
  - [5. Run the Backend Services](#5-run-the-backend-services)
  - [6. Launch the React Frontend](#6-launch-the-react-frontend)
- [Demo Credentials & Sample Tenants](#-demo-credentials--sample-tenants)
- [API Documentation](#-api-documentation)
- [Running Tests](#-running-tests)
- [Configuration & Environment Reference](#-configuration--environment-reference)
- [Production Deployment Notes](#-production-deployment-notes)
- [Contributing & License](#-contributing--license)

---

## 🌟 Overview & Value Proposition

This repository contains a **production-ready, business-agnostic ERP system** designed to adapt across diverse industry verticals without code modifications. Whether operating as a **physical goods retailer/distributor** with multiple warehouses and lot/stock tracking, or a **pure consulting/services firm** billing time and retainers, the system dynamically configures its UI, logic, and data structures per tenant.

### Why this architecture?
- **Business-Agnostic Engine:** Turn entire subsystems on or off (e.g. inventory tracking, dynamic forms) on a per-tenant basis.
- **Strict Multi-Tenancy:** Automated data isolation using thread-local context managers and middleware, guaranteeing zero cross-tenant data bleed.
- **Dual-Engine Backend:**
  - **Django 5 + Django REST Framework:** Robust transactional business logic, double-entry financial guarantees, JWT authentication, and administrative workflows.
  - **FastAPI (ASGI):** Ultra-high-throughput async endpoints sharing the PostgreSQL database for real-time inventory queries and external webhooks.
- **No-Code Extensibility:** Tenants can build custom entities, fields, and tables directly from the UI without running database migrations.
- **Enterprise Accounting:** True double-entry bookkeeping with immutable journal entries, chart of accounts automation, balance sheet, and trial balance reports.

---

## 🏗 Architecture Overview

```mermaid
graph TD
    Client["🌐 Client (Web Browser / API Consumer)"]

    subgraph "Frontend Layer (Vite + React 18 + TS + Tailwind)"
        UI["React SPA & Theme Tokens"]
        TenantCtx["Tenant Context & Role Switcher"]
        Pages["Pages (Sales, Inventory, Finance, Low-Code Builder)"]
    end

    subgraph "API & Ingestion Layer"
        DjangoGate["Django REST Framework (Port 8000)<br/>• Auth & JWT Claims<br/>• Tenancy Middleware<br/>• Business Transactions & Finance"]
        FastAPIGate["FastAPI Async Engine (Port 8001)<br/>• Live Stock Availability<br/>• Party Balance Checks<br/>• Webhook Ingestion"]
    end

    subgraph "Background & Scheduling"
        CeleryWorker["Celery 5 Workers<br/>• Async PDF Generation<br/>• Batch Invoicing & Webhook Dispatch"]
        RedisBroker["Redis 5+ Broker & Result Store"]
    end

    subgraph "Storage & Data Tier"
        PostgreSQL[("PostgreSQL 14+ Database<br/>• Tenancy Isolation (tenant_id)<br/>• Double-Entry General Ledger<br/>• Dynamic Records (JSONB)")]
    end

    Client --> UI
    UI --> TenantCtx
    TenantCtx --> Pages
    Pages -->|HTTP / REST (JWT)| DjangoGate
    Pages -->|HTTP / Async Queries| FastAPIGate

    DjangoGate --> PostgreSQL
    FastAPIGate --> PostgreSQL
    DjangoGate -.->|Enqueue Tasks| RedisBroker
    RedisBroker --> CeleryWorker
    CeleryWorker --> PostgreSQL
```

---

## 🚀 Key Features & Modules

### 1. Tenancy & Data Isolation
- **Subdomain & Header Resolution:** Requests are resolved to a tenant via subdomain (e.g. `apex-retail.platform.erp`), request headers (`X-Tenant-Subdomain`), or JWT claims.
- **Thread-Local Scoping:** Every ORM query is wrapped with `tenant_context(tenant)`, guaranteeing that Tenant A cannot view or mutate Tenant B's catalog, stock, or financials.
- **Customizable Tenant Settings:** Configure currency symbol (e.g., `$`, `€`, `Rs.`), timezone, subscription plan, and enabled feature modules per organization.

### 2. User Management & Dynamic Role Builder (RBAC)
- **Centralized User Model:** Global user authentication with tenant-specific membership (`TenantUser`).
- **Granular Permissions:** Customizable permission matrices covering `read`, `write`, `delete`, and module-specific access (`can_approve_po`, `can_post_journal`, `can_view_margins`).
- **Starter Role Presets:** Automated seeding for common business roles: `Owner`, `Admin`, `Finance`, `Sales`, `Warehouse`, and `Consultant`.

### 3. Product & Service Catalog
- **Dual Item Classification:** Native support for both **Goods** (physical items subject to stock tracking, dimensions, weight) and **Services** (billable hours, consultancy, non-inventoried).
- **Category Hierarchy:** Flexible categories with custom attributes stored as structured JSON.
- **Pricing Engine:** Base cost price, selling price, and currency formatting.

### 4. Multi-Warehouse Inventory Management
- **Multi-Location Storage:** Organize stock across multiple warehouses, distribution hubs, and retail outlets.
- **Real-Time Stock Counters:** Tracks both `quantity_on_hand` and `quantity_reserved`.
- **Live Stock Checks:** Sub-millisecond inventory availability queries powered by FastAPI.

### 5. Purchasing & Procurement
- **Purchase Order (PO) Lifecycle:** From `Draft` $\rightarrow$ `Approved` $\rightarrow$ `Received` $\rightarrow$ `Cancelled`.
- **Automated Inventory Intake:** Marking a PO as received automatically updates warehouse stock and posts debit/credit journal entries.

### 6. Sales & Interactive Invoice Builder
- **Sales Lifecycle:** Quotations $\rightarrow$ Invoices (`Draft`, `Sent`, `Paid`, `Overdue`, `Cancelled`).
- **Drag-and-Drop / Customizable Layouts:** Integrated Invoice Builder interface allowing companies to configure headers, terms, itemized tables, taxes, and branding.

### 7. Double-Entry General Ledger & Finance
- **Automated Chart of Accounts:** Automatically seeds Assets, Liabilities, Equity, Revenue, and Expense accounts upon tenant provisioning.
- **Strict Balance Enforcement:** Built-in validation ensures that total debits strictly equal total credits ($\sum \text{Debits} = \sum \text{Credits}$) for every `JournalEntry`.
- **Payment Processing:** Records customer and vendor settlements directly linked to invoices and cash/bank accounts.

### 8. Low-Code / Dynamic Module Builder
- **On-the-Fly Database Entities:** Business users can create custom tables (e.g. *Machinery Maintenance*, *Vehicle Inspections*, *Project Milestones*) without schema migrations.
- **Field Types:** Text, Number, Date, Boolean, Dropdown Select, and JSON.
- **JSON Schema Validation:** Records are validated dynamically against their field definitions before being stored in PostgreSQL.

### 9. High-Concurrency FastAPI Async Services
- **Real-Time Stock Inquiries:** Fast endpoint (`/api/async/stock-availability`) queried directly during checkout or POS sessions.
- **Real-Time Party Balances:** Immediate customer/vendor balance summaries (`/api/async/party-balance`).
- **Inbound Webhook Hub:** High-speed ingestion for partner integrations and external event listeners (`/api/async/webhooks/incoming`).

### 10. Reporting Hub & Notifications
- **Standard Financial Statements:** Balance Sheet, Trial Balance, and Profit & Loss generation.
- **Operational Reports:** Stock valuation by warehouse, sales by customer, open purchase orders.
- **Event-Driven Notifications:** System alerts for low stock levels, pending PO approvals, and payment receipts.

---

## 📁 Repository File Structure

```text
├── apps/                        # Modular Django Business Applications
│   ├── catalog/                 # Products, services, SKUs, and categories
│   ├── extensions/              # External plugins and outgoing webhooks
│   ├── finance/                 # General ledger, accounts, journal entries, payments
│   ├── inventory/               # Warehouses, stock items, and adjustments
│   ├── module_builder/          # Low-code custom module & field definition engine
│   ├── notifications/           # In-app alerts and notifications
│   ├── parties/                 # Unified customer & vendor directory
│   ├── purchasing/              # Purchase orders and receiving workflows
│   ├── reports/                 # Financial and operational report generators
│   ├── role_builder/            # Dynamic RBAC roles and permissions
│   ├── sales/                   # Sales invoices, templates, and lines
│   ├── tenancy/                 # Multi-tenancy context, models, and middleware
│   └── users/                   # Custom User model and JWT serializers
├── async_services/              # High-performance FastAPI ASGI microservice
│   └── main.py                  # Live stock checks, balance lookups, webhooks
├── config/                      # Core Django Project Settings & Routing
│   ├── asgi.py                  # ASGI configuration
│   ├── celery.py                # Celery task queue definitions
│   ├── settings.py              # Central application configuration
│   ├── urls.py                  # Root URL routing & OpenAPI schema docs
│   └── wsgi.py                  # WSGI entrypoint
├── frontend/                    # Modern React Single Page Application (SPA)
│   ├── src/
│   │   ├── components/          # Reusable UI (CrudPage, SideDrawer, TopBar, Sidebar)
│   │   ├── context/             # TenantContext and authentication state
│   │   ├── pages/               # Dashboard, Sales, Finance, DynamicModule, Users...
│   │   ├── theme/               # Modern theme design tokens
│   │   ├── App.tsx              # Root application router and layout
│   │   └── main.tsx             # React DOM entrypoint
│   ├── index.html               # Frontend HTML root
│   ├── package.json             # NPM dependencies & scripts
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   └── vite.config.ts           # Vite bundler configuration & proxy rules
├── tests/                       # Automated Pytest Suite
│   ├── test_fastapi_async.py    # FastAPI endpoint & webhook tests
│   ├── test_finance_ledger.py   # Double-entry ledger & balance validation tests
│   ├── test_module_builder.py   # Low-code custom module tests
│   ├── test_role_builder.py     # RBAC and role assignment tests
│   ├── test_sales_and_purchasing.py # Commercial workflow tests
│   └── test_tenancy_isolation.py# Multi-tenant data segregation tests
├── .env.example                 # Environment variables blueprint
├── .gitignore                   # Git ignore patterns
├── init_db.py                   # Automated PostgreSQL database creator
├── manage.py                    # Django management script
├── package.json                 # Workspace root package configuration
├── pytest.ini                   # Pytest configuration
├── requirements.txt             # Python backend dependencies
├── schema.yml                   # Pre-compiled OpenAPI 3.0 specification
└── seed_demo.py                 # Comprehensive multi-business demo seeder
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Python:** 3.11, 3.12, or newer
- **Node.js:** v18.x or v20.x+ & npm
- **PostgreSQL:** 14+ running locally or in Docker
- **Redis:** (Optional for Celery asynchronous workers; Celery runs synchronously in eager mode by default)

---

### 1. Clone and Prepare Virtual Environment

```bash
# Clone the repository
git clone https://github.com/your-org/generic-erp.git
cd erp

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
```

Install backend dependencies:
```bash
pip install -r requirements.txt
```

---

### 2. Configure Environment Variables

Copy the provided blueprint into your active `.env`:
```bash
cp .env.example .env
```

Adjust the database credentials in `.env` if your PostgreSQL installation differs from the defaults (`user=postgres`, `password=`, `host=127.0.0.1`, `port=5432`).

---

### 3. Database Initialization & Migrations

Run the database setup script to create the `generic_erp` database if it does not already exist:
```bash
python init_db.py
```

Apply all Django database migrations:
```bash
python manage.py migrate
```

---

### 4. Seed Multi-Business Demo Data

The repository includes a comprehensive seeder that creates a global SuperAdmin and two distinct tenant organizations demonstrating both physical retail and professional service workflows:

```bash
python seed_demo.py
```

---

### 5. Run the Backend Services

#### 5.1 Run the Core Django API (Port 8000)
```bash
python manage.py runserver 8000
```
> Django API and Admin are now accessible at [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

#### 5.2 Run the FastAPI Async Engine (Port 8001)
In a separate terminal:
```bash
uvicorn async_services.main:app --host 127.0.0.1 --port 8001 --reload
```
> FastAPI interactive docs are live at [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

---

### 6. Launch the React Frontend

In another terminal, install and launch the Vite development server:
```bash
cd frontend
npm install
npm run dev
```

> The web app will launch at **[http://localhost:5173/](http://localhost:5173/)** with automated proxying:
> - `/api/*` $\rightarrow$ Proxied to Django (`http://127.0.0.1:8000`)
> - `/api/async/*` $\rightarrow$ Proxied to FastAPI (`http://127.0.0.1:8001`)

---

## 🔑 Demo Credentials & Sample Tenants

The `seed_demo.py` script provisions realistic test environments out-of-the-box:

### 👑 Platform SuperAdmin
| Email | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `superadmin@platform.erp` | `SuperAdmin2026!` | Global Superuser | Full system administration and cross-tenant access via `/admin/` |

---

### 🏢 Tenant 1: Apex Retail Gear (`subdomain: apex-retail`)
*A physical goods retailer & equipment distributor utilizing multi-warehouse stock tracking, purchase orders, and commercial invoicing.*

| Email | Password | Role | Permissions / Scope |
| :--- | :--- | :--- | :--- |
| `admin@apexretail.com` | `ApexPass123!` | Owner | Full access, settings, user administration |
| `sales@apexretail.com` | `ApexPass123!` | Sales | Quotes, invoices, customer directory |
| `warehouse@apexretail.com` | `ApexPass123!` | Warehouse | Inventory intake, stock counts, warehouse transfers |

---

### 💼 Tenant 2: Nexus Advisory Group (`subdomain: nexus-advisory`)
*A corporate consulting and strategic advisory firm billing services and hourly retainers. Note that the **Inventory module is completely disabled** for this tenant.*

| Email | Password | Role | Permissions / Scope |
| :--- | :--- | :--- | :--- |
| `partner@nexusadvisory.com` | `NexusPass123!` | Owner | Executive partner with complete firm governance |
| `finance@nexusadvisory.com` | `NexusPass123!` | Finance | General ledger, payments, journal entries, balance sheet |

---

## 📚 API Documentation

The platform comes with native OpenAPI 3.0 documentation via `drf-spectacular` and FastAPI.

### Interactive API Explorers
| Service | Documentation Type | URL |
| :--- | :--- | :--- |
| **Django Core API** | Swagger UI | [http://127.0.0.1:8000/api/schema/swagger-ui/](http://127.0.0.1:8000/api/schema/swagger-ui/) |
| **Django Core API** | ReDoc Explorer | [http://127.0.0.1:8000/api/schema/redoc/](http://127.0.0.1:8000/api/schema/redoc/) |
| **Django Core API** | Raw OpenAPI YAML | [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/) |
| **FastAPI Async Engine**| Swagger UI | [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs) |

### Core API Route Summary

| Endpoint | App | Description |
| :--- | :--- | :--- |
| `/api/auth/token/` | `users` | Obtain JWT token pair with tenant claims |
| `/api/auth/token/refresh/` | `users` | Refresh access token |
| `/api/tenancy/tenants/` | `tenancy` | Tenant provisioning and settings management |
| `/api/role-builder/roles/` | `role_builder` | Custom RBAC role definitions and permission grids |
| `/api/parties/` | `parties` | Unified Customer and Vendor directory |
| `/api/catalog/items/` | `catalog` | Products, service definitions, and pricing |
| `/api/inventory/warehouses/` | `inventory` | Warehouse locations and multi-site stock counts |
| `/api/purchasing/orders/` | `purchasing` | Purchase orders, line items, and goods receipt |
| `/api/sales/invoices/` | `sales` | Commercial sales invoices and invoice templates |
| `/api/finance/accounts/` | `finance` | Chart of accounts and balance tracking |
| `/api/finance/journal-entries/`| `finance` | Balanced double-entry journal transactions |
| `/api/finance/payments/` | `finance` | Payment receipt and disbursement logging |
| `/api/reports/balance-sheet/` | `reports` | Live balance sheet calculation |
| `/api/reports/trial-balance/` | `reports` | Real-time debit/credit trial balance |
| `/api/module-builder/modules/` | `module_builder`| Define custom low-code entities and tables |
| `/api/module-builder/records/` | `module_builder`| Store and query dynamic records |
| `/api/async/stock-availability`| `async_services`| Live stock queries across warehouses |
| `/api/async/party-balance` | `async_services`| Real-time customer/vendor balance lookups |
| `/api/async/webhooks/incoming` | `async_services`| High-speed inbound event webhook ingest |

---

## 🧪 Running Tests

The test suite is powered by `pytest` and `pytest-django`, covering multi-tenant isolation, general ledger mathematical integrity, low-code dynamic records, and FastAPI async services.

Execute the test suite with:

```bash
pytest
```

To run a specific test suite with verbose logging:

```bash
# Test strict tenant data isolation
pytest tests/test_tenancy_isolation.py -v

# Test double-entry balance and ledger integrity
pytest tests/test_finance_ledger.py -v

# Test dynamic low-code module creation and JSON schema validation
pytest tests/test_module_builder.py -v

# Test FastAPI asynchronous service layer
pytest tests/test_fastapi_async.py -v
```

---

## ⚙️ Configuration & Environment Reference

All configuration variables can be passed via `.env` or system environment variables:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `SECRET_KEY` | *(django-insecure...)* | Django cryptographic signing key |
| `DEBUG` | `True` | Debug mode toggle (`True` / `False`) |
| `ALLOWED_HOSTS` | `*` | Comma-separated list of permitted hostnames |
| `DB_NAME` | `generic_erp` | PostgreSQL database name |
| `DB_USER` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | *(empty)* | PostgreSQL password |
| `DB_HOST` | `127.0.0.1` | PostgreSQL host address |
| `DB_PORT` | `5432` | PostgreSQL port |
| `CELERY_BROKER_URL` | `redis://127.0.0.1:6379/0`| Celery message broker URL |
| `CELERY_RESULT_BACKEND`| `redis://127.0.0.1:6379/0`| Celery task result backend |

---

## 🚢 Production Deployment Notes

When deploying to production:
1. **Set `DEBUG=False`** and specify explicit domains in `ALLOWED_HOSTS`.
2. **Set a strong unique `SECRET_KEY`**.
3. **Build Frontend Assets:**
   ```bash
   cd frontend
   npm run build
   ```
4. **Collect Static Files:**
   ```bash
   python manage.py collectstatic --noinput
   ```
5. **WSGI/ASGI Process Manager:**
   - Run Django via **Gunicorn** / **Uvicorn Worker**:
     ```bash
     gunicorn config.wsgi:application --workers 4 --bind 0.0.0.0:8000
     ```
   - Run FastAPI Async Layer via **Uvicorn**:
     ```bash
     uvicorn async_services.main:app --workers 4 --host 0.0.0.0 --port 8001
     ```
6. **Reverse Proxy:** Configure Nginx or Caddy to terminate SSL/TLS, route `/api/async/` to port 8001, `/api/` to port 8000, and serve `frontend/dist` directly for optimal performance.

---

## 🤝 Contributing & License

Contributions, bug reports, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Distributed under the **MIT License**. See `LICENSE` for more information.

