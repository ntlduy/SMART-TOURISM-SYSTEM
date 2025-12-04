import hashlib
from __init__ import app, db, mail
from models import  User, Shop, Comment
import random
from datetime import datetime, timedelta
from flask_mail import Message

from sqlalchemy import or_, and_, cast, Float
import math

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


def add_user(name, username, password, **kwargs):
    password = str(hashlib.md5(password.strip().encode('utf-8')).hexdigest())
    user = User(name=name.strip(), username=username.strip(),password=password,
                email=kwargs.get('email'),
                avatar=kwargs.get('avatar'))
                
    db.session.add(user)
    db.session.commit()

def check_login(username, password):
    if username and password:
        password = str(hashlib.md5(password.strip().encode('utf-8')).hexdigest())
        return User.query.filter(User.username.__eq__(username.strip()),
                                 User.password.__eq__(password)).first()
    return None


def get_user_by_id(user_id):
    return User.query.get(user_id)



def load_shops(kw=None, from_price=None, to_price=None, page=1):
    shops = Shop.query
    
    if kw:
        from sqlalchemy import or_
        shops = shops.filter(or_(
            Shop.shop_name.contains(kw),
            Shop.items.contains(kw)
        ))
    

    page_size = app.config['PAGE_SIZE']
    start = (page - 1) * page_size
    end = start + page_size
    
    return shops.slice(start, end).all()

def count_shops():
    return Shop.query.count()

#mail
def get_user_by_email(email):
    return User.query.filter(User.email.__eq__(email.strip())).first()


def get_user_by_email(email):
    return User.query.filter(User.email.__eq__(email.strip())).first()

# Hàm tạo mã, lưu mã và gửi email
def generate_and_send_reset_code(user_id): # <--- CHỈNH SỬA user thành user_id
    app.logger.error(f"--- BẮT ĐẦU XỬ LÝ QUÊN MẬT KHẨU CHO USER ID: {user_id} ---")
    with app.app_context():
        
        # KHẮC PHỤC LỖI DETACHED INSTANCE: Tải lại user object để liên kết với Session hiện tại
        user = get_user_by_id(user_id) 

        if not user:
            app.logger.error(f"Không tìm thấy user với ID: {user_id}")
            return False

        # 1. Tạo mã xác nhận ngẫu nhiên (6 chữ số)
        code = str(random.randint(100000, 999999))
        
        # 2. Lưu mã và thời gian hết hạn (ví dụ: 15 phút) vào database
        user.reset_code = code
        user.code_expiration = datetime.now() + timedelta(minutes=15)
        app.logger.error(f"--- RESET CODE TẠO RA: {code} ---")
        app.logger.error(f"--- CODE HẾT HẠN: {user.code_expiration} ---")
        
        
        try:
            # Ưu tiên: COMMIT TRƯỚC HẾT để đảm bảo mã code được lưu
            db.session.commit()
            app.logger.error("--- COMMIT DB (LƯU RESET CODE) THÀNH CÔNG ---")
            
            # 3. Gửi email
            msg = Message("Mã xác nhận thay đổi mật khẩu", recipients=[user.email])
            msg.body = f"""
                        Chào {user.name},

                        Bạn đã yêu cầu thay đổi mật khẩu. Mã xác nhận của bạn là:
                        {code}

                        Mã này sẽ hết hạn sau 15 phút. Vui lòng nhập mã này để tiếp tục.

                        Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.
                        """
            mail.send(msg)
            app.logger.error("--- GỬI MAIL THÀNH CÔNG ---")
            
            return True
        except Exception as ex:
            # ROLLBACK nếu commit hoặc gửi mail thất bại
            db.session.rollback()
            app.logger.error(f"LỖI XỬ LÝ QUÊN MẬT KHẨU (Email hoặc DB Commit): {str(ex)}")
            import traceback
            app.logger.error(traceback.format_exc())
            print("LỖI GỬI EMAIL: " + str(ex))
            return False

def verify_reset_code(user_id, code):
    user = get_user_by_id(user_id)
    if user:
        if user.reset_code and user.reset_code == code.strip() and user.code_expiration > datetime.now():
            return True
    return False


def update_password(user_id, new_password):
    app.logger.error("thanh none da chay")
    user = get_user_by_id(user_id)
    if user:
        # Mã hoá mật khẩu mới
        hashed_password = str(hashlib.md5(new_password.strip().encode('utf-8')).hexdigest())
        user.password = hashed_password
        
        # Xóa mã xác nhận và thời gian hết hạn sau khi đổi thành công
        user.reset_code = None
        user.code_expiration = None
        
        db.session.commit()
        return True
    return False

