from __init__ import app, db
from models import City, TikTokVideo

def seed_data():
    with app.app_context():
        print("--- ĐANG THÊM DỮ LIỆU TIKTOK ---")

        # 1. Tìm hoặc Tạo tỉnh Hồ Chí Minh
        city_name = "Hồ Chí Minh"
        city = City.query.filter(City.name.ilike(city_name)).first()
        
        if not city:
            print(f"Chưa có tỉnh {city_name}, đang tạo mới...")
            city = City(name=city_name)
            db.session.add(city)
            db.session.commit()
        
        print(f"Đang thêm video vào khu vực: {city.name} (ID: {city.id})")

        # 2. Danh sách 3 video Đại Vương gửi
        videos_data = [
            {
                "url": "https://www.tiktok.com/@chibesthcm/video/7372208193994362129",
                "id": "7372208193994362129",
                "desc": "Ăn uống tại Hồ Chí Minh (Chibest)"
            },
            {
                "url": "https://www.tiktok.com/@buianh.duong/video/7577319212834671890",
                "id": "7577319212834671890",
                "desc": "Trải nghiệm Sài Gòn (Bùi Anh Dương)"
            },
            {
                "url": "https://www.tiktok.com/@ccindylu/video/7537669201645800711",
                "id": "7537669201645800711",
                "desc": "Địa điểm hot HCM (Cindy Lu)"
            }
        ]

        count = 0
        for vid in videos_data:
            # Kiểm tra xem video này đã có trong DB chưa để tránh trùng
            exists = TikTokVideo.query.filter_by(embed_url=f"https://www.tiktok.com/embed/{vid['id']}").first()
            
            if not exists:
                new_vid = TikTokVideo(
                    video_url=vid["url"],
                    embed_url=f"https://www.tiktok.com/embed/{vid['id']}",
                    description=vid["desc"],
                    city_id=city.id
                )
                db.session.add(new_vid)
                count += 1
            else:
                print(f"Video {vid['id']} đã tồn tại, bỏ qua.")

        db.session.commit()
        print(f"--- HOÀN TẤT! ĐÃ THÊM THÀNH CÔNG {count} VIDEO ---")

if __name__ == "__main__":
    seed_data()