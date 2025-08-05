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

    if (req.method !== 'POST') {
        return res.status(405).json({ message: '只允许POST方法' });
    }

    try {
        const { name, description = '' } = req.body;
        const cookies = parseCookies(req.headers.cookie);
        const userId = cookies.mcode_userid;
        
        if (!userId || !name) {
            return res.status(400).json({ message: '参数不完整' });
        }

        // 创建项目
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert([{ 
                name,
                description,
                created_by: userId
            }])
            .select()
            .single();
        
        if (projectError) throw projectError;

        // 添加用户为项目所有者
        const { error: memberError } = await supabase
            .from('project_members')
            .insert([{
                project_id: project.id,
                user_id: userId,
                role: 'owner'
            }]);
        
        if (memberError) throw memberError;

        return res.status(201).json({ projectId: project.id });

    } catch (err) {
        console.error('创建项目错误:', err);
        return res.status(500).json({ message: '创建项目失败' });
    }
};
