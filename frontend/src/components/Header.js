// JavaScript source code
import React from 'react';
import { Link } from "react-router-dom";

const Header = () => {
    return (
        <nav style={{ background: '#007bff', padding: '15px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="logo">
                <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '20px', fontWeight: 'bold' }}>
                    🛍️ Smart Travel Shopping
                </Link>
            </div>
            <div className="menu">
                <Link to="/" style={{ color: 'white', margin: '0 10px', textDecoration: 'none' }}>Trang chủ</Link>
                <Link to="/login" style={{ color: 'white', margin: '0 10px', textDecoration: 'none' }}>Đăng nhập</Link>
            </div>
        </nav>
    );
};

export default Header;