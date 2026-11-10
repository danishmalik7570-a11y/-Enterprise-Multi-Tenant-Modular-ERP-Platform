import contextvars
from contextlib import contextmanager
from typing import Optional, Any

_current_tenant: contextvars.ContextVar[Optional[Any]] = contextvars.ContextVar('current_tenant', default=None)
_bypass_tenant_check: contextvars.ContextVar[bool] = contextvars.ContextVar('bypass_tenant_check', default=False)

def get_current_tenant():
    """Retrieve the active tenant from context."""
    return _current_tenant.get()

def set_current_tenant(tenant):
    """Set the active tenant in context."""
    return _current_tenant.set(tenant)

def reset_current_tenant(token):
    """Reset context to previous tenant token."""
    _current_tenant.reset(token)

def is_tenant_bypass_active() -> bool:
    return _bypass_tenant_check.get()

@contextmanager
def tenant_context(tenant):
    """Context manager for running operations scoped to a specific tenant."""
    token = _current_tenant.set(tenant)
    try:
        yield tenant
    finally:
        _current_tenant.reset(token)

@contextmanager
def unscoped_context():
    """Context manager to bypass automatic tenant filtering (e.g. for superadmin or background tasks)."""
    token = _bypass_tenant_check.set(True)
    try:
        yield
    finally:
        _bypass_tenant_check.reset(token)
