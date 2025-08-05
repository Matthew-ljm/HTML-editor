const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取Supabase配置（改用anon/public密钥）
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // 现在用anon/public密钥

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('请配置Supabase环境变量（URL和ANON_KEY）');
}

// 初始化Supabase客户端（使用anon/public密钥）
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 解析Cookie的工具函数
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
    // 只允许POST方法
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '只允许POST方法' });
    }

    const { username, password, rememberMe = false, duration = 7 } = req.body;

    // 验证输入
    if (!username || !password) {
        return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    try {
        // 查询用户（现在使用anon密钥，依赖RLS策略限制权限）
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username') // 只查询需要的字段，不返回密码（密码验证在后端处理）
            .eq('username', username)
            .eq('password', password) // 注意：实际项目中应该用密码哈希验证，而不是明文比对
            .single();

        if (error || !user) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 计算cookie有效期（秒）
        let cookieExpiry;
        if (rememberMe) {
            cookieExpiry = duration * 24 * 60 * 60; // 天→秒
        } else {
            cookieExpiry = 3600; // 1小时
        }

        // 设置Cookie（敏感信息用httpOnly）
        res.setHeader('Set-Cookie', [
            `mcode_userid=${user.id}; HttpOnly; Secure; SameSite=Strict; Max-Age=${cookieExpiry}; Path=/`,
            `mcode_username=${encodeURIComponent(user.username)}; Secure; SameSite=Strict; Max-Age=${cookieExpiry}; Path=/`
        ]);

        return res.status(200).json({ message: '登录成功' });
    } catch (err) {
        console.error('登录处理错误:', err);
        return res.status(500).json({ message: '服务器内部错误' });
    }
};