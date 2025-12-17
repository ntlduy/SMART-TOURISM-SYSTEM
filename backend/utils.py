import hashlib
from __init__ import app, db, mail
from models import User, Shop, Comment, City, Category, ChatHistory
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

def apply_smart_search(query, keyword_str):
    """
    Hàm lõi: Tách từ khóa theo dấu phẩy và áp dụng filter OR.
    Ví dụ: "bình gốm, vòng tay" -> Tìm (name LIKE %bình gốm% OR items LIKE %bình gốm%) 
                                OR (name LIKE %vòng tay% OR items LIKE %vòng tay%)
    """
    if not keyword_str:
        return query

    # 1. Tách chuỗi bằng dấu phẩy, xóa khoảng trắng thừa
    keywords = [k.strip() for k in keyword_str.split(',') if k.strip()]
    
    if not keywords:
        return query

    # 2. Tạo danh sách các điều kiện lọc
    filters = []
    for k in keywords:
        # Tìm trong Tên Shop HOẶC trong Mặt hàng (items)
        filters.append(Shop.shop_name.contains(k))
        filters.append(Shop.items.contains(k))
    
    # 3. Gộp tất cả điều kiện bằng phép OR
    # Nghĩa là chỉ cần thỏa mãn 1 trong các từ khóa là lấy
    return query.filter(or_(*filters))


# --- Hàm xử lý logic AI bằng Gemini (Sử dụng cấu trúc mới) ---
import json
import re

def get_gemini_response(user_message, chat_history=[]):
    global client
    if not client:
        return {"answer": "Lỗi AI.", "shop_ids": []}

    try:
        # --- GIAI ĐOẠN 1: DÙNG AI ĐỂ HIỂU Ý ĐỊNH KHÁCH HÀNG ---
        # Mục tiêu: Biến "tui muốn mua bánh tráng ở sài gòn" -> {"keyword": "bánh tráng", "city": "Hồ Chí Minh"}
        
        intent_prompt = f"""
        Bạn là một bộ lọc thông minh. Nhiệm vụ của bạn là trích xuất từ khóa tìm kiếm từ câu nói của người dùng.
        
        Câu người dùng: "{user_message}"
        
        Yêu cầu Output: Trả về JSON duy nhất:
        {{
            "keyword": "tên món ăn hoặc tên quán(ví dụ: vòng tay, tranh)",
            "city": "tên thành phố nếu có (ngắn gọn, ví dụ: Hồ Chí Minh, Hà Nội...)",
            "is_searching": true/false (true nếu người dùng đang muốn tìm mua gì đó, false nếu chỉ chào hỏi xã giao)
        }}
        """
        
        model_flash = genai.GenerativeModel('gemini-2.5-flash') # Dùng bản Flash cho nhanh và rẻ
        intent_resp = model_flash.generate_content(intent_prompt)
        
        try:
            # Làm sạch chuỗi json
            clean_intent = intent_resp.text.replace("```json", "").replace("```", "").strip()
            intent_data = json.loads(clean_intent)
        except:
            # Nếu lỗi parse, mặc định là tìm theo toàn bộ tin nhắn
            intent_data = {"keyword": user_message, "city": None, "is_searching": True}

        # --- GIAI ĐOẠN 2: TRUY VẤN DATABASE (RAG) ---
        found_shops = []
        context_text = ""
        
        if intent_data.get("is_searching"):
            # Gọi hàm SQL đã viết ở bước 1
            kw = intent_data.get("keyword")
            city = intent_data.get("city")
            
            # Chỉ tìm nếu có keyword, nếu user chỉ nói "Hello" thì không cần query DB
            if kw or city:
                shops_db = search_shops_from_db(keywords=kw, city=city, limit=4) # Lấy top 8
                
                if shops_db:
                    context_text = "DƯỚI ĐÂY LÀ KẾT QUẢ TÌM KIẾM TỪ DATABASE:\n"
                    for s in shops_db:
                        # Format dữ liệu để đưa vào Prompt bước 3
                        items_str = s.items if s.items else "Nhiều món"
                        city_name = s.city_obj.name if s.city_obj else ""
                        line = (f"- ID: {s.id} | Tên: {s.shop_name} | Đ/C: {s.address}, {city_name} "
                                f"| Món: {items_str} | Giá: {s.price}\n")
                        context_text += line
                        found_shops.append(s.id) # Lưu lại ID để trả về Frontend
                else:
                    context_text = "Hệ thống đã tìm trong Database nhưng không thấy quán nào phù hợp với từ khóa trên."
        
        # --- GIAI ĐOẠN 3: AI TRẢ LỜI CUỐI CÙNG ---
        
        FINAL_PROMPT = f"""
        {SOUVENIR_SYSTEM_INSTRUCTION}
        
        THÔNG TIN TÌM ĐƯỢC TỪ HỆ THỐNG:
        {context_text}
        
        LỊCH SỬ CHAT:
        {chat_history}
        
        CÂU HỎI CỦA KHÁCH: "{user_message}"
        
        YÊU CẦU:
        1. Dựa vào thông tin tìm được ở trên để trả lời khách.
        2. Nếu có danh sách quán, hãy giới thiệu sơ qua.
        3. Nếu không tìm thấy quán (context trống hoặc báo không có), hãy xin lỗi khéo léo và gợi ý tìm từ khóa khác.
        5. Trả về định dạng JSON: {{ "answer": "...", "shop_ids": {found_shops} }}
        """
        
        # Gửi request cuối
        final_resp = model_flash.generate_content(FINAL_PROMPT)
        
        # Parse kết quả cuối cùng
        final_clean = final_resp.text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(final_clean)
        except:
             return {"answer": final_clean, "shop_ids": found_shops}

    except Exception as e:
        print(f"LỖI RAG: {e}")
        return {"answer": "Đại Vương ơi, server đang quá tải xíu ạ.", "shop_ids": []}


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
    # Only treat coordinates as missing when they are None (0 is a valid coordinate)
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf') # Trả về vô cực nếu thiếu tọa độ
    
    R = 6371  # Bán kính trái đất (km)
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

