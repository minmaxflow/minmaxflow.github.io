# 部署流程详解

本文档详细解释了从 Next.js 构建到 GitHub Pages 部署的完整流程，以及各个组件是如何衔接工作的。

## 🏗️ 整体架构概览

```
开发环境 (本地)                    GitHub 环境
┌─────────────────┐              ┌─────────────────┐
│  Next.js 开发.   │  Git Push   │  GitHub 仓库    │
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

### 4.1 GitHub Actions 缓存机制深度解析

#### Key vs Restore-Keys 的区别

```yaml
- name: Setup npm cache
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

**两个配置的作用：**

1. **`key` (精确缓存键)**
   - 🎯 **用途：** 创建精确的缓存匹配
   - 🔧 **机制：** 基于操作系统 + package-lock.json 哈希值
   - ⚡ **效果：** 只有当依赖完全相同时才命中缓存
   - 📝 **示例：** `ubuntu-latest-node-abc123def456`

2. **`restore-keys` (缓存回退键)**
   - 🔄 **用途：** 提供缓存回退机制
   - 🔧 **机制：** 当精确匹配失败时使用前缀匹配
   - ⚡ **效果：** 即使依赖有变化也能复用部分缓存
   - 📝 **示例：** `ubuntu-latest-node-`

#### 实际工作场景

**场景 1：依赖未变化**
```
📦 之前的 package-lock.json 哈希: abc123def456
📦 当前的 package-lock.json 哈希: abc123def456
🎯 key 匹配: ubuntu-latest-node-abc123def456
✅ 缓存命中！直接使用完整缓存
⏱️ 构建时间: ~30秒
```

**场景 2：依赖有变化**
```
📦 之前的 package-lock.json 哈希: abc123def456
📦 当前的 package-lock.json 哈希: xyz789uvw012
❌ key 不匹配: ubuntu-latest-node-xyz789uvw012
🔄 restore-keys 匹配: ubuntu-latest-node-
✅ 部分缓存命中！复用系统缓存
⏱️ 构建时间: ~1-2分钟 (比全新安装快)
```

**场景 3：全新构建**
```
📦 之前没有任何缓存
❌ key 不匹配
❌ restore-keys 不匹配
❌ 缓存完全未命中
⏱️ 构建时间: ~3-5分钟 (全新安装)
```

#### 缓存的生命周期

```
缓存存储结构:
GitHub Actions Cache
├── ubuntu-latest-node-abc123def456  (完整缓存)
├── ubuntu-latest-node-xyz789uvw012  (完整缓存)
└── ubuntu-latest-node-             (前缀缓存 - 虚拟)
```

**缓存策略：**
- 🕐 **保存时间：** 7 天自动过期
- 📊 **存储限制：** 每个仓库 5GB
- 🔄 **更新机制：** 新缓存会替换同名旧缓存
- 🧹 **自动清理：** GitHub 自动清理过期缓存

#### 最佳实践建议

1. **使用精确的文件哈希**
   ```yaml
   key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
   # ✅ 好的做法 - 确保依赖一致性
   ```

2. **提供合理的回退键**
   ```yaml
   restore-keys: |
     ${{ runner.os }}-node-
   # ✅ 好的做法 - 提高缓存命中率
   ```

3. **避免过于宽泛的回退**
   ```yaml
   restore-keys: |
     ${{ runner.os }}-  # ❌ 不推荐 - 可能导致版本冲突
     node-              # ❌ 不推荐 - 跨系统缓存可能有问题
   ```

4. **缓存调试技巧**
   ```yaml
   - name: Cache debug
     run: |
       echo "Cache key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}"
       npm config get cache
       ls -la ~/.npm || echo "No cache found"
   ```

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

### 6.1 GitHub Pages Artifact 系统技术细节

#### 两阶段部署流程

GitHub Pages 部署实际上是一个两阶段的上传和部署过程：

```
阶段 1: Upload Artifact                    阶段 2: Deploy to Pages
┌─────────────────┐                     ┌─────────────────┐
│ 1. 打包 out/    │                     │ 1. 获取 artifact │
│    目录         │                     │ 2. 部署请求      │
│                 │                     │ 3. 等待部署完成  │
│ 2. 压缩为 zip   │ ──────────────────► │ 4. 更新 CDN     │
│                 │   GitHub API      │                 │
│ 3. 上传到存储    │                     │                 │
└─────────────────┘                     └─────────────────┘
```

