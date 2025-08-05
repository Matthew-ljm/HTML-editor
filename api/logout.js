module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    // 清除httpOnly Cookie（设置过期时间为过去）
    res.setHeader('Set-Cookie', [
        'mcode_userid=; HttpOnly; Secure; SameSite=Strict; expires=Thu, 01 Jan 1970 00:00:00 UTC; Path=/',
        'mcode_username=; Secure; SameSite=Strict; expires=Thu, 01 Jan 1970 00:00:00 UTC; Path=/'
    ]);
    
    return res.status(200).json({ message: '退出成功' });
};
