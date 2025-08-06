// api/verify-reset-captcha.js
const { createClient } = require('@supabase/supabase-js');

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
        const { username, email, captcha } = req.body; // 接收username
        
        // 基础验证
        if (!username || !email || !captcha) {
            return res.status(400).json({ message: '请输入用户名、邮箱和验证码' });
        }
        
        // 验证验证码：需匹配用户名、邮箱、验证码且未过期
        const { data: validCaptcha, error: captchaError } = await supabase
            .from('captchas')
            .select('*')
            .eq('username', username) // 新增：匹配用户名
            .eq('email', email)
            .eq('captcha', captcha)
            .gt('expires_at', new Date().toISOString()) // 未过期
            .single();
        
        if (captchaError || !validCaptcha) {
            return res.status(400).json({ message: '验证码无效或已过期' });
        }
        
        // 验证成功，删除验证码防止重复使用
        await supabase
            .from('captchas')
            .delete()
            .eq('id', validCaptcha.id);
        
        res.status(200).json({ message: '验证成功' });
        
    } catch (err) {
        console.error('验证重置密码验证码错误:', err);
        res.status(500).json({ message: '验证失败，请稍后重试' });
    }
};