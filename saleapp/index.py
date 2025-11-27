from __init__ import app, login
from flask import render_template, request, redirect, url_for, flash
import utils
import math
import cloudinary.uploader
from flask_login import login_user, logout_user
import random
from datetime import datetime, timedelta


from flask import Blueprint, request, jsonify, render_template

#mail

from utils import get_user_by_email, generate_and_send_reset_code, verify_reset_code, update_password

@app.route("/") 
def index():
    kw = request.args.get('keyword')
    page = request.args.get('page', 1)

    shops = utils.load_shops( page=int(page))
    counter = utils.count_shops()
    return render_template('index.html', shops=shops,
                        pages = math.ceil(counter/app.config['PAGE_SIZE']),
                        current_page=int(page))



@app.route('/challenge')
def challenge():
    return render_template('challenge.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/shop')
def shop():
    return render_template('shop.html')


@app.route('/search')
def search():
    return render_template('search.html')


@app.route('/register', methods=['get', 'post'])
def user_register():
    err_msg =""
    if request.method.__eq__('POST'):
        name = request.form.get('name')
        username = request.form.get('username')
        password = request.form.get('pass')
        email = request.form.get('email')
        confirm = request.form.get('confirm')
        avatar_path = None

        try:
            if password.strip().__eq__(confirm.strip()):               
                avatar = request.files.get('avatar')
                if avatar:
                    res = cloudinary.uploader.upload(avatar)
                    avatar_path = res['secure_url']
                utils.add_user(name=name, username=username, password=password, email=email,
                                avatar=avatar_path)
                return redirect(url_for('user_signin'))
            else:   
                err_msg = "Mat Khau Khong Hop Le"

        except Exception as ex:
            err_msg ="he thong co loi: " + str(ex)
 
            

    return render_template('register.html', err_msg=err_msg)


@app.route('/user-login', methods=['get', 'post'])
def user_signin() :
    err_msg = ''
    if request.method.__eq__('POST') :
        username = request.form.get('username')
        password = request.form.get('pass')

        user = utils.check_login(username=username, password=password)
        if user :
            login_user(user=user)
            return redirect(url_for('index'))
        else:
            err_msg="usernam or password KHONG chinh xac"
    return render_template('login.html', err_msg = err_msg)

@app.route('/user-logout')
def user_signout() :
    logout_user()
    return redirect(url_for('user_signin'))


# @app.context_processor
# def common_response():
#     return {
#         'categories': utils.load_categories()
#     }

@login.user_loader
def user_load(user_id) :
    return utils.get_user_by_id(user_id=user_id)




@app.route("/info-user")
def info_user():
    return render_template("infouser.html")

#mail

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form.get('email')
        user = get_user_by_email(email)
        
        




        if user:
            if generate_and_send_reset_code(user.id):
                flash('Mã xác nhận đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.', 'info')
                # Chuyển hướng đến trang nhập mã xác nhận
                return redirect(url_for('verify_code_page', user_id=user.id))
            else:
                flash('Lỗi khi gửi email xác nhận. Vui lòng thử lại sau.', 'danger')
        else:
            flash('Không tìm thấy tài khoản nào với địa chỉ email này.', 'danger')
            
    # Giả sử bạn có template 'forgot_password.html'
    return render_template('forgot_password.html')

# Route trung gian để hiển thị form nhập mã

@app.route('/verify-code-page/<int:user_id>', methods=['GET'])
def verify_code_page(user_id):
    # Dùng GET để chuyển user_id qua. Form POST sẽ gọi route xác minh thực sự.
    return render_template('verify_code.html', user_id=user_id)

@app.route('/reset-password', methods=['POST'])
def reset_password():
    user_id = request.form.get('user_id')
    code = request.form.get('reset_code')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')
    
    # 2a. Kiểm tra mã xác nhận
    if not verify_reset_code(user_id, code):
        flash('Mã xác nhận không hợp lệ hoặc đã hết hạn.', 'danger')
        return redirect(url_for('verify_code_page', user_id=user_id))
    
    # 2b. Kiểm tra mật khẩu mới
    if new_password != confirm_password:
        flash('Mật khẩu mới và xác nhận mật khẩu không khớp.', 'danger')
        return render_template('new_password.html', user_id=user_id, code=code) # Giữ lại form
        
    if update_password(user_id, new_password):
        flash('Thay đổi mật khẩu thành công! Vui lòng đăng nhập lại.', 'success')
        # Chuyển hướng về trang đăng nhập
        return redirect(url_for('user_signin'))
    else:
        flash('Lỗi khi cập nhật mật khẩu. Vui lòng thử lại.', 'danger')
        return redirect(url_for('verify_code_page', user_id=user_id))
    
# Route để hiển thị form nhập mật khẩu mới (sau khi mã được nhập)
@app.route('/new-password-form', methods=['POST'])
def new_password_form():
    user_id = request.form.get('user_id')
    code = request.form.get('reset_code')
    
    if verify_reset_code(user_id, code):
        # Giả sử bạn có template 'new_password.html'
        # Chuyển user_id và code ẩn qua form để POST lên /reset-password
        return render_template('new_password.html', user_id=user_id, code=code)
    else:
        flash('Mã xác nhận không hợp lệ hoặc đã hết hạn.', 'danger')
        return redirect(url_for('verify_code_page', user_id=user_id))






# --- Route Chat AI mới ---





if __name__ == '__main__':
    from admin import *
    app.run(debug=True)

