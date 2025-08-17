import React, { useRef, useState, useEffect } from "react";
import Matter from "matter-js";
import "./FallingText.css";

const FallingText = ({
  className = '',
  text = '',
  highlightWords = [],
  highlightClass = "highlighted",
  trigger = "hover", // Change to "auto" for always-on animation
  backgroundColor = "transparent",
  wireframes = false,
  gravity = 0.65,
  mouseConstraintStiffness = 0.9,
  fontSize = "2.2rem"
}) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const [effectStarted, setEffectStarted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');

  // Theme detection
  useEffect(() => {
    const detectTheme = () => {
      // Check for data-theme attribute on body
      const bodyTheme = document.body.getAttribute('data-theme');
      if (bodyTheme) {
        setCurrentTheme(bodyTheme);
        return;
      }

      // Check for CSS custom property
      const rootStyle = getComputedStyle(document.documentElement);
      const themeVar = rootStyle.getPropertyValue('--theme').trim();
      if (themeVar) {
        setCurrentTheme(themeVar);
        return;
      }

      // Fallback to prefers-color-scheme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setCurrentTheme(prefersDark ? 'dark' : 'light');
    };

    detectTheme();

    // Listen for theme changes
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['data-theme', 'class'] 
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener(detectTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeListener(detectTheme);
    };
  }, []);

  // Parse text and apply highlighting
  useEffect(() => {
    if (!textRef.current) return;
    
    const words = text.split(" ");
    const newHTML = words
      .map((word) => {
        const cleanWord = word.replace(/[.,!?;]/g, '');
        const isHighlighted = highlightWords.some((hw) => 
          cleanWord.toLowerCase() === hw.toLowerCase() || 
          cleanWord.toLowerCase().startsWith(hw.toLowerCase())
        );
        return `<span class="word ${isHighlighted ? highlightClass : ''}" data-theme="${currentTheme}">${word}</span>`;
      })
      .join(" ");
    
    textRef.current.innerHTML = newHTML;
  }, [text, highlightWords, highlightClass, currentTheme]);

  // Handle trigger setup
  useEffect(() => {
    if (trigger === "auto") {
      setEffectStarted(true);
      return;
    }
    
    if (trigger === "scroll" && containerRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setEffectStarted(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [trigger]);

  // Matter.js physics animation
  useEffect(() => {
    if (!effectStarted) return;

    const {
      Engine,
      Render,
      World,
      Bodies,
      Runner,
      Mouse,
      MouseConstraint,
    } = Matter;

    const containerRect = containerRef.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = Math.max(containerRect.height, 400); // Minimum height for animation

    if (width <= 0 || height <= 0) {
      return;
    }

    const engine = Engine.create();
    engine.world.gravity.y = gravity;

    const render = Render.create({
      element: canvasContainerRef.current,
      engine,
      options: {
        width,
        height,
        background: backgroundColor,
        wireframes,
        showVelocity: false,
        showAngleIndicator: false,
        showDebug: false,
      },
    });

    const boundaryOptions = {
      isStatic: true,
      render: { fillStyle: "transparent" },
    };

    // Create boundaries
    const floor = Bodies.rectangle(width / 2, height + 25, width, 50, boundaryOptions);
    const leftWall = Bodies.rectangle(-25, height / 2, 50, height, boundaryOptions);
    const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, boundaryOptions);
    const ceiling = Bodies.rectangle(width / 2, -25, width, 50, boundaryOptions);

    const wordSpans = textRef.current.querySelectorAll(".word");
    const wordBodies = [...wordSpans].map((elem, index) => {
      const rect = elem.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      const x = rect.left - containerRect.left + rect.width / 2;
      const y = rect.top - containerRect.top + rect.height / 2;
      
      const body = Bodies.rectangle(x, y, rect.width, rect.height, {
        render: { fillStyle: "transparent" },
        restitution: 0.8,
        frictionAir: 0.01,
        friction: 0.2,
        density: 0.001,
      });

      // Add some random initial velocity for natural movement
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 3,
        y: Math.random() * -2
      });
      
      // Add slight rotation
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);

      return { elem, body };
    });

    // Position elements initially
    wordBodies.forEach(({ elem, body }) => {
      elem.style.position = "absolute";
      elem.style.left = `${body.position.x}px`;
      elem.style.top = `${body.position.y}px`;
      elem.style.transform = "translate(-50%, -50%)";
      elem.style.pointerEvents = "none";
    });

    // Mouse interaction
    const mouse = Mouse.create(containerRef.current);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: mouseConstraintStiffness,
        render: { visible: false },
      },
    });

    render.mouse = mouse;

    World.add(engine.world, [
      floor,
      leftWall,
      rightWall,
      ceiling,
      mouseConstraint,
      ...wordBodies.map((wb) => wb.body),
    ]);

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    // Animation loop
    const updateLoop = () => {
      wordBodies.forEach(({ body, elem }) => {
        const { x, y } = body.position;
        elem.style.left = `${x}px`;
        elem.style.top = `${y}px`;
        elem.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
      });
      requestAnimationFrame(updateLoop);
    };

    updateLoop();

    // Cleanup
    return () => {
      Render.stop(render);
      Runner.stop(runner);
      if (render.canvas && canvasContainerRef.current && canvasContainerRef.current.contains(render.canvas)) {
        canvasContainerRef.current.removeChild(render.canvas);
      }
      World.clear(engine.world);
      Engine.clear(engine);
    };
  }, [
    effectStarted,
    gravity,
    wireframes,
    backgroundColor,
    mouseConstraintStiffness,
    currentTheme,
  ]);

  const handleTrigger = () => {
    if (!effectStarted && (trigger === "click" || trigger === "hover")) {
      setEffectStarted(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`falling-text-container ${className}`}
      data-theme={currentTheme}
      onClick={trigger === "click" ? handleTrigger : undefined}
      onMouseEnter={trigger === "hover" ? handleTrigger : undefined}
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: "400px",
        width: "100%",
      }}
    >
      <div
        ref={textRef}
        className="falling-text-target"
        data-theme={currentTheme}
        style={{
          fontSize: fontSize,
          lineHeight: 1.4,
        }}
      />
      <div ref={canvasContainerRef} className="falling-text-canvas" />
    </div>
  );
};

export default FallingText;
