export default async function handler(req, res) {
    // 只允许GET请求
    if (req.method !== 'GET') {
        return res.status(405).json({ error: '只允许GET请求' });
    }

    // 增强来源验证
    const allowedOrigin = 'https://ide.m-code.top';
    const referer = req.headers.referer || '';
    const origin = req.headers.origin || '';
    const xRequestedWith = req.headers['x-requested-with'];

    // 验证必须是AJAX请求
    if (xRequestedWith !== 'XMLHttpRequest') {
        return res.status(403).json({ error: '非法请求类型' });
    }

    // 严格验证来源
    const isOriginValid = origin === allowedOrigin;
    const isRefererValid = referer.startsWith(allowedOrigin);
    
    if (!isOriginValid && !isRefererValid) {
        console.error('拒绝非法请求，来源:', origin, 'Referer:', referer);
        return res.status(403).json({ error: '拒绝访问：非法来源' });
    }

    // 从环境变量获取配置
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('环境变量未配置');
        return res.status(500).json({ error: '服务器配置错误' });
    }

    // 设置安全的CORS头
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate'); // 禁止缓存
    
    return res.status(200).json({
        url: supabaseUrl,
        key: supabaseKey
    });
}
