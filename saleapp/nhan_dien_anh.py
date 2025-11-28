# import numpy as np
# import requests
# from io import BytesIO
# from PIL import Image
# from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input, decode_predictions
# from tensorflow.keras.preprocessing import image

# # --- THAY ĐỔI: Dùng thư viện mới ---
# from deep_translator import GoogleTranslator 
# # -----------------------------------

# def nhan_dien_tu_url(url_anh):
#     # 1. Tải mô hình
#     print("Đang khởi động 'bộ não' AI...")
#     model = ResNet50(weights='imagenet')

#     # 2. Tải ảnh từ Internet
#     try:
#         print(f"Đang tải ảnh từ: {url_anh}")
#         response = requests.get(url_anh)
#         if response.status_code != 200:
#             print("Lỗi: Không thể tải ảnh.")
#             return
            
#         img = Image.open(BytesIO(response.content))
#         img = img.convert('RGB') 
#         img = img.resize((224, 224))
        
#     except Exception as e:
#         print(f"Có lỗi xảy ra: {e}")
#         return

#     # 3. Xử lý ảnh
#     x = image.img_to_array(img)
#     x = np.expand_dims(x, axis=0)
#     x = preprocess_input(x)

#     # 4. Dự đoán
#     print("Đang phân tích...")
#     preds = model.predict(x)
#     ket_qua = decode_predictions(preds, top=3)[0]
    
#     print('\n' + '='*30)
#     print(' KẾT QUẢ NHẬN DIỆN')
#     print('='*30)
    
#     # Khởi tạo công cụ dịch
#     translator = GoogleTranslator(source='auto', target='vi')

#     for i, (id_anh, ten_vat_tieng_anh, xac_suat) in enumerate(ket_qua):
#         # Xử lý tên gốc
#         ten_sach = ten_vat_tieng_anh.replace("_", " ")
        
#         # Dịch sang Tiếng Việt bằng deep-translator
#         try:
#             ten_viet = translator.translate(ten_sach)
#         except:
#             ten_viet = "Lỗi dịch"

#         print(f"{i+1}. {ten_viet} ({ten_sach}): {xac_suat*100:.2f}%")

# # --- CHẠY THỬ ---
# # Ví dụ: Ảnh con mèo
# link_anh = 'https://product.hstatic.net/1000230347/product/43276_c384e10ddc774aa69cd948be742a12b4.jpg'
# nhan_dien_tu_url(link_anh)




import numpy as np
import requests
from io import BytesIO
from PIL import Image
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input, decode_predictions
from tensorflow.keras.preprocessing import image
from deep_translator import GoogleTranslator
import difflib # Thư viện tìm kiếm chuỗi gần đúng

