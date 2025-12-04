import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./components/Home";
import Login from "./components/Login";
import ShopDetail from "./components/ShopDetail";
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <Header />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                {/* Route động: :id sẽ nhận bất kỳ số nào */}
                <Route path="/shops/:id" element={<ShopDetail />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;