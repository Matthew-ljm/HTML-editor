// api/forgot-password.js
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

// 从环境变量获取配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (!supabaseUrl || !supabaseKey || !smtpHost || !smtpUser || !smtpPass) {
    throw new Error('请配置环境变量：SUPABASE_URL、SUPABASE_KEY、SMTP_HOST、SMTP_USER、SMTP_PASS');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 创建邮件 transporter
const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort || 465,
    secure: true,
    auth: {
        user: smtpUser,
        pass: smtpPass
    }
});

// 生成6位随机验证码
function generateCaptcha() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '仅支持POST方法' });
    }

    try {
        const { email } = req.body;
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: '邮箱格式无效' });
        }
        
        // 检查邮箱是否已注册
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
            
        if (!existingUser) {
            return res.status(400).json({ message: '该邮箱未注册' });
        }
        
        // 生成验证码
        const captcha = generateCaptcha();
        // 有效期5分钟
        const expiresAt = new Date(Date.now() + 300000).toISOString();
        
        // 存储验证码到数据库
        const { error: insertError } = await supabase
            .from('captchas')
            .insert([{
                email,
                captcha,
                expires_at: expiresAt
            }]);
        
        if (insertError) throw insertError;
        
        // 发送邮件
        await transporter.sendMail({
            from: `"M-Code协作编辑器" <${smtpUser}>`,
            to: email,
            subject: 'M-Code密码重置验证码',
            html: `
                <p>您的密码重置验证码是：<strong style="font-size: 1.2rem; color: #4ade80;">${captcha}</strong></p>
                <p>验证码5分钟内有效，请勿泄露给他人。</p>
            `
        });
        
        res.status(200).json({ message: '验证码发送成功' });
        
    } catch (err) {
        console.error('发送重置密码验证码错误:', err);
        res.status(500).json({ message: '发送验证码失败，请稍后重试' });
    }
};