import React, { useRef, useEffect, useCallback, useState } from "react";
import { gsap } from "gsap";
import { useHistory } from "react-router-dom";
import "./MagicBento.css";

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = "132, 0, 255";
const MOBILE_BREAKPOINT = 768;

const cardData = [
  {
    color: "#060010",
    title: "Academic Excellence",
    descriptions: [
      "Bachelor of Technology in Computer Science Engineering with 8.5 CGPA",
      "Specialized coursework in Software Testing, AI/ML, and Data Structures",
      "Academic projects in Test Automation and Quality Assurance frameworks",
      "Research focus on AI-driven testing methodologies and automation tools"
    ],
    label: "Education",
    icon: "🎓",
    link: "/education"
  },
  {
    color: "#060010", 
    title: "Professional Journey",
    descriptions: [
      "3+ years as SDET specializing in automation frameworks and API testing",
      "Expert in Selenium, Playwright, and Cypress for comprehensive test coverage",
      "Led quality assurance initiatives across multiple enterprise projects",
      "Mentored junior QA engineers in best practices and testing methodologies"
    ],
    label: "Experience",
    icon: "💼",
    link: "/experience"
  },
  {
    color: "#060010",
    title: "Verified Skills",
    descriptions: [
      "Certified Selenium WebDriver Professional with advanced automation expertise",
      "AWS Certified Cloud Practitioner for cloud testing environments",
      "ISTQB Foundation Level certification in software testing principles",
      "Agile Testing certification for modern development methodologies"
    ],
    label: "Certificates",
    icon: "🏆",
    link: "/education"
  },
  {
    color: "#060010",
    title: "Solutions Built",
    descriptions: [
      "E-commerce automation suite reducing manual testing time by 80%",
      "AI-powered test case generation tool using machine learning algorithms",
      "Cross-browser testing framework supporting 15+ browser configurations",
      "API testing framework with integrated performance and security testing"
    ],
    label: "Projects",
    icon: "🚀",
    link: "/projects"
  },
  {
    color: "#060010",
    title: "Technical Expertise",
    descriptions: [
      "Frontend: JavaScript, TypeScript, React, HTML5, CSS3, Responsive Design",
      "Backend: Python, Java, Node.js, REST APIs, GraphQL, Database Testing",
      "Testing: Selenium, Playwright, Cypress, Jest, TestNG, API Testing",
      "Tools: Git, Docker, Jenkins, JIRA, Postman, Performance Testing"
    ],
    label: "Skills",
    icon: "⚡",
    link: "/opensource"
  },
  {
    color: "#060010",
    title: "Recognition",
    descriptions: [
      "🏆 Best QA Engineer Award 2024 for outstanding automation contributions",
      "🌟 Innovation Excellence Award for AI-driven testing framework development",
      "🎯 Quality Champion Recognition for zero-defect delivery achievements",
      "🚀 Technical Leadership Award for mentoring and knowledge sharing initiatives"
    ],
    label: "Awards",
    icon: "🥇",
    link: "/contact"
  }
];

const testimonials = [
  {
    text: "Aayush's expertise in test automation transformed our QA process, reducing testing time by 70% while improving coverage.",
    author: "Sarah Johnson",
    role: "Senior QA Manager at TechCorp",
    rating: 5
  },
  {
    text: "Outstanding technical skills and attention to detail. His automation frameworks are robust and maintainable.",
    author: "Michael Chen",
    role: "Lead Developer at InnovateSoft",
    rating: 5
  },
  {
    text: "A true professional who delivers high-quality solutions on time. His API testing expertise is unmatched.",
    author: "Emily Rodriguez",
    role: "Product Manager at DataFlow",
    rating: 5
  },
  {
    text: "Aayush's innovative approach to testing and his ability to solve complex problems make him an invaluable team member.",
    author: "David Kumar",
    role: "CTO at QualityFirst",
    rating: 5
  },
  {
    text: "Exceptional knowledge of modern testing tools and frameworks. His mentorship helped our team grow significantly.",
    author: "Lisa Thompson",
    role: "QA Lead at DevSolutions",
    rating: 5
  },
  {
    text: "His automation scripts are clean, efficient, and well-documented. A pleasure to work with!",
    author: "Robert Martinez",
    role: "Senior SDET at TestLab",
    rating: 5
  },
  {
    text: "Aayush brings creativity and technical excellence to every project. His contributions are always top-notch.",
    author: "Jennifer Park",
    role: "Engineering Manager at CloudTech",
    rating: 5
  },
  {
    text: "Reliable, skilled, and always willing to go the extra mile. His work quality consistently exceeds expectations.",
    author: "Alex Williams",
    role: "QA Director at SecureApp",
    rating: 5
  },
  {
    text: "His deep understanding of both manual and automated testing makes him a versatile and valuable asset.",
    author: "Michelle Brown",
    role: "Test Manager at AgileWorks",
    rating: 5
  },
  {
    text: "Outstanding communication skills and technical expertise. Aayush is the kind of professional every team needs.",
    author: "James Anderson",
    role: "VP Engineering at TechForward",
    rating: 5
  }
];

