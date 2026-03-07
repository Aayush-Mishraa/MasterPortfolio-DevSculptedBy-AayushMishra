# 🚀 MasterPortfolio Quick Customization Checklist

## 📋 Available Sections in Portfolio
✔️ **Summary and About me**  
✔️ **Skills**  
✔️ **Open Source Projects Connected with Github**  
✔️ **Experience**  
✔️ **Certifications** 🏆  
✔️ **Blogs**  
✔️ **Education**  
✔️ **Contact me**

## ✅ Essential Customizations (Do First)

### 1. Basic Project Setup
- [ ] **Update `package.json`**
  - [ ] Change `"name"` field to your project name
  - [ ] Update `"homepage"` to `https://yourusername.github.io` ⚠️ **Must include `https://`** (fonts won't load without it)

### 2. Personal Information (`src/portfolio.js`)
- [ ] **Settings Section**
  ```javascript
  const settings = {
    isSplash: true, // Change to false if you don't want splash screen
  };
  ```

- [ ] **SEO Section**
  ```javascript
  const seo = {
    title: "Your Name's Portfolio",
    description: "Your professional description...",
    og: {
      title: "Your Portfolio",
      type: "website", 
      url: "https://yourdomain.com/",
    },
  };
  ```

- [ ] **Greeting Section**
  ```javascript
  const greeting = {
    title: "Your Full Name",
    logo_name: "YourName", 
    nickname: "your_nickname",
    subTitle: "Your professional tagline...",
    resumeLink: "https://your-resume-link.pdf",
    portfolio_repository: "https://github.com/username/repo",
    githubProfile: "https://github.com/username",
  };
  ```

### 3. Social Media Links
- [ ] **Update each social media object in `socialMediaLinks` array**
  ```javascript
  {
    name: "GitHub",
    link: "https://github.com/YOURUSERNAME", // ← Change this
    fontAwesomeIcon: "fa-github",
    backgroundColor: "#181717",
  }
  ```
  
**Required Updates:**
- [ ] GitHub profile link
- [ ] LinkedIn profile link  
- [ ] Email address
- [ ] Twitter profile (optional)
- [ ] Instagram profile (optional)
- [ ] Facebook profile (optional)
- [ ] YouTube channel (optional)

---

## 🛠️ Skills & Technical Information

### 4. Skills Section (`skills` object)
- [ ] **Update skill categories:**
  - [ ] Data Science & AI
  - [ ] Full Stack Development  
  - [ ] Cloud Infra-Architecture
  - [ ] UI/UX Design

- [ ] **For each skill category:**
  - [ ] Update `title`
  - [ ] Update `skills` array (bullet points)
  - [ ] Update `softwareSkills` array
    ```javascript
    {
      skillName: "React",
      fontAwesomeClassname: "simple-icons:react", // Find icons at icon-sets.iconify.design
      style: {
        color: "#61DAFB",
      },
    }
    ```

**🎨 How to add new skill icons:**
1. Visit: https://icon-sets.iconify.design/
2. Search for your skill/technology
3. Select the icon of your choice
4. Copy the text beside **"Selected Icon"**
5. Replace it with `fontAwesomeClassname` of that particular softwareSkill

**🖼️ How to use custom images instead of Iconify Icons:**
1. Add a valid image file into the `public/skills/` folder
2. Insert the image name into the `imageSrc` attribute: `imageSrc: "your-image.png"`
3. Remove the `fontAwesomeClassname` property (it takes precedence over `imageSrc`)
4. Add custom styling using the `style` property

### 5. Experience Section
- [ ] **Update work experience in `experience.sections[0].experiences`**
  ```javascript
  {
    title: "Your Job Title",
    company: "Company Name", 
    company_url: "https://company.com",
    logo_path: "company_logo.png", // Add logo to public/icons/
    duration: "Start Date - End Date",
    location: "City, State/Country", 
    description: "Your job description and achievements...",
    color: "#hexcolor",
  }
  ```

- [ ] **Update internships in `experience.sections[1].experiences`**
- [ ] **Update volunteering in `experience.sections[2].experiences`**

---

## 🎓 Education & Credentials

### 6. Education Section (`degrees` object)
- [ ] **Update each degree:**
  ```javascript
  {
    title: "University Name",
    subtitle: "Degree Title",
    logo_path: "university_logo.png", // Add to public/icons/
    alt_name: "University Short Name",
    duration: "Year - Year",
    descriptions: [
      "⚡ Description point 1",
      "⚡ Description point 2", 
    ],
    website_link: "https://university.edu",
  }
  ```

### 7. Certifications (`certifications` object)
- [ ] **Update each certification:**
  ```javascript
  {
    title: "Certification Name",
    subtitle: "- Issuer Name", 
    logo_path: "issuer_logo.png", // Add to public/icons/
    certificate_link: "https://certificate-link.com",
    alt_name: "Issuer Name",
    color_code: "#hexcolor",
  }
  ```

### 8. Competitive Programming Sites (`competitiveSites`)
- [ ] **Update coding platform profiles:**
  ```javascript
  {
    siteName: "LeetCode",
    iconifyClassname: "simple-icons:leetcode",
    style: { color: "#F79F1B" },
    profileLink: "https://leetcode.com/your-username/", // ← Update
  }
  ```

---

## 📞 Contact & Additional Sections

### 9. Contact Information (`contactPageData`)
- [ ] **Contact Section**
  ```javascript
  contactSection: {
    title: "Contact Me",
    profile_image_path: "your_profile_image.png", // Add to src/assets/images/
    description: "Your availability and expertise description...",
  }
  ```

- [ ] **Address Section**
  ```javascript
  addressSection: {
    title: "Address", 
    subtitle: "Your Address",
    locality: "City",
    country: "Country",
    region: "State/Region",
    postalCode: "ZIP",
    streetAddress: "Street Address",
    avatar_image_path: "address_image.svg",
    location_map_link: "https://maps.google.com/your-location",
  }
  ```

### 10. Projects & Publications (Optional)
- [ ] **Projects Header (`projectsHeader`)**
  ```javascript
  const projectsHeader = {
    title: "Projects",
    description: "Your projects description...",
    avatar_image_path: "projects_image.svg",
  };
  ```

- [ ] **Publications (`publications.data`)** - Add your research papers/blogs

---

## 🎨 Visual Customization

### 11. Theme Selection (`src/theme.js`)
- [ ] **Choose your theme at the bottom of theme.js:**
  ```javascript
  export const chosenTheme = blueTheme; // Change to your preferred theme
  ```

**Available Themes:**
- [ ] `blueTheme` (Professional)
- [ ] `brownTheme` (Warm)  
- [ ] `purpleTheme` (Creative)
- [ ] `greenTheme` (Nature)
- [ ] `redTheme` (Bold)
- [ ] `blackTheme` (Dark)
- [ ] `pinkTheme` (Soft)
- [ ] `violetTheme` (Rich)
- [ ] `materialDarkTheme` (Material Dark)
- [ ] `materialLightTheme` (Material Light)

**🎨 Creating Custom Theme:**
- [ ] **Define new theme in `src/theme.js`:**
  ```javascript
  export const myCustomTheme = {
    body: "#ffffff",
    text: "#333333", 
    highlight: "#007bff",
    // ... add other color properties
  };
  ```
- [ ] **Assign your theme:** `export const chosenTheme = myCustomTheme;`

### 12. Splash Screen Configuration
- [ ] **Option 1: Keep animated splash screen**
  - Keep `isSplash: true` in settings
  - Customize logo in `./src/components/Loader` directory
  
- [ ] **Option 2: Disable splash screen**
  ```javascript
  const settings = {
    isSplash: false, // Change to false
  };
  ```
  - Website will open directly to home page
  - Can enable later after designing custom logo

### 12. Images & Assets
- [ ] **Add company logos to `public/icons/`**
- [ ] **Add skill icons to `public/skills/` (if using custom images)**
- [ ] **Add profile photo to `src/assets/images/`**
- [ ] **Update favicon in `public/icons/`**
  - Generate favicons from [Favicon Generator](https://www.favicon-generator.org/) or [Favicon IO](https://favicon.io/)
  - Replace existing favicon files in `public/icons/`

---

## 🌐 SEO & Metadata

### 13. HTML Metadata (`public/index.html`)
- [ ] **Update page title**
- [ ] **Update meta description**
- [ ] **Update meta keywords**
- [ ] **Update Open Graph tags**
- [ ] **Update author name**

### 14. Website Preview Image
- [ ] **Create custom preview image:**
  1. Run your site locally (`npm start`)
  2. Take a screenshot (1280x640 recommended)
  3. Replace `public/icons/desc.png` with your screenshot
  4. This image shows when your portfolio is shared on social media

---

## 🐙 GitHub Integration Setup

### 15. GitHub Data Configuration (Important!)
- [ ] **Create `.env` file in root directory** (copy from `env.example`)
- [ ] **Get GitHub Personal Access Token**:
  1. Go to GitHub Settings → Developer settings → Personal access tokens
  2. Generate new token with **all permissions**
  3. ⚠️ **Keep your token secret!**
- [ ] **Update `.env` file:**
  ```bash
  GITHUB_TOKEN=your_token_here
  GITHUB_USERNAME=your_github_username
  ```
- [ ] **Fetch GitHub data:**
  ```bash
  node git_data_fetcher.mjs
  ```
  This will automatically replace the default data with yours.

**📊 What GitHub data gets fetched:**
- Pull requests
- Issues  
- Organizations
- Pinned projects
- Contribution statistics
- Repository information

⚠️ **Important**: Run `node git_data_fetcher.mjs` whenever you want to update GitHub-related information on your website.

---

## 🚀 Deployment Preparation

### 16. Pre-Deployment Checklist
- [ ] **Test locally with `npm start`**
- [ ] **Verify all images load correctly**
- [ ] **Check responsive design on mobile**
- [ ] **Test all navigation links**
- [ ] **Verify social media links work**
- [ ] **Check GitHub data fetching (if applicable)**
- [ ] **Build project with `npm run build`**

### 17. GitHub Pages Deployment

**⚠️ Repository Setup:**
- [ ] **Create GitHub repository named: `yourusername.github.io`** (exact format required)
- [ ] **DON'T use any other name for the repository**

**🚀 Deployment Options:**

**Option 1 (Manual):**
- [ ] Run `npm run build` to generate production build
- [ ] Navigate to `build` folder
- [ ] Run `git init` in build folder
- [ ] Push the build folder contents to `master` branch of your `yourusername.github.io` repository
- [ ] ⚠️ You may need to `git init` and force push for every new build

**Option 2 (Automated - Recommended):**
- [ ] Ensure `homepage` in `package.json` is correct: `https://yourusername.github.io`
- [ ] Run `npm run deploy` (builds and creates `gh-pages` branch automatically)
- [ ] Enable GitHub Pages in repository settings
- [ ] Select `gh-pages` branch as source
- [ ] **Note**: This won't work with user pages (yourusername.github.io repos)

**✅ Final Steps:**
- [ ] **Visit your deployed site at: `https://yourusername.github.io`**
- [ ] **Test all functionality on the live site**

---

## 🎯 Priority Order

### Phase 1 (Essential - 30 minutes)
1. Basic project setup (items 1-2)
2. Personal information & social links (item 3)
3. Theme selection (item 11)

### Phase 2 (Core Content - 1 hour) 
4. Skills section (item 4)
5. Experience section (item 5)  
6. Contact information (item 9)

### Phase 3 (Complete Profile - 1-2 hours)
7. Education & certifications (items 6-8)
8. Images & assets (item 13)
9. GitHub integration setup (item 15)
10. SEO optimization (items 14)

### Phase 4 (Polish & Deploy - 30-45 minutes)
11. Projects & publications (item 10)
12. Splash screen configuration (item 12)
13. Final testing & deployment (items 16-17)

---

## 🔧 Quick Commands

```bash
# Clone the repository
git clone https://github.com/ashutosh1919/masterPortfolio.git

# Install dependencies
npm install

# Fetch GitHub data (after setting up .env)
node git_data_fetcher.mjs

# Start development server  
npm start

# Build for production
npm run build

# Deploy to GitHub Pages (Option 2)
npm run deploy
```

---

## 🛠️ Technologies Used
- **React.js** - Frontend framework
- **GraphQL** - Query language  
- **Apollo Boost** - GraphQL client
- **BaseUI** - UI component library
- **React Reveal** - Animation library
- **Styled Components** - CSS-in-JS styling
- **UnDraw Illustrations** - SVG illustrations

---

## 📚 Key Resources

- **Live Demo**: https://ashutosh1919.github.io/
- **GitHub Repository**: https://github.com/ashutosh1919/masterPortfolio
- **Icon Search**: https://icon-sets.iconify.design/
- **Favicon Generator**: https://www.favicon-generator.org/ | https://favicon.io/
- **Color Picker**: https://htmlcolorcodes.com/
- **Google Fonts**: https://fonts.google.com/
- **GitHub Pages Guide**: https://pages.github.com/
- **UnDraw Illustrations**: https://undraw.co/
- **GitHub Personal Access Tokens**: https://github.com/settings/tokens

---

**💡 Pro Tip**: Start with Phase 1 to get a working version quickly, then gradually enhance your portfolio through the subsequent phases. Focus on content first, then polish the design!

**🔐 Security Note**: Never commit your `.env` file to git! It contains your GitHub token which should remain secret. The `.env` file is already included in `.gitignore`.
