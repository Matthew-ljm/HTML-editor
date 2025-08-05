const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    return (req, res) => res.status(500).json({ message: 'Supabase配置错误' });
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) cookies[name] = decodeURIComponent(value);
    });
    return cookies;
}

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    const { id } = req.query; // 项目ID

    if (req.method !== 'POST') {
        return res.status(405).json({ message: '只允许POST方法' });
    }

    try {
        const { username } = req.body;
        const cookies = parseCookies(req.headers.cookie);
        const currentUserId = cookies.mcode_userid;
        
        if (!currentUserId || !username) {
            return res.status(400).json({ message: '参数不完整' });
        }

        // 验证当前用户是项目成员
        const { data: member, error: memberError } = await supabase
            .from('project_members')
            .select('id')
            .eq('project_id', id)
            .eq('user_id', currentUserId)
            .single();
        
        if (memberError || !member) {
            return res.status(403).json({ message: '无权操作' });
        }

        // 查询被添加用户
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();
        
        if (userError || !user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 检查是否已添加
        const { data: existing, error: existingError } = await supabase
            .from('project_members')
            .select('id')
            .eq('project_id', id)
            .eq('user_id', user.id)
            .single();
        
        if (!existingError) {
            return res.status(400).json({ message: '用户已在项目中' });
        }

        // 添加协作者
        const { error } = await supabase
            .from('project_members')
            .insert([{
                project_id: id,
                user_id: user.id,
                role: 'editor'
            }]);
        
        if (error) throw error;

        return res.status(200).json({ userId: user.id });

    } catch (err) {
        console.error('添加协作者错误:', err);
        return res.status(500).json({ message: '添加协作者失败' });
    }
};