const createParticleElement = (
  x,
  y,
  color = DEFAULT_GLOW_COLOR
) => {
  const el = document.createElement("div");
  el.className = "particle";
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75,
});

const updateCardGlowProperties = (
  card,
  mouseX,
  mouseY,
  glow,
  radius
) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;
  card.style.setProperty("--glow-x", `${relativeX}%`);
  card.style.setProperty("--glow-y", `${relativeY}%`);
  card.style.setProperty("--glow-intensity", glow.toString());
  card.style.setProperty("--glow-radius", `${radius}px`);
};

const ParticleCard = ({
  children,
  className = "",
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false,
  onClick = () => {},
}) => {
  const cardRef = useRef(null);
  const particlesRef = useRef([]);
  const timeoutsRef = useRef([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef(null);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(
        Math.random() * width,
        Math.random() * height,
        glowColor
      )
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (magnetismAnimationRef.current) {
      magnetismAnimationRef.current.kill();
    }
    particlesRef.current.forEach((particle) => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        },
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;
    if (!particlesInitialized.current) {
      initializeParticles();
    }
    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;
        const clone = particle.cloneNode(true);
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);
        gsap.fromTo(
          clone,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
        );
        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });
        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
        });
      }, index * 100);
      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;
    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();
      if (enableTilt) {
        gsap.to(element, {
          rotateX: 5,
          rotateY: 5,
          duration: 0.3,
          ease: "power2.out",
          transformPerspective: 1000,
        });
      }
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();
      if (enableTilt) {
        gsap.to(element, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
      if (enableMagnetism) {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    const handleMouseMove = (e) => {
      if (!enableTilt && !enableMagnetism) return;
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;
        gsap.to(element, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: "power2.out",
          transformPerspective: 1000,
        });
      }

      if (enableMagnetism) {
        const magnetX = (x - centerX) * 0.05;
        const magnetY = (y - centerY) * 0.05;
        magnetismAnimationRef.current = gsap.to(element, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    const handleClick = (e) => {
      onClick();
      if (!clickEffect) return;
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement("div");
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;
      element.appendChild(ripple);

      gsap.fromTo(
        ripple,
        {
          scale: 0,
          opacity: 1,
        },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          onComplete: () => ripple.remove(),
        }
      );
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);
    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("click", handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("click", handleClick);
      clearAllParticles();
    };
  }, [
    animateParticles,
    clearAllParticles,
    disableAnimations,
    enableTilt,
    enableMagnetism,
    clickEffect,
    glowColor,
    onClick,
  ]);

  return (
    <div
      ref={cardRef}
      className={`${className} particle-container`}
      style={{ ...style, position: "relative", overflow: "hidden" }}
    >
      {children}
    </div>
  );
};

