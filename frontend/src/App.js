import React, { useState, useEffect, useRef } from 'react';
import {
    Search, MapPin, Star, ShoppingBag,
    Camera, MessageCircle, X, Send, LogOut,
    ChevronRight, CheckCircle, Gift,
    Trophy, Video, UploadCloud, Navigation, User as UserIcon, Mail, Lock
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import L from 'leaflet';
// --- CẤU HÌNH API ---
const API_BASE = 'http://127.0.0.1:5000';

// --- TIỆN ÍCH ---
const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};
// --- FIX LỖI ICON MARKER TRONG REACT LEAFLET ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- COMPONENT VẼ ĐƯỜNG (ROUTING MACHINE) ---
const RoutingMachine = ({ userLat, userLon, shopLat, shopLon }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const routingControl = L.Routing.control({
            waypoints: [
                L.latLng(userLat, userLon), // Điểm bắt đầu (User)
                L.latLng(shopLat, shopLon)  // Điểm đến (Shop)
            ],
            routeWhileDragging: false,
            addWaypoints: false,            // Không cho phép thêm điểm dừng
            draggableWaypoints: false,      // Không cho kéo thả điểm
            fitSelectedRoutes: true,        // Tự động zoom vừa khung hình
            showAlternatives: false,
            lineOptions: {
                styles: [{ color: '#007bff', weight: 5, opacity: 0.7 }] // Màu đường đi xanh dương
            },
            createMarker: function () { return null; } // Ẩn marker mặc định của routing (để dùng marker riêng đẹp hơn)
        }).addTo(map);

        // Ẩn bảng hướng dẫn text (Turn right, turn left...) để giao diện gọn
        routingControl.getContainer().style.display = 'none';

        return () => map.removeControl(routingControl);
    }, [map, userLat, userLon, shopLat, shopLon]);

    return null;
};
// --- CSS GIAO DIỆN ---
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&family=Mulish:wght@300;400;600;700;800&family=Roboto+Slab:wght@400;500;700;800&display=swap');

:root {
    --primary: #4e382d;
    --primary-dark: #3a2a22;
    --accent: #d4a373;
    --accent-hover: #c59360;
    --bg-body: #f7f5f0;
    --text-dark: #2c2420;
    --text-light: #6b7280;
    --white: #ffffff;
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.05);
    --shadow-md: 0 8px 24px rgba(0,0,0,0.08);
    --shadow-lg: 0 15px 40px rgba(0,0,0,0.12);
    --radius: 12px;
}

