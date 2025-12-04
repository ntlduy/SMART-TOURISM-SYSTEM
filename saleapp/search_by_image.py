
import json




import numpy as np

from dotenv import load_dotenv
import google.generativeai as genai
import os



import numpy as np
import requests
from io import BytesIO
from PIL import Image
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input, decode_predictions
from tensorflow.keras.preprocessing import image
import google.generativeai as genai

import json
import ast # Thư viện để chuyển chuỗi string dạng list thành list thật


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




# 1. Dữ liệu kho hàng của bạn (Chuyển thành chuỗi JSON để AI dễ đọc)
category_items_map = {
    "convenience": [
        # Đồ ăn - thức uống
        "Bánh snack", "Chai nước", "Mì ly", "Nước ngọt", "Bánh quy", "Sữa hộp", "Kẹo", "Mì gói", "Nước suối", "Nước tăng lực",
        "Trà đóng chai", "Cà phê lon", "Bánh mì sandwich", "Sữa chua uống", "Kẹo cao su", "Khoai tây chiên", "Thịt hộp", "Bánh bao mini",
        # Đồ dùng cá nhân
        "Bàn chải đánh răng", "Kem đánh răng", "Xà phòng tắm", "Dầu gội", "Khăn giấy", "Khẩu trang y tế", "Dao cạo râu", "Lăn khử mùi",
        # Gia dụng nhỏ
        "Bật lửa", "Pin AA", "Pin sạc", "Dây sạc điện thoại", "Túi nylon", "Bao rác", "Bóng đèn LED mini",
        # Khác
        "Sổ tay nhỏ", "Bút bi", "Ô dù gấp", "Khăn ướt", "Găng tay nilon", "Cốc nhựa", "Muỗng nhựa", "Gối cổ du lịch"
    ],

    "supermarket": [
        # Thực phẩm thiết yếu
        "Gạo", "Đường", "Muối", "Bột ngọt", "Nước mắm", "Dầu ăn", "Trứng gà", "Thịt heo", "Cá hộp", "Rau củ quả", 
        "Nước tương", "Sốt cà chua", "Bơ thực vật", "Bột mì", "Sữa tươi", "Sữa chua", "Nước trái cây", "Snack", 
        "Mì gói", "Ngũ cốc ăn sáng", "Trà túi lọc", "Cà phê hòa tan",
        # Gia dụng - vệ sinh
        "Bột giặt", "Nước xả vải", "Nước rửa chén", "Giấy vệ sinh", "Khăn giấy", "Bàn chải", "Nước lau sàn", "Túi đựng rác",
        # Mỹ phẩm & chăm sóc cá nhân
        "Kem dưỡng da", "Sữa tắm", "Dầu gội", "Kem cạo râu", "Son dưỡng môi", "Nước hoa mini", "Khẩu trang y tế", "Bông tẩy trang",
        # Đồ bếp
        "Chảo chống dính", "Dao bếp", "Thớt", "Muỗng nĩa", "Ly thủy tinh", "Đĩa sứ", "Khay nhựa", "Giấy bọc thực phẩm"
    ],

    "mall": [
        "Áo thun", "Áo sơ mi", "Váy dạ hội", "Đầm công sở", "Quần jean", "Quần short", "Áo khoác", "Giày thể thao", "Dép sandal",
        "Túi xách", "Ví da", "Thắt lưng", "Đồng hồ", "Nước hoa", "Kính mát", "Khăn choàng", "Nón thời trang",
        "Mỹ phẩm trang điểm", "Kem nền", "Son môi", "Phấn má", "Mascara", "Dầu dưỡng tóc", "Máy sấy tóc", "Lược điện",
        "Đồ chơi trẻ em", "Sách", "Tai nghe Bluetooth", "Ốp điện thoại", "Đồng hồ thông minh", "Laptop mini", 
        "Vali kéo", "Ba lô thời trang", "Áo khoác da", "Túi tote", "Găng tay", "Giày cao gót", "Bông tai", "Vòng tay"
    ],

    "marketplace": [
        "Trái cây tươi", "Rau củ sạch", "Cá tươi", "Thịt heo", "Thịt bò", "Hải sản", "Gia vị", "Đặc sản địa phương", 
        "Đồ thủ công", "Túi đan tay", "Nón lá", "Khăn dệt tay", "Áo bà ba", "Quần áo vải thô", "Gạo đặc sản", "Bánh pía",
        "Bánh tráng", "Mắm ruốc", "Khô cá lóc", "Khô mực", "Đồ nhựa gia dụng", "Rổ nhựa", "Chổi quét nhà", "Giỏ tre",
        "Hoa tươi", "Cây cảnh nhỏ", "Đồ chơi trẻ em", "Vật dụng học tập", "Bút chì", "Bút bi", "Thước kẻ", "Vở học sinh",
        "Đồ lưu niệm", "Móc khóa", "Thiệp thủ công", "Đèn dầu cổ", "Khăn choàng tay", "Quạt nan"
    ],
    
    "department_store": [
        "Sữa tươi", "Sữa bột", "Sữa chua", "Bánh kẹo", "Mì gói", "Gạo", 
        "Dầu ăn", "Nước mắm", "Đường", "Muối", "Trà", "Cà phê", 
        "Nước suối", "Nước ngọt", "Thực phẩm đóng hộp", "Ngũ cốc", "Bột nêm",
        "Bột giặt", "Nước rửa chén", "Nước lau sàn", "Nước xả vải", 
        "Dầu gội", "Sữa tắm", "Kem đánh răng", "Khăn giấy", "Giấy vệ sinh",
        "Tã em bé", "Khăn ướt", "Bình sữa", "Sữa bột trẻ em", "Bánh ăn dặm"
    ],

    "gift": [
        "Quà lưu niệm", "Móc khóa", "Bưu thiếp", "Đồ thủ công", "Khung ảnh", "Nến thơm", "Thiệp chúc mừng", "Tượng nhỏ", "Gấu bông mini", "Bình hoa nhỏ",
        "Hộp quà tặng", "Đèn trang trí nhỏ", "Đồng hồ để bàn", "Tranh mini", "Ly in hình", "Sổ tay dễ thương", "Bút ký cao cấp", 
        "Khăn lụa", "Gối in hình", "Bình giữ nhiệt", "Cốc đôi", "Móc khóa đôi", "Túi đựng quà", "Bánh handmade", "Chậu cây mini", "Khung ảnh LED"
    ],

    "souvenir": [
        "Đồ gỗ mỹ nghệ", "Đồ dệt", "Tượng gốm", "Đồ sơn mài", "Móc khóa du lịch", "Tranh thêu", "Đĩa lưu niệm", "Áo du lịch", "Nón lá nhỏ", "Đồ gốm trang trí",
        "Tượng đồng", "Đèn lồng Hội An", "Khăn choàng lụa", "Vòng tay tre", "Hộp nhạc cổ điển", "Thẻ đánh dấu sách", "Túi thổ cẩm", 
        "Hình chụp phong cảnh", "Chai cát nghệ thuật", "Vỏ ốc trang trí", "Bút thủ công", "Tranh dán cát", "Huy hiệu du lịch", "Gối thêu tay"
    ],

    "craft": [
        "Giỏ đan", "Đồ trang trí mây tre", "Thêu tay", "Lọ mây", "Đèn lồng giấy", "Tranh treo tường thủ công", "Gối handmade", "Bình tre", "Túi đan tay", "Khung tre",
        "Lồng đèn mây", "Thảm cói", "Giá để chén bằng tre", "Ghế đan tay", "Khung ảnh tre", "Đĩa mây", "Rổ tre", "Bàn tre mini", 
        "Giá sách nhỏ", "Túi tote vải bố", "Đèn treo mây", "Đồ trang trí vintage", "Bình mây tre", "Tấm lót bàn", "Hộp quà thủ công"
    ],

    "ceramics": [
        "Bình gốm", "Bộ ấm trà", "Đĩa gốm", "Lọ hoa gốm", "Tượng gốm", "Ly sứ", "Bình trà", "Chén gốm", "Tô gốm", "Bình đựng nước gốm",
        "Gạt tàn gốm", "Đèn ngủ gốm", "Bình phong gốm", "Chậu cây gốm", "Đồ thờ gốm", "Tượng linh vật", "Gạch gốm trang trí", 
        "Bộ ly espresso gốm", "Lọ tinh dầu", "Bình đựng tăm gốm", "Bộ chén đĩa cao cấp", "Bộ ly trà đạo", "Tượng Phật nhỏ", "Bộ bình sake", "Bình trang trí men lam"
    ],

    "art": [
        "Tranh", "Tranh canvas", "Tượng điêu khắc", "Tranh sơn dầu", "Tranh acrylic", "Tượng nhỏ", "Tranh phong cảnh", "Tượng gỗ", 
        "Tranh trừu tượng", "Tranh chân dung", "Tranh tường", "Tranh ký họa", "Tranh màu nước", "Tượng đất nung", "Tượng đá cẩm thạch",
        "Mô hình nghệ thuật", "Tượng kim loại", "Tranh sơn mài", "Tranh thêu tay", "Tranh nghệ thuật hiện đại", "Tượng đồng nhỏ", 
        "Tranh nghệ thuật 3D", "Tượng nhân vật cổ điển", "Tranh thư pháp", "Tranh nghệ thuật dân gian", "Tranh đương đại", "Tranh giấy cuộn"
    ]
}

