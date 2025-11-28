import hashlib
from __init__ import app, db, mail
from models import  User, Shop
import random
from datetime import datetime, timedelta
from flask_mail import Message





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





from sqlalchemy import or_

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