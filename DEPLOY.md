# 部署流程详解

本文档详细解释了从 Next.js 构建到 GitHub Pages 部署的完整流程，以及各个组件是如何衔接工作的。

## 🏗️ 整体架构概览

```
开发环境 (本地)                    GitHub 环境
┌─────────────────┐              ┌─────────────────┐
│  Next.js 开发   │  Git Push   │  GitHub 仓库    │
│                 ├────────────►│                 │
│ npm run dev     │              │                 │
└─────────────────┘              └─────────────────┘
                                          │
                                          ▼
                                ┌─────────────────┐
                                │  GitHub Actions │
                                │                 │
                                │  自动触发构建    │
                                └─────────────────┘
                                          │
                                          ▼
                                ┌─────────────────┐
                                │  Next.js 构建   │
                                │                 │
                                │  npm run build  │
                                └─────────────────┘
                                          │
                                          ▼
                                ┌─────────────────┐
                                │  静态文件输出    │
                                │                 │
                                │  out/ 目录       │
                                └─────────────────┘
                                          │
                                          ▼
                                ┌─────────────────┐
                                │  GitHub Pages   │
                                │                 │
                                │  托管静态网站    │
                                └─────────────────┘
                                          │
                                          ▼
                                ┌─────────────────┐
                                │  用户访问        │
                                │                 │
                                │  https://...    │
                                └─────────────────┘
```

## 📋 详细流程步骤

### 1. 开发阶段 (本地)

```bash
# 开发环境
npm run dev          # 启动开发服务器
# 编写代码和内容
git add .           # 添加更改
git commit -m "..." # 提交更改
git push origin main # 推送到 GitHub
```

**关键点：**
- 本地开发使用热重载，实时预览
- 代码管理通过 Git 版本控制
- 推送到 main 分支触发后续流程

### 2. GitHub Actions 自动触发

当代码推送到 `main` 分支时，GitHub 会自动触发 `.github/workflows/deploy.yml` 中定义的工作流。

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]  # 只在 main 分支推送时触发
  pull_request:
    branches: [ main ]  # PR 时也触发（用于测试）
```

**触发机制：**
- GitHub 监听仓库事件
- 检测到 main 分支的 push
- 自动执行 Actions 工作流

### 3. 构建环境设置

GitHub Actions 提供一个干净的 Ubuntu 环境：

```yaml
jobs:
  build:
    runs-on: ubuntu-latest  # 使用最新的 Ubuntu 系统

    steps:
    - name: Checkout
      uses: actions/checkout@v4  # 检出代码

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '24'  # 使用 Node.js 24
```

**环境配置：**
- ✅ Linux 环境 (Ubuntu)
- ✅ Node.js 24 运行时
- ✅ 包管理器 (npm)
- ✅ 缓存支持 (加速构建)

### 4. 依赖安装和缓存

```yaml
- name: Setup npm cache
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Install dependencies
  run: npm ci  # 使用 npm ci 安装依赖
```

**优化点：**
- 🚀 使用缓存加速后续构建
- 📦 npm ci 比 npm install 更快更可靠
- 🔑 基于 package-lock.json 的缓存键

### 5. Next.js 静态构建

这是最关键的一步，Next.js 将 React 应用转换为静态 HTML 文件：

```bash
npm run build
```

**内部发生了什么：**

1. **读取配置：**
   ```javascript
   // next.config.ts
   export default {
     output: 'export',           // 启用静态导出
     trailingSlash: true,        // 为 GitHub Pages 添加尾部斜杠
     images: {
       unoptimized: true,        // 禁用图片优化（静态部署需要）
     },
     pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
   };
   ```

2. **处理 MDX 文件：**
   ```javascript
   // src/lib/posts.ts
   // 读取 content/posts/*.mdx 文件
   // 使用 gray-matter 解析 frontmatter
   // 使用 remark 将 Markdown 转换为 HTML
   ```

3. **静态页面生成：**
   ```javascript
   // 生成静态路由
   / → index.html
   /posts/hello-world → posts/hello-world/index.html
   /posts/minimal-web-development → posts/minimal-web-development/index.html
   ```

4. **输出到 out/ 目录：**
   ```
   out/
   ├── index.html           # 首页
   ├── posts/
   │   ├── hello-world/
   │   │   └── index.html   # 文章页面
   │   └── ...
   ├── _next/              # Next.js 静态资源
   ├── favicon.ico         # 图标文件
   └── 404.html            # 404 页面
   ```

### 6. GitHub Pages 部署

构建完成后，GitHub Actions 将静态文件部署到 GitHub Pages：

```yaml
- name: Upload Pages artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: ./out  # 上传 out 目录

