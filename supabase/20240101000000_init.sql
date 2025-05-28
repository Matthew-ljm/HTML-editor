-- 初始化脚本：supabase/migrations/20240101000000_init.sql
-- 执行后将创建协作编辑器所需的所有数据库结构

BEGIN;

-- 1. 创建文档表（存储编辑内容）
CREATE TABLE public.documents (
  id TEXT PRIMARY KEY DEFAULT 'shared-doc', -- 固定ID用于协作
  content TEXT NOT NULL DEFAULT '<h1>欢迎使用实时编辑器!</h1>',
  last_editor TEXT,                        -- 最后编辑用户ID
  updated_at TIMESTAMPTZ DEFAULT NOW()     -- 最后更新时间
);

-- 2. 创建在线用户表（显示活跃用户）
CREATE TABLE public.online_users (
  user_id TEXT PRIMARY KEY,               -- 用户ID（来自auth.users）
  username TEXT NOT NULL,                 -- 显示用用户名
  last_seen TIMESTAMPTZ DEFAULT NOW()     -- 最后活跃时间
);

-- 3. 启用实时功能（关键步骤！）
ALTER PUBLICATION supabase_realtime 
ADD TABLE public.documents, public.online_users;

-- 4. 设置权限策略（RLS）
-- 允许所有人读写文档（协作编辑）
CREATE POLICY "允许所有人编辑文档" ON public.documents
FOR ALL USING (true);

-- 允许用户管理自己的在线状态
CREATE POLICY "允许管理在线状态" ON public.online_users
FOR ALL USING (auth.uid() = user_id);

-- 5. 为方便测试，添加初始数据
INSERT INTO public.documents (id, content) 
VALUES ('shared-doc', '<h1>开始协作编辑吧！</h1>')
ON CONFLICT (id) DO NOTHING;

COMMIT;