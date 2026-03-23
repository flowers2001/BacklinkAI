# Supabase 云端数据配置指南

## 🎯 功能说明

插件现已支持**云端数据同步**，可以：
- 管理多个推广网站
- 自动记录每次发布的外链
- 数据云端存储，跨设备同步
- Google 账号登录

---

## 📝 配置步骤

### 第一步：配置 Supabase 凭证

编辑 `.env` 文件，填入你的 Supabase 项目信息：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**获取方式**：
1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击 Settings → API
4. 复制 `Project URL` 和 `anon public` key

---

### 第二步：创建数据表

#### 2.1 创建表结构

1. 在 Supabase Dashboard，打开 **SQL Editor**
2. 复制 `database/schema.sql` 文件的全部内容
3. 粘贴到 SQL Editor 并执行（点击 RUN）

**这会创建**：
- `promotion_sites` 表（推广网站）
- `backlinks` 表（外链记录）

#### 2.2 配置安全策略（Zeabur 环境必须执行！）

**⚠️ 重要：如果你的 Zeabur Supabase 没有 Authentication 服务，必须禁用 RLS！**

1. 继续在 **SQL Editor** 中
2. 复制 `database/disable-rls.sql` 文件的全部内容
3. 粘贴并执行（点击 RUN）

**为什么要禁用 RLS？**
- Zeabur 的 Supabase 没有 Auth 服务，`auth.uid()` 永远返回 null
- 插件已在应用层通过 `user_id` 字段隔离数据
- ANON_KEY 只能通过插件访问，外部无法直接调用

---

### 第三步：配置 Google 登录

#### 3.1 Google Cloud Console 配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目（或使用现有项目）
3. 进入 **APIs & Services** → **Credentials**
4. 点击 **Create Credentials** → **OAuth 2.0 Client ID**
5. 应用类型：选择 **Web application**
6. 配置重定向 URI：

   **Authorized JavaScript origins**（留空，不填）
   
   **Authorized redirect URIs**（填 2 个）：
   ```
   https://<你的插件ID>.chromiumapp.org/
   https://your-zeabur-supabase-url/auth/v1/callback
   ```
   
   **如何获取插件 ID？**
   - 先 `npm run build`
   - 在 `chrome://extensions/` 加载插件
   - 复制插件 ID（类似 `abcdefghijklmnop`）

7. 点击 **Create**，复制 Client ID

#### 3.2 Supabase 配置（Zeabur 版本可跳过）

**如果你的 Zeabur Supabase 没有 Authentication 配置界面，跳过此步骤！**

插件会直接使用 Chrome Identity API 进行认证，不依赖 Supabase Auth 服务。

---

### 第四步：重新构建插件

```bash
npm run build
```

然后在 Chrome 中刷新插件（`chrome://extensions/` → 点击刷新图标）

---

## 🚀 使用流程

### 1. 首次使用：登录

打开插件设置页面（右键插件图标 → Options）：
- 点击 "使用 Google 账号登录"
- 授权后会跳转回插件

### 2. 添加推广网站

登录后，设置页面会显示管理界面：
- **链接管理** 标签页
- 点击 "添加外链" 按钮
- 填写你的推广网站信息：
  - 物料名称（例如：我的独立站）
  - 推广网址（https://your-site.com）
  - 品牌名、描述、邮箱等
- 点击保存
- 点击 "设为激活" 使其生效

### 3. 使用插件发外链

打开任意目标网站，点击插件图标：
- 顶部会显示 **"当前推广项目"** 下拉框
- 选择要推广的网站
- 点击 "生成评论/描述"
- 点击 "自动填充"

**自动功能**：
- ✅ 填充时使用选中项目的信息
- ✅ 填充成功后，自动将外链记录保存到数据库

### 4. 查看外链记录

设置页面 → **外链管理** 标签页：
- 查看所有发布的外链记录
- 显示域名、URL、提交时间、类型等
- 可以删除不需要的记录

---

## 🔒 安全性说明

- ✅ 使用 **Row Level Security (RLS)**：用户只能访问自己的数据
- ✅ **ANON_KEY** 安全：编译进插件，但只能访问 RLS 允许的数据
- ✅ **Google OAuth**：无需管理密码，安全可靠

---

## 🆘 常见问题

### Q1: 登录失败，显示 "Invalid redirect URL"
**解决**：检查 Google OAuth 配置中的重定向 URI 是否正确：
```
https://your-project.supabase.co/auth/v1/callback
```

### Q2: 数据表创建失败
**解决**：确保在 Supabase SQL Editor 中完整执行了 `database/schema.sql`

### Q3: 不想使用云端数据，只想本地存储
**解决**：不登录即可！插件会自动回退到本地存储模式（`chrome.storage.local`）

### Q4: 多设备同步数据
**解决**：在每台设备上登录同一个 Google 账号即可自动同步

---

## 📊 数据迁移

如果你之前使用本地存储，现在想迁移到云端：

1. 登录后，打开设置页面
2. 手动添加推广网站（复制之前的配置）
3. 外链记录无法迁移（从现在开始自动记录新的）

---

## 💡 高级功能

### 多项目管理
- 可以添加多个推广网站
- 在侧边栏下拉框中切换
- 每个网站有独立的配置和外链记录

### 团队协作（未来）
- 目前每个账号独立管理自己的数据
- 未来可以实现团队共享功能

---

**配置完成后，刷新插件即可使用云端数据功能！**
