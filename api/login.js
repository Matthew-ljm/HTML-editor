// api/login.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs'); // 记得安装：npm install bcryptjs

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// 确保环境变量错误也返回JSON
if (!supabaseUrl || !supabaseKey) {
  // 不要用throw，改用返回JSON错误
  module.exports = (req, res) => {
    res.status(500).json({ message: '服务器配置错误：缺少Supabase密钥' });
  };
  return; // 终止后续代码执行
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '仅支持POST方法' });
  }

  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: '请输入用户名和密码' });
    }
    
    // 1. 查询用户（需要获取哈希密码）
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password') // 必须包含password（哈希后的）
      .eq('username', username)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    // 2. 验证密码（明文与哈希比对）
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    // 登录成功
    res.status(200).json({
      success: true,
      username: user.username,
      userId: user.id
    });
    
  } catch (err) {
    console.error('登录接口错误:', err);
    // 确保异常时返回JSON
    res.status(500).json({ message: '服务器错误，请稍后重试', error: err.message });
  }
};