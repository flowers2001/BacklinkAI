// ========================================
// 设置页面 - 数据管理系统
// ========================================

import { useState, useEffect } from 'react';
import { AuthGuard } from '../components/AuthGuard';
import type { PromotionSite, Backlink, UserProfile } from '../shared/supabase-types';
import {
  getPromotionSites,
  createPromotionSite,
  updatePromotionSite,
  deletePromotionSite,
  setActiveSite,
} from '../models/promotion-sites';
import { getBacklinks, deleteBacklink } from '../models/backlinks';

type TabType = 'sites' | 'backlinks';

function App() {
  return (
    <AuthGuard>
      {(user) => <ManagerApp user={user} />}
    </AuthGuard>
  );
}

function ManagerApp({ user }: { user: UserProfile }) {
  const [activeTab, setActiveTab] = useState<TabType>('sites');
  const [sites, setSites] = useState<PromotionSite[]>([]);
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingSite, setEditingSite] = useState<PromotionSite | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sites') {
        const data = await getPromotionSites(user.id);
        setSites(data);
      } else {
        const data = await getBacklinks(user.id);
        setBacklinks(data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      showToast('error', '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  const handleAddSite = () => {
    setEditingSite({
      name: '',
      url: '',
      brand_name: '',
      title: '',
      tagline: '',
      description: '',
      keywords: '',
      email: '',
      author_name: '',
    });
    setIsAdding(true);
  };

  const handleSaveSite = async () => {
    if (!editingSite) return;
    
    // 验证 URL 格式
    if (editingSite.url) {
      try {
        const url = new URL(editingSite.url);
        // 检查协议是否为 http 或 https
        if (!['http:', 'https:'].includes(url.protocol)) {
          showToast('error', 'URL 必须以 http:// 或 https:// 开头');
          return;
        }
      } catch {
        showToast('error', '请输入有效的 URL 格式（例如：https://example.com）');
        return;
      }
    }
    
    try {
      if (editingSite.id) {
        // 更新
        await updatePromotionSite(editingSite.id, user.id, editingSite);
        showToast('success', '更新成功');
      } else {
        // 新建
        await createPromotionSite({
          ...editingSite,
          user_id: user.id,
        });
        showToast('success', '添加成功');
      }
      setIsAdding(false);
      setEditingSite(null);
      loadData();
    } catch (error) {
      showToast('error', '保存失败');
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm('确定要删除这个推广网站吗？')) return;
    
    try {
      await deletePromotionSite(id, user.id);
      showToast('success', '删除成功');
      loadData();
    } catch (error) {
      showToast('error', '删除失败');
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await setActiveSite(user.id, id);
      showToast('success', '已切换激活网站');
      loadData();
    } catch (error) {
      showToast('error', '切换失败');
    }
  };

  const handleDeleteBacklink = async (id: string) => {
    if (!confirm('确定要删除这条外链记录吗？')) return;
    
    try {
      await deleteBacklink(id, user.id);
      showToast('success', '删除成功');
      loadData();
    } catch (error) {
      showToast('error', '删除失败');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f9fafb' }}>
      {/* 左侧导航 */}
      <div style={{
        width: '200px',
        background: 'white',
        borderRight: '1px solid #e5e7eb',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ padding: '0 16px', marginBottom: '12px' }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #ff6b35 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '4px'
          }}>
            BacklinkAI
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
            外链数据管理
          </div>
        </div>

        <NavItem
          active={activeTab === 'sites'}
          onClick={() => setActiveTab('sites')}
          icon="🌐"
          label="链接管理"
        />
        <NavItem
          active={activeTab === 'backlinks'}
          onClick={() => setActiveTab('backlinks')}
          icon="🔗"
          label="外链管理"
        />
      </div>

      {/* 右侧内容区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 标题栏 */}
        <div style={{
          padding: '24px 32px',
          background: 'white',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
            {activeTab === 'sites' ? '链接管理' : '外链管理'}
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            {activeTab === 'sites' 
              ? '管理你的推广网站，插件将使用激活的网站进行外链发布'
              : '查看和管理已发布的外链记录'}
          </p>
        </div>

        {/* 主内容区 */}
        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#6b7280' }}>加载中...</p>
            </div>
          ) : activeTab === 'sites' ? (
            <SitesTable
              sites={sites}
              onAdd={handleAddSite}
              onEdit={setEditingSite}
              onDelete={handleDeleteSite}
              onSetActive={handleSetActive}
            />
          ) : (
            <BacklinksTable
              backlinks={backlinks}
              onDelete={handleDeleteBacklink}
            />
          )}
        </div>
      </div>

      {/* 编辑弹窗 */}
      {(isAdding || editingSite) && (
        <SiteEditModal
          site={editingSite}
          onSave={handleSaveSite}
          onCancel={() => {
            setIsAdding(false);
            setEditingSite(null);
          }}
          onChange={setEditingSite}
        />
      )}

      {/* Toast 提示 */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          padding: '12px 20px',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 9999
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ========== 子组件 ==========

function NavItem({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        margin: '0 8px',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        fontWeight: active ? '600' : '400',
        background: active ? '#eff6ff' : 'transparent',
        color: active ? '#2563eb' : '#6b7280',
        transition: 'all 0.2s'
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function SitesTable({ sites, onAdd, onEdit, onDelete, onSetActive }: {
  sites: PromotionSite[];
  onAdd: () => void;
  onEdit: (site: PromotionSite) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
}) {
  return (
    <div>
      {/* 操作栏 */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          共 {sites.length} 个推广网站
        </div>
        <button
          onClick={onAdd}
          style={{
            padding: '8px 16px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '16px' }}>+</span>
          添加外链
        </button>
      </div>

      {/* 表格 */}
      {sites.length === 0 ? (
        <div style={{
          background: 'white',
          border: '2px dashed #e5e7eb',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px' }}>
            还没有推广网站
          </p>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            点击右上角"添加外链"按钮创建你的第一个推广项目
          </p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={thStyle}>状态</th>
                <th style={thStyle}>项目名称</th>
                <th style={thStyle}>推广网址</th>
                <th style={thStyle}>联系方式</th>
                <th style={thStyle}>描述</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>
                    {site.is_active ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        background: '#d1fae5',
                        color: '#065f46',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        ● 激活
                      </span>
                    ) : (
                      <button
                        onClick={() => site.id && onSetActive(site.id)}
                        style={{
                          padding: '4px 10px',
                          background: 'transparent',
                          border: '1px solid #d1d5db',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#6b7280',
                          cursor: 'pointer'
                        }}
                      >
                        设为激活
                      </button>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: '500', color: '#1f2937' }}>{site.name}</div>
                    {site.brand_name && (
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                        {site.brand_name}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {(() => {
                        try {
                          return new URL(site.url).hostname;
                        } catch {
                          return site.url || '-';
                        }
                      })()}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '13px', color: '#4b5563' }}>{site.email || '-'}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {site.description || '-'}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => onEdit(site)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#6b7280',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => site.id && onDelete(site.id)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1px solid #fca5a5',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#dc2626',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BacklinksTable({ backlinks, onDelete }: {
  backlinks: Backlink[];
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      {/* 统计信息 */}
      <div style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
        共 {backlinks.length} 条外链记录
      </div>

      {/* 表格 */}
      {backlinks.length === 0 ? (
        <div style={{
          background: 'white',
          border: '2px dashed #e5e7eb',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px' }}>
            暂无外链记录
          </p>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            使用插件提交外链后，记录会自动显示在这里
          </p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={thStyle}>域名</th>
                <th style={thStyle}>URL</th>
                <th style={thStyle}>嵌入链接</th>
                <th style={thStyle}>类型</th>
                <th style={thStyle}>提交时间</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {backlinks.map((link) => (
                <tr key={link.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: '500', color: '#1f2937' }}>{link.domain}</div>
                  </td>
                  <td style={tdStyle}>
                    <a
                      href={link.backlink_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {link.backlink_url}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {link.embedded_link || '-'}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 10px',
                      background: link.mode === 'comment' ? '#dbeafe' : '#fef3c7',
                      color: link.mode === 'comment' ? '#1e40af' : '#92400e',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {link.mode === 'comment' ? '评论' : '导航站'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {link.submitted_at ? new Date(link.submitted_at).toLocaleString('zh-CN') : '-'}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => link.id && onDelete(link.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#dc2626',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SiteEditModal({ site, onSave, onCancel, onChange }: {
  site: PromotionSite | null;
  onSave: () => void;
  onCancel: () => void;
  onChange: (site: PromotionSite) => void;
}) {
  if (!site) return null;

  const handleChange = (field: keyof PromotionSite, value: string) => {
    onChange({ ...site, [field]: value });
  };

  // 验证 URL 格式
  const isUrlValid = (() => {
    if (!site.url) return false;
    try {
      const url = new URL(site.url);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  })();

  const canSave = site.name && site.url && isUrlValid;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        width: '600px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px', color: '#1f2937' }}>
          {site.id ? '编辑推广网站' : '添加推广网站'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField
            label="项目名称"
            required
            value={site.name}
            onChange={(v) => handleChange('name', v)}
            placeholder="例如：我的独立站、产品A官网"
          />
          <FormField
            label="推广网址"
            required
            type="url"
            value={site.url}
            onChange={(v) => handleChange('url', v)}
            placeholder="https://your-website.com"
          />
          <FormField
            label="品牌名"
            value={site.brand_name || ''}
            onChange={(v) => handleChange('brand_name', v)}
            placeholder="你的品牌名称"
          />
          <FormField
            label="网站标题"
            value={site.title || ''}
            onChange={(v) => handleChange('title', v)}
            placeholder="表单中的 title 字段填充内容"
          />
          <FormField
            label="简短描述(Tagline)"
            value={site.tagline || ''}
            onChange={(v) => handleChange('tagline', v)}
            placeholder="一句话介绍你的网站"
          />
          <FormField
            label="网站描述"
            value={site.description || ''}
            onChange={(v) => handleChange('description', v)}
            placeholder="AI 生成内容时会结合此描述"
            multiline
          />
          <FormField
            label="核心关键词"
            value={site.keywords || ''}
            onChange={(v) => handleChange('keywords', v)}
            placeholder="SEO, 工具, 独立站"
          />
          <FormField
            label="联系邮箱"
            value={site.email || ''}
            onChange={(v) => handleChange('email', v)}
            placeholder="your@email.com"
          />
          <FormField
            label="联系人姓名"
            value={site.author_name || ''}
            onChange={(v) => handleChange('author_name', v)}
            placeholder="张三"
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={onSave}
            disabled={!canSave}
            style={{
              flex: 1,
              padding: '12px',
              background: !canSave ? '#d1d5db' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: !canSave ? 'not-allowed' : 'pointer'
            }}
          >
            保存
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              background: '#f3f4f6',
              color: '#6b7280',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, type, value, onChange, placeholder, multiline }: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  // URL 格式验证
  const isUrlField = type === 'url';
  const isValidUrl = (() => {
    if (!isUrlField || !value) return true;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  })();

  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '6px'
      }}>
        {label}
        {required && <span style={{ color: '#ef4444' }}> *</span>}
        {isUrlField && value && !isValidUrl && (
          <span style={{ color: '#ef4444', fontSize: '11px', marginLeft: '8px' }}>
            ⚠️ 请输入完整 URL（例如：https://example.com）
          </span>
        )}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${isUrlField && value && !isValidUrl ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      ) : (
        <input
          type={type || 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${isUrlField && value && !isValidUrl ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '8px',
            fontSize: '14px'
          }}
        />
      )}
    </div>
  );
}

// 样式常量
const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const tdStyle: React.CSSProperties = {
  padding: '16px',
  fontSize: '14px',
  color: '#4b5563'
};

export default App;
