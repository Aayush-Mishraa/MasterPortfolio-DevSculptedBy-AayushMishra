/* Change this file to get your personal Porfolio */

// Website related settings
const settings = {
  isSplash: true, // Change this to false if you don't want Splash screen.
};

//SEO Related settings
const seo = {
  title: "Aayush Mishra's Portfolio",
  description:
    "A passionate Software Development Engineer in Test who creates innovative testing solutions and builds amazing web applications with modern technologies.",
  og: {
    title: "Aayush Mishra Portfolio",
    type: "website",
    url: "https://Aayush-Mishraa.github.io/",
  },
};

//Home Page
const greeting = {
  title: "Aayush Mishra",
  logo_name: "AayushMishra",
  nickname: "Software Development Engineer in Test 🚀",
  subTitle:
    "A passionate Software Development Engineer in Test who specializes in creating robust testing frameworks and ensuring quality in software products through innovative testing solutions.",
  resumeLink:
    "https://drive.google.com/file/d/1oKsp7o5ZmpJbwP-Vs4wjnENlV_czoPFY/view",
  portfolio_repository: "https://github.com/Aayush-Mishraa",
  githubProfile: "https://github.com/Aayush-Mishraa",
};

const socialMediaLinks = [
  /* Your Social Media Link */
  // github: "https://github.com/ashutosh1919",
  // linkedin: "https://www.linkedin.com/in/ashutosh-hathidara-88710b138/",
  // gmail: "ashutoshhathidara98@gmail.com",
  // gitlab: "https://gitlab.com/ashutoshhathidara98",
  // facebook: "https://www.facebook.com/laymanbrother.19/",
  // twitter: "https://twitter.com/ashutosh_1919",
  // instagram: "https://www.instagram.com/layman_brother/"

  {
    name: "Github",
    link: "https://github.com/Aayush-Mishraa",
    fontAwesomeIcon: "fa-github", // Reference https://fontawesome.com/icons/github?style=brands
    backgroundColor: "#181717", // Reference https://simpleicons.org/?q=github
  },
  {
    name: "LinkedIn",
    link: "https://www.linkedin.com/in/aayushmishra33/",
    fontAwesomeIcon: "fa-linkedin-in", // Reference https://fontawesome.com/icons/linkedin-in?style=brands
    backgroundColor: "#0077B5", // Reference https://simpleicons.org/?q=linkedin
  },
  {
    name: "Instagram",
    link: "https://www.instagram.com/_aayush_mishraa/",
    fontAwesomeIcon: "fa-instagram", // Reference https://fontawesome.com/icons/instagram?style=brands
    backgroundColor: "#E4405F", // Reference https://simpleicons.org/?q=instagram
  },
  {
    name: "Gmail",
    link: "mailto:aayushmishra@gmail.com", // Add your actual email here
    fontAwesomeIcon: "fa-google", // Reference https://fontawesome.com/icons/google?style=brands
    backgroundColor: "#D14836", // Reference https://simpleicons.org/?q=gmail
  },
  {
    name: "Kaggle",
    link: "https://www.kaggle.com/aayushmishra", // Update with your actual Kaggle profile
    fontAwesomeIcon: "fa-brands fa-kaggle", // Reference https://fontawesome.com/icons/kaggle?style=brands
    backgroundColor: "#20BEFF", // Reference https://simpleicons.org/?q=kaggle
  },
];

