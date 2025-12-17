from sqlalchemy import Column, Integer, String, Enum, Float, Boolean, DateTime, ForeignKey, Text
from __init__ import db, app
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum as UserEnum
from flask_login import UserMixin
import csv, os

class BaseModel(db.Model):
    __abstract__ = True
    id = Column(Integer, primary_key=True, autoincrement=True)

class UserRole(UserEnum):
    ADMIN = 1
    USER = 2

class User(BaseModel, UserMixin):
    __tablename__ = 'user'
    name = Column(String(50), nullable=False)
    username = Column(String(50), nullable=False, unique=True)
    password = Column(String(50), nullable=False)
    avatar = Column(String(100))
    email = Column(String(50))
    active = Column(Boolean, default=True)
    joined_date = Column(DateTime, default=datetime.now()) 
    user_role = Column(Enum(UserRole), default=UserRole.USER)
    points = Column(Integer, default=0)

    reset_code = Column(String(10), nullable=True) 
    code_expiration = Column(DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'username': self.username,
            'email': self.email,
            'avatar': self.avatar,
            'points' : self.points
        }

# --- 1. TẠO BẢNG CITY RIÊNG ---
class City(BaseModel):
    __tablename__ = 'city'
    name = Column(String(100), nullable=False, unique=True) # Tên tỉnh thành duy nhất
    
    # Quan hệ ngược: Một city có nhiều shop
    shops = relationship('Shop', backref='city_obj', lazy=True)

    def __str__(self):
        return self.name

# --- 2. TẠO BẢNG CATEGORY RIÊNG ---
class Category(BaseModel):
    __tablename__ = 'category'
    name = Column(String(50), nullable=False, unique=True) # Tên danh mục duy nhất
    
    # Quan hệ ngược: Một category có nhiều shop
    shops = relationship('Shop', backref='category_obj', lazy=True)

    def __str__(self):
        return self.name

# --- 3. SỬA BẢNG SHOP LIÊN KẾT VỚI 2 BẢNG TRÊN ---
class Shop(BaseModel):
    __tablename__ = 'shop'
    shop_name = Column(String(100), nullable=False)
    address = Column(String(255))
    items = Column(Text) 
    price = Column(String(50)) 
    rating = Column(Float)
    lat = Column(Float)
    lon = Column(Float)
    
    # Thay cột String cũ bằng Khóa ngoại (ForeignKey)
    city_id = Column(Integer, ForeignKey('city.id'), nullable=False)
    category_id = Column(Integer, ForeignKey('category.id'), nullable=True)

    def __str__(self):
        return self.shop_name
        
    def to_dict(self):
        # --- XỬ LÝ AN TOÀN CHO PRICE ---
        try:
            # Thử chuyển đổi sang số thực
            # Nếu self.price là None hoặc chuỗi rỗng thì float() có thể lỗi hoặc ta gán 0
            real_price = float(self.price) if self.price else 0
        except ValueError:
            # Nếu gặp lỗi (ví dụ: price lưu chuỗi "Thỏa thuận" hoặc "100,000"), gán về 0
            real_price = 20

        return {
            'id': self.id,
            'name': self.shop_name,
            'price': real_price,  # Sử dụng biến đã được kiểm tra ở trên
            'address': self.address,
            'rating': self.rating,
            'items': self.items,
            'lat': self.lat,
            'lon': self.lon,
            'category': self.category_obj.name if self.category_obj else None, 
            'city': self.city_obj.name if self.city_obj else None
        }

class Comment(BaseModel):
    __tablename__ = 'comment'
    content = Column(String(255), nullable=False)
    created_date = Column(DateTime, default=datetime.now())
    
    shop_id = Column(Integer, ForeignKey('shop.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    
    rating = Column(Integer, default=0)
    image = Column(Text)
    
    user = relationship('User', backref='comments')
    shop = relationship('Shop', backref='comments')

    def __str__(self):
        return self.content
        
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'rating': self.rating,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else "Ẩn danh", # Lấy thêm tên user cho tiện hiển thị
            'created_date': self.created_date.strftime("%Y-%m-%d %H:%M:%S"),
            'images': self.image.split(';') if self.image else []
        }
    

# 1. Bảng TikTok Video (Gắn với City)
# class TikTokVideo(BaseModel):
#     __tablename__ = "tiktok_video"
#     video_url = Column(String(255), nullable=False) # Link gốc
#     embed_url = Column(String(255), nullable=False) # Link nhúng để hiện lên web
#     description = Column(String(255))
    
#     # Liên kết với bảng City (Một tỉnh có nhiều video)
#     city_id = Column(Integer, ForeignKey("city.id"), nullable=False)
#     city = relationship("City", backref="tiktok_videos")

# Trong file models.py

class TikTokVideo(BaseModel):
    __tablename__ = "tiktok_video"
    video_url = Column(String(255), nullable=False)
    embed_url = Column(String(255), nullable=False)
    description = Column(String(255))
    
    # THAY ĐỔI: Liên kết trực tiếp với Shop
    shop_id = Column(Integer, ForeignKey("shop.id"), nullable=False)
    shop = relationship("Shop", backref="videos")
    
    # (Có thể bỏ cột city_id đi hoặc giữ lại để tham chiếu phụ tuỳ Ngài)



# 2. Bảng quản lý phiên Thử thách (Lưu lộ trình 3 quán)
class ChallengeSession(BaseModel):
    __tablename__ = "challenge_session"
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    
    # Lưu danh sách ID của 3 shop dưới dạng chuỗi JSON: ví dụ "[1, 5, 9]"
    # Shop 1 (Gần nhất), Shop 2 (Vừa), Shop 3 (Xa nhất)
    target_shops = Column(Text, nullable=False) 
    
    # Đánh dấu đang ở bước nào (0: chưa đi, 1: xong quán 1, 2: xong quán 2, 3: Hoàn thành)
    current_step = Column(Integer, default=0) 
    
    status = Column(String(20), default="ACTIVE") # ACTIVE, COMPLETED, CANCELLED
    created_date = Column(DateTime, default=datetime.now)

    user = relationship("User", backref="challenge_sessions")


# 1. Bảng danh sách các Voucher có trong hệ thống
class Voucher(BaseModel):
    __tablename__ = 'voucher'
    code = Column(String(50), nullable=False, unique=True) # Mã voucher (VD: SALE50K)
    description = Column(String(255), nullable=False)      # Mô tả (VD: Giảm 50k cho đơn 200k)
    point_cost = Column(Integer, nullable=False)           # Giá đổi (VD: 100 điểm)
    image_url = Column(String(255))                        # Ảnh voucher (nếu có)
    
    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "description": self.description,
            "point_cost": self.point_cost,
            "image_url": self.image_url
        }

