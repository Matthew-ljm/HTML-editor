const { createClient } = require('@supabase/supabase-js');

// 从Vercel环境变量获取配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY;

// 初始化Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cookie解析工具
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

// Vercel Serverless Function入口
module.exports = async (req, res) => {
    // 强制设置JSON响应类型
    res.setHeader('Content-Type', 'application/json');
    
    // 允许跨域请求（根据实际域名调整）
    res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只允许POST方法
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '只允许POST方法' });
    }

    try {
        // 解析请求体（Vercel会自动解析JSON）
        const { username, password, rememberMe = false, duration = 7 } = req.body || {};

        // 验证输入
        if (!username || !password) {
            return res.status(400).json({ message: '用户名和密码不能为空' });
        }

        // 查询用户（使用anon密钥，依赖RLS策略）
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !user) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 计算Cookie有效期
        const cookieExpiry = rememberMe 
            ? duration * 24 * 60 * 60  // 记住密码：天→秒
            : 3600;                   // 不记住：1小时

        // 设置安全Cookie
        res.setHeader('Set-Cookie', [
            `mcode_userid=${user.id}; HttpOnly; Secure; SameSite=Strict; Max-Age=${cookieExpiry}; Path=/`,
            `mcode_username=${encodeURIComponent(user.username)}; Secure; SameSite=Strict; Max-Age=${cookieExpiry}; Path=/`
        ]);

        // 返回成功响应
        return res.status(200).json({ 
            message: '登录成功',
            username: user.username 
        });

    } catch (err) {
        console.error('登录处理错误:', err);
        // 生产环境隐藏详细错误
        return res.status(500).json({ 
            message: '服务器内部错误',
            ...(process.env.NODE_ENV === 'development' && { detail: err.message })
        });
    }
};