const skills = {
  data: [
   {
      title: "Test Automation & Framework Development",
      fileName: "DesignImg",
      skills: [
        "⚡ Designing and implementing robust test automation frameworks using Selenium, Playwright, and Cypress for modern web applications",
        "⚡ Building comprehensive end-to-end testing solutions with TypeScript and JavaScript for enhanced maintainability",
        "⚡ Creating data-driven BDD frameworks with Cucumber and advanced reporting using Allure and ExtentReports",
        "⚡ Developing cross-browser and cross-platform testing strategies for maximum coverage and reliability",
      ],
      softwareSkills: [
        
        {
          skillName: "Selenium",
          fontAwesomeClassname: "simple-icons:selenium",
          style: {
            color: "#43B02A",
          },
        },
        {
          skillName: "Playwright",
          fontAwesomeClassname: "simple-icons:playwright",
          style: {
            color: "#2EAD33",
          },
        },
        {
          skillName: "TypeScript",
          fontAwesomeClassname: "simple-icons:typescript",
          style: {
            color: "#3178C6",
          },
        },
        {
          skillName: "JavaScript",
          fontAwesomeClassname: "simple-icons:javascript",
          style: {
            backgroundColor: "#000000",
            color: "#F7DF1E",
          },
        },
        {
          skillName: "TestNG",
          fontAwesomeClassname: "simple-icons:testinglibrary",
          style: {
            color: "#E33332",
          },
        },
        {
          skillName: "Cucumber",
          fontAwesomeClassname: "simple-icons:cucumber",
          style: {
            color: "#23D96C",
          },
        },
        {
          skillName: "Cypress",
          fontAwesomeClassname: "simple-icons:cypress",
          style: {
            color: "#17202C",
          },
        },
        {
          skillName: "Appium",
          fontAwesomeClassname: "simple-icons:appium",
          style: {
            color: "#662D91",
          },
        },
      ],
    },
    {
      title: "API Testing & CI/CD Integration",
      fileName: "FullStackImg",
      skills: [
        "⚡ Building comprehensive API testing suites using RestAssured, Postman, and Playwright for microservices architecture",
        "⚡ Implementing advanced CI/CD pipelines with Jenkins, GitHub Actions, and Docker for seamless test automation",
        "⚡ Performing sophisticated performance testing using JMeter and K6 with detailed metrics analysis",
        "⚡ Establishing quality gates and test reporting with Allure, SonarQube, and custom dashboard solutions",
      ],
      softwareSkills: [
        {
          skillName: "Postman",
          fontAwesomeClassname: "simple-icons:postman",
          style: {
            color: "#FF6C37",
          },
        },
        {
          skillName: "JMeter",
          fontAwesomeClassname: "simple-icons:apachejmeter",
          style: {
            color: "#D22128",
          },
        },
      
        {
          skillName: "Jenkins",
          fontAwesomeClassname: "simple-icons:jenkins",
          style: {
            color: "#D33833",
          },
        },
        {
          skillName: "GitHub Actions",
          fontAwesomeClassname: "simple-icons:githubactions",
          style: {
            color: "#2088FF",
          },
        },
        {
          skillName: "Git",
          fontAwesomeClassname: "simple-icons:git",
          style: {
            color: "#F05032",
          },
        },
        {
          skillName: "Maven",
          fontAwesomeClassname: "simple-icons:apachemaven",
          style: {
            color: "#C71A36",
          },
        },
        {
          skillName: "Gradle",
          fontAwesomeClassname: "simple-icons:gradle",
          style: {
            color: "#02303A",
          },
        },
        {
          skillName: "JIRA",
          fontAwesomeClassname: "simple-icons:jira",
          style: {
            color: "#0052CC",
          },
        },
      ],
    },
    {
      title: "Cloud Infra-Architecture",
      fileName: "CloudInfraImg",
      skills: [
        "⚡ Experience working on multiple cloud platforms",
        "⚡ Hosting and maintaining websites on virtual machine instances along with integration of databases",
        "⚡ Deploying deep learning models on cloud to use on mobile devices",
        "⚡ Setting up streaming jobs from DB to Server or vice-versa on GCP and AWS",
      ],
      softwareSkills: [
        {
          skillName: "GCP",
          fontAwesomeClassname: "simple-icons:googlecloud",
          style: {
            color: "#4285F4",
          },
        },
        {
          skillName: "AWS",
          fontAwesomeClassname: "simple-icons:amazonaws",
          style: {
            color: "#FF9900",
          },
        },
        {
          skillName: "Azure",
          fontAwesomeClassname: "simple-icons:microsoftazure",
          style: {
            color: "#0089D6",
          },
        },
        {
          skillName: "Firebase",
          fontAwesomeClassname: "simple-icons:firebase",
          style: {
            color: "#FFCA28",
          },
        },
        {
          skillName: "PostgreSQL",
          fontAwesomeClassname: "simple-icons:postgresql",
          style: {
            color: "#336791",
          },
        },
        {
          skillName: "MongoDB",
          fontAwesomeClassname: "simple-icons:mongodb",
          style: {
            color: "#47A248",
          },
        },
        {
          skillName: "Docker",
          fontAwesomeClassname: "simple-icons:docker",
          style: {
            color: "#1488C6",
          },
        },
        {
          skillName: "Kubernetes",
          fontAwesomeClassname: "simple-icons:kubernetes",
          style: {
            color: "#326CE5",
          },
        },
      ],
    },
    {
      title: "Data Science & AI",
      fileName: "DataScienceImg",
      skills: [
        "⚡ Developing highly scalable production ready models for various deeplearning and statistical use cases",
        "⚡ Experience of working with Computer Vision and NLP projects",
        "⚡ Complex quantitative modelling for dynamic forecasting and time series analysis",
      ],
      softwareSkills: [
        {
          skillName: "Tensorflow",
          fontAwesomeClassname: "logos-tensorflow",
          style: {
            backgroundColor: "transparent",
          },
        },
        {
          skillName: "Keras",
          fontAwesomeClassname: "simple-icons:keras",
          style: {
            backgroundColor: "white",
            color: "#D00000",
          },
        },
        {
          skillName: "PyTorch",
          fontAwesomeClassname: "logos-pytorch",
          style: {
            backgroundColor: "transparent",
          },
        },
        {
          skillName: "Python",
          fontAwesomeClassname: "ion-logo-python",
          style: {
            backgroundColor: "transparent",
            color: "#3776AB",
          },
        },
        {
          skillName: "Deeplearning",
          imageSrc: "deeplearning_ai_logo.png",
        },
      ],
    },
  ],
};