#### Upload-Pages-Artifact 工作原理

```yaml
- name: Upload Pages artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: ./out  # 上传 out 目录
```

**内部发生了什么：**

1. **📦 打包阶段**
   ```
   out/ 目录结构:
   ├── index.html                    (4KB)
   ├── posts/hello-world/index.html  (8KB)
   ├── _next/static/css/main.css     (15KB)
   ├── favicon.ico                   (16KB)
   └── ...                          (其他文件)
   ↓
   压缩为 artifact.zip (压缩率: ~60%)
   ```

2. **🔐 OIDC 认证**
   ```bash
   # GitHub Actions 自动生成临时令牌
   OIDC_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   # 令牌特点：
   # - 1小时自动过期
   # - 仅限当前仓库使用
   # - 仅限 Pages 部署权限
   ```

3. **☁️ 上传到 GitHub 存储**
   ```bash
   POST https://api.github.com/repos/{owner}/{repo}/pages/artifacts
   Headers:
     Authorization: Bearer {OIDC_TOKEN}
     Content-Type: application/zip
     Content-Length: {file_size}
   Body:
     Binary ZIP data
   ```

#### Deploy-Pages 机制解析

```yaml
- name: Deploy to GitHub Pages
  uses: actions/deploy-pages@v4
```

**详细工作流程：**

1. **🎯 获取最新 Artifact**
   ```bash
   GET https://api.github.com/repos/{owner}/{repo}/pages/artifacts
   Response:
   {
     "artifacts": [
       {
         "id": 12345,
         "name": "github-pages",
         "size_in_bytes": 2048576,
         "created_at": "2024-01-01T12:00:00Z"
       }
     ]
   }
   ```

2. **🚀 触发 Pages 部署**
   ```bash
   POST https://api.github.com/repos/{owner}/{repo}/pages/deployments
   Headers:
     Authorization: Bearer {OIDC_TOKEN}
   Body:
   {
     "artifact_id": 12345,
     "oidc_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```

3. **📡 GitHub Pages 服务处理**
   ```
   GitHub Pages 内部系统:
   ┌─────────────────┐
   │ 1. 接收部署请求  │
   │ 2. 下载 artifact │
   │ 3. 验证文件完整性 │
   │ 4. 解压到 CDN    │
   │ 5. 更新路由表    │
   │ 6. 清理旧文件    │
   │ 7. 激活新版本    │
   └─────────────────┘
   ```

#### Artifact 生命周期管理

**创建阶段：**
```
状态流转: pending → uploaded → processing → ready
时间: 通常 30-60 秒
```

**部署阶段：**
```
状态流转: requested → building → deployed → failed
时间: 通常 1-3 分钟
```

**清理阶段：**
```
自动清理策略:
- 成功的 artifact: 保留 7 天
- 失败的 artifact: 立即清理
- 最大存储: 每仓库 10GB
```

#### 安全机制详解

**OIDC (OpenID Connect) 工作流程：**

```
GitHub Actions Runner                  GitHub OIDC Provider
        │                                  │
        │ 1. 请求临时令牌                    │
        ├─────────────────────────────────►│
        │                                  │ 2. 验证身份
        │                                  │    - 检查仓库权限
        │                                  │    - 验证工作流
        │                                  │    - 生成令牌
        │                                  │
        │ 3. 返回 OIDC 令牌                 │
        │ ◄─────────────────────────────────┤
        │                                  │
        │ 4. 使用令牌访问 API                │
        ├─────────────────────────────────► GitHub API
```

**权限最小化原则：**
```yaml
permissions:
  pages: write      # 只能写入 Pages
  id-token: write   # 只能请求 OIDC 令牌
  contents: read    # 只能读取代码
  # ❌ 不需要的权限不授予
```

#### 故障排查技巧

**1. 上传失败调试**
```yaml
- name: Debug upload
  run: |
    echo "Directory contents:"
    find out/ -type f | head -20
    echo "Total size:"
    du -sh out/
    echo "File count:"
    find out/ -type f | wc -l
```

**2. 部署状态检查**
```yaml
- name: Check deployment status
  run: |
    curl -H "Authorization: token ${{ github.token }}" \
         https://api.github.com/repos/${{ github.repository }}/pages/deployments
```

