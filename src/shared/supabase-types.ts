// ========================================
// Supabase 数据类型定义
// ========================================

export interface PromotionSite {
  id?: string;
  user_id?: string;
  name: string;
  url: string;
  brand_name?: string;
  title?: string;
  tagline?: string;
  description?: string;
  keywords?: string;
  email?: string;
  author_name?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Backlink {
  id?: string;
  user_id?: string;
  site_id?: string;
  domain: string;
  backlink_url: string;
  embedded_link?: string;
  mode: 'comment' | 'directory';
  content?: string;
  status?: 'success' | 'pending' | 'failed';
  submitted_at?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}
