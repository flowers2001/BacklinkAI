# BacklinkAI 安装指南

从 GitHub 克隆并构建插件的完整流程。

---

## 📦 第一步：克隆仓库

```bash
git clone <仓库地址>
cd BacklinkAI
```

---

## ⚙️ 第二步：配置环境变量

复制配置文件：

**Windows:**
```bash
copy .env.example .env
```

**Mac/Linux:**
```bash
cp .env.example .env
```

⚠️ **无需修改 `.env` 文件**，后端配置已包含在内。

---

## 🔨 第三步：安装依赖并构建

```bash
npm install
npm run build
```

构建完成后会生成 `dist` 目录。

---

## 🌐 第四步：加载插件到 Chrome

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「**开发者模式**」
3. 点击「**加载未打包的扩展程序**」
4. 选择 `BacklinkAI/dist` 目录
5. 安装完成！看到橙色链条图标

---

## 🔑 第五步：发送扩展 ID（重要！）

在 `chrome://extensions/` 页面：
- 找到 **BacklinkAI** 插件
- 复制「**ID**」字段（32位小写字母）
- **发送给管理员**（等待 OAuth 配置）

示例 ID：
```
hbfafbhhcalkfdeogkchimkclocbgfdm
```

---


## 🛠️ 开发模式（可选）

如果你想修改代码：

```bash
npm run dev
```

开发模式会自动监听文件变化并重新构建。每次修改后，在 Chrome 扩展页面点击刷新按钮。

---

## 📧 联系管理员

遇到问题？联系管理员获取帮助。