# 2. Bảng lưu Voucher mà User đã đổi thành công
class UserVoucher(BaseModel):
    __tablename__ = 'user_voucher'
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    voucher_id = Column(Integer, ForeignKey('voucher.id'), nullable=False)
    created_date = Column(DateTime, default=datetime.now)
    status = Column(String(20), default="UNUSED") # UNUSED (Chưa dùng), USED (Đã dùng)

    user = relationship("User", backref="owned_vouchers")
    voucher = relationship("Voucher")

# Bảng lưu lịch sử chat

class ChatHistory(BaseModel):
    __tablename__ = 'chat_history'
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    role = Column(String(10), nullable=False) # 'user' hoặc 'model'
    message = Column(Text, nullable=False) # Nội dung tin nhắn
    created_date = Column(DateTime, default=datetime.now)

    user = relationship('User', backref='chat_history')

    def to_dict(self):
        return {
            'id': self.id,
            'role': self.role,
            'message': self.message,
            'created_date': self.created_date.strftime("%Y-%m-%d %H:%M:%S")
        }

if __name__ == '__main__':
    with app.app_context():
        # Xóa bảng cũ và tạo lại (CẨN THẬN: Mất dữ liệu cũ)
        # db.drop_all() 
        db.create_all()
        # v1 = Voucher(code="FREE_SHIP", description="Mã Freeship tối đa 30k", point_cost=50)
        # v2 = Voucher(code="GIAM_20K", description="Giảm trực tiếp 20k cho đơn hàng", point_cost=100)
        # v3 = Voucher(code="BUFFET_VE", description="1 Vé Buffet miễn phí", point_cost=500)
        
        # db.session.add_all([v1, v2, v3])
        # db.session.commit()
        # print("Đã cập nhật cấu trúc bảng dữ liệu!")

        # # --- LOGIC IMPORT CSV MỚI  ---
        # csv_file_path = 'data.csv' 
        
        # if os.path.exists(csv_file_path):
        #     try:
        #         # Kiểm tra xem đã có dữ liệu chưa để tránh import trùng
        #         if Shop.query.count() == 0: 
        #             print("Đang tiến hành import dữ liệu...")
        #             with open(csv_file_path, mode='r', encoding='utf-8-sig') as f:
        #                 reader = csv.DictReader(f)
        #                 count = 0
        #                 for row in reader:
        #                     # 1. Xử lý City (Nếu chưa có thì tạo mới)
        #                     city_name = row['city'].strip()
        #                     city = City.query.filter_by(name=city_name).first()
        #                     if not city:
        #                         city = City(name=city_name)
        #                         db.session.add(city)
        #                         db.session.commit() # Commit để lấy ID ngay

        #                     # 2. Xử lý Category (Nếu chưa có thì tạo mới)
        #                     cat_name = row['category'].strip()
        #                     category = Category.query.filter_by(name=cat_name).first()
        #                     if not category:
        #                         category = Category(name=cat_name)
        #                         db.session.add(category)
        #                         db.session.commit() # Commit để lấy ID ngay
                            
        #                     # 3. Tạo Shop với ID của City và Category
        #                     s = Shop(
        #                         shop_name=row['shop_name'],
        #                         address=row['address'],
        #                         items=row['item_name'], 
        #                         price=row['price'],
        #                         rating=float(row['rating']) if row['rating'] else 0,
        #                         lat=float(row['lat']) if row['lat'] else 0,
        #                         lon=float(row['lon']) if row['lon'] else 0,
                                
        #                         # Gán khóa ngoại
        #                         city_id=city.id,
        #                         category_id=category.id
        #                     )
        #                     db.session.add(s)
        #                     count += 1
                        
        #                 db.session.commit()
        #                 print(f"Thành công! Đã import {count} cửa hàng.")
        #         else:
        #             print("Dữ liệu Shop đã tồn tại, bỏ qua import CSV.")
                    
        #     except Exception as ex:
        #         print("Lỗi khi import CSV: " + str(ex))
        #         import traceback
        #         traceback.print_exc()
        # else:
        #     print(f"Không tìm thấy file '{csv_file_path}'.")