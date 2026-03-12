# 📦 Build Artifacts

This folder contains production build packages and deployment archives.

## 📋 File Format

Build artifacts are created by the deployment scripts in `/scripts/deploy/` directory.

**Files in this folder:**
- `hostinger-deployment.zip` - Latest production build ready for deployment
- `hostinger-deployment-latest.zip` - Previous version backup

## 🚀 How to Use

1. **Create a new build artifact:**
   ```bash
   .\scripts\deploy\deploy-hostinger.bat
   ```

2. **Extract and deploy:**
   - Extract the `.zip` file to a temporary folder
   - Login to Hostinger File Manager (hPanel)
   - Upload all files to `public_html/`
   - Verify deployment at https://aayushmishra.tech

## 📊 File Size

- Typical size: 15-30 MB (compressed)
- Contains: HTML, CSS, JS (minified & optimized), fonts, icons, assets

## 🗑️ Cleanup

Older `.zip` files can be safely deleted once deployed:
- Keep only the latest version for rollback purposes
- Delete if storage space is needed

---

**Created by:** Deployment automation scripts  
**Location:** Generated after running `npm run build` + deployment tool
