from __init__ import app, login
from flask import render_template, request, redirect, url_for
import utils
import math
import cloudinary.uploader
from flask_login import login_user, logout_user

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


if __name__ == '__main__':
    from admin import *
    app.run(debug=True)