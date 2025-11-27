from sqlalchemy import Column, Integer, String,Enum, Float, Boolean, DateTime, ForeignKey, Text
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


class User(BaseModel, UserMixin) :
    name = Column(String(50), nullable=False)
    username = Column(String(50), nullable=False, unique=True)
    password = Column(String(50), nullable=False)
    avatar = Column(String(100))
    email = Column(String(50))
    active = Column(Boolean, default=True)
    joined_date = Column(DateTime, default=datetime.now()) 
    user_role = Column(Enum(UserRole), default=UserRole.USER)

    reset_code = Column(String(10), nullable=True) 
    code_expiration = Column(DateTime, nullable=True)

    


class Shop(BaseModel):
    id = Column(Integer, primary_key=True, autoincrement=True)
    shop_name = Column(String(100), nullable=False)
    address = Column(String(255))
    city = Column(String(50))
    items = Column(Text) 
    price = Column(String(50)) 
    rating = Column(Float)
    category = Column(String(50)) 
    lat = Column(Float)
    lon = Column(Float)
    def __str__(self):
        return self.shop_name







if __name__ == '__main__':
    with app.app_context():
        db.drop_all() 
        db.create_all()
        print("Đã tạo bảng dữ liệu mới!")
        csv_file_path = 'D:\\TL_nam_2\\TDTT\\my_sale_app\\saleapp\\DataMarket.csv' 
        if os.path.exists(csv_file_path):
            try:
                with open(csv_file_path, mode='r', encoding='utf-8-sig') as f:
                    reader = csv.DictReader(f)
                    
                    count = 0
                    for row in reader:
                        s = Shop(
                            shop_name=row['shop_name'],
                            city=row['city'],
                            address=row['address'],
                            items=row['item_name'], 
                            price=row['price'],
                            rating=float(row['rating']) if row['rating'] else 0,
                            category=row['category'],
                            lat=float(row['lat']) if row['lat'] else 0,
                            lon=float(row['lon']) if row['lon'] else 0
                        )
                        db.session.add(s)
                        count += 1
                    
                    db.session.commit()
                    print(f"Thành công! Đã import {count} cửa hàng từ file CSV vào database.")
            except Exception as ex:
                print("Lỗi khi đọc file CSV: " + str(ex))
        else:
            print(f"Không tìm thấy file '{csv_file_path}'. Vui lòng kiểm tra lại đường dẫn.")