# 2. Hàm load_shops
# Đảm bảo bạn đã import Category ở đầu file
from models import Shop, City, Category  # <--- Thêm Category vào đây

def load_shops(kw=None, from_price=None, to_price=None, 
               city=None, category=None, 
               min_rating=None, 
               user_lat=None, user_lon=None, radius=None, page=1):
    
    query = Shop.query
    
    # --- 1. TÌM KIẾM THÔNG MINH (Thay thế đoạn code cũ) ---
    if kw:
        query = apply_smart_search(query, kw)
    
    # --- 2. Lọc theo Tỉnh/Thành phố ---
    if city and city != 'all':
        query = query.join(City).filter(City.name == city)

    # --- 3. Lọc theo Category ---
    if category and category != 'all':
        query = query.join(Category).filter(Category.name == category)
        
    # --- 4. Lọc theo Giá ---
    if from_price:
        query = query.filter(cast(Shop.price, Float) >= float(from_price))
    if to_price:
        query = query.filter(cast(Shop.price, Float) <= float(to_price))
        
    # --- 5. Lọc theo Rating ---
    if min_rating:
        query = query.filter(Shop.rating >= float(min_rating))

    # Lấy dữ liệu (Execute Query)
    shops = query.all()
    
    # --- 6. Lọc theo Khoảng cách (Logic Python giữ nguyên) ---
    if user_lat and user_lon and radius:
        try:
            user_lat = float(user_lat)
            user_lon = float(user_lon)
            radius = float(radius)
            
            filtered_shops = []
            for s in shops:
                # Xử lý trường hợp shop không có toạ độ
                s_lat = s.lat if s.lat is not None else 0
                s_lon = s.lon if s.lon is not None else 0
                
                dist = calculate_distance(user_lat, user_lon, s_lat, s_lon)
                s.distance = round(dist, 1) # Gán thuộc tính tạm distance để sort
                
                if dist <= radius:
                    filtered_shops.append(s)
            
            # Sort theo khoảng cách gần nhất
            shops = sorted(filtered_shops, key=lambda x: x.distance)
            
        except ValueError:
            pass 

    # --- 7. Phân trang ---
    total_count = len(shops)
    page_size = app.config['PAGE_SIZE']
    start = (page - 1) * page_size
    end = start + page_size
    
    return shops[start:end], total_count

# 3. Hàm lấy danh sách các tỉnh thành (để đổ vào dropdown list)

def get_all_cities():
    # Lấy toàn bộ danh sách từ bảng City
    cities = City.query.order_by(City.name).all()
    # Trả về danh sách tên để hiển thị trên dropdown
    return [c.name for c in cities]