// Education Page
const competitiveSites = {
  competitiveSites: [
    {
      siteName: "LeetCode",
      iconifyClassname: "simple-icons:leetcode",
      style: {
        color: "#F79F1B",
      },
      profileLink: "",
    },
    {
      siteName: "HackerRank",
      iconifyClassname: "simple-icons:hackerrank",
      style: {
        color: "#2EC866",
      },
      profileLink: "",
    },
    {
      siteName: "Codechef",
      iconifyClassname: "simple-icons:codechef",
      style: {
        color: "#5B4638",
      },
      profileLink: "",
    },
    {
      siteName: "Codeforces",
      iconifyClassname: "simple-icons:codeforces",
      style: {
        color: "#1F8ACB",
      },
      profileLink: "",
    },
    {
      siteName: "Hackerearth",
      iconifyClassname: "simple-icons:hackerearth",
      style: {
        color: "#323754",
      },
      profileLink: "",
    },
    {
      siteName: "Kaggle",
      iconifyClassname: "simple-icons:kaggle",
      style: {
        color: "#20BEFF",
      },
      profileLink: "",
    },
  ],
};

const degrees = {
  degrees: [
    {
      title: "St. Aloysius Institute of Technology College",
      subtitle: "B.Tech. in Computer Engineering",
      logo_path: "Remove background project.png",
      alt_name: "St. Aloysius Institute",
      duration: "2013 - 2017",
      descriptions: [
        "⚡ I have studied basic software engineering subjects like DS, Algorithms, DBMS, OS, CA, AI etc.",
        "⚡ Apart from this, I have done courses on Deep Learning, Data Science, Cloud Computing and Full Stack Development.",
        "⚡ I was selected for Merit cum Means Scholarship which is given to top 10% of students in college. I have received award from respected director for consistently best performance in academics.",
      ],
      website_link: "https://staloysiuscollege.ac.in/en-in/",
    },
    {
      title: "Chandigarh University Mohali",
      subtitle: "Master's degree in Data Science and Artificial Intelligence (AI)",
      logo_path: "Remove background project (2).png",
      alt_name: "chandigarh-university.png",
      duration: "2022 - 2024",
      descriptions: [
        "⚡ I have taken varity of courses related to Artificial Intelligence which correspond to Explainable AI, Graph Machine Learning, Computer Vision etc.",
        "⚡ Apart from this, I have also done research assistantship. As part of it, I have worked on creating new algorithms in Graph ML and Network Science.",
        "⚡ During my time at university, I was also associated with multimedia department. As part of it, I have worked on some documentry films and interviews.",
      ],
      website_link: "https://www.cuchd.in/",
    },
  ],
};