# 1. DANH SÁCH SẢN PHẨM CỦA BẠN
category_items_map = {
    "convenience": ["Bánh snack", "Chai nước", "Mì ly", "Nước ngọt", "Bánh quy", "Sữa hộp", "Kẹo", "Mì gói", "Nước suối", "Nước tăng lực", "Trà đóng chai", "Cà phê lon", "Bánh mì sandwich", "Sữa chua uống", "Kẹo cao su", "Khoai tây chiên", "Thịt hộp", "Bánh bao mini", "Bàn chải đánh răng", "Kem đánh răng", "Xà phòng tắm", "Dầu gội", "Khăn giấy", "Khẩu trang y tế", "Dao cạo râu", "Lăn khử mùi", "Bật lửa", "Pin AA", "Pin sạc", "Dây sạc điện thoại", "Túi nylon", "Bao rác", "Bóng đèn LED mini", "Sổ tay nhỏ", "Bút bi", "Ô dù gấp", "Khăn ướt", "Găng tay nilon", "Cốc nhựa", "Muỗng nhựa", "Gối cổ du lịch"],
    "supermarket": ["Gạo", "Đường", "Muối", "Bột ngọt", "Nước mắm", "Dầu ăn", "Trứng gà", "Thịt heo", "Cá hộp", "Rau củ quả", "Nước tương", "Sốt cà chua", "Bơ thực vật", "Bột mì", "Sữa tươi", "Sữa chua", "Nước trái cây", "Snack", "Mì gói", "Ngũ cốc ăn sáng", "Trà túi lọc", "Cà phê hòa tan", "Bột giặt", "Nước xả vải", "Nước rửa chén", "Giấy vệ sinh", "Khăn giấy", "Bàn chải", "Nước lau sàn", "Túi đựng rác", "Kem dưỡng da", "Sữa tắm", "Dầu gội", "Kem cạo râu", "Son dưỡng môi", "Nước hoa mini", "Khẩu trang y tế", "Bông tẩy trang", "Chảo chống dính", "Dao bếp", "Thớt", "Muỗng nĩa", "Ly thủy tinh", "Đĩa sứ", "Khay nhựa", "Giấy bọc thực phẩm"],
    "mall": ["Áo thun", "Áo sơ mi", "Váy dạ hội", "Đầm công sở", "Quần jean", "Quần short", "Áo khoác", "Giày thể thao", "Dép sandal", "Túi xách", "Ví da", "Thắt lưng", "Đồng hồ", "Nước hoa", "Kính mát", "Khăn choàng", "Nón thời trang", "Mỹ phẩm trang điểm", "Kem nền", "Son môi", "Phấn má", "Mascara", "Dầu dưỡng tóc", "Máy sấy tóc", "Lược điện", "Đồ chơi trẻ em", "Sách", "Tai nghe Bluetooth", "Ốp điện thoại", "Đồng hồ thông minh", "Laptop mini", "Vali kéo", "Ba lô thời trang", "Áo khoác da", "Túi tote", "Găng tay", "Giày cao gót", "Bông tai", "Vòng tay"],
    "ceramics": ["Bình gốm", "Bộ ấm trà", "Đĩa gốm", "Lọ hoa gốm", "Tượng gốm", "Ly sứ", "Bình trà", "Chén gốm"]
}

# 2. TỪ ĐIỂN CẦU NỐI (MAPPING) - Quan trọng nhất
# Cấu trúc: "Tên ImageNet trả về": "Tên trong danh sách của bạn"
# Bạn cần bổ sung thêm dần dần vào đây
IMAGENET_MAPPING = {
    "water_bottle": "Chai nước",
    "pop_bottle": "Nước ngọt",
    "packet": "Bánh snack", # AI hay nhầm gói snack là 'packet'
    "bagel": "Bánh mì sandwich",
    "coffee_mug": "Ly sứ",
    "cup": "Cốc nhựa",
    "jersey": "Áo thun",
    "shirt": "Áo sơ mi",
    "running_shoe": "Giày thể thao",
    "sandal": "Dép sandal",
    "teapot": "Bộ ấm trà",
    "vase": "Lọ hoa gốm",
    "cellular_telephone": "Ốp điện thoại", # ImageNet nhận diện điện thoại
    "lipstick": "Son môi"
}

def tim_trong_kho(ten_nhan_dien):
    """
    Hàm này nhận vào tên tiếng Việt (đã dịch) hoặc tiếng Anh
    và cố gắng tìm món đồ tương ứng trong category_items_map
    """
    tat_ca_san_pham = []
    for danh_muc in category_items_map.values():
        tat_ca_san_pham.extend(danh_muc)
    
    # Cách 1: Tìm chính xác
    if ten_nhan_dien in tat_ca_san_pham:
        return ten_nhan_dien
        
    # Cách 2: Tìm gần đúng (Fuzzy search)
    # Ví dụ: Dịch ra "Bánh quy bơ" -> Tìm thấy "Bánh quy" trong kho
    ket_qua_gan_dung = difflib.get_close_matches(ten_nhan_dien, tat_ca_san_pham, n=1, cutoff=0.5)
    
    if ket_qua_gan_dung:
        return ket_qua_gan_dung[0] # Trả về kết quả giống nhất
    
    return None

print(tim_trong_kho("áo"))