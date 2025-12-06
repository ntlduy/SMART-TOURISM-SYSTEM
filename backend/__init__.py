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
# Allow configuring the database via environment variable for testing/development.
import os
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL",
    # Default to a local SQLite file so the app can run without a MySQL server during tests.
    "sqlite:///backend_test.db",
)
# Disable modify-tracking to avoid overhead; enable explicitly if needed.
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
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

# Register feature blueprints
try:
    # Importing here registers the blueprint with the app
    from .challenge import challenge_bp
    app.register_blueprint(challenge_bp, url_prefix='/api/challenge')
except Exception:
    # If the file doesn't exist yet or import fails, skip — developer will see errors in logs
    pass

