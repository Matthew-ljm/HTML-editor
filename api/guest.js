// api/register.js
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
        const {username} = req.body;
        
        // 1. 检查用户名是否已存在
        const { data: existingUserByUsername, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .maybeSingle();
        
        if (userCheckError) throw userCheckError;
        if (existingUserByUsername) {
            return res.status(400).json({ message: '该用户名已被使用' });
        }
        
        // 2. 创建新用户
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
                username
            }])
            .select()
            .single();
        
        if (insertError) throw insertError;
        
    } catch (err) {
        console.error('注册错误:', err);
        res.status(500).json({ message: '注册失败，请稍后再试' });
    }
};