* { box-sizing: border-box; }
body { margin: 0; font-family: 'Mulish', sans-serif; background-color: var(--bg-body); color: var(--text-dark); line-height: 1.6; }
.container { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
button { font-family: inherit; transition: all 0.2s; }
.fade-in { animation: fadeIn 0.4s ease-in; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* NAVBAR */
.navbar { background-color: var(--primary); color: white; padding: 12px 0; box-shadow: 0 4px 10px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 1000; }
.nav-inner { display: flex; justify-content: space-between; align-items: center; }

.logo { display: flex; align-items: center; gap: 12px; cursor: pointer; transition: transform 0.2s; }
.logo:hover { transform: scale(1.02); }
.logo-symbol { width: 42px; height: 42px; background: var(--accent); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2); border: 2px solid rgba(255,255,255,0.2); }
.logo-text { font-family: 'Roboto Slab', serif; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; line-height: 1; }

.auth-block { display: flex; gap: 12px; align-items: center; }
.nav-btn { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 14px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; }
.nav-btn:hover { background: rgba(255,255,255,0.25); }
.nav-btn.active { background: var(--accent); border-color: var(--accent); color: white; }

.btn-secondary { background: white; color: var(--primary); border: none; font-weight: 700; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-secondary:hover { background: #f0f0f0; }
.user-profile { display: flex; align-items: center; gap: 10px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--accent); object-fit: cover; }
.btn-logout { background: none; border: none; color: white; cursor: pointer; opacity: 0.8; }

/* HERO & SEARCH */
.hero-header { background: linear-gradient(rgba(78, 56, 45, 0.8), rgba(78, 56, 45, 0.6)), url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop'); background-size: cover; background-position: center; color: white; padding: 70px 0 110px; text-align: center; transition: background 0.5s; }
.hero-header.challenge-mode { background: linear-gradient(rgba(45, 78, 56, 0.85), rgba(45, 78, 56, 0.6)), url('https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=2070&auto=format&fit=crop'); }
.hero-header h1 { font-family: 'Dancing Script', cursive; font-size: 64px; margin: 0 0 15px; font-weight: 700; text-shadow: 0 4px 10px rgba(0,0,0,0.3); }
.hero-header p { font-family: 'Mulish', sans-serif; font-size: 20px; opacity: 0.95; font-weight: 300; letter-spacing: 0.5px; }

.search-container-wrapper { margin-top: -55px; position: relative; z-index: 10; }
.search-bar-booking { background-color: var(--white); padding: 10px; border-radius: 16px; display: flex; gap: 10px; box-shadow: var(--shadow-lg); border: 4px solid rgba(212, 163, 115, 0.3); flex-wrap: wrap; }
.sb-item { display: flex; align-items: center; padding: 0 15px; height: 50px; flex: 1; border-right: 1px solid #eee; min-width: 200px; }
.sb-item:nth-last-child(2) { border-right: none; }
.sb-input-keyword { flex: 2; }
.sb-icon { color: var(--accent); margin-right: 10px; }
.sb-item input, .sb-item select { border: none; width: 100%; outline: none; font-size: 16px; color: var(--text-dark); background: transparent; font-weight: 600; font-family: 'Mulish', sans-serif; }
.sb-btn { background-color: var(--primary); color: white; border: none; font-weight: 700; font-size: 16px; padding: 0 35px; cursor: pointer; border-radius: 10px; }
.sb-btn:hover { background-color: var(--primary-dark); transform: translateY(-1px); }

/* MAIN LAYOUT */
.main-layout { display: flex; gap: 30px; margin-top: 50px; margin-bottom: 60px; }
.sidebar { width: 280px; flex-shrink: 0; }
.content-list { flex: 1; }

.filter-box { border: 1px solid #eee; border-radius: var(--radius); background: white; padding: 25px; margin-bottom: 25px; box-shadow: var(--shadow-sm); }
.filter-box h3 { font-family: 'Roboto Slab', serif; font-size: 18px; margin: 0 0 20px; color: var(--primary); border-bottom: 2px solid #f0e6d2; padding-bottom: 10px; display: inline-block; }
.filter-row { display: flex; gap: 10px; margin-bottom: 12px; font-size: 15px; align-items: center; cursor: pointer; }
.price-inputs { display: flex; gap: 8px; align-items: center; }
.price-inputs input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }

/* SHOP CARD */
.shop-card-booking { display: flex; border-radius: var(--radius); overflow: hidden; background: white; margin-bottom: 25px; box-shadow: var(--shadow-sm); transition: all 0.3s; border: 1px solid #eee; cursor: pointer; }
.shop-card-booking:hover { box-shadow: var(--shadow-md); transform: translateY(-3px); border-color: var(--accent); }
.sc-img { width: 240px; min-height: 240px; position: relative; overflow: hidden; }
.sc-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.shop-card-booking:hover .sc-img img { transform: scale(1.05); }
.sc-info { flex: 1; padding: 25px; display: flex; flex-direction: column; }
.sc-header { display: flex; justify-content: space-between; }
.sc-header h2 { margin: 0 0 8px; font-size: 22px; color: var(--primary); font-family: 'Roboto Slab', serif; }
.sc-badge { background-color: #008234; color: white; font-size: 11px; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-bottom: 10px; font-weight: 700; text-transform: uppercase; }
.sc-price-col { width: 180px; text-align: right; display: flex; flex-direction: column; justify-content: center; padding: 20px; background: #fbfbfb; border-left: 1px solid #eee; }
.sc-price-value { font-size: 24px; font-weight: 800; color: var(--primary); font-family: 'Roboto Slab', serif; margin: 5px 0; }
.btn-view-detail { background-color: var(--accent); color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 700; width: 100%; margin-top: 10px; display: flex; justify-content: center; gap: 5px; align-items: center; }
.btn-view-detail:hover { background-color: var(--accent-hover); }

/* CHALLENGE UI SPECIFIC */
.challenge-card { background: white; border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-sm); border: 1px solid #eee; height: 100%; }
.video-frame { width: 100%; height: 400px; background: black; border-bottom: 4px solid var(--accent); }
.challenge-body { padding: 20px; }
.voucher-ticket { background: #fffcf5; border: 1px dashed var(--accent); padding: 15px; margin-top: 15px; border-radius: 8px; display: flex; gap: 15px; align-items: center; }
.points-badge { background: linear-gradient(45deg, #FFD700, #FFA500); color: white; font-weight: 800; padding: 5px 15px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 4px 10px rgba(255, 165, 0, 0.3); }

/* DETAIL PAGE & MAPS */
.detail-header-booking { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
.detail-title h1 { font-family: 'Roboto Slab', serif; font-size: 36px; color: var(--primary); margin: 0; line-height: 1.2; }
.detail-location { display: flex; align-items: center; gap: 6px; color: var(--text-light); margin-top: 10px; font-size: 15px; }
.btn-back { background: none; border: none; color: #006ce4; cursor: pointer; margin-bottom: 15px; padding: 0; font-weight: 600; display: flex; align-items: center; gap: 5px; }
.detail-gallery { display: grid; grid-template-columns: 2fr 1fr; gap: 15px; height: 450px; margin-bottom: 40px; border-radius: var(--radius); overflow: hidden; }
.gallery-main img, .gallery-sub img { width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: opacity 0.2s; }
.gallery-sub { display: flex; flex-direction: column; gap: 15px; }
.gallery-sub img:hover { opacity: 0.9; }
.detail-content-layout { display: flex; gap: 30px; }
.dcl-main { flex: 1; }
.dcl-sidebar { width: 340px; }
.price-box-sticky { background: white; border: 1px solid #e0e0e0; padding: 25px; border-radius: var(--radius); position: sticky; top: 100px; box-shadow: var(--shadow-lg); }
.price-box-sticky h4 { font-family: 'Roboto Slab', serif; font-size: 20px; color: var(--primary); margin-top: 0; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
.btn-booking-primary { background-color: var(--primary); color: white; border: none; padding: 14px 25px; font-weight: 700; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s; }
.btn-booking-primary:hover { background-color: var(--primary-dark); box-shadow: 0 4px 12px rgba(78, 56, 45, 0.3); }
.comment-item { padding: 20px 0; border-bottom: 1px solid #f0f0f0; display: flex; gap: 15px; }
.comment-avatar { width: 45px; height: 45px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; flex-shrink: 0; }

.upload-box-modern { border: 2px dashed #ccc; border-radius: 16px; padding: 60px 20px; text-align: center; background: #fafafa; transition: all 0.3s; cursor: pointer; position: relative; overflow: hidden; }
.upload-box-modern:hover { border-color: var(--accent); background: #fffaf5; transform: scale(1.01); }
.upload-icon-circle { width: 80px; height: 80px; background: #eee; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #888; transition: all 0.3s; }
.upload-box-modern:hover .upload-icon-circle { background: var(--accent); color: white; }

/* MAP EMBED */
.map-container { width: 100%; height: 300px; border-radius: 12px; overflow: hidden; margin-top: 20px; border: 1px solid #ddd; }
.btn-directions { background: #fff; color: #007bff; border: 1px solid #007bff; margin-top: 10px; }
.btn-directions:hover { background: #f0f8ff; }

/* AUTH */
.auth-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(78, 56, 45, 0.4), rgba(78, 56, 45, 0.4)), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop'); background-size: cover; display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(4px); }
.auth-card { background: rgba(255, 255, 255, 0.95); width: 420px; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative; animation: slideUp 0.4s ease-out; max-height: 90vh; overflow-y: auto; }
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.auth-title { text-align: center; font-family: 'Roboto Slab', serif; font-size: 28px; color: var(--primary); margin-bottom: 5px; margin-top: 0; }
.auth-subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 30px; margin-top: 0; }
.modern-input { width: 100%; padding: 14px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; transition: border 0.3s; background: white; }
.modern-input:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px rgba(212, 163, 115, 0.1); }
.btn-auth-full { width: 100%; background: var(--primary); color: white; padding: 14px; border: none; border-radius: 8px; font-weight: 700; font-size: 16px; cursor: pointer; transition: background 0.3s; }
.btn-auth-full:hover { background: var(--primary-dark); }
.auth-close { position: absolute; top: 15px; right: 15px; cursor: pointer; color: #999; }

/* CHATBOX */
.chat-btn { position: fixed; bottom: 30px; right: 30px; width: 64px; height: 64px; background-color: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 100; box-shadow: 0 4px 20px rgba(78, 56, 45, 0.4); transition: transform 0.2s; }
.chat-btn:hover { transform: scale(1.1); }
.chat-window { position: fixed; bottom: 100px; right: 30px; width: 360px; height: 500px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 9999; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #eee; }
.chat-header { background: var(--primary); color: white; padding: 15px; font-weight: 700; display: flex; justify-content: space-between; font-family: 'Mulish', sans-serif; }
.chat-content { flex: 1; padding: 20px; overflow-y: auto; background: #f9f9f9; }
.chat-msg { padding: 10px 15px; margin-bottom: 10px; border-radius: 16px; max-width: 85%; font-size: 14px; line-height: 1.4; }
.chat-msg.user { background: var(--accent); color: white; align-self: flex-end; margin-left: auto; border-bottom-right-radius: 2px; }
.chat-msg.bot { background: white; border: 1px solid #ddd; align-self: flex-start; border-bottom-left-radius: 2px; }
.chat-input { display: flex; border-top: 1px solid #eee; padding: 15px; background: white; }
.chat-input input { flex: 1; border: none; outline: none; padding: 5px; font-family: inherit; }

/* RESPONSIVE */
@media (max-width: 768px) {
    .main-layout, .detail-content-layout { flex-direction: column; }
    .sidebar, .dcl-sidebar { width: 100%; display: none; }
    .shop-card-booking { flex-direction: column; }
    .sc-img { width: 100%; height: 220px; }
    .sc-price-col { width: 100%; border: none; padding: 20px; background: white; text-align: left; border-top: 1px solid #eee; }
    .detail-gallery { height: 300px; }
    .search-bar-booking { flex-direction: column; height: auto; padding: 15px; }
    .sb-item { border-right: none; border-bottom: 1px solid #eee; padding: 0; margin-bottom: 10px; }
    .auth-card { width: 90%; padding: 25px; }
    .hero-header { padding: 40px 0 80px; }
    .hero-header h1 { font-size: 40px; }
    .map-container { height: 200px; }
}
/* DETAIL PAGE PROFESSIONAL LAYOUT */
.detail-container-pro { max-width: 960px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
.detail-header-pro { padding: 30px 40px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; background: #fff; }
.dh-info { flex: 1; }
.dh-price-box { text-align: right; min-width: 200px; padding-left: 20px; border-left: 1px solid #f0f0f0; }

.pro-title { font-family: 'Roboto Slab', serif; font-size: 32px; color: var(--primary); margin: 8px 0; line-height: 1.3; }
.pro-badge { background: #e6f6eb; color: #008234; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; }
.pro-address { display: flex; align-items: center; gap: 6px; color: #555; font-size: 15px; margin-bottom: 10px; }
.pro-rating { display: flex; align-items: center; gap: 8px; margin-top: 10px; }

.pro-price { font-family: 'Roboto Slab', serif; font-size: 28px; color: var(--primary); font-weight: 800; }
.pro-sub-price { font-size: 13px; color: #888; margin-top: 4px; }

.map-section-pro { padding: 0; position: relative; height: 450px; background: #eee; }
.action-bar-pro { padding: 20px 40px; background: #fafafa; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
`;

// --- COMPONENT CHÍNH ---
export default function App() {
    const [view, setView] = useState('home'); // home, detail, imageSearch, challenge, register, login
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    // Dữ liệu Shops & Filters
    const [shops, setShops] = useState([]);
    const [inputKeyword, setInputKeyword] = useState('');
    const [filters, setFilters] = useState({
        keyword: '', city: 'all', category: 'all',
        rating: 0, from_price: '', to_price: '',
        lat: null, lon: null, radius: null // Thêm 3 tham số này
    });
    const [metaData, setMetaData] = useState({ cities: [], categories: [] });

    // Chi tiết Shop & Chat
    const [selectedShop, setSelectedShop] = useState(null);
    const [shopComments, setShopComments] = useState([]);

    // Chatbot AI
    const [showChat, setShowChat] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef(null);

    // 1. KHỞI TẠO: CHECK LOGIN
    useEffect(() => {
        fetch(`${API_BASE}/api/current-user`)
            .then(res => res.json())
            .then(data => { if (data.is_authenticated) setUser(data.user); });
    }, []);

    // 2. LOAD SHOPS (Chỉ chạy khi view là home)
    useEffect(() => {
        if (view !== 'home') return;
        setLoading(true);
        const params = new URLSearchParams();

        // Mapping các state vào tham số URL backend yêu cầu
        if (filters.keyword) params.append('keyword', filters.keyword);
        if (filters.city !== 'all') params.append('city', filters.city);
        if (filters.category !== 'all') params.append('category', filters.category);

        // Rating (backend logic: lấy shop có rating >= giá trị gửi lên)
        if (filters.rating > 0) params.append('rating', filters.rating);

        // Giá (from_price, to_price)
        if (filters.from_price) params.append('from_price', filters.from_price);
        if (filters.to_price) params.append('to_price', filters.to_price);

        // Vị trí (Quan trọng: Phải gửi đủ 3 cái này backend mới tính khoảng cách)
        if (filters.lat && filters.lon) {
            params.append('lat', filters.lat);
            params.append('lon', filters.lon);
            params.append('radius', filters.radius || 5); // Mặc định tìm trong 5km
        }

        fetch(`${API_BASE}/api/shops?${params.toString()}`) //
            .then(res => res.json())
            .then(data => {
                setShops(data.data);
                if (data.filters) setMetaData({
                    cities: data.filters.cities || [],
                    categories: data.filters.categories || []
                });
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    }, [filters, view]);

    // Scroll chat xuống cuối
    useEffect(() => {
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const doSearch = () => setFilters(prev => ({ ...prev, keyword: inputKeyword }));

    // Xử lý đăng nhập
    const handleLogin = async (username, password) => {
        try {
            const res = await fetch(`${API_BASE}/api/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) { setUser(data.user); setView('home'); }
            else alert(data.error);
        } catch { alert('Lỗi kết nối server!'); }
    };

    // Xử lý đăng ký (Có upload avatar)
    const handleRegister = async (formData) => {
        try {
            const res = await fetch(`${API_BASE}/api/register`, {
                method: 'POST',
                body: formData // Gửi dạng multipart/form-data
            });
            const data = await res.json();
            if (data.success) {
                alert("Đăng ký thành công! Vui lòng đăng nhập.");
                setView('login');
            }
            else alert(data.error);
        } catch { alert('Lỗi kết nối server!'); }
    }

    const openDetail = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/shops/${id}`);
            const data = await res.json();
            if (data.error) {
                alert(data.error);
            } else {
                setSelectedShop(data.shop);
                setShopComments(data.comments);
                setView('detail');
            }
        } catch { alert('Không tải được chi tiết shop!'); }
        setLoading(false);
    };

    const sendChat = async () => {
        if (!chatInput.trim()) return;
        const userText = chatInput;
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', text: userText }]);

        try {
            // Chuẩn bị payload đúng format backend
            const payload = {
                message: userText,
                history: chatHistory.map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                }))
            };

            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            setChatHistory(prev => [...prev, { role: 'bot', text: data.reply || "Xin lỗi, tôi chưa hiểu ý bạn." }]);
        } catch {
            setChatHistory(prev => [...prev, { role: 'bot', text: "Lỗi kết nối AI." }]);
        }
    };

    return (
        <div className="app-container">
            <style>{styles}</style>

            {/* --- NAVBAR --- */}
            <nav className="navbar">
                <div className="container nav-inner">
                    <div className="logo" onClick={() => setView('home')}>
                        <div className="logo-symbol">
                            <Gift size={24} strokeWidth={2.5} />
                        </div>
                        <span className="logo-text">SLocale</span>
                    </div>

                    <div className="auth-block">
                        <button
                            className={`nav-btn ${view === 'challenge' ? 'active' : ''}`}
                            onClick={() => setView('challenge')}
                        >
                            <Trophy size={18} /> Thử thách
                        </button>

                        <button
                            className={`nav-btn ${view === 'imageSearch' ? 'active' : ''}`}
                            onClick={() => setView('imageSearch')}
                        >
                            <Camera size={18} /> Tìm bằng ảnh
                        </button>

                        {user ? (
                            <div className="user-profile">
                                <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} className="avatar" alt="avt" />
                                <div className="user-info-text">
                                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{user.name}</div>
                                </div>
                                <button className="btn-logout" onClick={async () => {
                                    await fetch(`${API_BASE}/api/logout`, { method: 'POST' }); setUser(null); setView('home');
                                }}><LogOut size={16} /></button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-secondary" onClick={() => setView('register')}>Đăng ký</button>
                                <button className="btn-secondary" onClick={() => setView('login')}>Đăng nhập</button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* --- NỘI DUNG CHÍNH --- */}
            <main>
                {/* === VIEW: HOME === */}
                {view === 'home' && (
                    <div className="fade-in">
                        {/* HERO HEADER */}
                        <div className="hero-header">
                            <div className="container">
                                <h1>Tìm món quà hoàn hảo cho chuyến đi</h1>
                                <p>Khám phá hàng ngàn món đồ lưu niệm độc đáo tại địa phương.</p>
                            </div>
                        </div>

                        {/* SEARCH BAR */}
                        <div className="container search-container-wrapper">
                            <div className="search-bar-booking">
                                <div className="sb-item sb-input-keyword">
                                    <Search className="sb-icon" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Bạn muốn tìm món gì?"
                                        value={inputKeyword}
                                        onChange={e => setInputKeyword(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && doSearch()}
                                    />
                                </div>
                                <div className="sb-item">
                                    <MapPin className="sb-icon" size={20} />
                                    <select
                                        value={filters.city}
                                        onChange={e => setFilters({ ...filters, city: e.target.value })}
                                    >
                                        <option value="all">Mọi nơi</option>
                                        {metaData.cities.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="sb-item">
                                    <ShoppingBag className="sb-icon" size={20} />
                                    <select
                                        value={filters.category}
                                        onChange={e => setFilters({ ...filters, category: e.target.value })}
                                    >
                                        <option value="all">Tất cả loại</option>
                                        {metaData.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <button className="sb-btn" onClick={doSearch}>Tìm kiếm</button>
                            </div>
                        </div>
                        <div className="container main-layout">
                            {/* --- SIDEBAR BẮT ĐẦU TỪ ĐÂY --- */}
                            <div className="sidebar">

                                {/* 1. BOX LỌC ĐÁNH GIÁ (Rating) */}
                                <div className="filter-box">
                                    <h3>Đánh giá</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="number"
                                            className="modern-input"
                                            style={{ width: '70px', margin: 0, padding: '8px', textAlign: 'center', fontWeight: 'bold' }}
                                            min="0" max="5" step="0.5" placeholder="0"
                                            value={filters.rating > 0 ? filters.rating : ''}
                                            onChange={e => {
                                                let val = parseFloat(e.target.value);
                                                if (val > 5) val = 5;
                                                if (val < 0) val = 0;
                                                setFilters({ ...filters, rating: val });
                                            }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Star size={16} fill="#f5a623" color="#f5a623" />
                                                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>trở lên</span>
                                            </div>
                                            <small style={{ color: '#999', fontSize: '11px' }}>Nhập số sao (VD: 4.5)</small>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. BOX LỌC VỊ TRÍ (Nearby) */}
                                <div className="filter-box">
                                    <h3>Vị trí</h3>
                                    <div className="filter-row">
                                        <input
                                            type="checkbox"
                                            id="chk-nearby"
                                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                            checked={!!filters.lat}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    if (navigator.geolocation) {
                                                        navigator.geolocation.getCurrentPosition(
                                                            (position) => {
                                                                setFilters({
                                                                    ...filters,
                                                                    lat: position.coords.latitude,
                                                                    lon: position.coords.longitude,
                                                                    radius: 10
                                                                });
                                                            },
                                                            () => {
                                                                alert("Không thể lấy vị trí. Vui lòng bật GPS.");
                                                                e.target.checked = false;
                                                            }
                                                        );
                                                    } else {
                                                        alert("Trình duyệt không hỗ trợ định vị.");
                                                    }
                                                } else {
                                                    setFilters({ ...filters, lat: null, lon: null, radius: null });
                                                }
                                            }}
                                        />
                                        <label htmlFor="chk-nearby" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', marginLeft: '5px' }}>
                                            <span style={{ fontWeight: '600' }}>Gần tôi nhất</span>
                                            <span style={{ fontSize: '12px', color: '#666' }}>Bán kính tìm kiếm 10km</span>
                                        </label>
                                    </div>
                                </div>

                                {/* 3. BOX LỌC NGÂN SÁCH (Budget) */}
                                <div className="filter-box">
                                    <h3>Ngân sách</h3>
                                    <div className="price-inputs">
                                        <input
                                            type="number"
                                            placeholder="Từ..."
                                            value={filters.from_price}
                                            onChange={e => setFilters({ ...filters, from_price: e.target.value })}
                                        />
                                        <span>-</span>
                                        <input
                                            type="number"
                                            placeholder="Đến..."
                                            value={filters.to_price}
                                            onChange={e => setFilters({ ...filters, to_price: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        className="btn-secondary"
                                        style={{ marginTop: '10px', width: '100%', fontSize: '13px' }}
                                    >
                                        Áp dụng giá
                                    </button>
                                </div>
                            </div>
                            {/* --- KẾT THÚC SIDEBAR --- */}

                            {/* SHOP LIST */}
                            <div className="content-list">
                                {loading ? <div style={{ textAlign: 'center', padding: '20px' }}><span className="loader"></span> Đang tải...</div> : (
                                    <div>
                                        {shops.length > 0 ? shops.map(shop => (
                                            <div key={shop.id} className="shop-card-booking" onClick={() => openDetail(shop.id)} style={{ minHeight: '160px' }}>

                                                {/* 1. ẢNH ĐẠI DIỆN */}
                                                <div className="sc-img" style={{ width: '220px', minHeight: 'auto' }}>
                                                    <img
                                                        src={`https://source.unsplash.com/random/300x300/?souvenir,${shop.category}`}
                                                        onError={e => e.target.src = 'https://via.placeholder.com/300x300?text=Shop'}
                                                        alt={shop.name}
                                                        style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>

                                                {/* 2. THÔNG TIN CHÍNH (Sửa đổi layout) */}
                                                <div className="sc-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 30px' }}>

                                                    {/* Dòng 1: Tên Shop (Trái) - Rating (Phải) */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', width: '100%' }}>
                                                        {/* Tên Shop to hơn (26px) */}
                                                        <h2 style={{ fontSize: '20px', margin: 0, color: '#4e382d', fontFamily: 'Roboto Slab, serif' }}>
                                                            {shop.name}
                                                        </h2>

                                                        {/* Rating căn phải */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                            <span style={{ fontWeight: 'bold', color: '#2c2420', fontSize: '15px' }}>{shop.rating || 4.5}</span>
                                                            <Star size={16} fill="#f5a623" color="#f5a623" />
                                                        </div>
                                                    </div>

                                                    {/* Dòng 2: Địa chỉ (Màu thường, bỏ in xanh, bỏ gạch chân) */}
                                                    <div style={{ fontSize: '15px', color: '#555', lineHeight: '1.6' }}>
                                                        <span style={{ fontWeight: '500' }}>{shop.city}</span>
                                                        <span style={{ margin: '0 8px', color: '#ccc' }}>•</span>
                                                        <span style={{ color: '#666' }}>{shop.address}</span>
                                                    </div>

                                                    {/* --- CODE ITEMS PREVIEW (HIỆN TỐI ĐA 3 MÓN) --- */}
                                                    {shop.items && (
                                                        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            {(Array.isArray(shop.items) 
                                                                ? shop.items 
                                                                : String(shop.items).replace(/[\[\]']/g, "").split(',')
                                                            ).slice(0, 3).map((item, i) => (
                                                                <span key={i} style={{ 
                                                                    fontSize: '11px', background: '#f0f0f0', padding: '3px 8px', 
                                                                    borderRadius: '4px', color: '#666', border: '1px solid #ddd' 
                                                                }}>
                                                                    {item.trim()}
                                                                </span>
                                                            ))}
                                                            {/* Nếu nhiều hơn 3 món thì hiện dấu ... */}
                                                            {(Array.isArray(shop.items) ? shop.items.length : String(shop.items).split(',').length) > 3 && 
                                                                <span style={{ fontSize: '11px', color: '#999', alignSelf: 'center' }}>+ thêm...</span>
                                                            }
                                                        </div>
                                                    )}

                                                </div>

                                                {/* 3. CỘT GIÁ VÀ NÚT */}
                                                <div className="sc-price-col" style={{ justifyContent: 'center', width: '200px', borderLeft: '1px solid #f0f0f0' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Giá trung bình</div>
                                                        <div className="sc-price-value" style={{ fontSize: '24px', color: '#4e382d' }}>
                                                            {/* Format giá + thêm đuôi ,000 */}
                                                            {new Intl.NumberFormat('vi-VN').format(shop.price)},000 ₫
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#999' }}>Đã bao gồm thuế</div>
                                                    </div>

                                                    <button className="btn-view-detail" style={{ marginTop: '20px', background: '#d4a373', fontSize: '14px', padding: '10px' }}>
                                                        Xem chi tiết <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                                                Không tìm thấy cửa hàng nào phù hợp.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* === VIEW: CHALLENGE === */}
                {view === 'challenge' && (
                    <ChallengeUI user={user} onLoginRequest={() => setView('login')} />
                )}

                {/* === VIEW: DETAIL (Giao diện Professional) === */}
                {view === 'detail' && selectedShop && (
                    <div className="fade-in" style={{ paddingBottom: '60px' }}>

                        {/* Breadcrumb / Nút quay lại */}
                        <div className="container" style={{ marginTop: '20px' }}>
                            <button className="btn-back" onClick={() => setView('home')} style={{ color: '#666', fontSize: '14px' }}>
                                <ChevronRight transform="rotate(180)" size={16} /> Quay lại danh sách
                            </button>
                        </div>

                        <div className="detail-container-pro">

                            {/* 1. HEADER: CHIA 2 CỘT (Thông tin Trái - Giá Phải) */}
                            <div className="detail-header-pro">

                                {/* Cột Trái: Thông tin */}
                                <div className="dh-info">
                                    <span className="pro-badge">
                                        {selectedShop.category || "Địa điểm"}
                                    </span>
                                    <h1 className="pro-title">{selectedShop.name}</h1>

                                    <div className="pro-address">
                                        <MapPin size={18} color="#888" />
                                        <span>{selectedShop.address}, {selectedShop.city}</span>
                                    </div>

                                    <div className="pro-rating">
                                        <div style={{ display: 'flex' }}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} size={18} fill={s <= (selectedShop.rating || 5) ? "#f5a623" : "#e0e0e0"} color="none" />
                                            ))}
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
                                            {selectedShop.rating || 5.0} / 5.0
                                        </span>

                                        <span style={{ color: '#ccc' }}>•</span>
                                        <span style={{ color: '#666', fontSize: '14px', textDecoration: 'underline', cursor: 'pointer' }}>Xem {shopComments.length} đánh giá</span>

                                    </div>
                                </div>
                                {/* --- CODE HIỂN THỊ ITEMS MỚI --- */}
                                {selectedShop.items && (
                                    <div style={{ marginTop: '15px', borderTop: '1px dashed #eee', paddingTop: '15px' }}>
                                        <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                                            <ShoppingBag size={14} style={{ marginRight: '5px', verticalAlign: '-2px' }}/> 
                                            Sản phẩm nổi bật:
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {/* Tự động xử lý dù items là Mảng hay Chuỗi ngăn cách dấu phẩy */}
                                            {(Array.isArray(selectedShop.items) 
                                                ? selectedShop.items 
                                                : String(selectedShop.items).replace(/[\[\]']/g, "").split(',')
                                            ).map((item, idx) => (
                                                <span key={idx} style={{ 
                                                    background: '#f7f5f0', color: '#4e382d', padding: '6px 12px', 
                                                    borderRadius: '6px', fontSize: '14px', fontWeight: '600', border: '1px solid #e0dcd5' 
                                                }}>
                                                    {item.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* --- HẾT CODE ITEMS --- */}
                                {/* Cột Phải: Giá & Trạng thái */}
                                <div className="dh-price-box">
                                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>Giá tham khảo</div>
                                    <div className="pro-price">
                                        {new Intl.NumberFormat('vi-VN').format(selectedShop.price)},000 ₫
                                    </div>
                                    <div className="pro-sub-price">Đã bao gồm thuế</div>
                                    <div style={{ marginTop: '15px', display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#008234', fontSize: '13px', fontWeight: 'bold', background: '#e6f6eb', padding: '5px 10px', borderRadius: '20px' }}>
                                        <CheckCircle size={14} /> Đang mở cửa
                                    </div>
                                </div>
                            </div>

                            {/* 2. BẢN ĐỒ FULL-WIDTH VỚI LEAFLET */}
                            <div className="map-section-pro" style={{ height: '500px', width: '100%', zIndex: 0 }}>
                                {selectedShop.lat && selectedShop.lon ? (
                                    <MapContainer
                                        center={[selectedShop.lat, selectedShop.lon]}
                                        zoom={15}
                                        scrollWheelZoom={false}
                                        style={{ height: "100%", width: "100%" }}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />

                                        {/* Marker của Shop */}
                                        <Marker position={[selectedShop.lat, selectedShop.lon]}>
                                            <Popup>
                                                <b>{selectedShop.name}</b><br />{selectedShop.address}
                                            </Popup>
                                        </Marker>

                                        {/* Nếu có vị trí User (đang demo HCM), vẽ đường đi */}
                                        {/* Lưu ý: Bạn cần lấy toạ độ thật của user từ state filters.lat/lon hoặc hardcode test */}
                                        {(filters.lat || 10.762622) && (filters.lon || 106.660172) && (
                                            <>
                                                <Marker position={[filters.lat || 10.762622, filters.lon || 106.660172]}>
                                                    <Popup>Vị trí của bạn</Popup>
                                                </Marker>
                                                <RoutingMachine
                                                    userLat={filters.lat || 10.762622}
                                                    userLon={filters.lon || 106.660172}
                                                    shopLat={selectedShop.lat}
                                                    shopLon={selectedShop.lon}
                                                />
                                            </>
                                        )}
                                    </MapContainer>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                                        Không có dữ liệu bản đồ
                                    </div>
                                )}

                                {/* Nút chỉ đường Google Maps vẫn giữ lại để dự phòng */}
                                <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 400 }}>
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedShop.lat},${selectedShop.lon}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-booking-primary"
                                        style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.3)', padding: '10px 20px', fontSize: '14px', background: 'white', color: '#333', border: '1px solid #ccc' }}
                                    >
                                        <Navigation size={16} /> Mở Google Maps
                                    </a>
                                </div>
                            </div>

                            {/* 3. THANH TÁC VỤ (ACTION BAR) */}
                            <div className="action-bar-pro">
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', background: '#e0e0e0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <MessageCircle size={20} color="#555" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Hỗ trợ trực tuyến</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>Hỏi AI về sản phẩm tại đây</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowChat(true);
                                        setChatHistory(prev => [...prev, { role: 'bot', text: `Chào bạn! Bạn cần tư vấn gì về ${selectedShop.name}?` }]);
                                    }}
                                    style={{
                                        background: 'var(--primary)', color: 'white', border: 'none',
                                        padding: '12px 30px', borderRadius: '6px', fontWeight: '700',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                        boxShadow: '0 4px 12px rgba(78, 56, 45, 0.2)'
                                    }}
                                >
                                    Chat ngay <MessageCircle size={18} />
                                </button>
                            </div>

                            {/* 4. COMMENTS SECTION (Giữ nguyên logic cũ nhưng làm gọn padding) */}
                            <div style={{ padding: '40px', background: '#fff' }}>
                                <h3 style={{ fontFamily: 'Roboto Slab', margin: '0 0 25px', fontSize: '20px', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px', display: 'inline-block' }}>
                                    Đánh giá từ cộng đồng
                                </h3>

                                {user ? <CommentForm shopId={selectedShop.id} onSuccess={() => openDetail(selectedShop.id)} /> :
                                    <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '8px', textAlign: 'center', fontSize: '14px' }}>
                                        <span style={{ color: '#666' }}>Vui lòng </span>
                                        <a onClick={() => setView('login')} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>đăng nhập</a>
                                        <span style={{ color: '#666' }}> để gửi đánh giá.</span>
                                    </div>
                                }

                                <div style={{ marginTop: '30px' }}>
                                    {shopComments.length === 0 && <p style={{ color: '#999', fontStyle: 'italic' }}>Chưa có đánh giá nào cho địa điểm này.</p>}
                                    {shopComments.map(c => (
                                        <div key={c.id} style={{ display: 'flex', gap: '15px', marginBottom: '25px', borderBottom: '1px solid #f5f5f5', paddingBottom: '25px' }}>
                                            <div style={{ width: '45px', height: '45px', background: '#d4a373', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', flexShrink: 0 }}>
                                                {c.user_name?.[0]?.toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <strong style={{ fontSize: '15px', color: '#222' }}>{c.user_name}</strong>
                                                    <small style={{ color: '#999', fontSize: '12px' }}>{c.created_date}</small>
                                                </div>
                                                <div style={{ marginBottom: '8px' }}>
                                                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < (c.rating || 5) ? "#f5a623" : "#e0e0e0"} color="none" />)}
                                                </div>
                                                <div style={{ color: '#444', fontSize: '14px', lineHeight: '1.6' }}>{c.content}</div>
                                                {c.images && c.images.length > 0 && (
                                                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                                        {c.images.map((img, idx) => <img key={idx} src={img} alt="review" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }} />)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </main>

            {/* --- CHATBOX AI GEMINI --- */}
            {!showChat && (
                <div className="chat-btn" onClick={() => setShowChat(true)}>
                    <MessageCircle size={28} />
                </div>
            )}
            {showChat && (
                <div className="chat-window">
                    <div className="chat-header">
                        <span>Trợ lý Souvenir AI</span>
                        <div style={{ cursor: 'pointer' }} onClick={() => setShowChat(false)}><X size={20} /></div>
                    </div>
                    <div className="chat-content">
                        {chatHistory.length === 0 && <div style={{ textAlign: 'center', marginTop: '20px', color: '#999' }}>Chào bạn! Tôi có thể giúp gì về quà lưu niệm?</div>}
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`chat-msg ${msg.role}`}>{msg.text}</div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="chat-input">
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Nhập câu hỏi..." />
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }} onClick={sendChat}><Send size={18} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUB-COMPONENT: CHALLENGE UI ---
function ChallengeUI({ user, onLoginRequest }) {
    const [challenges, setChallenges] = useState([]);
    const [shops, setShops] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [userPoints, setUserPoints] = useState(0);
    const [loading, setLoading] = useState(true);

    const [selectedShopId, setSelectedShopId] = useState('');
    const [receiptFile, setReceiptFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        // Giả lập lấy toạ độ hiện tại (HCM)
        const userLat = 10.762622;
        const userLon = 106.660172;

        fetch(`${API_BASE}/api/challenge/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: userLat, lon: userLon, radius_km: 10 })
        })
            .then(res => res.json())
            .then(data => {
                setChallenges(data.videos || []);
                setShops(data.nearby_shops || []);
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });

        if (user) {
            fetch(`${API_BASE}/api/challenge/vouchers`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setUserPoints(data.points);
                        setVouchers(data.suggestions);
                    }
                });
        }
    }, [user]);

    const handleComplete = async () => {
        if (!user) return onLoginRequest();
        if (!selectedShopId || !receiptFile) return alert("Vui lòng chọn shop và ảnh hóa đơn");

        setUploading(true);
        const fd = new FormData();
        fd.append('shop_id', selectedShopId);
        fd.append('user_lat', 10.762622); // Demo toạ độ
        fd.append('user_lon', 106.660172);
        fd.append('receipt', receiptFile);

        try {
            const res = await fetch(`${API_BASE}/api/challenge/complete`, { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                setUserPoints(data.new_points);
                setReceiptFile(null);
            } else {
                alert(data.error);
            }
        } catch (e) { alert("Lỗi hệ thống"); }
        setUploading(false);
    };

    return (
        <div className="fade-in">
            <div className="hero-header challenge-mode">
                <div className="container">
                    <h1>Săn Deal - Nhận Quà Địa Phương</h1>
                    <p>Check-in tại các địa điểm, quay video hoặc mua sắm để tích điểm đổi voucher.</p>
                    {user && (
                        <div style={{ marginTop: '20px' }}>
                            <div className="points-badge">
                                <Trophy size={18} /> Điểm của bạn: {userPoints}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="container main-layout">
                <div className="content-list">
                    <h2 style={{ fontFamily: 'Roboto Slab', color: 'var(--primary)', marginBottom: '20px' }}>
                        <Video style={{ verticalAlign: 'middle' }} /> Thử thách đang diễn ra
                    </h2>

                    {loading ? <div>Đang tải...</div> : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {challenges.length === 0 && <p>Chưa có video thử thách nào.</p>}
                            {challenges.map((vid, idx) => (
                                <div key={idx} className="challenge-card">
                                    <iframe
                                        src={vid.embed}
                                        title={vid.id}
                                        className="video-frame"
                                        allowFullScreen
                                        style={{ border: 'none' }}
                                    ></iframe>
                                    <div className="challenge-body">
                                        <h3 style={{ margin: '0 0 5px', fontSize: '18px' }}>Thử thách #{idx + 1}</h3>
                                        <p style={{ fontSize: '13px', color: '#555' }}>Ghé thăm và check-in để nhận điểm.</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="sidebar" style={{ width: '350px' }}>
                    <div className="price-box-sticky">
                        <h4><UploadCloud size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Nộp minh chứng</h4>

                        {!user ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <p>Đăng nhập để tham gia thử thách</p>
                                <button className="btn-booking-primary" onClick={onLoginRequest}>Đăng nhập ngay</button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Chọn cửa hàng bạn đang đứng:</label>
                                    <select
                                        className="modern-input"
                                        style={{ margin: 0 }}
                                        value={selectedShopId}
                                        onChange={e => setSelectedShopId(e.target.value)}
                                    >
                                        <option value="">-- Chọn Shop --</option>
                                        {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div
                                    className="upload-box-modern"
                                    style={{ padding: '30px 10px', marginBottom: '15px' }}
                                    onClick={() => document.getElementById('receipt-up').click()}
                                >
                                    {receiptFile ? (
                                        <div style={{ color: 'green', fontWeight: 'bold' }}><CheckCircle size={30} /> {receiptFile.name}</div>
                                    ) : (
                                        <div>
                                            <Camera size={30} style={{ opacity: 0.5 }} />
                                            <p style={{ margin: '5px 0', fontSize: '13px' }}>Chụp ảnh hóa đơn</p>
                                        </div>
                                    )}
                                </div>
                                <input id="receipt-up" type="file" hidden accept="image/*" onChange={e => setReceiptFile(e.target.files[0])} />

                                <button className="btn-booking-primary" onClick={handleComplete} disabled={uploading}>
                                    {uploading ? 'Đang gửi...' : 'Hoàn thành & Nhận điểm'}
                                </button>
                            </div>
                        )}

                        {/* VOUCHER LIST */}
                        {vouchers.length > 0 && (
                            <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                <h4>Voucher đổi thưởng</h4>
                                {vouchers.map((v, i) => (
                                    <div key={i} className="voucher-ticket">
                                        <Gift size={24} color="var(--primary)" />
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{v.code}</div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>{v.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENT: IMAGE SEARCH ---
function ImageSearchUI({ onBack }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        const fd = new FormData(); fd.append('image', file);
        try {
            const res = await fetch(`${API_BASE}/api/search-by-image`, { method: 'POST', body: fd });
            const data = await res.json();
            setResult(data);
        } catch { alert('Lỗi xử lý ảnh'); }
        setLoading(false);
    };

    return (
        <div className="container fade-in" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
            <button className="btn-back" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ChevronRight transform="rotate(180)" size={16} /> Quay lại
            </button>

            <h2 style={{ fontFamily: 'Roboto Slab', fontSize: '28px', color: 'var(--primary)', marginBottom: '30px', textAlign: 'center' }}>
                Tìm kiếm bằng hình ảnh
            </h2>

            <div className="detail-content-layout">
                <div className="dcl-main">
                    <div
                        className="upload-box-modern"
                        onClick={() => document.getElementById('img-up').click()}
                    >
                        {preview ? (
                            <div style={{ position: 'relative' }}>
                                <img src={preview} style={{ maxHeight: '400px', maxWidth: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} alt="Preview" />
                                <div style={{ marginTop: '15px', color: 'var(--text-light)' }}>Nhấn để chọn ảnh khác</div>
                            </div>
                        ) : (
                            <div>
                                <div className="upload-icon-circle">
                                    <Camera size={40} />
                                </div>
                                <h3 style={{ margin: '0 0 10px', color: '#333' }}>Tải ảnh lên hoặc kéo thả vào đây</h3>
                                <p style={{ color: '#888', margin: 0 }}>Hỗ trợ JPG, PNG. Tối đa 5MB.</p>
                            </div>
                        )}
                    </div>

                    <input id="img-up" type="file" hidden accept="image/*" onChange={e => {
                        if (e.target.files[0]) {
                            setFile(e.target.files[0]);
                            setPreview(URL.createObjectURL(e.target.files[0]));
                            setResult(null);
                        }
                    }} />

                    {file && (
                        <button
                            className="btn-booking-primary"
                            style={{ marginTop: '25px', width: '100%', padding: '16px', fontSize: '18px' }}
                            onClick={handleAnalyze}
                            disabled={loading}
                        >
                            {loading ? 'Đang phân tích...' : '🔍 Tìm kiếm sản phẩm này'}
                        </button>
                    )}
                </div>

                <div className="dcl-sidebar">
                    {result ? (
                        <div className="price-box-sticky">
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CheckCircle color="green" size={20} /> Kết quả phân tích
                            </h4>
                            <div style={{ marginBottom: '20px', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                                <small style={{ color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Từ khóa nhận diện:</small>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--primary)' }}>
                                    {result.identified_items?.join(', ') || "Không rõ"}
                                </div>
                            </div>

                            <h5 style={{ margin: '0 0 10px' }}>Cửa hàng gợi ý:</h5>
                            {result.shops?.length > 0 ? result.shops.map(s => (
                                <div key={s.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <strong style={{ fontSize: '15px', display: 'block', color: '#333' }}>{s.name}</strong>
                                        <div style={{ color: 'var(--accent)', fontWeight: 'bold', marginTop: '4px' }}>{formatCurrency(s.price)}</div>
                                    </div>
                                    <ChevronRight size={16} color="#ccc" />
                                </div>
                            )) : <p>Không tìm thấy shop nào phù hợp.</p>}
                        </div>
                    ) : (
                        <div className="promo-banner" style={{ background: '#eef3f7', padding: '30px 20px', textAlign: 'center', color: '#555' }}>
                            <Search size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                            <p>Kết quả tìm kiếm sẽ hiển thị tại đây sau khi bạn tải ảnh lên.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// --- SUB-COMPONENT: AUTH FORM (Cập nhật Register đầy đủ) ---
function AuthForm({ type, onSwitch, onLogin, onRegister, onClose }) {
    const [form, setForm] = useState({
        username: '', password: '',
        name: '', email: '', confirm: '', avatar: null
    });
    const [avatarPreview, setAvatarPreview] = useState(null);

    const handleKeyDown = (e) => { if (e.key === 'Enter') submit(); };

    const submit = () => {
        if (type === 'login') {
            if (!form.username || !form.password) return alert("Vui lòng nhập đủ thông tin");
            onLogin(form.username, form.password);
        } else {
            // Register Logic
            if (!form.username || !form.password || !form.name || !form.email || !form.confirm) return alert("Vui lòng nhập đủ thông tin");
            if (form.password !== form.confirm) return alert("Mật khẩu xác nhận không khớp");

            const fd = new FormData();
            fd.append('name', form.name);
            fd.append('username', form.username);
            fd.append('pass', form.password);
            fd.append('confirm', form.confirm);
            fd.append('email', form.email);
            if (form.avatar) fd.append('avatar', form.avatar);

            onRegister(fd);
        }
    };

    return (
        <div className="auth-overlay">
            <div className="auth-card">
                <div className="auth-close" onClick={onClose}><X size={24} /></div>
                <h2 className="auth-title">{type === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
                <p className="auth-subtitle">{type === 'login' ? 'Chào mừng bạn quay trở lại' : 'Tham gia cộng đồng quà lưu niệm'}</p>

                {type === 'register' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <label style={{ cursor: 'pointer' }}>
                                {avatarPreview ? (
                                    <img src={avatarPreview} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} alt="avatar" />
                                ) : (
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                        <Camera size={24} color="#888" />
                                    </div>
                                )}
                                <input type="file" hidden accept="image/*" onChange={e => {
                                    if (e.target.files[0]) {
                                        setForm({ ...form, avatar: e.target.files[0] });
                                        setAvatarPreview(URL.createObjectURL(e.target.files[0]));
                                    }
                                }} />
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Chọn ảnh đại diện</div>
                            </label>
                        </div>
                        <input className="modern-input" placeholder="Họ và tên" onChange={e => setForm({ ...form, name: e.target.value })} />
                        <input className="modern-input" placeholder="Email" type="email" onChange={e => setForm({ ...form, email: e.target.value })} />
                    </>
                )}

                <div style={{ position: 'relative' }}>
                    <UserIcon size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: '#aaa' }} />
                    <input className="modern-input" style={{ paddingLeft: '45px' }} placeholder="Tên đăng nhập" onChange={e => setForm({ ...form, username: e.target.value })} />
                </div>

                <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: '#aaa' }} />
                    <input className="modern-input" style={{ paddingLeft: '45px' }} placeholder="Mật khẩu" type="password" onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={handleKeyDown} />
                </div>

                {type === 'register' && (
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: '#aaa' }} />
                        <input className="modern-input" style={{ paddingLeft: '45px' }} placeholder="Nhập lại mật khẩu" type="password" onChange={e => setForm({ ...form, confirm: e.target.value })} />
                    </div>
                )}

                <button className="btn-auth-full" onClick={submit}>
                    {type === 'login' ? 'Đăng nhập' : 'Đăng ký ngay'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
                    {type === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }} onClick={onSwitch}>
                        {type === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </span>
                </div>
            </div>
        </div>
    )
}

function CommentForm({ shopId, onSuccess }) {
    const [content, setContent] = useState('');
    const [rating, setRating] = useState(5);
    const [images, setImages] = useState([]);

    const submit = async () => {
        if (!content) return;
        const fd = new FormData();
        fd.append('content', content);
        fd.append('rating', rating);
        if (images.length > 0) {
            for (let i = 0; i < images.length; i++) fd.append('images', images[i]);
        }

        await fetch(`${API_BASE}/api/shops/${shopId}/comments`, { method: 'POST', body: fd });
        setContent(''); setImages([]); onSuccess();
    };

    return (
        <div style={{ background: '#fafafa', padding: '15px', borderRadius: '4px', marginTop: '10px' }}>
            <div style={{ marginBottom: '10px' }}>{[1, 2, 3, 4, 5].map(s => <Star key={s} size={20} fill={s <= rating ? "#d4a373" : "#eee"} color={s <= rating ? "#d4a373" : "#eee"} onClick={() => setRating(s)} style={{ cursor: 'pointer', marginRight: '2px' }} />)}</div>
            <textarea style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '2px' }} rows="3" placeholder="Viết đánh giá của bạn..." value={content} onChange={e => setContent(e.target.value)}></textarea>

            <input type="file" multiple accept="image/*" onChange={e => setImages(e.target.files)} style={{ marginTop: '10px' }} />
            <button className="btn-booking-primary" style={{ marginTop: '10px' }} onClick={submit}>Gửi đánh giá</button>
        </div>
    )
}