import math
import os
import random
from datetime import datetime, timedelta

import cloudinary.uploader
from flask import jsonify, make_response, render_template, request
from flask_login import current_user, login_required, login_user, logout_user
from flask_cors import CORS
import utils
from __init__ import app, login
from challenge import challenge_bp  # Import Blueprint Challenge

# Image analysis may require heavy native libs (numpy). Import lazily inside the route.


# --- 1. API SẢN PHẨM & TRANG CHỦ ---
@app.route("/api/shops", methods=["GET"])
def api_get_shops():
    # Lấy tham số
    kw = request.args.get("keyword")
    page = request.args.get("page", 1, type=int)
    from_price = request.args.get("from_price")
    to_price = request.args.get("to_price")
    city = request.args.get("city")
    category = request.args.get("category")
    min_rating = request.args.get("rating")
    user_lat = request.args.get("lat")
    user_lon = request.args.get("lon")
    radius = request.args.get("radius")

    # Gọi utils xử lý
    shops, total_count = utils.load_shops(
        kw=kw,
        from_price=from_price,
        to_price=to_price,
        city=city,
        category=category,
        min_rating=min_rating,
        user_lat=user_lat,
        user_lon=user_lon,
        radius=radius,
        page=page,
    )

    # Serialize dữ liệu
    shops_data = [s.to_dict() for s in shops]
    categories = utils.get_all_categories()

    cities = utils.get_all_cities()

    return jsonify(
        {
            "data": shops_data,
            "pagination": {
                "current_page": page,
                "total_pages": math.ceil(total_count / app.config["PAGE_SIZE"]),
                "total_count": total_count,
            },
            "filters": {"cities": cities, "categories": categories},
        }
    )


@app.route("/api/shops/<int:shop_id>", methods=["GET"])
def api_shop_detail(shop_id):
    shop = utils.get_shop_by_id(shop_id)
    if not shop:
        return jsonify({"error": "Không tìm thấy cửa hàng"}), 404

    comments = utils.get_comments(shop_id)

    return jsonify(
        {"shop": shop.to_dict(), "comments": [c.to_dict() for c in comments]}
    )


# --- 2. API AUTH (Đăng ký, Đăng nhập, Đăng xuất) ---


@app.route("/api/register", methods=["POST"])
def api_register():
    # API nhận dữ liệu từ JSON hoặc Form-data
    # Nếu client gửi JSON: data = request.get_json()
    # Nếu client gửi Form (multipart): dùng request.form

    name = request.form.get("name")
    username = request.form.get("username")
    password = request.form.get("pass")
    email = request.form.get("email")
    confirm = request.form.get("confirm")
    avatar = request.files.get("avatar")

    if not username or not password:
        return jsonify({"error": "Vui lòng nhập đầy đủ thông tin"}), 400

    if password.strip() != confirm.strip():
        return jsonify({"error": "Mật khẩu xác nhận không khớp"}), 400

    try:
        avatar_path = None
        if avatar:
            res = cloudinary.uploader.upload(avatar)
            avatar_path = res["secure_url"]

        utils.add_user(
            name=name,
            username=username,
            password=password,
            email=email,
            avatar=avatar_path,
        )
        return jsonify({"message": "Đăng ký thành công", "success": True}), 201

    except Exception as ex:
        return jsonify({"error": str(ex), "success": False}), 500


@app.route("/api/login", methods=["POST"])
def api_login():
    # Nhận JSON
    data = request.get_json()
    if not data:  # Fallback nếu gửi form data
        username = request.form.get("username")
        password = request.form.get("pass")
    else:
        username = data.get("username")
        password = data.get("password")  # Lưu ý frontend gửi key là 'password'

    user = utils.check_login(username=username, password=password)
    if user:
        login_user(user=user)
        # Quan trọng: Trả về thông tin user để Frontend lưu (ví dụ vào LocalStorage/Context)
        return jsonify(
            {"message": "Đăng nhập thành công", "user": user.to_dict(), "success": True}
        )

    return jsonify({"error": "Sai tên đăng nhập hoặc mật khẩu", "success": False}), 401


@app.route("/api/logout", methods=["POST"])
def api_logout():
    logout_user()
    return jsonify({"message": "Đăng xuất thành công"})


@app.route("/api/current-user")
def api_get_current_user():
    if current_user.is_authenticated:
        return jsonify({"user": current_user.to_dict(), "is_authenticated": True})
    return jsonify({"user": None, "is_authenticated": False})


