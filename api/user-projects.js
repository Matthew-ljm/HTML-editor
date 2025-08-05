const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    return (req, res) => res.status(500).json({ message: 'Supabase配置错误' });
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 解析Cookie
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

    if (req.method !== 'GET') {
        return res.status(405).json({ message: '只允许GET方法' });
    }

    try {
        // 从Cookie获取用户ID（httpOnly的mcode_userid）
        const cookies = parseCookies(req.headers.cookie);
        const userId = cookies.mcode_userid;
        
        if (!userId) {
            return res.status(401).json({ message: '未登录' });
        }

        // 查询用户的项目
        const { data, error } = await supabase
            .from('project_members')
            .select('project_id, projects(*)')
            .eq('user_id', userId);
        
        if (error) throw error;

        const projects = data.map(item => item.projects);
        return res.status(200).json({ projects });

    } catch (err) {
        console.error('获取用户项目错误:', err);
        return res.status(500).json({ message: '获取项目失败' });
    }
};
