-- ========================================
-- Chrome 插件数据表 Schema
-- 在 Supabase SQL Editor 中执行此文件
-- ========================================

-- 1. 推广网站表（链接管理）
CREATE TABLE IF NOT EXISTS promotion_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- Google OAuth 用户 ID（由 email 生成的稳定 UUID）
    
    -- 基本信息
    name TEXT NOT NULL,  -- 项目名称（用于在插件中区分不同推广网站）
    url TEXT NOT NULL,  -- 推广网址
    brand_name TEXT,  -- 品牌名
    title TEXT,  -- 网站标题
    tagline TEXT,  -- 标语/简短描述
    description TEXT,  -- 网站描述
    keywords TEXT,  -- 核心关键词
    
    -- 联系信息
    email TEXT,  -- 联系邮箱
    author_name TEXT,  -- 联系人姓名
    
    -- 状态
    is_active BOOLEAN DEFAULT true,  -- 是否激活
    
    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 外链记录表（外链管理）
CREATE TABLE IF NOT EXISTS backlinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- Google OAuth 用户 ID
    site_id UUID REFERENCES promotion_sites(id) ON DELETE CASCADE,  -- 关联推广网站
    
    -- 外链信息
    domain TEXT NOT NULL,  -- 外链域名（如 example.com）
    backlink_url TEXT NOT NULL,  -- 外链完整地址
    embedded_link TEXT,  -- 嵌入的推广链接
    
    -- 提交信息
    mode TEXT NOT NULL,  -- comment 或 directory
    content TEXT,  -- 提交的评论/描述内容
    status TEXT DEFAULT 'success',  -- success/pending/failed
    
    -- 审计字段
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引（提升查询性能）
CREATE INDEX IF NOT EXISTS idx_promotion_sites_user_id ON promotion_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_sites_is_active ON promotion_sites(is_active);
CREATE INDEX IF NOT EXISTS idx_backlinks_user_id ON backlinks(user_id);
CREATE INDEX IF NOT EXISTS idx_backlinks_site_id ON backlinks(site_id);
CREATE INDEX IF NOT EXISTS idx_backlinks_domain ON backlinks(domain);
CREATE INDEX IF NOT EXISTS idx_backlinks_submitted_at ON backlinks(submitted_at DESC);


-- ========================================
-- 更新时间触发器
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_promotion_sites_updated_at BEFORE UPDATE ON promotion_sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