# Chuyển kho hàng thành chuỗi văn bản
INVENTORY_CONTEXT = json.dumps(category_items_map, ensure_ascii=False)

# 2. Câu lệnh hệ thống (System Instruction)
SOUVENIR_SYSTEM_INSTRUCTION = f"""
Bạn là một trợ lý quản lý kho hàng thông minh.
Nhiệm vụ của bạn là nhận vào một danh sách các từ khóa tiếng Anh (mô tả hình ảnh).
Sau đó, bạn phải tìm xem những vật đó có tương ứng với mặt hàng nào trong KHO HÀNG dưới đây không.

--- KHO HÀNG CỦA TÔI ---
{INVENTORY_CONTEXT}
------------------------

YÊU CẦU TRẢ LỜI:
1. Chỉ trả về tên các sản phẩm TIẾNG VIỆT có trong kho hàng khớp với mô tả.
2. Nếu tìm thấy, hãy trả về dạng danh sách Python. Ví dụ: ["Chai nước", "Nước ngọt"]
3. Nếu không tìm thấy sản phẩm nào khớp, hãy trả về: "Không tìm thấy sản phẩm phù hợp trong kho."
4. Hãy suy luận thông minh (Ví dụ: 'jersey' hoặc 'shirt' -> 'Áo thun', 'packet' -> 'Bánh snack').
"""





