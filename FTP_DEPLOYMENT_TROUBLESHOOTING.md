# 🔧 Hostinger FTP Deployment Troubleshooting Guide

## Issue: FTP Connection Error 425

**Error Message:** `425 Unable to build data connection: Operation not permitted`

### 🔍 Problem Analysis
This error occurs during large file uploads to Hostinger's FTP server, typically due to:
1. **Connection Timeout**: FTP server terminates connection during large transfers
2. **Passive Mode Issues**: FTP passive mode configuration conflicts
3. **SSL/TLS Handshake Problems**: FTPS security negotiations
4. **Server Resource Limits**: Hostinger server temporary resource constraints

### ✅ Solutions Implemented

#### 1. Enhanced FTP Configuration
```yaml
# Updated deploy-ftp.yml with improved settings:
security: loose          # Relaxed SSL verification
timeout: 600000         # 10-minute timeout (vs default 40s)
retry: 3               # Automatic retry on failure
```

#### 2. Alternative Deployment Method
Created `deploy-ftp-backup.yml` using LFTP:
- More reliable FTP client
- Better error handling
- Automatic reconnection
- Optimized for large file transfers

### 🚀 Deployment Options

#### Option 1: Re-run Main Deployment
The main workflow has been updated with better FTP settings. Try triggering it again:
```bash
git add .
git commit -m "🔧 Fix FTP deployment configuration"
git push origin main
```

#### Option 2: Use Backup Deployment
If main deployment continues to fail, use the backup method:
1. Go to GitHub Actions tab
2. Select "Backup Deploy to Hostinger"
3. Click "Run workflow"
4. Select "force_deploy: true" if needed

### 📊 Current Deployment Status

**Files Successfully Uploaded:** 126/127 ✅
**Failed File:** `sw-enhanced.js` (empty service worker file)
**Upload Progress:** ~99% complete

### 🔄 Recovery Steps

1. **Immediate Fix**: The deployment was 99% successful. Only one empty file failed.
2. **Site Status**: Your portfolio should be fully functional at https://aayushmishra.tech
3. **Missing File**: `sw-enhanced.js` is a service worker file (0 bytes) - not critical for functionality

### 🛠️ Manual Verification Steps

```bash
# Check if site is live
curl -I https://aayushmishra.tech

# Verify main files are deployed
curl -s https://aayushmishra.tech/index.html | grep -o '<title>.*</title>'
```

### 📋 Hostinger FTP Settings Verification

Ensure your GitHub Secrets are correct:
- `FTP_HOST`: `217.21.87.230` ✅
- `FTP_USERNAME`: `u778141320` ✅
- `FTP_PASSWORD`: [Your account password] ✅
- `FTP_PORT`: `21` ✅
- `FTP_SERVER_DIR`: `/public_html/` ✅
- `SITE_URL`: `https://aayushmishra.tech` ✅

### 🎯 Next Steps

1. **Test Current Site**: Visit https://aayushmishra.tech to verify it's working
2. **Re-run Deployment**: If needed, the improved configuration should work
3. **Monitor Logs**: Check GitHub Actions logs for any remaining issues

### 💡 Prevention Tips

- **Smaller Builds**: Consider code splitting for large applications
- **Build Optimization**: Remove unnecessary files from build output
- **Gradual Updates**: For major changes, deploy incrementally

---

**Status**: 🟢 Portfolio should be live and functional
**Action Required**: Verify site accessibility, re-run deployment if needed