**3. 常见错误和解决方案**
- **Artifact 过大** (>10GB): 优化构建输出，移除不必要的文件
- **权限不足**: 检查 Actions permissions 设置
- **部署超时** (>30分钟): 优化构建时间或检查网络连接
- **文件路径问题**: 确保使用相对路径和正确的文件名

这个两阶段的 artifact 系统确保了部署的可靠性和安全性，同时提供了详细的日志和状态追踪能力。

### 6.2 部署输出变量详解

#### `${{ steps.deployment.outputs.page_url }}` 是什么？

在我们的 GitHub Actions 配置中，有一个关键配置：

```yaml
deploy:
  environment:
    name: github-pages
    url: ${{ steps.deployment.outputs.page_url }}  # ← 这行代码
  runs-on: ubuntu-latest
  needs: build
  steps:
  - name: Deploy to GitHub Pages
    id: deployment  # ← 定义步骤 ID
    uses: actions/deploy-pages@v4
```

#### 工作原理详解

**步骤1：定义步骤 ID**
```yaml
- name: Deploy to GitHub Pages
  id: deployment  # 给这个步骤命名为 "deployment"
  uses: actions/deploy-pages@v4
```

**步骤2：deploy-pages 动作返回输出**
```yaml
# deploy-pages@v4 执行完成后，自动生成输出：
outputs:
  page_url: "https://minmaxflow.github.io"
  status: "deployed"
  deployment_id: "12345"
  preview_url: "https://pr-123.minmaxflow.github.io"  # PR 预览
```

**步骤3：环境变量设置**
```yaml
environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}  # 引用步骤输出
```

#### 输出变量的具体内容

**成功部署时的输出：**
```bash
page_url: "https://minmaxflow.github.io"
status: "deployed"
deployment_id: "67890"
```

**不同仓库类型的 URL 格式：**

1. **用户/组织仓库 (username.github.io)**
   ```bash
   page_url: "https://username.github.io"
   ```

2. **项目仓库**
   ```bash
   page_url: "https://username.github.io/repository-name"
   ```

3. **自定义域名**
   ```bash
   page_url: "https://my-custom-domain.com"
   ```

4. **PR 预览**
   ```bash
   preview_url: "https://pr-123.username.github.io"
   ```

#### 环境配置的作用

**在 GitHub 界面中的效果：**

1. **Actions 页面显示**
   ```
   ✅ deploy job
   Environment: github-pages
   URL: https://minmaxflow.github.io  ← 可点击链接
   ```

2. **仓库主页显示**
   ```
   📄 Pages
   ✅ Your site is live at https://minmaxflow.github.io
   ```

3. **环境保护规则**
   ```yaml
   environment:
     name: github-pages
     url: ${{ steps.deployment.outputs.page_url }}
     protection_rules:
       - wait_timer: 5  # 等待 5 分钟
       - reviewers: ["@maintainer"]  # 需要审核
   ```

#### 实际使用示例

**1. 基础用法**
```yaml
- name: Deploy to GitHub Pages
  id: deployment
  uses: actions/deploy-pages@v4

- name: Display URL
  run: |
    echo "🚀 Site deployed to: ${{ steps.deployment.outputs.page_url }}"
```

**2. 发送通知**
```yaml
- name: Notify Slack
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    text: "🎉 Deployment successful! ${{ steps.deployment.outputs.page_url }}"
```

**3. 更新 README**
```yaml
- name: Update deployment badge
  run: |
    sed -i "s|https://.*.github.io|${{ steps.deployment.outputs.page_url }}|" README.md
```

**4. 部署摘要**
```yaml
- name: Deployment summary
  run: |
    echo "## 🚀 Deployment Complete" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "✅ **Status**: ${{ steps.deployment.outputs.status }}" >> $GITHUB_STEP_SUMMARY
    echo "🌐 **URL**: [${{ steps.deployment.outputs.page_url }}](${{ steps.deployment.outputs.page_url }})" >> $GITHUB_STEP_SUMMARY
    echo "🆔 **Deployment ID**: ${{ steps.deployment.outputs.deployment_id }}" >> $GITHUB_STEP_SUMMARY
```

#### 所有可用的输出变量

**deploy-pages@v4 提供的输出：**

