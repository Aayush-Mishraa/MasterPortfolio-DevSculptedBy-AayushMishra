import React, { useState, useEffect } from "react";
import "./CreativeFooter.css";
import { greeting, socialMediaLinks } from "../../portfolio";
import { Fade } from "react-reveal";

export default function CreativeFooter() {
  const [isVisible, setIsVisible] = useState(false);

  // Show scroll-to-top button when user scrolls down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  const automationTools = [
    {
      name: "Selenium",
      icon: "fa-solid fa-robot",
      description: "Web Automation"
    },
    {
      name: "Cypress",
      icon: "fa-solid fa-circle-check",
      description: "E2E Testing"
    },
    {
      name: "Playwright",
      icon: "fa-solid fa-theater-masks",
      description: "Cross-Browser"
    },
    {
      name: "JUnit",
      icon: "fa-solid fa-flask",
      description: "Unit Testing"
    },
    {
      name: "TestNG",
      icon: "fa-solid fa-vial",
      description: "Test Framework"
    },
    {
      name: "Postman",
      icon: "fa-solid fa-paper-plane",
      description: "API Testing"
    },
    {
      name: "Jenkins",
      icon: "fa-solid fa-gear",
      description: "CI/CD Pipeline"
    },
    {
      name: "GitHub Actions",
      icon: "fa-brands fa-github",
      description: "Automation"
    },
    {
      name: "Docker",
      icon: "fa-brands fa-docker",
      description: "Containerization"
    }
  ];

  const contactEmails = [
    {
      email: "contact@aayushmishra.tech",
      type: "General Inquiries",
      icon: "fa-solid fa-envelope"
    },
    {
      email: "qa.architect@aayushmishra.tech",
      type: "QA & Testing",
      icon: "fa-solid fa-bug"
    },
    {
      email: "connecttoayushmishra@gmail.com",
      type: "Business",
      icon: "fa-solid fa-briefcase"
    }
  ];

  return (
    <footer className="creative-footer">
      <div className="footer-background">
        <div className="footer-container">
          <Fade bottom duration={1000} distance="40px">
            <div className="footer-content">
              {/* Automation Tools Section */}
              <div className="footer-section automation-section">
                <h3 className="footer-section-title">
                  <i className="fa-solid fa-cogs"></i>
                  Automation Arsenal
                </h3>
                <div className="automation-grid">
                  {automationTools.map((tool, index) => (
                    <div key={index} className="automation-tool" data-delay={index * 100}>
                      <div className="tool-icon">
                        <i className={tool.icon}></i>
                      </div>
                      <div className="tool-info">
                        <span className="tool-name">{tool.name}</span>
                        <span className="tool-desc">{tool.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="footer-section contact-section">
                <h3 className="footer-section-title">
                  <i className="fa-solid fa-address-card"></i>
                  Let's Connect
                </h3>
                <div className="contact-info">
                  {contactEmails.map((contact, index) => (
                    <div key={index} className="contact-item" data-delay={index * 150}>
                      <div className="contact-icon">
                        <i className={contact.icon}></i>
                      </div>
                      <div className="contact-details">
                        <span className="contact-type">{contact.type}</span>
                        <a href={`mailto:${contact.email}`} className="contact-email">
                          {contact.email}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="location-info">
                  <i className="fa-solid fa-map-marker-alt"></i>
                  <span>Available for Remote & On-site Opportunities</span>
                </div>
              </div>

              {/* Social Media Section */}
              <div className="footer-section social-section">
                <h3 className="footer-section-title">
                  <i className="fa-solid fa-share-nodes"></i>
                  Follow My Journey
                </h3>
                <div className="social-links">
                  {socialMediaLinks.map((media, index) => (
                    <a
                      key={index}
                      href={media.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                      style={{ "--bg-color": media.backgroundColor }}
                      data-delay={index * 100}
                    >
                      <i className={`fab ${media.fontAwesomeIcon}`}></i>
                      <span className="social-name">{media.name}</span>
                    </a>
                  ))}
                </div>
                <div className="social-stats">
                  <div className="stat-item">
                    <span className="stat-number">500+</span>
                    <span className="stat-label">Test Cases Automated</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">50+</span>
                    <span className="stat-label">Projects Delivered</span>
                  </div>
                </div>
              </div>

              {/* Policies & Copyright Section */}
              <div className="footer-section policies-section">
                <h3 className="footer-section-title">
                  <i className="fa-solid fa-scale-balanced"></i>
                  Legal & Policies
                </h3>
                <div className="policies-content">
                  <div className="copyright-info">
                    <i className="fa-solid fa-copyright"></i>
                    <span>© 2025 {greeting.title}. All rights reserved.</span>
                  </div>
                  <div className="policy-links">
                    <a href="#privacy" className="policy-link">
                      <i className="fa-solid fa-shield-halved"></i>
                      Privacy Policy
                    </a>
                    <a href="#terms" className="policy-link">
                      <i className="fa-solid fa-file-contract"></i>
                      Terms & Conditions
                    </a>
                    <a href="#accessibility" className="policy-link">
                      <i className="fa-solid fa-universal-access"></i>
                      Accessibility
                    </a>
                  </div>
                  <div className="made-with-love">
                    <span>Crafted with</span>
                    <i className="fa-solid fa-heart"></i>
                    <span>and Quality Assurance mindset</span>
                  </div>
                </div>
              </div>
            </div>
          </Fade>

          {/* Footer Bottom Bar */}
          <Fade bottom duration={1000} delay={300}>
            <div className="footer-bottom">
              <div className="footer-tagline">
                <span className="tagline-text">
                  "Quality is not an act, it is a habit" - Aristotle
                </span>
              </div>
              <div className="footer-tech-stack">
                <span>Built with</span>
                <div className="tech-icons">
                  <i className="fab fa-react" title="React"></i>
                  <i className="fab fa-css3-alt" title="CSS3"></i>
                  <i className="fab fa-js-square" title="JavaScript"></i>
                  <i className="fab fa-github" title="GitHub"></i>
                </div>
              </div>
            </div>
          </Fade>
        </div>

        {/* Scroll to Top Button */}
        {isVisible && (
          <button
            className="scroll-to-top"
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            <i className="fa-solid fa-chevron-up"></i>
            <span className="scroll-text">Top</span>
          </button>
        )}

        {/* Decorative Elements */}
        <div className="footer-decorations">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
        </div>
      </div>
    </footer>
  );
}
