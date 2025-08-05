function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    
    cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
            cookies[name] = decodeURIComponent(value);
        }
    });
    return cookies;
}

module.exports = async (req, res) => {
    // 设置JSON响应类型
    res.setHeader('Content-Type', 'application/json');
    // 允许跨域带Cookie
    res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 解析Cookie
        const cookies = parseCookies(req.headers.cookie);
        
        // 验证身份Cookie
        const isLoggedIn = !!cookies.mcode_userid && !!cookies.mcode_username;
        
        return res.status(200).json({
            isLoggedIn,
            ...(isLoggedIn && { username: cookies.mcode_username })
        });
    } catch (err) {
        console.error('验证登录状态错误:', err);
        return res.status(500).json({
            isLoggedIn: false,
            message: '验证登录状态失败'
        });
    }
};
