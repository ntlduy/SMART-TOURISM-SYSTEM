import React, { useState, useEffect, useRef } from 'react';
import {
    Search, MapPin, Star, ShoppingBag, User,
    Camera, MessageCircle, X, Send, LogOut,
    ChevronRight, Image as ImageIcon, Filter, Sliders
} from 'lucide-react';

// --- CẤU HÌNH ---
const API_BASE = 'http://127.0.0.1:5000';

// --- TIỆN ÍCH ---
const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

// --- CSS GIAO DIỆN (Đã gộp vào đây để tránh lỗi file) ---
const cssStyles = `
/* GLOBAL & RESET */
:root {
  --primary: #f97316; /* Cam chủ đạo */
  --primary-hover: #ea580c;
  --bg-body: #f8fafc;
  --white: #ffffff;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --radius: 16px;
}
* { box-sizing: border-box; outline: none; }
body { margin: 0; font-family: 'Segoe UI', Roboto, sans-serif; background: var(--bg-body); color: var(--text-main); -webkit-font-smoothing: antialiased; padding-bottom: 80px; }
button { font-family: inherit; }

/* LAYOUT */
.app-container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* NAVBAR */
.navbar {
  position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0; padding: 15px 0; margin-bottom: 20px;
}
.nav-inner { display: flex; justify-content: space-between; align-items: center; }
.logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 24px; color: var(--primary); cursor: pointer; }
.logo span { background: -webkit-linear-gradient(45deg, #f97316, #ef4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.nav-menu { display: flex; gap: 20px; }
.nav-item { cursor: pointer; font-weight: 600; color: var(--text-sub); transition: 0.2s; display: flex; align-items: center; gap: 5px; }
.nav-item:hover, .nav-item.active { color: var(--primary); }
.auth-block { display: flex; align-items: center; gap: 15px; }

/* COMPONENTS */
.btn {
  padding: 10px 20px; border-radius: 99px; border: none; font-weight: 600; cursor: pointer; transition: 0.2s;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px;
}
.btn-primary { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(249, 115, 22, 0.4); }
.btn-outline { background: white; border: 1px solid #e2e8f0; color: var(--text-main); }
.btn-outline:hover { border-color: var(--primary); color: var(--primary); }
.btn-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; background: #f1f5f9; color: var(--text-sub); cursor: pointer; transition: 0.2s; }
.btn-icon:hover { background: var(--primary); color: white; }
.avatar { width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }

/* HERO & SEARCH */
.hero {
  background: linear-gradient(120deg, #fff7ed 0%, #fff1f2 100%);
  border-radius: 24px; padding: 40px; text-align: center; margin-bottom: 30px; position: relative; overflow: hidden;
}
.hero h1 { font-size: 36px; margin: 0 0 20px 0; color: #334155; }
.hero b { color: var(--primary); }
.search-box {
  background: white; max-width: 600px; margin: 0 auto; padding: 5px; border-radius: 99px;
  display: flex; align-items: center; box-shadow: 0 8px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;
}
.search-input { border: none; flex: 1; padding: 12px 20px; font-size: 16px; border-radius: 99px; }

/* FILTERS */
.filter-bar { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.filter-group { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 5px 10px; display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; align-items: center; max-width: 100%; }
.chip { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; background: #f8fafc; color: var(--text-sub); transition: 0.2s; }
.chip:hover { background: #e2e8f0; }
.chip.active { background: var(--primary); color: white; }
.adv-filter {
  width: 100%; background: white; padding: 20px; border-radius: 16px; margin-top: 10px; border: 1px solid #e2e8f0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;
}
.form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px; color: var(--text-sub); }
.form-control { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; }

/* PRODUCTS GRID */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 25px; }
.card {
  background: white; border-radius: 20px; overflow: hidden; border: 1px solid #f1f5f9;
  transition: 0.3s; cursor: pointer; position: relative; display: flex; flex-direction: column;
}
.card:hover { transform: translateY(-5px); box-shadow: var(--shadow); border-color: #fed7aa; }
.card-img-box { height: 180px; position: relative; background: #f1f5f9; overflow: hidden; }
.card-img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
.card:hover .card-img { transform: scale(1.05); }
.rating-tag {
  position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.95);
  padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: 700; color: #eab308;
  display: flex; align-items: center; gap: 3px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.card-body { padding: 15px; flex: 1; display: flex; flex-direction: column; }
.card-title { font-size: 16px; font-weight: 700; margin: 0 0 5px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-price { color: var(--primary); font-weight: 700; font-size: 16px; margin-top: auto; }
.card-meta { font-size: 12px; color: var(--text-sub); display: flex; align-items: center; gap: 4px; margin-bottom: 10px; }

/* DETAIL PAGE */
.detail-container { display: grid; grid-template-columns: 1.5fr 1fr; gap: 30px; }
.detail-img { width: 100%; height: 400px; border-radius: 24px; object-fit: cover; box-shadow: var(--shadow); }
.detail-info { background: white; padding: 30px; border-radius: 24px; border: 1px solid #e2e8f0; height: fit-content; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; margin: 15px 0; }
.tag-item { background: #ffedd5; color: #c2410c; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.comments-box { margin-top: 30px; background: white; padding: 25px; border-radius: 24px; border: 1px solid #e2e8f0; }
.comment-item { padding: 15px 0; border-bottom: 1px solid #f1f5f9; display: flex; gap: 15px; }

/* CHAT WIDGET */
.chat-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: var(--primary); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 20px rgba(249, 115, 22, 0.4); cursor: pointer; z-index: 100; transition: 0.2s; }
.chat-btn:hover { transform: scale(1.1); }
.chat-window {
  position: fixed; bottom: 100px; right: 30px; width: 350px; height: 500px; background: white;
  border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); 
  z-index: 9999; /* Đã sửa: Tăng z-index lên cao */
  display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0;
}
.chat-header { background: var(--primary); padding: 15px; color: white; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
.chat-content { flex: 1; overflow-y: auto; padding: 15px; background: #f8fafc; display: flex; flex-direction: column; gap: 10px; }
.chat-msg { padding: 8px 14px; border-radius: 12px; max-width: 80%; font-size: 14px; line-height: 1.4; }
.chat-msg.user { background: var(--primary); color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
.chat-msg.bot { background: white; border: 1px solid #e2e8f0; align-self: flex-start; border-bottom-left-radius: 2px; }
.chat-input { border-top: 1px solid #e2e8f0; padding: 10px; display: flex; gap: 10px; background: white; }

/* RESPONSIVE */
@media (max-width: 768px) {
  .detail-container { grid-template-columns: 1fr; }
  .nav-menu span { display: none; }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .filter-group { overflow-x: auto; }
}
`;

