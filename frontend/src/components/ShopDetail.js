// JavaScript source code
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Apis, { endpoints } from '../configs/Apis';

const ShopDetail = () => {
    const { id } = useParams(); // Lấy ID từ URL
    const [shop, setShop] = useState(null);
    const [comments, setComments] = useState([]);

    useEffect(() => {
        const loadDetail = async () => {
            try {
                let res = await Apis.get(endpoints['shop_detail'](id));
                // API trả về { shop: {...}, comments: [...] }
                setShop(res.data.shop);
                setComments(res.data.comments);
            } catch (err) {
                console.error(err);
            }
        }
        loadDetail();
    }, [id]);

    if (!shop) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Đang tải dữ liệu...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>{shop.name}</h1>
            <img src={shop.image} alt={shop.name} style={{ width: '100%', borderRadius: '10px' }} />
            <p style={{ fontSize: '18px', marginTop: '20px' }}>{shop.description}</p>
            <h3 style={{ color: 'red' }}>Giá tham khảo: {shop.price ? shop.price.toLocaleString() : 0} VND</h3>

            <hr />

            <h3>Bình luận & Đánh giá ({comments.length})</h3>
            <div className="comments-list">
                {comments.length === 0 ? <p>Chưa có bình luận nào.</p> : null}

                {comments.map(c => (
                    <div key={c.id} style={{ background: '#f9f9f9', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
                        <strong>User ID: {c.user_id}</strong>
                        <p>{c.content}</p>
                        <small style={{ color: 'gray' }}>Đánh giá: {c.rating} sao - {c.created_date}</small>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ShopDetail;