# 部署作业
deploy:
  needs: build  # 等待构建完成
  permissions:
    pages: write      # 写入 Pages 权限
    id-token: write   # OIDC 令牌权限
  steps:
  - name: Deploy to GitHub Pages
    uses: actions/deploy-pages@v4
```

**部署机制：**
- 📦 将 `out/` 目录打包为 artifact
- 🚀 使用 GitHub Pages API 部署
- 🔐 通过 OIDC 令牌认证（无需个人访问令牌）
- ⏱️ 通常 1-2 分钟完成部署

### 7. GitHub Pages 服务

GitHub Pages 接收静态文件并提供 Web 服务：

```
用户访问: https://minmaxflow.github.io
    ↓
GitHub Pages 服务器
    ↓
返回: out/index.html
```

**服务特性：**
- 🌍 全球 CDN 分发
- 🚀 自动 HTTPS
- 📱 响应式设计支持
- ⚡ 静态文件高速加载

## 🔄 完整的文件路径映射

### 开发文件 → 生产 URL

```
src/app/page.tsx           →  https://minmaxflow.github.io/
src/app/posts/[slug]/page.tsx
    ↓
content/posts/hello-world.mdx → https://minmaxflow.github.io/posts/hello-world/
content/posts/example.mdx     → https://minmaxflow.github.io/posts/example/
```

### 构建输出映射

```
Next.js 源码                    静态输出
src/app/page.tsx            →   out/index.html
src/app/posts/[slug]/page.tsx
    ↓ (生成静态页面)
out/posts/hello-world/index.html
out/posts/example/index.html
```

## ⚙️ 配置文件详解

### 1. `next.config.ts` - Next.js 配置

```typescript
import createMDX from '@next/mdx';

const nextConfig = {
  output: 'export',        // 🎯 静态导出模式
  trailingSlash: true,     // 🎯 GitHub Pages 需要
  images: {
    unoptimized: true,     // 🎯 静态部署禁用图片优化
  },
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [],     // MDX 插件配置
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
```

### 2. `package.json` - 构建脚本

```json
{
  "scripts": {
    "dev": "next dev",           // 开发服务器
    "build": "next build",       // 🎯 静态构建
    "start": "next start",       // 生产服务器（静态模式不用）
    "lint": "eslint"             // 代码检查
  }
}
```

### 3. GitHub Actions 权限配置

在仓库设置中需要配置：

```
Settings → Actions → General → Workflow permissions
    ↓
选择: "Read and write permissions"
勾选: "Allow GitHub Actions to create and approve pull requests"

Settings → Pages → Build and deployment
    ↓
Source: "GitHub Actions"
```

## 🚀 性能优化机制

### 1. 静态生成 (SSG)

```javascript
// src/lib/posts.ts
export async function getAllPosts(): Promise<Post[]> {
  // 构建时预生成所有文章列表
}

// src/app/posts/[slug]/page.tsx
export async function generateStaticParams() {
  // 构建时预生成所有文章页面
}
```

### 2. 缓存策略

- **依赖缓存：** `~/.npm` 目录缓存
- **构建缓存：** 基于 `package-lock.json` 的缓存键
- **CDN 缓存：** GitHub Pages 全球 CDN

### 3. 加载优化

- **代码分割：** Next.js 自动代码分割
- **预加载：** 静态资源预加载
- **压缩：** 自动 Gzip 压缩

## 🔧 故障排除

### 常见问题和解决方案

1. **构建失败：**
   - 检查 Node.js 版本兼容性
   - 检查依赖安装是否完整
   - 查看 Actions 日志

2. **部署失败：**
   - 检查 Pages 权限设置
   - 确认 Source 设置为 "GitHub Actions"
   - 检查 `out/` 目录是否生成

3. **页面 404：**
   - 检查 `trailingSlash: true` 设置
   - 确认路径配置正确
   - 检查 GitHub Pages 自定义域名设置

4. **样式丢失：**
   - 检查 Tailwind CSS 配置
   - 确认 CSS 文件路径
   - 检查 `_next` 静态资源

## 📝 总结

这个部署流程实现了：

1. **🔄 自动化：** 代码推送后自动部署
2. **⚡ 高性能：** 静态文件 + CDN 加速
3. **🛡️ 可靠性：** GitHub 官方托管
4. **💰 免费：** 完全免费的部署方案
5. **🚀 现代化：** 使用最新的 Web 技术

整个流程从代码编写到用户访问，完全自动化，只需要 `git push` 一个命令就能触发完整的部署流程。