# --- 3. API TÍNH NĂNG (Comment, Chat, Search Image) ---


@app.route("/api/shops/<int:shop_id>/comments", methods=["POST"])
@login_required  # Chặn nếu chưa đăng nhập
def api_add_comment(shop_id):
    try:
        content = request.form.get("content")
        rating = request.form.get("rating", type=int)
        files = request.files.getlist("images")

        if len(files) > 3:
            return jsonify({"error": "Tối đa 3 ảnh"}), 400

        uploaded_urls = []
        for file in files:
            if file and file.filename:
                res = cloudinary.uploader.upload(file)
                uploaded_urls.append(res["secure_url"])

        # Lưu comment
        new_comment = utils.add_comment(
            content=content,
            shop_id=shop_id,
            user_id=current_user.id,
            rating=rating,
            images=uploaded_urls,
        )

        return jsonify(
            {"message": "Đánh giá thành công", "comment": new_comment.to_dict()}
        )
    except Exception as ex:
        return jsonify({"error": str(ex)}), 500


@app.route("/api/chat", methods=["POST"])
def api_chat():
    try:
        data = request.get_json()
        user_message = data.get("message", "")
        chat_history = data.get("history", [])

        if not user_message:
            return jsonify({"reply": "Vui lòng gửi tin nhắn.", "success": False}), 400

        ai_reply = utils.get_gemini_response(user_message, chat_history=chat_history)
        return jsonify({"reply": ai_reply, "success": True})

    except Exception as e:
        print(f"Chat Error: {e}")
        return jsonify({"reply": "Lỗi server", "success": False}), 500


@app.route("/api/search-by-image", methods=["POST"])
def api_search_by_image():
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "Chưa gửi ảnh"}), 400

    try:
        res = cloudinary.uploader.upload(file)
        image_url = res["secure_url"]

        identified_items = phan_tich_hinh_anh(image_url)
        shops = []
        if identified_items:
            shops_list = utils.search_shops_by_items(identified_items)
            # Serialize danh sách shop
            shops = [s.to_dict() for s in shops_list]

        return jsonify(
            {
                "identified_items": identified_items,
                "image_url": image_url,
                "shops": shops,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- 4. API QUÊN MẬT KHẨU ---


@app.route("/api/forgot-password", methods=["POST"])
def api_forgot_password():
    email = request.form.get("email")  # Hoặc json
    if not email:
        data = request.get_json()
        email = data.get("email")

    user = utils.get_user_by_email(email)
    if user:
        if utils.generate_and_send_reset_code(user.id):
            # Trả về user_id để client dùng cho bước tiếp theo
            return jsonify(
                {"message": "Đã gửi mã xác nhận", "user_id": user.id, "success": True}
            )
        return jsonify({"error": "Lỗi gửi mail", "success": False}), 500

    return jsonify({"error": "Email không tồn tại", "success": False}), 404


@app.route("/api/verify-code", methods=["POST"])
def api_verify_code():
    # Gom gọn việc kiểm tra mã vào 1 API
    data = request.get_json()
    user_id = data.get("user_id")
    code = data.get("reset_code")

    if utils.verify_reset_code(user_id, code):
        return jsonify({"message": "Mã hợp lệ", "valid": True})
    return jsonify({"error": "Mã sai hoặc hết hạn", "valid": False}), 400


@app.route("/api/reset-password", methods=["POST"])
def api_reset_password():
    data = request.get_json()
    user_id = data.get("user_id")
    code = data.get("reset_code")  # Kiểm tra lại lần nữa cho chắc
    new_password = data.get("new_password")

    # Logic kiểm tra code lần 2 (bảo mật)
    if not utils.verify_reset_code(user_id, code):
        return jsonify({"error": "Mã phiên làm việc hết hạn"}), 400

    if utils.update_password(user_id, new_password):
        return jsonify({"message": "Đổi mật khẩu thành công", "success": True})

    return jsonify({"error": "Lỗi cập nhật", "success": False}), 500


# --- User Loader ---
@login.user_loader
def user_load(user_id):
    return utils.get_user_by_id(user_id=user_id)


# --- ROUTE TEST (Thêm vào index.py) ---
from flask import render_template

if __name__ == "__main__":
    # Lưu ý: file admin.py có thể sẽ cần chỉnh sửa nếu nó phụ thuộc vào template
    # try:
    #     from admin import * except:
    #     pass

    if not os.getenv("GEMINI_API_KEY"):
        print("CẢNH BÁO: Chưa có key Gemini")

    app.run(debug=True)
