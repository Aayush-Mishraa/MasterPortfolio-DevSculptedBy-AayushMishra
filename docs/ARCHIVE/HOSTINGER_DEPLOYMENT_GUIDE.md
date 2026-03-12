# 🚀 Hostinger Deployment Guide for Your Portfolio

## 📋 Prerequisites
- Hostinger hosting account
- Domain name configured
- FTP access (optional but recommended)

## 🎯 Method 1: Using the Automated Batch Script (Recommended)

### Step 1: Run the Deployment Script
1. **Double-click** `deploy-hostinger.bat` in your project folder
2. The script will automatically:
   - Install dependencies
   - Build production version
   - Create `hostinger-deployment.zip`

### Step 2: Upload to Hostinger
1. **Login** to your Hostinger account (hPanel)
2. Go to **File Manager**
3. Navigate to `public_html` folder
4. **Delete** any existing files in public_html (if this is a new deployment)
5. **Extract** `hostinger-deployment.zip` on your computer
6. **Upload** all extracted files to `public_html`
7. Ensure `index.html` is in the root of `public_html`

## 🎯 Method 2: Manual FTP Upload

### Step 1: Build the Project
```bash
npm install
npm run build
```

### Step 2: FTP Upload
1. Use an FTP client (FileZilla, WinSCP, etc.)
2. Connect using your Hostinger FTP credentials:
   - **Host**: Your domain or IP
   - **Username**: Your FTP username
   - **Password**: Your FTP password
   - **Port**: 21 (or 22 for SFTP)
3. Upload contents of `build` folder to `public_html`

## 🎯 Method 3: Using Hostinger's Git Deploy (Advanced)

### If you have Git access on Hostinger:
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Auto-deploy on push to main branch

## ⚙️ Important Configuration for React Apps

### Update package.json (CONFIGURED FOR YOUR DOMAIN)
Your current homepage setting:
```json
"homepage": "https://aayushmishra.tech"
```

✅ **Already configured for your domain: aayushmishra.tech**

### For Subdirectory Deployment (if needed)
If deploying to a subdirectory (e.g., aayushmishra.tech/portfolio):
```json
"homepage": "https://aayushmishra.tech/portfolio"
```

## 🔧 Troubleshooting

### Problem: White Screen After Upload
**Solution**: Check these files are in public_html root:
- `index.html` ✅
- `static/` folder ✅
- `asset-manifest.json` ✅

### Problem: 404 Errors on Page Refresh
**Solution**: Create `.htaccess` file in public_html:
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QR,L]
```

### Problem: CSS/JS Files Not Loading
**Solution**: Verify correct homepage URL in package.json

## 📁 File Structure After Upload
```
public_html/
├── index.html
├── asset-manifest.json
├── manifest.json
├── robots.txt
├── static/
│   ├── css/
│   ├── js/
│   └── media/
└── icons/
```

## 🎉 Final Steps
1. **Test your website** at https://aayushmishra.tech
2. **Check mobile responsiveness**
3. **Verify all pages work** (if using React Router)
4. **Test contact forms** and external links

## 📞 Support
- **Hostinger Help**: Use their live chat support
- **Common Issues**: Check Hostinger knowledge base
- **React Deployment**: Refer to Create React App deployment docs

---
**Your portfolio will be live at https://aayushmishra.tech! 🚀**
