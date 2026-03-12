# 📜 Scripts

This folder contains all executable scripts for the project.

## 📁 Subdirectories

### `/deploy/`
Deployment scripts for building and packaging your portfolio:
- **deploy-hostinger.bat** - Main deployment script for Hostinger
- **deploy-now.bat** - Alternative deployment script
- **deploy-manual.bat** - Manual deployment helper
- **test-build.bat** - Test build verification
- **deploy-*.ps1** - PowerShell versions of deployment scripts

**Usage:**
```bash
# From root directory
.\scripts\deploy\deploy-hostinger.bat
```

### `/automation/`
Automation and data fetching scripts:
- **git_data_fetcher.mjs** - Fetches GitHub repository data (called via `npm run fetch-github-data`)
- **auto-refresh.mjs** - Auto-refreshes data periodically

**Usage:**
```bash
npm run fetch-github-data
npm run auto-refresh
```

---

## 🚀 Quick Commands

From the project root:

```bash
# Deploy to Hostinger
npm run build  # First, build the project
.\scripts\deploy\deploy-hostinger.bat

# Fetch GitHub data
npm run fetch-github-data

# Auto-refresh data
npm run auto-refresh
```

---

**Note:** Requires Node.js and npm installed. See root `README.md` for setup instructions.
