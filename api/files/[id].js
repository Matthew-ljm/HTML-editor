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

    const { id } = req.query; // 文件ID

    if (req.method === 'GET') {
        // 获取文件详情
        try {
            const cookies = parseCookies(req.headers.cookie);
            const userId = cookies.mcode_userid;
            
            if (!userId) {
                return res.status(401).json({ message: '未登录' });
            }

            // 获取文件及所属项目
            const { data: file, error: fileError } = await supabase
                .from('files')
                .select('*, projects(id)')
                .eq('id', id)
                .single();
            
            if (fileError) throw fileError;

            // 验证权限
            const { data: member, error: memberError } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', file.projects.id)
                .eq('user_id', userId)
                .single();
            
            if (memberError || !member) {
                return res.status(403).json({ message: '无权访问' });
            }

            return res.status(200).json({ file });

        } catch (err) {
            console.error('获取文件错误:', err);
            return res.status(500).json({ message: '获取文件失败' });
        }
    } 
    else if (req.method === 'PUT') {
        // 更新文件内容
        try {
            const { content } = req.body;
            const cookies = parseCookies(req.headers.cookie);
            const userId = cookies.mcode_userid;
            const updatedAt = new Date().toISOString();
            
            if (!userId || content === undefined) {
                return res.status(400).json({ message: '参数不完整' });
            }

            // 获取文件所属项目
            const { data: file, error: fileError } = await supabase
                .from('files')
                .select('project_id')
                .eq('id', id)
                .single();
            
            if (fileError) throw fileError;

            // 验证权限
            const { data: member, error: memberError } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', file.project_id)
                .eq('user_id', userId)
                .single();
            
            if (memberError || !member) {
                return res.status(403).json({ message: '无权操作' });
            }

            // 更新文件
            const { error } = await supabase
                .from('files')
                .update({ 
                    content,
                    last_updated_by: userId,
                    updated_at: updatedAt
                })
                .eq('id', id);
            
            if (error) throw error;

            return res.status(200).json({ updatedAt });

        } catch (err) {
            console.error('更新文件错误:', err);
            return res.status(500).json({ message: '保存文件失败' });
        }
    }
    else {
        return res.status(405).json({ message: '方法不允许' });
    }
};
