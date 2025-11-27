from __init__ import app, login, db
from flask import render_template, request, redirect, url_for, flash
import utils
import math
import cloudinary.uploader
import random
from flask_login import login_user, logout_user
from datetime import datetime, timedelta
#mail

from utils import get_user_by_email, generate_and_send_reset_code, verify_reset_code, update_password


if __name__ == '__main__':
    with app.app_context():
        user =  get_user_by_email("duyn27353@gmail.com")
        code = str(random.randint(100000, 999999))
        
        # 2. Lưu mã và thời gian hết hạn (ví dụ: 15 phút) vào database
        user.reset_code = code
        user.code_expiration = datetime.now() + timedelta(minutes=15)
        db.session.commit()

