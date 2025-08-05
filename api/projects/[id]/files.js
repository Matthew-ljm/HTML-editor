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

    if (req.method === 'GET') {
        // 获取文件列表
        try {
            const cookies = parseCookies(req.headers.cookie);
            const userId = cookies.mcode_userid;
            
            if (!userId) {
                return res.status(401).json({ message: '未登录' });
            }

            // 验证权限
            const { data: member, error: memberError } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', id)
                .eq('user_id', userId)
                .single();
            
            if (memberError || !member) {
                return res.status(403).json({ message: '无权访问' });
            }

            // 获取文件
            const { data: files, error } = await supabase
                .from('files')
                .select('*')
                .eq('project_id', id)
                .order('created_at', { ascending: true });
            
            if (error) throw error;

            return res.status(200).json({ files });

        } catch (err) {
            console.error('获取文件列表错误:', err);
            return res.status(500).json({ message: '获取文件失败' });
        }
    } 
    else if (req.method === 'POST') {
        // 创建新文件
        try {
            const { name, language } = req.body;
            const cookies = parseCookies(req.headers.cookie);
            const userId = cookies.mcode_userid;
            
            if (!userId || !name || !language) {
                return res.status(400).json({ message: '参数不完整' });
            }

            // 验证权限
            const { data: member, error: memberError } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', id)
                .eq('user_id', userId)
                .single();
            
            if (memberError || !member) {
                return res.status(403).json({ message: '无权操作' });
            }

            // 创建文件
            const { data: file, error } = await supabase
                .from('files')
                .insert([{ 
                    name,
                    language,
                    content: '',
                    project_id: id,
                    created_by: userId,
                    last_updated_by: userId
                }])
                .select()
                .single();
            
            if (error) throw error;

            return res.status(201).json({ fileId: file.id });

        } catch (err) {
            console.error('创建文件错误:', err);
            return res.status(500).json({ message: '创建文件失败' });
        }
    }
    else {
        return res.status(405).json({ message: '方法不允许' });
    }
};