const GlobalSpotlight = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR,
}) => {
  const spotlightRef = useRef(null);
  const isInsideSection = useRef(false);

  useEffect(() => {
    if (disableAnimations || !gridRef.current || !enabled) return;

    const spotlight = document.createElement("div");
    spotlight.className = "global-spotlight";
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const handleMouseMove = (e) => {
      if (!spotlightRef.current || !gridRef.current) return;

      const section = gridRef.current.closest(".bento-section");
      const rect = section ? section.getBoundingClientRect() : null;
      const mouseInside =
        rect &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      isInsideSection.current = mouseInside || false;
      const cards = gridRef.current.querySelectorAll(".card");

      if (!mouseInside) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
        });
        cards.forEach((card) => {
          card.style.setProperty("--glow-intensity", "0");
        });
        return;
      }

      const { proximity, fadeDistance } =
        calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cards.forEach((card) => {
        const cardElement = card;
        const cardRect = cardElement.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) -
          Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);
        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity =
            (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(
          cardElement,
          e.clientX,
          e.clientY,
          glowIntensity,
          spotlightRadius
        );
      });

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: "power2.out",
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0;

      gsap.to(spotlightRef.current, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      isInsideSection.current = false;
      if (gridRef.current) {
        gridRef.current.querySelectorAll(".card").forEach((card) => {
          card.style.setProperty("--glow-intensity", "0");
        });
      }
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (spotlightRef.current && spotlightRef.current.parentNode) {
        spotlightRef.current.parentNode.removeChild(spotlightRef.current);
      }
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

// Enhanced Card Component with Rotating Content
const EnhancedCard = ({ card, index, shouldDisableAnimations, cardProps, glowColor, enableTilt, clickEffect, enableMagnetism, onNavigate }) => {
  const [currentDescIndex, setCurrentDescIndex] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  
  // Rotate descriptions every 3 seconds
  useEffect(() => {
    if (card.descriptions && card.descriptions.length > 1) {
      const interval = setInterval(() => {
        setCurrentDescIndex((prev) => (prev + 1) % card.descriptions.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [card.descriptions]);

  // Rotate testimonials every 4 seconds for Awards card
  useEffect(() => {
    if (card.label === 'Awards') {
      const interval = setInterval(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [card.label]);

  const handleCardClick = () => {
    if (card.link) {
      onNavigate(card.link);
    }
  };

  const renderContent = () => {
    if (card.label === 'Awards') {
      const testimonial = testimonials[currentTestimonial];
      return (
        <div className="card__content">
          <h3 className="card__title">{card.title}</h3>
          <div className="testimonial-content">
            <div className="stars">
              {Array.from({ length: testimonial.rating }, (_, i) => (
                <span key={i} className="star">⭐</span>
              ))}
            </div>
            <p className="testimonial-text">"{testimonial.text}"</p>
            <div className="testimonial-author">
              <strong>{testimonial.author}</strong>
              <span className="testimonial-role">{testimonial.role}</span>
            </div>
          </div>
        </div>
      );
    }

    const description = card.descriptions 
      ? card.descriptions[currentDescIndex] 
      : card.description;

    return (
      <div className="card__content">
        <h3 className="card__title">{card.title}</h3>
        <p className="card__description" key={currentDescIndex}>
          {description}
        </p>
        {card.descriptions && card.descriptions.length > 1 && (
          <div className="progress-dots">
            {card.descriptions.map((_, i) => (
              <span 
                key={i} 
                className={`dot ${i === currentDescIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <ParticleCard
      key={index}
      {...cardProps}
      disableAnimations={shouldDisableAnimations}
      particleCount={12}
      glowColor={glowColor}
      enableTilt={enableTilt}
      clickEffect={clickEffect}
      enableMagnetism={enableMagnetism}
      onClick={handleCardClick}
    >
      <div className="card__header">
        <div className="card__label">{card.label}</div>
        <div className="card__icon">{card.icon}</div>
      </div>
      {renderContent()}
      {card.link && (
        <div className="card__footer">
          <button className="explore-btn" onClick={handleCardClick}>
            Explore More →
          </button>
        </div>
      )}
    </ParticleCard>
  );
};

const BentoCardGrid = ({
  children,
  gridRef
}) => (
  <div className="card-grid bento-section" ref={gridRef}>
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () =>
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  return isMobile;
};

const MagicBento = ({
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = true,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true,
}) => {
  const gridRef = useRef(null);
  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;
  const history = useHistory();

  const handleNavigation = (link) => {
    // Navigate to the specified route using React Router
    history.push(link);
  };

  return (
    <div className="magic-bento-container">
      <div className="bento-header">
        <h2 className="bento-title">Portfolio Overview</h2>
        <p className="bento-subtitle">Explore my professional journey through interactive cards</p>
      </div>
      
      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}
      
      <BentoCardGrid gridRef={gridRef}>
        {cardData.map((card, index) => {
          const baseClassName = `card ${textAutoHide ? "card--text-autohide" : ""} ${enableBorderGlow ? "card--border-glow" : ""}`;
          const cardProps = {
            className: baseClassName,
            style: {
              backgroundColor: card.color,
              "--glow-color": glowColor,
            }
          };

          return (
            <EnhancedCard
              key={index}
              card={card}
              index={index}
              shouldDisableAnimations={shouldDisableAnimations}
              cardProps={cardProps}
              glowColor={glowColor}
              enableTilt={enableTilt}
              clickEffect={clickEffect}
              enableMagnetism={enableMagnetism}
              onNavigate={handleNavigation}
            />
          );
        })}
      </BentoCardGrid>
    </div>
  );
};

export default MagicBento;
