const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取Supabase配置（在Vercel后台设置）
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('请配置Supabase环境变量');
}

// 初始化Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

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
        // 查询用户
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, password')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !user) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 计算cookie有效期（秒）
        let cookieExpiry;
        if (rememberMe) {
            // 记住密码的情况
            cookieExpiry = duration * 24 * 60 * 60; // 转换为秒
        } else {
            // 不记住密码的情况，1小时有效期
            cookieExpiry = 3600;
        }

        // 设置Cookie（敏感信息用httpOnly）
        res.setHeader('Set-Cookie', [
            // 用户ID - 敏感信息，设置httpOnly
            `mcode_userid=${user.id}; HttpOnly; Secure; SameSite=Strict; Max-Age=${cookieExpiry}; Path=/`,
            // 用户名 - 非敏感信息，不设置httpOnly以便前端读取
            `mcode_username=${encodeURIComponent(user.username)}; Secure; SameSite=Strict; Max-Age=${cookieExpiry}; Path=/`
        ]);

        // 返回成功信息
        return res.status(200).json({
            message: '登录成功'
        });
    } catch (err) {
        console.error('登录处理错误:', err);
        return res.status(500).json({ message: '服务器内部错误' });
    }
};