# 1. Hàm tính khoảng cách (Haversine Formula)
def calculate_distance(lat1, lon1, lat2, lon2):
    if not lat1 or not lon1 or not lat2 or not lon2:
        return float('inf') # Trả về vô cực nếu thiếu tọa độ
    
    R = 6371  # Bán kính trái đất (km)
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

# 2. Hàm load_shops nâng cấp
def load_shops(kw=None, from_price=None, to_price=None, 
               city=None, min_rating=None, 
               user_lat=None, user_lon=None, radius=None, page=1):
    
    query = Shop.query
    
    # --- Lọc theo Keyword (Tên shop hoặc Vật phẩm) ---
    if kw:
        query = query.filter(or_(
            Shop.shop_name.contains(kw),
            Shop.items.contains(kw)
        ))
    
    # --- Lọc theo Tỉnh/Thành phố ---
    if city and city != 'all':
        query = query.filter(Shop.city == city)
        
    # --- Lọc theo Giá (Cần ép kiểu String sang Float để so sánh) ---
    if from_price:
        query = query.filter(cast(Shop.price, Float) >= float(from_price))
    if to_price:
        query = query.filter(cast(Shop.price, Float) <= float(to_price))
        
    # --- Lọc theo Rating ---
    if min_rating:
        query = query.filter(Shop.rating >= float(min_rating))

    # Lấy toàn bộ dữ liệu thỏa mãn các điều kiện trên (để xử lý khoảng cách)
    shops = query.all()
    
    # --- Lọc theo Khoảng cách (Xử lý bằng Python) ---
    if user_lat and user_lon and radius:
        try:
            user_lat = float(user_lat)
            user_lon = float(user_lon)
            radius = float(radius)
            
            filtered_shops = []
            for s in shops:
                # Tính khoảng cách
                dist = calculate_distance(user_lat, user_lon, s.lat, s.lon)
                s.distance = round(dist, 1) # Gán thuộc tính distance để hiển thị
                
                if dist <= radius:
                    filtered_shops.append(s)
            
            # Sắp xếp theo khoảng cách gần nhất
            shops = sorted(filtered_shops, key=lambda x: x.distance)
            
        except ValueError:
            pass # Bỏ qua nếu dữ liệu toạ độ lỗi

    # --- Phân trang (Pagination) bằng Python ---
    total_count = len(shops)
    page_size = app.config['PAGE_SIZE']
    start = (page - 1) * page_size
    end = start + page_size
    
    return shops[start:end], total_count

# 3. Hàm lấy danh sách các tỉnh thành (để đổ vào dropdown list)
def get_all_cities():
    # Lấy các thành phố unique, loại bỏ None
    cities = db.session.query(Shop.city).distinct().order_by(Shop.city).all()
    return [c[0] for c in cities if c[0]]




def search_shops_by_items(item_list):
    """
    Tìm các shop có chứa ít nhất 1 món trong item_list
    """
    if not item_list:
        return []
    
    query = Shop.query
    filters = []
    
    for item in item_list:
        # Tìm shop có cột items chứa tên sản phẩm (dùng like/contains)
        filters.append(Shop.items.contains(item))
    
    # Dùng OR: chỉ cần shop có bán 1 trong các món là được chọn
    return query.filter(or_(*filters)).all()


# 1. Hàm lấy thông tin chi tiết shop theo ID
def get_shop_by_id(shop_id):
    return Shop.query.get(shop_id)

# 2. Hàm lấy danh sách bình luận của shop
def get_comments(shop_id):
    return Comment.query.filter(Comment.shop_id == shop_id).order_by(Comment.created_date.desc()).all()


# Trong saleapp/utils.py
from sqlalchemy import func # Import hàm tính toán

def add_comment(content, shop_id, user_id, rating=0, images=[]):
    # 1. Thêm comment vào DB
    image_string = ";".join(images) if images else None

    c = Comment(content=content, shop_id=shop_id, user_id=user_id, rating=rating, image=image_string)
    db.session.add(c)
    db.session.commit()

    # 2. (Nâng cao) Tính lại điểm trung bình cho Shop
    # Lấy trung bình cộng cột rating của các comment thuộc shop này
    avg_rating = db.session.query(func.avg(Comment.rating)).filter(Comment.shop_id == shop_id).scalar()
    
    # Cập nhật vào bảng Shop
    shop = Shop.query.get(shop_id)
    shop.rating = round(avg_rating, 1) # Làm tròn 1 chữ số thập phân
    db.session.commit()
    
    return c