# Cấu hình API Key (Thay bằng key của bạn)
# genai.configure(api_key="YOUR_GEMINI_API_KEY")

# def get_gemini_mapping(image_tags):
#     """
#     Hàm này gửi các tag tiếng Anh từ ResNet sang Gemini để đối chiếu kho hàng
#     :param image_tags: List các từ khóa tiếng Anh (VD: ['water_bottle', 'plastic'])
#     """
#     try:
#         # Khởi tạo model với chỉ thị đặc biệt
#         model = genai.GenerativeModel(
#             'gemini-2.5-flash', # Dùng 1.5 Flash cho nhanh và rẻ
#             system_instruction=SOUVENIR_SYSTEM_INSTRUCTION
#         )

#         # Tạo câu hỏi cho AI
#         user_message = f"Hệ thống nhận diện hình ảnh tìm thấy các vật thể sau: {image_tags}. Hãy kiểm tra xem chúng là món gì trong kho?"

#         # Gửi tin nhắn
#         response = model.generate_content(user_message)
#         return response.text.strip()
        
#     except Exception as e:
#         print(f"LỖI GỌI GEMINI: {str(e)}")
#         return "Lỗi kết nối AI."
    


#     import numpy as np
# import requests
# from io import BytesIO
# from PIL import Image
# from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input, decode_predictions
# from tensorflow.keras.preprocessing import image

# def xu_ly_anh_bang_ai_kep(url_anh):
#     """
#     Quy trình:
#     1. ResNet50: Nhìn ảnh -> Ra từ khóa Tiếng Anh (VD: water_bottle)
#     2. Gemini: Đọc từ khóa -> So sánh với Kho hàng -> Trả ra tên sản phẩm Tiếng Việt chuẩn
#     """
    
#     # --- GIAI ĐOẠN 1: MẮT THẦN (RESNET50) ---
#     print("1. ResNet đang nhìn ảnh...")
#     model_resnet = ResNet50(weights='imagenet')
    
#     try:
#         response = requests.get(url_anh)
#         img = Image.open(BytesIO(response.content)).convert('RGB').resize((224, 224))
#     except:
#         print("Lỗi tải ảnh"); return