```yaml
outputs:
  page_url: "https://username.github.io"        # 最终访问 URL
  preview_url: "https://pr-123.username.github.io"  # PR 预览 URL (仅 PR)
  status: "deployed"                           # 部署状态
  deployment_id: "12345"                       # 部署 ID
  duration: "120s"                             # 部署耗时
```

**部署状态的可能值：**
- `"deployed"` - 部署成功
- `"failed"` - 部署失败
- `"building"` - 正在构建
- `"pending"` - 等待中

#### 错误处理和调试

**1. 检查输出变量**
```yaml
- name: Debug deployment outputs
  run: |
    echo "Page URL: ${{ steps.deployment.outputs.page_url }}"
    echo "Status: ${{ steps.deployment.outputs.status }}"
    echo "Deployment ID: ${{ steps.deployment.outputs.deployment_id }}"

    # 检查变量是否存在
    if [[ -z "${{ steps.deployment.outputs.page_url }}" ]]; then
      echo "❌ page_url is empty"
      exit 1
    fi
```

**2. 失败时的处理**
```yaml
- name: Handle deployment failure
  if: failure()
  run: |
    echo "❌ Deployment failed"
    echo "Check the deployment logs for details"
    echo "Page URL: ${{ steps.deployment.outputs.page_url || 'N/A' }}"
```

#### 最佳实践

1. **总是设置步骤 ID**
   ```yaml
   - name: Deploy to GitHub Pages
     id: deployment  # ✅ 必须设置
     uses: actions/deploy-pages@v4
   ```

2. **验证输出变量**
   ```yaml
   - name: Validate deployment
   run: |
     if [[ "${{ steps.deployment.outputs.status }}" == "deployed" ]]; then
       echo "✅ Deployment successful"
     else
       echo "❌ Deployment failed"
       exit 1
     fi
   ```

3. **使用条件执行**
   ```yaml
   - name: Post-deployment tasks
   if: steps.deployment.outputs.status == 'deployed'
   run: |
     echo "Running post-deployment tasks..."
   ```

这些输出变量让部署过程更加透明和可操作，你可以根据部署状态执行不同的操作，或者将部署信息发送到其他系统。

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

### 高级故障排除

#### 1. GitHub Actions 调试技巧

**启用调试模式：**
```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

**缓存问题调试：**
```yaml
- name: Debug cache
  run: |
    echo "Cache key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}"
    echo "Package-lock.json hash:"
    sha256sum package-lock.json
    echo "NPM cache location:"
    npm config get cache
    echo "Cache size:"
    du -sh ~/.npm || echo "No npm cache"
```

**依赖安装调试：**
```yaml
- name: Debug dependencies
  run: |
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Package-lock.json exists: $(test -f package-lock.json && echo 'Yes' || echo 'No')"
    echo "Node modules size:"
    du -sh node_modules || echo "No node_modules"
```

#### 2. Next.js 构建问题

**静态导出验证：**
```yaml
- name: Verify static export
  run: |
    echo "Checking out directory structure:"
    find out/ -type f | head -20
    echo "Total files:"
    find out/ -type f | wc -l
    echo "Total size:"
    du -sh out/
    echo "Checking for required files:"
    test -f out/index.html && echo "✅ index.html found" || echo "❌ index.html missing"
    test -d out/_next && echo "✅ _next directory found" || echo "❌ _next directory missing"