const certifications = {
  certifications: [
    {
      title: "AWS Machine Learning",
      subtitle: "- Andrew Ng",
      logo_path: "aws-1.png",
      certificate_link:
        "https://coursera.org/share/3191ed2114b3502ba9b50e9bc3d425bc",
      alt_name: "Stanford University",
      color_code: "#020202ff",
    },
    {
      title: "Python for Data Science, AI & Development",
      subtitle: "- Andrew Ng",
      logo_path: "deeplearning_ai_logo.png",
      certificate_link:
        "https://coursera.org/share/3191ed2114b3502ba9b50e9bc3d425bc",
      alt_name: "deeplearning.ai",
      color_code: "#00000099",
    },
      {
      title: "Selenium",
      subtitle: "- Saurabh Mukhopadhyay",
      logo_path: "Selenium.jpg",
      certificate_link:
        "https://udemy-certificate.s3.amazonaws.com/pdf/UC-5eefb0ee-2a2d-4ed4-9784-07fbea2b314d.pdf",
      alt_name: "NPTEL",
      color_code: "#ffffffff",
    },
    {
      title: "Data Science",
      subtitle: "- Alex Aklson",
      logo_path: "ibm_logo.png",
      certificate_link:
        "https://udemy-certificate.s3.amazonaws.com/pdf/UC-5eefb0ee-2a2d-4ed4-9784-07fbea2b314d.pdf",
      alt_name: "IBM",
      color_code: "#1F70C199",
    },
    {
      title: "Playwright Testing",
      subtitle: "- Rahul Shetty",
      logo_path: "playwright.png",
      certificate_link:
        "https://udemy-certificate.s3.amazonaws.com/pdf/UC-5eefb0ee-2a2d-4ed4-9784-07fbea2b314d.pdf",
      alt_name: "Microsoft",
      color_code: "#D83B0199",
    },
    {
      title: "Python for Data Science, AI & Development",
      subtitle: "- ",
      logo_path: "ibm_logo.png",
      certificate_link:
        "https://coursera.org/share/20de3900518c4f79a0e407454a446751",
      alt_name: "IBM",
      color_code: "#1F70C199",
    },
    {
      title: "Advanced ML on GCP",
      subtitle: "- Srikanth Varma Chekuri",
      logo_path: "Applied_Root2.png",
      certificate_link:
        "",
      alt_name: "Google",
      color_code: "#0C9D5899",
    },
      {
      title: "Rest Assured",
      subtitle: "- Rahul",
      logo_path: "rest-assured-1.webp",
      certificate_link:
        "https://google.qwiklabs.com/public_profiles/5fab4b2d-be6f-408c-8dcb-6d3b58ecb4a2",
      alt_name: "GCP",
      color_code: "#feffffff",
    },
    {
      title: "Swift IOS Development",
      subtitle: "- Nick Walter",
      logo_path: "Swift-Logo.png",
      certificate_link:
        "https://udemy-certificate.s3.amazonaws.com/pdf/UC-38add859-4573-4f77-a143-c0113923d90b.pdf",
      alt_name: "Coursera",
      color_code: "#2A73CC",
    },
    {
      title: "Postman API Testing",
      subtitle: "- Qwiklabs",
      logo_path: "Postman.png",
      certificate_link:
        "https://udemy-certificate.s3.amazonaws.com/pdf/UC-ce8a68f1-7c6a-485f-b2b9-8ef414f2e1aa.pdf",
      alt_name: "GCP",
      color_code: "#4285F499",
    },
   {
      title: "ML on GCP",
      subtitle: "- GCP Training",
      logo_path: "google_logo.png",
      certificate_link:
        "Link to your certificate",
      alt_name: "Google",
      color_code: "#0C9D5899",
    },
  {
      title: "DL on Tensorflow",
      subtitle: "- Nitish Singh",
      logo_path: "CampusX.png",
      certificate_link:
        "Link to your certificate",
      alt_name: "deeplearning.ai",
      color_code: "#00000099",
    },
  ],
};