#     x = image.img_to_array(img)
#     x = np.expand_dims(x, axis=0)
#     x = preprocess_input(x)

#     preds = model_resnet.predict(x)
#     # Lấy top 5 dự đoán của ResNet
#     ket_qua_raw = decode_predictions(preds, top=5)[0]
    
#     # Chỉ lấy tên vật thể (bỏ xác suất), thay dấu _ bằng khoảng trắng
#     # Ví dụ: ['water_bottle', 'pop_bottle', 'plastic_bag']
#     danh_sach_tags = [item[1] for item in ket_qua_raw]
    
#     print(f"   -> ResNet thấy: {danh_sach_tags}")

#     # --- GIAI ĐOẠN 2: BỘ NÃO (GEMINI) ---
#     print("\n2. Gemini đang suy luận và tra kho hàng...")
#     ket_qua_cuoi_cung = get_gemini_mapping(danh_sach_tags)
    
#     print("\n" + "="*40)
#     print(" KẾT QUẢ TỪ AI QUẢN LÝ KHO")
#     print("="*40)
#     print(ket_qua_cuoi_cung)

# # --- CHẠY THỬ ---
# if __name__ == "__main__":
#     # Ảnh chai nước
#     link_anh = 'https://gomsubattrang.vn/uploads/data/20/imgproducts/2021061112421_61421.jpg'
    
#     xu_ly_anh_bang_ai_kep(link_anh)


def get_gemini_mapping(image_tags):
    """
    Gửi tag tiếng Anh sang Gemini để đối chiếu kho hàng và trả về List tiếng Việt
    """
    try:
        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            system_instruction=SOUVENIR_SYSTEM_INSTRUCTION
        )
        user_message = f"Hệ thống nhận diện hình ảnh tìm thấy các vật thể sau: {image_tags}. Hãy kiểm tra xem chúng là món gì trong kho?"
        response = model.generate_content(user_message)
        
        text_response = response.text.strip()
        print(f"Gemini trả về: {text_response}")
        
        # Xử lý: Cố gắng chuyển chuỗi văn bản thành Python List
        # Tìm đoạn bắt đầu bằng '[' và kết thúc bằng ']'
        start = text_response.find('[')
        end = text_response.rfind(']') + 1
        
        if start != -1 and end != -1:
            list_str = text_response[start:end]
            try:
                # Chuyển chuỗi "['A', 'B']" thành list ['A', 'B']
                return ast.literal_eval(list_str)
            except Exception as e:
                print(f"Lỗi parse list: {e}")
                return []
        return [] # Trả về rỗng nếu không tìm thấy list
        
    except Exception as e:
        print(f"LỖI GỌI GEMINI: {str(e)}")
        return []

def phan_tich_hinh_anh(url_anh):
    """
    Hàm chính để gọi từ index.py.
    Input: URL ảnh
    Output: List tên sản phẩm tiếng Việt (VD: ['Chai nước', 'Bánh snack'])
    """
    print(f"1. Đang tải và phân tích ảnh từ URL: {url_anh}")
    
    # --- GIAI ĐOẠN 1: RESNET50 ---
    model_resnet = ResNet50(weights='imagenet')
    try:
        response = requests.get(url_anh)
        img = Image.open(BytesIO(response.content)).convert('RGB').resize((224, 224))
    except Exception as e:
        print(f"Lỗi tải ảnh: {e}")
        return []

    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)

    preds = model_resnet.predict(x)
    # Lấy top 5 từ khóa tiếng Anh
    ket_qua_raw = decode_predictions(preds, top=1)[0]


    # --- THAY ĐỔI Ở ĐÂY: Hiển thị phần trăm ---
    danh_sach_tags = []
    print("   -> Kết quả ResNet (Top 5):")
    for item in ket_qua_raw:
        # item[1] là tên, item[2] là xác suất (0.0 -> 1.0)
        ten_vat_the = item[1]
        do_tin_cay = item[2] * 100 # Đổi ra %
        
        # In ra log có kèm %
        print(f"      • {ten_vat_the}: {do_tin_cay:.2f}%")
        
        danh_sach_tags.append(ten_vat_the)
    # --- GIAI ĐOẠN 2: GEMINI ---
    print("2. Gemini đang tra cứu kho hàng...")
    danh_sach_san_pham = get_gemini_mapping(danh_sach_tags)
    
    return danh_sach_san_pham