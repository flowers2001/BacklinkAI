import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync, cpSync, readFileSync, writeFileSync } from 'fs';

// ESM 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 自定义插件：构建后复制必要文件
function copyManifestPlugin() {
  return {
    name: 'copy-manifest',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      
      // 读取 manifest.json
      const manifestPath = resolve(__dirname, 'public/manifest.json');
      const manifestContent = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      
      // 从环境变量注入 Google Client ID
      const env = loadEnv('production', process.cwd(), '');
      const googleClientId = env.VITE_GOOGLE_CLIENT_ID;
      
      if (googleClientId) {
        manifestContent.oauth2 = {
          client_id: googleClientId,
          scopes: ['openid', 'email', 'profile']
        };
        console.log('✓ 已注入 Google OAuth2 Client ID');
      } else {
        console.warn('⚠️  未检测到 VITE_GOOGLE_CLIENT_ID，跳过 OAuth2 配置');
      }
      
      // 写入 manifest.json
      writeFileSync(
        resolve(distDir, 'manifest.json'),
        JSON.stringify(manifestContent, null, 2)
      );
      
      // 复制 icons 目录
      const iconsDir = resolve(distDir, 'icons');
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true });
      }
      cpSync(
        resolve(__dirname, 'public/icons'),
        iconsDir,
        { recursive: true }
      );
      
      console.log('✓ Copied manifest.json and icons to dist/');
    },
  };
}

export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        options: resolve(__dirname, 'options.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
