// api/login.js
const { createClient } = require('@supabase/supabase-js');

// 从Vercel环境变量获取密钥（关键：避免硬编码）
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('请在Vercel控制台配置SUPABASE_URL和SUPABASE_KEY环境变量');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
    // 只允许POST方法
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '仅支持POST方法' });
    }

    try {
        const { username, password } = req.body;
        
        // 验证输入
        if (!username || !password) {
            return res.status(400).json({ message: '请输入用户名和密码' });
        }
        
        // 查询用户（后端安全验证）
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username')  // 只查询必要字段，不返回密码
            .eq('username', username)
            .eq('password', password)
            .single();
        
        if (error || !user) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }
        
        // 登录成功：返回用户信息
        res.status(200).json({
            success: true,
            username: user.username,
            userId: user.id
        });
        
    } catch (err) {
        console.error('登录接口错误:', err);
        res.status(500).json({ message: '服务器错误，请稍后重试' });
    }
};