# 3. Hàm lấy danh sách category
def get_all_categories():
    # Lấy danh sách tên các danh mục từ bảng Category
    cats = Category.query.order_by(Category.name).all()
    return [c.name for c in cats]


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

    # 2.  Tính lại điểm trung bình cho Shop
    # Lấy trung bình cộng cột rating của các comment thuộc shop này
    avg_rating = db.session.query(func.avg(Comment.rating)).filter(Comment.shop_id == shop_id).scalar()
    
    # Cập nhật vào bảng Shop
    shop = Shop.query.get(shop_id)
    shop.rating = round(avg_rating, 1) # Làm tròn 1 chữ số thập phân
    db.session.commit()
    
    return c

def update_user_avatar(user_id, avatar_url):
    try:
        u = get_user_by_id(user_id)
        if u:
            u.avatar = avatar_url
            db.session.commit()
            return True
    except Exception as e:
        print(e)
        return False
    


def get_all_shops_context():
    """
    Lấy toàn bộ shop từ DB và format thành chuỗi văn bản để dạy AI.
    """
    shops = Shop.query.all()
    context_text = "DANH SÁCH CÁC CỬA HÀNG TRONG HỆ THỐNG:\n"
    
    for s in shops:
        # Format: ID: 1 | Tên: Shop A | Địa chỉ: HCM | Bán: Bánh, Kẹo | Giá: 50000
        items_str = s.items if s.items else "Không rõ mặt hàng"
        city_name = s.city_obj.name if s.city_obj else "Không rõ"
        
        line = (f"- ID: {s.id} | Tên: {s.shop_name} | Địa chỉ: {s.address}, {city_name} "
                f"| Mặt hàng: {items_str} | Giá khoảng: {s.price}\n")
        context_text += line
        
    return context_text


def search_shops_from_db(keywords=None, city=None, limit=5):
    """
    Hàm này thay thế việc load toàn bộ DB.
    Nó chỉ lấy tối đa 'limit' shop dựa trên tiêu chí tìm kiếm.
    """
    query = Shop.query
    
    # 1. Lọc theo từ khóa (Tên hoặc món ăn)
    if keywords:
        query = query.filter(or_(
            Shop.shop_name.contains(keywords),
            Shop.items.contains(keywords)
        ))
        
    # 2. Lọc theo thành phố (Nếu AI phát hiện ra tên thành phố)
    if city:
        # Tìm gần đúng tên thành phố
        query = query.join(City).filter(City.name.contains(city))
        
    # 3. Lấy giới hạn kết quả (Quan trọng để không bị quá tải)
    shops = query.limit(limit).all()
    
    return shops


# --- CÁC HÀM QUẢN LÝ CHAT HISTORY ---

def save_chat_message(user_id, role, message):
    """
    Lưu tin nhắn và đảm bảo giới hạn số lượng (Ví dụ: 50 tin gần nhất).
    """
    MAX_HISTORY = 50  # Giới hạn số tin nhắn lưu trữ cho mỗi user
    
    # 1. Lưu tin nhắn mới
    new_msg = ChatHistory(user_id=user_id, role=role, message=message)
    db.session.add(new_msg)
    
    # 2. Kiểm tra số lượng
    count = ChatHistory.query.filter_by(user_id=user_id).count()
    
    if count > MAX_HISTORY:
        # Tìm các tin nhắn cũ nhất để xóa bớt
        # Lấy danh sách ID cần xóa (số lượng vượt quá)
        limit = count - MAX_HISTORY
        old_msgs = ChatHistory.query.filter_by(user_id=user_id)\
            .order_by(ChatHistory.created_date.asc())\
            .limit(limit).all()
            
        for msg in old_msgs:
            db.session.delete(msg)
            
    db.session.commit()
    return new_msg

def get_user_chat_history(user_id):
    """Lấy toàn bộ lịch sử chat của user (để hiển thị lên giao diện)"""
    return ChatHistory.query.filter_by(user_id=user_id)\
                            .order_by(ChatHistory.created_date.asc()).all()

def delete_chat_message(msg_id, user_id):
    """Xóa 1 tin nhắn cụ thể"""
    msg = ChatHistory.query.filter_by(id=msg_id, user_id=user_id).first()
    if msg:
        db.session.delete(msg)
        db.session.commit()
        return True
    return False

def clear_all_chat_history(user_id):
    """Xóa toàn bộ lịch sử chat của user"""
    try:
        ChatHistory.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(e)
        return False