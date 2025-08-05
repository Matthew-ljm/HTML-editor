const { createClient } = require('@supabase/supabase-js');

// 初始化Supabase客户端
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Cookie工具函数
const cookieUtils = {
    parse: (cookieHeader) => {
        const cookies = {};
        if (!cookieHeader) return cookies;
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) cookies[name] = decodeURIComponent(value);
        });
        return cookies;
    },
    stringify: (name, value, maxAge = 3600) => {
        return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Strict; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`;
    }
};

// 验证登录状态
async function checkLogin(req) {
    const cookies = cookieUtils.parse(req.headers.cookie);
    const userId = cookies.mcode_userid;
    const username = cookies.mcode_username;
    
    if (!userId || !username) return null;
    
    // 验证用户是否存在
    const { data: user } = await supabase
        .from('users')
        .select('id, username')
        .eq('id', userId)
        .eq('username', username)
        .single()
        .catch(() => ({ data: null }));
    
    return user;
}

// 主处理函数
module.exports = async (req, res) => {
    // 设置跨域和响应类型
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 获取请求参数
    const { action } = req.query;
    const user = await checkLogin(req);

    try {
        // 1. 验证登录状态
        if (action === 'checkLogin') {
            return res.status(200).json({
                isLoggedIn: !!user,
                user: user ? { id: user.id, username: user.username } : null
            });
        }

        // 以下操作需要登录
        if (!user) {
            return res.status(401).json({ message: '请先登录' });
        }

        // 2. 获取用户项目列表
        if (action === 'getProjects') {
            const { data: projectMembers } = await supabase
                .from('project_members')
                .select('project_id, projects(*)')
                .eq('user_id', user.id);
            
            const projects = projectMembers.map(item => item.projects || {});
            return res.status(200).json({ projects });
        }

        // 3. 获取项目详情及协作者
        if (action === 'getProject' && req.query.projectId) {
            const projectId = req.query.projectId;
            
            // 验证用户是否为项目成员
            const { data: member } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', projectId)
                .eq('user_id', user.id)
                .single()
                .catch(() => ({ data: null }));
            
            if (!member) {
                return res.status(403).json({ message: '没有项目访问权限' });
            }

            // 获取项目详情
            const { data: project } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();
            
            // 获取协作者
            const { data: collaboratorsData } = await supabase
                .from('project_members')
                .select('user_id, users(username)')
                .eq('project_id', projectId);
            
            const collaborators = collaboratorsData.map(item => ({
                id: item.user_id,
                username: item.users.username
            }));

            return res.status(200).json({ project, collaborators });
        }

        // 4. 获取项目文件列表
        if (action === 'getProjectFiles' && req.query.projectId) {
            const projectId = req.query.projectId;
            
            // 验证权限
            const { data: member } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', projectId)
                .eq('user_id', user.id)
                .single()
                .catch(() => ({ data: null }));
            
            if (!member) {
                return res.status(403).json({ message: '没有项目访问权限' });
            }

            const { data: files } = await supabase
                .from('files')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at');
            
            return res.status(200).json({ files });
        }

        // 5. 获取文件详情
        if (action === 'getFile' && req.query.fileId) {
            const fileId = req.query.fileId;
            
            // 先查询文件所属项目
            const { data: file } = await supabase
                .from('files')
                .select('*, project_id')
                .eq('id', fileId)
                .single()
                .catch(() => ({ data: null }));
            
            if (!file) {
                return res.status(404).json({ message: '文件不存在' });
            }

            // 验证项目权限
            const { data: member } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', file.project_id)
                .eq('user_id', user.id)
                .single()
                .catch(() => ({ data: null }));
            
            if (!member) {
                return res.status(403).json({ message: '没有文件访问权限' });
            }

            return res.status(200).json({ file });
        }

        // 6. 保存文件
        if (action === 'saveFile' && req.method === 'POST' && req.body.fileId) {
            const { fileId, content } = req.body;
            
            // 先查询文件所属项目
            const { data: file } = await supabase
                .from('files')
                .select('project_id')
                .eq('id', fileId)
                .single()
                .catch(() => ({ data: null }));
            
            if (!file) {
                return res.status(404).json({ message: '文件不存在' });
            }

            // 验证权限
            const { data: member } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', file.project_id)
                .eq('user_id', user.id)
                .single()
                .catch(() => ({ data: null }));
            
            if (!member) {
                return res.status(403).json({ message: '没有文件修改权限' });
            }

            const updatedAt = new Date().toISOString();
            const { error } = await supabase
                .from('files')
                .update({ 
                    content, 
                    last_updated_by: user.id,
                    updated_at: updatedAt
                })
                .eq('id', fileId);
            
            if (error) throw error;
            
            return res.status(200).json({ message: '保存成功', updatedAt });
        }

        // 7. 创建项目
        if (action === 'createProject' && req.method === 'POST' && req.body.name) {
            const { name, description } = req.body;
            
            // 创建项目
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .insert([{ 
                    name, 
                    description: description || '',
                    created_by: user.id 
                }])
                .select()
                .single();
            
            if (projectError) throw projectError;

            // 添加当前用户为项目成员
            await supabase
                .from('project_members')
                .insert([{
                    project_id: project.id,
                    user_id: user.id,
                    role: 'owner'
                }]);
            
            return res.status(200).json({ message: '项目创建成功', projectId: project.id });
        }

        // 8. 创建文件
        if (action === 'createFile' && req.method === 'POST' && req.body.projectId && req.body.name) {
            const { projectId, name, language } = req.body;
            
            // 验证项目权限
            const { data: member } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', projectId)
                .eq('user_id', user.id)
                .single()
                .catch(() => ({ data: null }));
            
            if (!member) {
                return res.status(403).json({ message: '没有项目访问权限' });
            }

            // 创建文件
            const { data: file, error } = await supabase
                .from('files')
                .insert([{
                    name,
                    language: language || 'html',
                    content: '',
                    project_id: projectId,
                    created_by: user.id,
                    last_updated_by: user.id
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            return res.status(200).json({ message: '文件创建成功', fileId: file.id });
        }

        // 9. 添加协作者
        if (action === 'addCollaborator' && req.method === 'POST' && req.body.projectId && req.body.username) {
            const { projectId, username } = req.body;
            
            // 验证当前用户是否为项目成员
            const { data: currentMember } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', projectId)
                .eq('user_id', user.id)
                .single()
                .catch(() => ({ data: null }));
            
            if (!currentMember) {
                return res.status(403).json({ message: '没有项目访问权限' });
            }

            // 查询被添加用户是否存在
            const { data: targetUser } = await supabase
                .from('users')
                .select('id, username')
                .eq('username', username)
                .single()
                .catch(() => ({ data: null }));
            
            if (!targetUser) {
                return res.status(404).json({ message: '用户不存在' });
            }

            // 检查是否已为成员
            const { data: existingMember } = await supabase
                .from('project_members')
                .select('id')
                .eq('project_id', projectId)
                .eq('user_id', targetUser.id)
                .single()
                .catch(() => ({ data: null }));
            
            if (existingMember) {
                return res.status(400).json({ message: '该用户已是项目成员' });
            }

            // 添加协作者
            await supabase
                .from('project_members')
                .insert([{
                    project_id: projectId,
                    user_id: targetUser.id,
                    role: 'editor'
                }]);
            
            return res.status(200).json({ message: '协作者添加成功', userId: targetUser.id });
        }

        // 10. 退出登录
        if (action === 'logout') {
            res.setHeader('Set-Cookie', [
                cookieUtils.stringify('mcode_userid', '', -1),
                cookieUtils.stringify('mcode_username', '', -1)
            ]);
            return res.status(200).json({ message: '退出成功' });
        }

        // 未匹配的操作
        return res.status(400).json({ message: '无效的操作' });

    } catch (err) {
        console.error('API错误:', err);
        return res.status(500).json({ message: '操作失败', detail: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
};
