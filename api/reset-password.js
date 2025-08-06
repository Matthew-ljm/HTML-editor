// api/reset-password.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// 从环境变量获取配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('请配置环境变量：SUPABASE_URL、SUPABASE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '仅支持POST方法' });
    }

    try {
        const { username, email, newPassword } = req.body; // 接收username
        
        // 基础验证
        if (!username || !email || !newPassword) {
            return res.status(400).json({ message: '请输入用户名、邮箱和新密码' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: '密码长度不能少于6位' });
        }
        
        // 1. 检查用户是否存在（按用户名查询）
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .eq('username', username)
            .single();
        
        if (userError || !user) {
            return res.status(400).json({ message: '用户不存在' });
        }
        
        // 2. 再次验证邮箱匹配（防止篡改）
        if (user.email !== email) {
            return res.status(400).json({ message: '邮箱与用户名不匹配' });
        }
        
        // 3. 加密并更新密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', user.id);
        
        if (updateError) throw updateError;
        
        res.status(200).json({ message: '密码重置成功' });
        
    } catch (err) {
        console.error('重置密码错误:', err);
        res.status(500).json({ message: '重置密码失败，请稍后重试' });
    }
};