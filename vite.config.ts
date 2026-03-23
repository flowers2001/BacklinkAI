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
      
      // 移除 oauth2 配置（改用 launchWebAuthFlow，不需要在 manifest 中声明）
      delete manifestContent.oauth2;
      console.log('✓ 使用 launchWebAuthFlow 认证方式（不需要 manifest.oauth2）');
      
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
