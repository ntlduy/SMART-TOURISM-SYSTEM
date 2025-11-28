from __init__ import app, login
from flask import render_template, request, redirect, url_for, flash
import utils
import math
import cloudinary.uploader
from flask_login import login_user, logout_user
import random
from datetime import datetime, timedelta
import os
from flask_cors import CORS
from ai_nhandienanh import phan_tich_hinh_anh # Import hàm xử lý ảnh

CORS(app)


from flask import Blueprint, request, jsonify, render_template

#mail

from utils import get_user_by_email, generate_and_send_reset_code, verify_reset_code, update_password


from google import genai




from dotenv import load_dotenv
import google.generativeai as genai
import os



# Lấy đường dẫn tuyệt đối đến file .env nằm cùng thư mục với file index.py
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path, override=True)




# Lấy API Key từ biến môi trường
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
client = None
if GEMINI_API_KEY:
    print(f"--- KEY ĐÃ TẢI: {GEMINI_API_KEY} ---")
else:
    print("--- LỖI: CHƯA ĐỌC ĐƯỢC GEMINI_API_KEY ---")


if GEMINI_API_KEY:
    try:
        # Cấu hình API key sử dụng cú pháp mới
        genai.configure(api_key=GEMINI_API_KEY)
        # Sử dụng một biến cờ đơn giản để kiểm tra trạng thái cấu hình
        client = True 
        print("Đã cấu hình Gemini Client thành công từ file .env.")
    except Exception as e:
        print(f"LỖI CẤU HÌNH GEMINI: Khóa API có thể không hợp lệ. {e}")
        client = None
else:
    print("CẢNH BÁO: Không tìm thấy GEMINI_API_KEY trong môi trường.")
    client = None

# Định nghĩa vai trò của Chatbot (System Instruction)
SOUVENIR_SYSTEM_INSTRUCTION = (
    "Bạn là 'Souvenir Expert AI' (Chuyên gia Quà Lưu Niệm) thân thiện và nhiệt tình. "
    "Nhiệm vụ của bạn là tư vấn cho du khách về các món quà lưu niệm độc đáo, "
    "kinh nghiệm mua sắm, mẹo trả giá, và các địa điểm mua sắm (chợ, cửa hàng) tại Việt Nam."
    "Phản hồi của bạn phải ngắn gọn, hữu ích, và sử dụng ngôn ngữ tiếng Việt tự nhiên."
)

# --- Hàm xử lý logic AI bằng Gemini (Sử dụng cấu trúc mới) ---
def get_gemini_response(user_message, chat_history=[]):
    """
    Sử dụng Gemini API để nhận phản hồi thông minh và duy trì lịch sử trò chuyện 
    theo cấu trúc start_chat.
    :param user_message: Câu hỏi mới nhất của người dùng.
    :param chat_history: List lịch sử chat (format cũ) từ frontend.
    """
    global client
    if not client:
        return "Lỗi cấu hình AI. Vui lòng kiểm tra lại GEMINI_API_KEY trên server."

    try:
        # 1. Khởi tạo model và system instruction
        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            system_instruction=SOUVENIR_SYSTEM_INSTRUCTION
        )

        # 2. Định dạng lại lịch sử chat để tương thích với genai.GenerativeModel.start_chat
        formatted_history = []
        for msg in chat_history:
             # Kiểm tra và chuyển đổi định dạng
            if msg.get('role') in ['user', 'model'] and msg.get('parts'):
                # API mới chỉ cần chuỗi văn bản cho mỗi part
                text_part = msg['parts'][0].get('text') if isinstance(msg['parts'][0], dict) else msg['parts'][0]
                if text_part:
                    formatted_history.append({
                        "role": msg['role'],
                        "parts": [text_part] # Truyền thẳng chuỗi văn bản
                    })

        # 3. Tạo phiên chat với lịch sử cũ
        chat_session = model.start_chat(history=formatted_history)

        # 4. Gửi tin nhắn mới nhất
        response = chat_session.send_message(user_message)
        
        return response.text
        
    except Exception as e:
        # In lỗi cụ thể để debug
        print(f"LỖI GỌI API TRONG get_gemini_response: {str(e)}")
        # Trả về thông báo lỗi thân thiện cho frontend
        return "Xin lỗi, hiện tại tôi đang gặp vấn đề kết nối với AI. Vui lòng thử lại sau."








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



# --- API Endpoint ---
@app.route('/chat', methods=['POST'])
def chat():
    """
    Endpoint nhận tin nhắn từ frontend và trả về phản hồi của AI.
    """
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        
        # 1. THÊM VIỆC LẤY LỊCH SỬ CHAT TỪ REQUEST
        chat_history = data.get('history', []) 
        
        if not user_message:
            return jsonify({'reply': 'Vui lòng gửi tin nhắn.', 'success': False}), 400

        # 2. TRUYỀN THÊM LỊCH SỬ CHAT VÀO HÀM UTILS
        # Hàm utils.get_gemini_response trong file utils.py cần được cập nhật
        # để chấp nhận tham số chat_history
        ai_reply = get_gemini_response(user_message, chat_history=chat_history)

        return jsonify({'reply': ai_reply, 'success': True})

    except Exception as e:
        # In lỗi cụ thể ra console server để debug
        print(f"Lỗi xảy ra trong quá trình xử lý chat: {e}")
        return jsonify({'reply': 'Lỗi server, vui lòng kiểm tra console.', 'success': False}), 500
# --- Chạy Server ---

@app.route('/search-by-image', methods=['GET', 'POST']) 
def search_by_image():
    identified_items = [] # Danh sách vật phẩm AI nhìn thấy
    shops = []            # Danh sách shop bán vật phẩm đó
    image_url = None      # Link ảnh để hiển thị lại

    if request.method == 'POST':
        # 1. Lấy file từ frontend
        file = request.files.get('image')
        
        if file:
            try:
                # 2. Đưa file lên Cloudinary
                res = cloudinary.uploader.upload(file)
                image_url = res['secure_url']
                print(f"Đã upload ảnh lên: {image_url}")

                # 3. Chạy hàm tìm kiếm bằng hình ảnh (đã viết ở step 1)
                # Trả về danh sách: VD ['Chai nước', 'Bánh snack']
                identified_items = phan_tich_hinh_anh(image_url)
                print(f"AI nhận diện được: {identified_items}")

                # 4. Chạy hàm load từ sql danh sách cửa hàng (đã viết ở step 2)
                if identified_items:
                    shops = utils.search_shops_by_items(identified_items)
            
            except Exception as e:
                print(f"Lỗi xử lý tìm kiếm ảnh: {e}")
    
    # 5. Đưa kết quả ra frontend
    return render_template('search.html', 
                           shops=shops, 
                           identified_items=identified_items, 
                           image_url=image_url)




if __name__ == '__main__':
    from admin import *

    if not os.getenv("GEMINI_API_KEY"):
        print("CẢNH BÁO: Biến môi trường GEMINI_API_KEY chưa được thiết lập!")
        print("Chatbot sẽ không hoạt động với Gemini.")
    app.run(debug=True)

