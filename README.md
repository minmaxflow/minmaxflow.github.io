# Minimal Blog

A minimal, fast blog built with Next.js, MDX, and Tailwind CSS. Designed for GitHub Pages deployment.

## Features

- 🚀 **Static Generation** - Fast loading with pre-built HTML
- 📝 **MDX Support** - Write posts in Markdown with JSX support
- 🎨 **Minimal Design** - Clean, distraction-free reading experience
- 📱 **Responsive** - Works perfectly on all devices
- ⚡ **Fast** - Optimized for performance
- 🔍 **SEO Friendly** - Built with semantic HTML and meta tags

## Tech Stack

- **Next.js** - React framework with static export
- **MDX** - Markdown with JSX components
- **Tailwind CSS** - Utility-first CSS framework
- **GitHub Pages** - Free static hosting

## Getting Started

1. **Clone and install:**
   ```bash
   git clone <your-repo>
   cd <your-repo>
   npm install
   ```

2. **Run locally:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## Writing Posts

Posts are stored in `content/posts/` as `.mdx` files with frontmatter:

```mdx
---
title: "Your Post Title"
date: "2024-01-01"
excerpt: "Brief description of the post"
---

# Your Post Content

Write your post content in Markdown. You can use all standard Markdown features.
```

## Deployment

This blog is configured for automatic deployment to GitHub Pages via GitHub Actions:

1. Push to the `main` branch
2. GitHub Actions will build and deploy automatically
3. Your blog will be available at `https://<username>.github.io/<repository>`

## Customization

### Styling
- Edit `src/app/globals.css` for custom styles
- Modify Tailwind config in `tailwind.config.ts`
- Components are in `src/app/`

### Content
- Add posts in `content/posts/`
- Edit homepage in `src/app/page.tsx`
- Modify layout in `src/app/layout.tsx`

### Configuration
- Update `next.config.ts` for build settings
- Modify package.json scripts as needed
- Adjust GitHub Actions in `.github/workflows/deploy.yml`

## License

Feel free to use this as a template for your own blog!
