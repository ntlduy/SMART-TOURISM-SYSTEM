import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest

import admin
from models import Shop


def test_admin_registered_shop_view():
    # admin.admin should exist and have views registered
    assert hasattr(admin, "admin")
    a = admin.admin
    # find a view whose model is Shop
    found = False
    for v in getattr(a, "_views", []):
        if getattr(v, "model", None) is Shop:
            found = True
            break
    assert found, "Shop ModelView not registered in admin"
