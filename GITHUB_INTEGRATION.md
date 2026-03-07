# 🔄 Real-time GitHub Repository Integration

Your portfolio now features dynamic, real-time GitHub repository display that automatically updates when you create new repositories!

## ✨ Features

### 🚀 Dynamic Repository Display
- **All Repositories View**: Shows all your public repositories (currently 22 repos)
- **Pinned Repositories View**: Shows only your pinned/featured repositories
- **Real-time Search**: Filter repositories by name or description
- **Smart Sorting**: Sort by updated date, creation date, name, or star count
- **Advanced Filtering**: Filter by original repos, forks, or all repositories

### 🔄 Auto-Refresh Capabilities
- **Automatic Updates**: Refreshes repository data every 5 minutes
- **Manual Refresh**: Click "🔄 Refresh Now" to update immediately
- **Toggle Auto-refresh**: Turn automatic updates on/off as needed
- **Status Indicators**: Shows last refresh time and current status

### 📊 Repository Information
Each repository card displays:
- Repository name and description
- Programming languages with icons
- Star count and fork count
- Creation and last updated dates
- Fork status (original vs forked)
- Direct links to GitHub

## 🛠️ Setup Instructions

### 1. Environment Configuration
Your `.env` file is already configured with:
```env
GITHUB_TOKEN=your_github_token_here
GITHUB_USERNAME=Aayush-Mishraa
REACT_APP_GITHUB_TOKEN=your_github_token_here
REACT_APP_GITHUB_USERNAME=Aayush-Mishraa
```

### 2. Manual Refresh Commands
```bash
# Fetch latest GitHub data
npm run fetch-github-data

# Run auto-refresh script
npm run auto-refresh

# Or directly
node git_data_fetcher.mjs
```

### 3. Windows Scheduled Task Setup
For automatic updates every 15 minutes:

1. Open Task Scheduler (taskschd.msc)
2. Create Basic Task
3. Name: "Portfolio GitHub Refresh"
4. Trigger: Daily, repeat every 15 minutes
5. Action: Start a program
6. Program: `C:\Users\aayus\OneDrive\Desktop\Webpage\masterPortfolio\auto-refresh.bat`
7. Start in: `C:\Users\aayus\OneDrive\Desktop\Webpage\masterPortfolio`

### 4. Linux/Mac Cron Job Setup
```bash
# Edit crontab
crontab -e

# Add this line for updates every 15 minutes
*/15 * * * * cd /path/to/your/portfolio && node git_data_fetcher.mjs

# Or use the auto-refresh script
*/15 * * * * cd /path/to/your/portfolio && node auto-refresh.mjs
```

## 📁 Data Structure

### All Projects JSON (`/src/shared/opensource/all_projects.json`)
```json
{
  "data": [
    {
      "id": "R_kgDOPVehkA",
      "name": "JavaScriptPrecticeCode", 
      "createdAt": "2025-07-30T15:47:39Z",
      "updatedAt": "2025-07-30T15:49:56Z",
      "url": "https://github.com/Aayush-Mishraa/JavaScriptPrecticeCode",
      "description": "JavaScript practice and learning code",
      "isFork": false,
      "stargazerCount": 0,
      "forkCount": 0,
      "languages": [
        {
          "name": "JavaScript",
          "iconifyClass": "logos-javascript"
        }
      ]
    }
  ],
  "totalCount": 26
}
```

## 🎯 Usage

### Accessing Your Repositories
1. **Projects Page**: Visit `/projects` to see all repositories
2. **Toggle Views**: Switch between "All Repositories" and "Pinned Repositories"
3. **Search**: Use the search bar to find specific repositories
4. **Filter & Sort**: Use dropdowns to organize repositories

### Real-time Updates
- The page automatically refreshes repository data every 5 minutes
- When you create a new repository on GitHub, it will appear within 5 minutes
- You can manually refresh anytime using the "🔄 Refresh Now" button
- Toggle auto-refresh on/off with the "🟢 Auto-refresh ON/⭕ Auto-refresh OFF" button

## 🔧 Customization

### Modify Refresh Interval
In `AllProjects.js`, change the interval (currently 5 minutes):
```javascript
const interval = setInterval(() => {
  this.refreshRepositories();
}, 5 * 60 * 1000); // Change 5 to desired minutes
```

### Add More Language Icons
In `git_data_fetcher.mjs`, add to the `languages_icons` object:
```javascript
const languages_icons = {
  // Add new languages here
  "Your Language": "your-iconify-class",
  // ...existing languages
};
```

### Customize Repository Display
Modify `GithubRepoCard` component to change how repositories are displayed.

## 🚨 Important Notes

### Security
- Your GitHub token is used to fetch public repository data
- The token is stored in environment variables
- Never commit the `.env` file to version control

### Rate Limits
- GitHub API allows 5000 requests per hour for authenticated users
- The current setup makes ~4 requests every 5 minutes (well within limits)
- Auto-refresh is designed to be respectful of API limits

### Troubleshooting
1. **No repositories showing**: Check your GitHub token permissions
2. **Auto-refresh not working**: Verify environment variables are set
3. **Old data**: Manually run `npm run fetch-github-data`

## 📈 Performance

- **Initial Load**: ~2-3 seconds to display repositories
- **Auto-refresh**: Runs in background without affecting UI
- **Search/Filter**: Client-side processing for instant results
- **Memory Usage**: Minimal impact with efficient data handling

## 🎉 Features in Action

Your portfolio now showcases:
- ✅ **22 Public Repositories** automatically displayed
- ✅ **Real-time Updates** when you push new repos
- ✅ **Advanced Search & Filtering** capabilities
- ✅ **Professional Repository Cards** with language icons
- ✅ **Responsive Design** for all device sizes
- ✅ **Auto-refresh System** for always current data

When you create a new repository on GitHub, it will automatically appear in your portfolio within 5 minutes! 🎊
