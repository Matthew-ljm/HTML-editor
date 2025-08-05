// api/register.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt'); // 需安装：npm install bcrypt

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
        const { username, email, captcha, password } = req.body;
        
        // 基础验证
        if (!username || !email || !captcha || !password) {
            return res.status(400).json({ message: '请完善所有信息' });
        }
        
        // 1. 验证验证码（检查是否存在且未过期）
        const { data: validCaptcha, error: captchaError } = await supabase
            .from('captchas')
            .select('*')
            .eq('email', email)
            .eq('captcha', captcha)
            .gt('expires_at', new Date().toISOString()) // 未过期
            .single();
        
        if (captchaError || !validCaptcha) {
            return res.status(400).json({ message: '验证码无效或已过期' });
        }
        
        // 2. 检查用户名是否已存在
        const { data: existingUser, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .maybeSingle();
        
        if (userCheckError) throw userCheckError;
        if (existingUser) {
            return res.status(400).json({ message: '该用户名已被使用' });
        }
        
        // 3. 密码加密（10轮哈希）
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 4. 创建新用户
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
                username,
                email,
                password: hashedPassword // 存储加密后的密码
            }])
            .select()
            .single();
        
        if (insertError) throw insertError;
        
        // 5. 注册成功后删除用过的验证码（防止重复使用）
        await supabase
            .from('captchas')
            .delete()
            .eq('id', validCaptcha.id);
        
        res.status(200).json({ message: '注册成功' });
        
    } catch (err) {
        console.error('注册错误:', err);
        res.status(500).json({ message: '注册失败，请稍后再试' });
    }
};