// Experience Page
const experience = {
  title: "Experience",
  subtitle: "Work, Internship and Volunteership",
  description:
    "Experienced SDET specializing in test automation, AI-powered testing solutions, and quality assurance. I've built robust testing frameworks across banking, ecommerce, healthcare, and logistics industries while implementing CI/CD pipelines and performance testing strategies. Passionate about leveraging cutting-edge AI technologies to revolutionize testing methodologies.",
  header_image_path: "experience.svg",
  sections: [
    {
      title: "Work",
      work: true,
      experiences: [
        {
          title: "Software Development Engineer In Test",
          company: "Keywords Studio",
          company_url: "https://www.keywordsstudios.com/en/",
          logo_path: "keywordsstudios_logo.jpg",
          duration: "April 2022 - Present",
          location: "Gurgaon, HR, India",
          description:
            "Leading test automation initiatives and quality assurance processes for gaming and software products. Developing comprehensive test frameworks using Selenium, TestNG, and REST Assured. Implementing CI/CD pipelines with Jenkins and Docker for automated testing. Designing and executing performance testing strategies using JMeter. Mentoring junior QA engineers and establishing best practices for test automation across multiple projects.",
          color: "#000000",
        },
        {
          title: "ML Engineer",
          company: "Applied AI Root",
          company_url: "https://legatohealthtech.com/",
          logo_path: "Applied_Root0.png.avif",
          duration: "June 2020 - Aug 2021",
          location: "Hyderabad, Telangana",
          description:
            "I am working on automating healthcare products. The projects involve automation for process improvements and for significantly enhancing the profits. I am currently working on Cancer Survival and Reoccurence Prediction. Our goal is to make AI system which scales and removes doctor dependency as much as possible.",
          color: "#0879bf",
        },
        // REMOVED: Android and ML Developer - Muffito Incorporation
        // REMOVED: Android Developer - FreeCopy Pvt. Ltd.
      ],
    },
    {
      title: "Internships",
      experiences: [
        {
          title: "QA Automation Intern",
          company: "Keywords Studio",
          company_url: "https://www.keywordsstudios.com/",
          logo_path: "keywords_logo.png",
          duration: "May 2021 - Aug 2021",
          location: "Gurgaon, HR, India",
          description:
            "Developed automated testing frameworks for gaming applications and web platforms. Created comprehensive test suites using Selenium WebDriver and TestNG. Implemented API testing solutions with Postman and REST Assured. Collaborated with development teams to establish continuous integration practices. Gained hands-on experience in mobile testing using Appium and performance testing methodologies.",
          color: "#000000",
        },
        {
          title: "Data Science Research Intern",
          company: "Delhivery Pvt. Ltd.",
          company_url: "https://www.delhivery.com/",
          logo_path: "delhivery_logo.png",
          duration: "May 2019 - Sept 2019",
          location: "Gurgaon, Haryana",
          description:
            "I have worked on project of predicting freight rates based on previous data. There were two objectives: (1) To build a forecasting engine to predict daily freight rates. (2) To embed feature in the model which can explain the seasonal major changes in freight rate based on regions and locations. I have closely worked with deep learning models in combination with statistical methods to create solution for this. At the end of internship, I had created model deployed on AWS EC2 with the use of Kafka stream jobs, ElasticSearch and PostgreSQL.",
          color: "#ee3c26",
        },
        // MOVED: Intel Indexer LLC moved to Volunteerships section
      ],
    },
    {
      title: "Volunteerships",
      experiences: [
        {
          title: "Google Explore ML Facilitator",
          company: "Google",
          company_url: "https://about.google/",
          logo_path: "google_logo.png",
          duration: "June 2020 - April 2021",
          location: "Hyderabad, Telangana",
          description:
            "Explore Machine Learning (ML) is a Google-sponsored program for university students to get started with Machine Learning. The curriculum offers 3 tracks of ML Content (Beginner, Intermediate, Advanced) and relies on university student facilitators to train other students on campus and to build opensource projects under this program.",
          color: "#4285F4",
        },
        {
          title: "Microsoft Student Partner",
          company: "Microsoft",
          company_url: "https://www.microsoft.com/",
          logo_path: "microsoft_logo.png",
          duration: "Aug 2019 - May 2020",
          location: "Hyderabad, Telangana",
          description:
            "Microsoft Student Partner is a program for university students to lead the awareness and use of Cloud especially Azure tools in the development of their projects and startups. Under this program, I have organised hands on workshops and seminars to teach Cloud Computing concepts to students.",
          color: "#D83B01",
        },
        {
          title: "Developer Program Member",
          company: "Github",
          company_url: "https://github.com/",
          logo_path: "github_logo.png",
          duration: "July 2019 - PRESENT",
          location: "Work From Home",
          description:
            "I am actively contributing to many opensource projects. I have contributed to projects of organisations like Tensorflow, Uber, Facebook, Google, Scikit-learn, Kiwix, Sympy, Python, NVLabs, Fossasia, Netrack, Keras etc. These contributions include bug fixes, feature requests and formulating proper documentation for project.",
          color: "#181717",
        },
        {
          title: "Data Science Volunteer",
          company: "Intel Indexer LLC",
          company_url: "https://opencorporates.com/companies/us_dc/EXTUID_4170286",
          logo_path: "intel_logo.jpg",
          duration: "Nov 2018 - Dec 2018",
          location: "Work From Home",
          description:
            "This is financial Solution Company. I have made Supervised Learning model for the company which can perform time series analysis on Stock price data for 32 companies. I have built LSTM Neural Networks Model and trained the data of 32 companies for last 2 years. This model is also used for forecasting.",
          color: "#0071C5",
        },
      ],
    },
  ],
};