```

**MDX 处理调试：**
```yaml
- name: Debug MDX processing
  run: |
    echo "Checking MDX files:"
    find content/posts -name "*.mdx" | head -10
    echo "Sample MDX content:"
    head -20 content/posts/*.mdx | head -20
```

#### 3. Artifact 和部署问题

**上传前验证：**
```yaml
- name: Pre-upload validation
  run: |
    echo "Validating out directory:"
    if [[ ! -d out/ ]]; then
      echo "❌ out directory does not exist"
      exit 1
    fi

    if [[ -z "$(ls -A out/)" ]]; then
      echo "❌ out directory is empty"
      exit 1
    fi

    echo "✅ out directory is valid"
    echo "Contents:"
    ls -la out/
```

**部署状态检查：**
```yaml
- name: Check deployment status
  run: |
    echo "Fetching deployment status..."
    response=$(curl -s -H "Authorization: token ${{ github.token }}" \
                    "https://api.github.com/repos/${{ github.repository }}/pages/deployments")
    echo "Response: $response"

    # 提取最新部署状态
    status=$(echo "$response" | jq -r '.[0].status // "unknown"')
    echo "Latest deployment status: $status"
```

#### 4. GitHub Pages 配置问题

**DNS 和域名检查：**
```yaml
- name: Check DNS configuration
  if: contains(steps.deployment.outputs.page_url, 'github.io') == false
  run: |
    domain=$(echo "${{ steps.deployment.outputs.page_url }}" | sed 's|https://||')
    echo "Checking DNS for custom domain: $domain"
    dig +short $domain || echo "DNS lookup failed"
```

**HTTPS 证书检查：**
```yaml
- name: Check SSL certificate
  run: |
    domain=$(echo "${{ steps.deployment.outputs.page_url }}" | sed 's|https://||')
    echo "Checking SSL certificate for: $domain"
    echo | timeout 10 openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates || echo "SSL check failed"
```

#### 5. 性能问题诊断

**构建时间分析：**
```yaml
- name: Analyze build performance
  run: |
    echo "Build time analysis:"
    echo "Node modules installation time: $(npm list --depth=0 2>&1 | head -1)"
    echo "Next.js build time will be measured next..."
```

**文件大小优化：**
```yaml
- name: Analyze bundle size
  run: |
    echo "Bundle size analysis:"
    if [[ -d out/_next/static ]]; then
      find out/_next/static -name "*.js" -exec ls -lh {} \; | sort -k5 -hr | head -10
      echo "Total JS bundle size:"
      find out/_next/static -name "*.js" -exec du -ch {} + | tail -1
    fi

    echo "Total site size:"
    du -sh out/
```

#### 6. 常见错误代码和解决方案

| 错误代码 | 描述 | 解决方案 |
|---------|------|----------|
| `EPERM: operation not permitted` | 权限不足 | 检查 Actions permissions 设置 |
| `ENOENT: no such file or directory` | 文件不存在 | 验证构建输出路径 |
| `ETIMEDOUT` | 超时 | 优化构建时间或增加 timeout |
| `ENOSPC: no space left on device` | 磁盘空间不足 | 清理不必要的文件 |
| `ECONNRESET` | 连接重置 | 检查网络配置 |

#### 7. 监控和日志

**实时监控部署：**
```yaml
- name: Monitor deployment
  run: |
    echo "Monitoring deployment progress..."
    for i in {1..10}; do
      status=$(curl -s -H "Authorization: token ${{ github.token }}" \
                    "https://api.github.com/repos/${{ github.repository }}/pages/deployments" | \
                    jq -r '.[0].status // "unknown"')
      echo "Check $i: Status = $status"

      if [[ "$status" == "deployed" ]]; then
        echo "✅ Deployment successful!"
        break
      elif [[ "$status" == "failed" ]]; then
        echo "❌ Deployment failed!"
        exit 1
      fi

      sleep 30
    done
```

**日志收集和报告：**
```yaml
- name: Collect deployment logs
  if: always()
  run: |
    echo "=== Deployment Summary ===" >> $GITHUB_STEP_SUMMARY
    echo "**Status:** ${{ job.status }}" >> $GITHUB_STEP_SUMMARY
    echo "**URL:** ${{ steps.deployment.outputs.page_url || 'N/A' }}" >> $GITHUB_STEP_SUMMARY
    echo "**Duration:** ${{ job.status }}" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY

    if [[ "${{ job.status }}" == "failure" ]]; then
      echo "❌ Deployment failed. Check the logs above for details." >> $GITHUB_STEP_SUMMARY
    fi
```

这些高级故障排除技巧可以帮助你快速定位和解决部署过程中的各种问题。记住，大多数问题都可以通过查看详细的 Actions 日志来找到根本原因。

## 📝 总结

这个部署流程实现了：

1. **🔄 自动化：** 代码推送后自动部署
2. **⚡ 高性能：** 静态文件 + CDN 加速
3. **🛡️ 可靠性：** GitHub 官方托管
4. **💰 免费：** 完全免费的部署方案
5. **🚀 现代化：** 使用最新的 Web 技术

整个流程从代码编写到用户访问，完全自动化，只需要 `git push` 一个命令就能触发完整的部署流程。