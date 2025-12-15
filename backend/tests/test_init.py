import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import backend
from flask import Flask


def test_app_and_config():
    assert hasattr(backend, "app")
    assert isinstance(backend.app, Flask)
    assert backend.app.config.get("PAGE_SIZE") == 12
    # SQLALCHEMY settings exist
    assert "SQLALCHEMY_DATABASE_URI" in backend.app.config
    # MAIL settings
    assert backend.app.config.get("MAIL_SERVER") == "smtp.googlemail.com"


def test_extensions_present():
    assert hasattr(backend, "db")
    from flask_sqlalchemy import SQLAlchemy

    assert isinstance(backend.db, SQLAlchemy)

    assert hasattr(backend, "mail")
    from flask_mail import Mail

    assert isinstance(backend.mail, Mail)

    assert hasattr(backend, "login")
    from flask_login import LoginManager

    assert isinstance(backend.login, LoginManager)

    # cloudinary should be imported and have config callable
    assert hasattr(backend, "cloudinary")
    assert callable(getattr(backend.cloudinary, "config", None))