// Projects Page
const projectsHeader = {
  title: "Projects",
  description:
    "My projects makes use of vast variety of latest technology tools. My best experience is to create Data Science projects and deploy them to web applications using cloud infrastructure.",
  avatar_image_path: "projects_image.svg",
};

const publicationsHeader = {
  title: "Publications",
  description: "Some of my published Articles, Blogs and Research.",
  avatar_image_path: "projects_image.svg",
};

const publications = {
  data: [
    {
      id: "neuro-symbolic-sudoku-solver",
      name: "The Exponential Rise of Data Upload in the Cloud: A Statistical Overview",
      createdAt: "Jul 2, 2023",
      description: "Paper published in 2023",
      url: "https://medium.com/@aayushmishra.in/the-exponential-rise-of-data-upload-in-the-cloud-a-statistical-overview-1f4c9bb35cd1",
    },
    {
      id: "mdp-diffusion",
      name: "The Importance of Manual and Software Automation Testing in the IT Industry",
      createdAt: "2023-09-19T00:00:00Z",
      description: "Blog published in Paperspace",
      url: "https://medium.com/@aayushmishra.in/the-importance-of-manual-and-software-automation-testing-in-the-it-industry-8db7c423b5f1",
    },
    {
      id: "consistency-models",
      name: "The Exponential Rise of Data Upload in the Cloud: A Statistical Overview",
      createdAt: "2023-10-12T00:00:00Z",
      description: "Blog published in Paperspace",
      url: "https://medium.com/@aayushmishra.in/unleashing-the-power-of-ai-and-machine-learning-exploring-the-advantages-and-disadvantages-28e7c0fe0b31",
    },
  ],
};

// Open Source Section
const openSource = {
  showGithubProfile: "true", // Set true or false to show Contact profile using Github, defaults to true
  display: true // Set false to hide this section, defaults to true
};

// Contact Page
const contactPageData = {
  contactSection: {
    title: "Contact Me",
    profile_image_path: "ProfileImage.png",
    description:
      "I'm actively available across multiple platforms and always excited to connect! Reach out to me and I'll respond within 24 hours. I specialize in SDET (Software Development Engineer in Test) expertise including test automation frameworks, AI-powered testing solutions, performance testing, and CI/CD pipeline optimization. I can also assist with Machine Learning model testing, AI quality assurance, React test automation, mobile testing strategies, cloud-based testing infrastructure, and open-source testing tools. Let's discuss how we can enhance your testing capabilities with cutting-edge AI and automation technologies!",
  },
  blogSection: {
    title: "Blogs",
    subtitle:
      "I like to document some of my experiences in professional career journey as well as some technical knowledge sharing.",
    link: "https://medium.com/@aayushmishra.in",
    avatar_image_path: "blogs_image.svg",
  },
  addressSection: {
    title: "Address",
    subtitle: "Mumbai, India 400001",
    locality: "Mumbai",
    country: "India",
    region: "",
    postalCode: "",
    streetAddress: " ",
    avatar_image_path: "address_image.svg",
    location_map_link: "https://www.google.co.in/maps/place/Mumbai,+Maharashtra/@19.0824822,72.71413,11z/data=!3m1!4b1!4m6!3m5!1s0x3be7c6306644edc1:0x5da4ed8f8d648c69!8m2!3d18.9581934!4d72.8320729!16zL20vMDR2bXA?entry=ttu&g_ep=EgoyMDI1MDcyOC4wIKXMDSoASAFQAw%3D%3D",
  },
  phoneSection: {
    title: "",
    subtitle: "",
  },
};

export {
  settings,
  seo,
  greeting,
  socialMediaLinks,
  skills,
  competitiveSites,
  degrees,
  certifications,
  experience,
  projectsHeader,
  publicationsHeader,
  publications,
  openSource,
  contactPageData,
};
