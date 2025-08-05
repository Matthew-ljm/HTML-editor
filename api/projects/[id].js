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

    if (req.method !== 'GET') {
        return res.status(405).json({ message: '只允许GET方法' });
    }

    const { id } = req.query; // 获取项目ID

    try {
        const cookies = parseCookies(req.headers.cookie);
        const userId = cookies.mcode_userid;
        
        if (!userId) {
            return res.status(401).json({ message: '未登录' });
        }

        // 验证用户是否为项目成员
        const { data: member, error: memberError } = await supabase
            .from('project_members')
            .select('id')
            .eq('project_id', id)
            .eq('user_id', userId)
            .single();
        
        if (memberError || !member) {
            return res.status(403).json({ message: '无权访问该项目' });
        }

        // 获取项目详情
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();
        
        if (projectError) throw projectError;

        // 获取协作者
        const { data: members, error: membersError } = await supabase
            .from('project_members')
            .select('user_id, users(username)')
            .eq('project_id', id);
        
        if (membersError) throw membersError;

        const collaborators = members.map(m => ({
            id: m.user_id,
            username: m.users.username
        }));

        return res.status(200).json({ project, collaborators });

    } catch (err) {
        console.error('获取项目详情错误:', err);
        return res.status(500).json({ message: '获取项目详情失败' });
    }
};
