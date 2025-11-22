from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import cloudinary
from flask_login import LoginManager
app = Flask(__name__) 
app.secret_key = 'aheafgwagfsadgasfsdfa2673^^8y8621'
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://root:@localhost/shop_db?charset=utf8mb4"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = True
app.config["PAGE_SIZE"] = 12

db = SQLAlchemy(app=app)


cloudinary.config (
    cloud_name = 'dsnbftdyy',
    api_key= '457533482377296',
    api_secret= 'Txx3CT7cgdYJ5NPLqEHo226wx3I',

)


login = LoginManager(app=app)

