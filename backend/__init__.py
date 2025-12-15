from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import cloudinary
from flask_login import LoginManager
from flask_cors import CORS


#mail
from flask_mail import Mail, Message
import os
app = Flask(__name__) 





app.secret_key = 'aheafgwagfsadgasfsdfa2673^^8y8621'
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://root:@localhost/db_shop?charset=utf8mb4"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = True
# THÊM ĐOẠN NÀY: Ép PyMySQL dùng utf8mb4 ngay khi kết nối
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'connect_args': {
        'charset': 'utf8mb4',
        'use_unicode': True
    }
}
app.config["PAGE_SIZE"] = 12
#mail
app.config['MAIL_SERVER'] = 'smtp.googlemail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', 'duyn26353@gmail.com') # Dùng biến môi trường cho bảo mật
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', 'xdhj qdyc bgcg nhgj') # Mật khẩu ứng dụng
app.config['MAIL_DEFAULT_SENDER'] = 'duyn26353@gmail.com'


CORS(app, supports_credentials=True)
# CORS(app, origins=["http://localhost:3000"], supports_credentials=True)
# CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)
# CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000"]}}, supports_credentials=True)

mail = Mail(app)
db = SQLAlchemy(app=app)



cloudinary.config (
    cloud_name = 'dsnbftdyy',
    api_key= '457533482377296',
    api_secret= 'Txx3CT7cgdYJ5NPLqEHo226wx3I',

)


login = LoginManager(app=app)

