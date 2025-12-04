from __init__ import app, db
from flask_admin import Admin 
from flask_admin.contrib.sqla import ModelView
from models import Shop
admin = Admin(app = app, name="Administration")


admin.add_view(ModelView(Shop, db.session))