// --- COMPONENT CHÍNH ---
export default function App() {
    const [view, setView] = useState('home');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showAdvFilter, setShowAdvFilter] = useState(false); // Toggle lọc nâng cao

    // Dữ liệu Shops & Filters
    const [shops, setShops] = useState([]);
    const [inputKeyword, setInputKeyword] = useState(''); // Text trong ô search
    const [filters, setFilters] = useState({
        keyword: '', city: 'all', category: 'all',
        rating: 0, from_price: '', to_price: ''
    });
    const [metaData, setMetaData] = useState({ cities: [], categories: [] });

    // Chi tiết Shop & Chat
    const [selectedShop, setSelectedShop] = useState(null);
    const [shopComments, setShopComments] = useState([]);
    const [showChat, setShowChat] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [chatInput, setChatInput] = useState('');

    // 1. KHỞI TẠO: Kiểm tra Login & Load dữ liệu ban đầu
    useEffect(() => {
        fetch(`${API_BASE}/api/current-user`)
            .then(res => res.json())
            .then(data => { if (data.is_authenticated) setUser(data.user); });
    }, []);

    // 2. LOAD SHOPS: Gọi API mỗi khi `filters` thay đổi
    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.keyword) params.append('keyword', filters.keyword);
        if (filters.city !== 'all') params.append('city', filters.city);
        if (filters.category !== 'all') params.append('category', filters.category);
        if (filters.rating > 0) params.append('rating', filters.rating);
        if (filters.from_price) params.append('from_price', filters.from_price);
        if (filters.to_price) params.append('to_price', filters.to_price);

        fetch(`${API_BASE}/api/shops?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                setShops(data.data);
                // Cập nhật danh mục & thành phố để hiện lên dropdown
                if (data.filters) setMetaData({
                    cities: data.filters.cities || [],
                    categories: data.filters.categories || []
                });
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    }, [filters]);

    // HÀM XỬ LÝ
    const doSearch = () => setFilters(prev => ({ ...prev, keyword: inputKeyword }));

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

    const openDetail = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/shops/${id}`);
            const data = await res.json();
            setSelectedShop(data.shop);
            setShopComments(data.comments);
            setView('detail');
        } catch { alert('Không tải được chi tiết shop!'); }
        setLoading(false);
    };

    const sendChat = async () => {
        if (!chatInput.trim()) return;
        const userText = chatInput;
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', text: userText }]);

        try {
            // Gửi history để bot hiểu ngữ cảnh
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
            <style>{cssStyles}</style>

            {/* --- NAVBAR --- */}
            <nav className="navbar">
                <div className="app-container nav-inner">
                    <div className="logo" onClick={() => setView('home')}>
                        <ShoppingBag size={28} />
                        <span>SouvenirShop</span>
                    </div>

                    <div className="nav-menu">
                        <div className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
                            <MapPin size={18} /> <span>Khám phá</span>
                        </div>
                        <div className={`nav-item ${view === 'imageSearch' ? 'active' : ''}`} onClick={() => setView('imageSearch')}>
                            <Camera size={18} /> <span>Tìm bằng ảnh</span>
                        </div>
                    </div>

                    <div className="auth-block">
                        {user ? (
                            <>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{user.name}</div>
                                    <div style={{ fontSize: '11px', color: '#999' }}>Thành viên</div>
                                </div>
                                <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="avatar" alt="avt" />
                                <button className="btn-icon" onClick={async () => {
                                    await fetch(`${API_BASE}/api/logout`, { method: 'POST' }); setUser(null); setView('home');
                                }}><LogOut size={18} /></button>
                            </>
                        ) : (
                            <button className="btn btn-primary" onClick={() => setView('login')}>Đăng nhập</button>
                        )}
                    </div>
                </div>
            </nav>

            {/* --- NỘI DUNG CHÍNH --- */}
            <main>
                {/* === VIEW: HOME === */}
                {view === 'home' && (
                    <div className="fade-in">
                        {/* Hero & Search */}
                        <div className="hero">
                            <h1>Tìm kiếm món quà <b>Ý nghĩa nhất</b></h1>
                            <div className="search-box">
                                <Search className="text-gray-400" style={{ marginLeft: '15px' }} />
                                <input
                                    className="search-input"
                                    placeholder="Bạn muốn tìm gì? (VD: Khăn rằn, Cafe...)"
                                    value={inputKeyword}
                                    onChange={e => setInputKeyword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && doSearch()}
                                />
                                <button className="btn btn-primary" style={{ margin: '5px' }} onClick={doSearch}>Tìm kiếm</button>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="filter-bar">
                            <div className="filter-group">
                                <div
                                    className={`chip ${filters.category === 'all' ? 'active' : ''}`}
                                    onClick={() => setFilters({ ...filters, category: 'all' })}
                                >Tất cả</div>
                                {metaData.categories.map(cat => (
                                    <div
                                        key={cat}
                                        className={`chip ${filters.category === cat ? 'active' : ''}`}
                                        onClick={() => setFilters({ ...filters, category: cat })}
                                    >{cat}</div>
                                ))}
                            </div>

                            <select
                                className="form-control" style={{ width: 'auto' }}
                                value={filters.city}
                                onChange={e => setFilters({ ...filters, city: e.target.value })}
                            >
                                <option value="all">Toàn quốc</option>
                                {metaData.cities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            <button className={`btn btn-outline ${showAdvFilter ? 'active' : ''}`} onClick={() => setShowAdvFilter(!showAdvFilter)}>
                                <Sliders size={16} /> Bộ lọc nâng cao
                            </button>
                        </div>

                        {/* Advanced Filter Panel */}
                        {showAdvFilter && (
                            <div className="adv-filter fade-in">
                                <div>
                                    <label className="form-label">Khoảng giá (VNĐ)</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input type="number" placeholder="Từ..." className="form-control"
                                            value={filters.from_price} onChange={e => setFilters({ ...filters, from_price: e.target.value })} />
                                        <input type="number" placeholder="Đến..." className="form-control"
                                            value={filters.to_price} onChange={e => setFilters({ ...filters, to_price: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Đánh giá tối thiểu</label>
                                    <select className="form-control" value={filters.rating} onChange={e => setFilters({ ...filters, rating: e.target.value })}>
                                        <option value="0">Tất cả sao</option>
                                        <option value="3">Trên 3 sao</option>
                                        <option value="4">Trên 4 sao</option>
                                        <option value="4.5">Trên 4.5 sao</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Shop List */}
                        {loading ? <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải dữ liệu...</div> : (
                            <div className="grid">
                                {shops.length > 0 ? shops.map(shop => (
                                    <div key={shop.id} className="card" onClick={() => openDetail(shop.id)}>
                                        <div className="card-img-box">
                                            <img
                                                src={`https://source.unsplash.com/random/400x300/?store,${shop.category}`}
                                                className="card-img" alt={shop.name}
                                                onError={e => e.target.src = 'https://via.placeholder.com/400x300?text=Shop'}
                                            />
                                            <div className="rating-tag"><Star size={12} fill="#eab308" /> {shop.rating}</div>
                                        </div>
                                        <div className="card-body">
                                            <h3 className="card-title">{shop.name}</h3>
                                            <div className="card-meta"><MapPin size={12} /> {shop.city}</div>
                                            <div className="card-meta" style={{ color: '#64748b' }}>{shop.address}</div>
                                            <div className="card-price">{formatCurrency(shop.price)}</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#999', padding: '50px' }}>
                                        Không tìm thấy cửa hàng nào phù hợp với bộ lọc.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* === VIEW: DETAIL === */}
                {view === 'detail' && selectedShop && (
                    <div className="detail-container fade-in">
                        <div>
                            <img
                                src={`https://source.unsplash.com/random/800x600/?store,${selectedShop.category}`}
                                className="detail-img" alt="Cover"
                            />

                            <div className="comments-box">
                                <h3 style={{ marginBottom: '20px' }}>Sản phẩm nổi bật</h3>
                                <div className="tag-cloud">
                                    {(selectedShop.items || "Đang cập nhật").split(',').map((item, i) => (
                                        <span key={i} className="tag-item">{item.trim()}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="comments-box">
                                <h3>Đánh giá từ khách hàng ({shopComments.length})</h3>
                                {user ? (
                                    <CommentForm shopId={selectedShop.id} onSuccess={() => openDetail(selectedShop.id)} />
                                ) : <p style={{ margin: '15px 0', color: '#999' }}>Đăng nhập để bình luận.</p>}

                                {shopComments.map(c => (
                                    <div key={c.id} className="comment-item">
                                        <div className="avatar" style={{ background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {c.user_name?.[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{c.user_name}</div>
                                            <div style={{ fontSize: '12px', color: '#999' }}>{c.created_date}</div>
                                            <div style={{ margin: '5px 0' }}>{c.content}</div>
                                            {c.images && c.images.length > 0 && (
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    {c.images.map((img, idx) => (
                                                        <img key={idx} src={img} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} alt="review" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="detail-info">
                            <button className="btn btn-outline" style={{ marginBottom: '20px' }} onClick={() => setView('home')}>
                                <ChevronRight style={{ transform: 'rotate(180deg)' }} size={16} /> Quay lại
                            </button>
                            <h1 style={{ margin: '0 0 10px 0' }}>{selectedShop.name}</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#eab308', fontWeight: 'bold', marginBottom: '20px' }}>
                                <Star fill="#eab308" /> {selectedShop.rating} / 5.0
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <MapPin size={20} className="text-gray-400" />
                                <span>{selectedShop.address}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                                <ShoppingBag size={20} className="text-gray-400" />
                                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatCurrency(selectedShop.price)}</span>
                            </div>

                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {
                                setShowChat(true);
                                setChatHistory(prev => [...prev, { role: 'bot', text: `Chào bạn, bạn muốn hỏi gì về shop ${selectedShop.name}?` }]);
                            }}>
                                <MessageCircle size={18} /> Chat tư vấn ngay
                            </button>
                        </div>
                    </div>
                )}

                {/* === VIEW: IMAGE SEARCH === */}
                {view === 'imageSearch' && (
                    <ImageSearchUI onBack={() => setView('home')} />
                )}

                {/* === VIEW: LOGIN/REGISTER === */}
                {(view === 'login' || view === 'register') && (
                    <AuthForm
                        type={view}
                        onSwitch={() => setView(view === 'login' ? 'register' : 'login')}
                        onLogin={handleLogin}
                    />
                )}
            </main>

            {/* --- CHATBOX WIDGET --- */}
            {!showChat && (
                <div className="chat-btn" onClick={() => setShowChat(true)}>
                    <MessageCircle size={30} />
                </div>
            )}

            {showChat && (
                <div className="chat-window fade-in">
                    <div className="chat-header">
                        <span>Trợ lý AI Souvenir</span>
                        {/* ĐÃ SỬA: Bọc icon X để dễ bấm hơn */}
                        <div
                            onClick={() => setShowChat(false)}
                            style={{
                                cursor: 'pointer',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                transition: '0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <X size={24} />
                        </div>
                    </div>
                    <div className="chat-content">
                        {chatHistory.length === 0 && <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>Xin chào! Tôi có thể giúp gì cho bạn?</div>}
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`chat-msg ${msg.role}`}>
                                {msg.text}
                            </div>
                        ))}
                    </div>
                    <div className="chat-input">
                        <input
                            className="form-control"
                            placeholder="Nhập tin nhắn..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendChat()}
                        />
                        <button className="btn btn-primary" style={{ padding: '0 15px' }} onClick={sendChat}>
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- TIỂU COMPONENT: TÌM KIẾM BẰNG ẢNH ---
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
        <div className="detail-container fade-in">
            <div className="detail-info" style={{ textAlign: 'center' }}>
                <button className="btn btn-outline" style={{ float: 'left' }} onClick={onBack}>Quay lại</button>
                <div style={{ clear: 'both', marginBottom: '20px' }}></div>

                <div
                    style={{ border: '2px dashed #cbd5e1', borderRadius: '20px', padding: '40px', cursor: 'pointer', background: preview ? `url(${preview}) center/contain no-repeat` : '#f8fafc', height: '300px' }}
                    onClick={() => document.getElementById('img-up').click()}
                >
                    {!preview && <div style={{ color: '#94a3b8' }}><ImageIcon size={48} style={{ display: 'block', margin: '0 auto 10px' }} />Click để tải ảnh lên</div>}
                </div>
                <input id="img-up" type="file" hidden accept="image/*" onChange={e => {
                    if (e.target.files[0]) { setFile(e.target.files[0]); setPreview(URL.createObjectURL(e.target.files[0])); setResult(null); }
                }} />

                <button className="btn btn-primary" style={{ marginTop: '20px', width: '100%' }} onClick={handleAnalyze} disabled={loading || !file}>
                    {loading ? 'AI đang phân tích...' : 'Tìm kiếm sản phẩm này'}
                </button>
            </div>

            <div className="detail-info">
                <h3>Kết quả phân tích</h3>
                {!result ? <div style={{ color: '#999' }}>Kết quả sẽ hiện ở đây...</div> : (
                    <>
                        <div style={{ marginBottom: '20px' }}>
                            <div>AI nhận diện được:</div>
                            <div className="tag-cloud">
                                {result.identified_items?.map((it, i) => (
                                    <span key={i} className="tag-item" style={{ background: '#dcfce7', color: '#166534' }}>{it}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div>Cửa hàng có bán:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                {result.shops?.length > 0 ? result.shops.map(s => (
                                    <div key={s.id} style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                        <div style={{ fontWeight: 'bold' }}>{s.name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{s.address}</div>
                                        <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatCurrency(s.price)}</div>
                                    </div>
                                )) : <div>Không tìm thấy shop nào.</div>}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

// --- TIỂU COMPONENT: ĐĂNG NHẬP/ĐĂNG KÝ ---
function AuthForm({ type, onSwitch, onLogin }) {
    const [form, setForm] = useState({});
    const [avatar, setAvatar] = useState(null);

    const submit = async () => {
        if (type === 'login') {
            onLogin(form.username, form.password);
        } else {
            // Register logic
            if (form.password !== form.confirm) return alert('Mật khẩu không khớp');
            const fd = new FormData();
            Object.keys(form).forEach(k => fd.append(k, form[k]));
            if (avatar) fd.append('avatar', avatar);

            try {
                const res = await fetch(`${API_BASE}/api/register`, { method: 'POST', body: fd });
                const data = await res.json();
                if (data.success) { alert('Đăng ký thành công!'); onSwitch(); } else alert(data.error);
            } catch { alert('Lỗi đăng ký'); }
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', background: 'white', padding: '40px', borderRadius: '24px', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>{type === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {type === 'register' && (
                    <>
                        <input className="form-control" placeholder="Họ và tên" onChange={e => setForm({ ...form, name: e.target.value })} />
                        <input className="form-control" placeholder="Email" type="email" onChange={e => setForm({ ...form, email: e.target.value })} />
                        <input type="file" onChange={e => setAvatar(e.target.files[0])} />
                    </>
                )}
                <input className="form-control" placeholder="Tên đăng nhập" onChange={e => setForm({ ...form, username: e.target.value })} />
                <input className="form-control" placeholder="Mật khẩu" type="password" onChange={e => setForm({ ...form, password: e.target.value })} />
                {type === 'register' && <input className="form-control" placeholder="Nhập lại mật khẩu" type="password" onChange={e => setForm({ ...form, confirm: e.target.value })} />}

                <button className="btn btn-primary" onClick={submit}>Xác nhận</button>
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px', cursor: 'pointer', color: 'var(--primary)' }} onClick={onSwitch}>
                    {type === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
                </div>
            </div>
        </div>
    )
}

// --- TIỂU COMPONENT: FORM BÌNH LUẬN ---
function CommentForm({ shopId, onSuccess }) {
    const [content, setContent] = useState('');
    const [rating, setRating] = useState(5);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!content) return;
        setLoading(true);
        const fd = new FormData();
        fd.append('content', content);
        fd.append('rating', rating);
        for (let i = 0; i < files.length; i++) fd.append('images', files[i]);

        await fetch(`${API_BASE}/api/shops/${shopId}/comments`, { method: 'POST', body: fd });
        setContent(''); setFiles([]); onSuccess(); setLoading(false);
    };

    return (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
            <div style={{ marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={24} fill={s <= rating ? "#eab308" : "#e2e8f0"} color={s <= rating ? "#eab308" : "#e2e8f0"} onClick={() => setRating(s)} style={{ cursor: 'pointer', marginRight: '5px' }} />
                ))}
            </div>
            <textarea className="form-control" rows="3" placeholder="Chia sẻ trải nghiệm của bạn..." value={content} onChange={e => setContent(e.target.value)} />
            <input type="file" multiple style={{ marginTop: '10px' }} onChange={e => setFiles(e.target.files)} />
            <button className="btn btn-primary" style={{ marginTop: '10px' }} onClick={submit} disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
        </div>
    )
}