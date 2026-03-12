import React from "react";
import * as THREE from "three";
import "./ThreeOrbitSplash.css";

const MAX_VISIBLE_TOOLS = 12;
const MAX_FIXED_TOOLS = MAX_VISIBLE_TOOLS - 1;
const CENTER_SAFE_RADIUS = 500;

const TOOL_POSITION_MAP = [
  { name: "Playwright", top: "12%", left: "10%" },
  { name: "Selenium", top: "25%", left: "8%" },
  { name: "RestAssured", top: "40%", left: "6%" },
  { name: "TestNG", top: "55%", left: "9%" },
  { name: "API Testing", top: "70%", left: "12%" },
  { name: "Amazon Nova Act", top: "82%", left: "18%" },
  { name: "Postman", top: "10%", left: "88%" },
  { name: "JMeter", top: "28%", left: "92%" },
  { name: "JUnit", top: "42%", left: "90%" },
  { name: "Docker", top: "58%", left: "91%" },
  { name: "Browser Use AI", top: "75%", left: "86%" },
];

const SHOOTING_STAR_TOOLS = ["Cypress", "K6"];

function getEffectiveSafeRadius() {
  return CENTER_SAFE_RADIUS;
}

function distance(pointX, pointY, centerX, centerY) {
  return Math.hypot(pointX - centerX, pointY - centerY);
}

function isOutsideSafeZone(position, viewportWidth, viewportHeight, safeRadius, centerPoint) {
  const leftPercent = Number.parseFloat(position.left);
  const topPercent = Number.parseFloat(position.top);

  const pointX = (leftPercent / 100) * viewportWidth;
  const pointY = (topPercent / 100) * viewportHeight;

  const centerX = centerPoint?.x ?? viewportWidth / 2;
  const centerY = centerPoint?.y ?? viewportHeight / 2;

  return distance(pointX, pointY, centerX, centerY) >= safeRadius;
}

function buildFixedTools(viewportWidth, viewportHeight, safeRadius, centerPoint) {
  return TOOL_POSITION_MAP.filter((item) => isOutsideSafeZone(item, viewportWidth, viewportHeight, safeRadius, centerPoint))
    .slice(0, MAX_FIXED_TOOLS)
    .map((item, index) => ({
      ...item,
      floatDelay: `${(index * 0.35).toFixed(2)}s`,
    }));
}

function createShootingStar(starIndex, viewportWidth, viewportHeight) {
  const toolName = SHOOTING_STAR_TOOLS[starIndex % SHOOTING_STAR_TOOLS.length];
  const fromRight = starIndex % 2 === 0;

  if (fromRight) {
    return {
      id: `${toolName}-${Date.now()}-${starIndex}`,
      name: toolName,
      startX: viewportWidth + 150,
      startY: 78,
      endX: viewportWidth - 230,
      endY: viewportHeight * 0.48,
    };
  }

  return {
    id: `${toolName}-${Date.now()}-${starIndex}`,
    name: toolName,
    startX: -150,
    startY: viewportHeight - 120,
    endX: 220,
    endY: viewportHeight * 0.42,
  };
}

function ThreeOrbitSplash({ theme, isExiting }) {
  const canvasRef = React.useRef(null);
  const rootRef = React.useRef(null);
  const badgeWrapRef = React.useRef(null);
  const badgeRef = React.useRef(null);
  const shootingCursorRef = React.useRef(0);

  const [safeRadius, setSafeRadius] = React.useState(CENTER_SAFE_RADIUS);
  const [fixedTools, setFixedTools] = React.useState([]);
  const [shootingStar, setShootingStar] = React.useState(null);
  const [orbitCenter, setOrbitCenter] = React.useState({ xRatio: 0.5, yRatio: 0.5 });

  React.useEffect(() => {
    const rootElement = rootRef.current;
    if (!rootElement) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      rootElement.style.setProperty("--parallax-x", "0px");
      rootElement.style.setProperty("--parallax-y", "0px");
      return undefined;
    }

    const pointer = {
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
    };

    let rafId = null;

    const onPointerMove = (event) => {
      const normalizedX = (event.clientX / window.innerWidth - 0.5) * 2;
      const normalizedY = (event.clientY / window.innerHeight - 0.5) * 2;
      pointer.targetX = normalizedX * 14;
      pointer.targetY = normalizedY * 10;
    };

    const animatePointer = () => {
      pointer.currentX += (pointer.targetX - pointer.currentX) * 0.08;
      pointer.currentY += (pointer.targetY - pointer.currentY) * 0.08;
      rootElement.style.setProperty("--parallax-x", `${pointer.currentX.toFixed(2)}px`);
      rootElement.style.setProperty("--parallax-y", `${pointer.currentY.toFixed(2)}px`);
      rafId = window.requestAnimationFrame(animatePointer);
    };

    window.addEventListener("mousemove", onPointerMove, { passive: true });
    animatePointer();

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("mousemove", onPointerMove);
    };
  }, []);

  React.useEffect(() => {
    const rootElement = rootRef.current;
    const badgeWrapElement = badgeRef.current;

    if (!rootElement || !badgeWrapElement) {
      return undefined;
    }

    let rafId = null;

    const syncOrbitCenter = () => {
      const rootRect = rootElement.getBoundingClientRect();
      const badgeRect = badgeWrapElement.getBoundingClientRect();

      if (!rootRect.width || !rootRect.height) {
        return;
      }

      const centerX = badgeRect.left + badgeRect.width / 2 - rootRect.left;
      const centerY = badgeRect.top + badgeRect.height / 2 - rootRect.top;
      const xRatio = THREE.MathUtils.clamp(centerX / rootRect.width, 0, 1);
      const yRatio = THREE.MathUtils.clamp(centerY / rootRect.height, 0, 1);

      setOrbitCenter((current) => {
        const deltaX = Math.abs(current.xRatio - xRatio);
        const deltaY = Math.abs(current.yRatio - yRatio);

        if (deltaX < 0.001 && deltaY < 0.001) {
          return current;
        }

        return { xRatio, yRatio };
      });
    };

    const scheduleSync = () => {
      syncOrbitCenter();
      rafId = window.requestAnimationFrame(scheduleSync);
    };

    scheduleSync();

    const onResize = () => {
      syncOrbitCenter();
    };

    window.addEventListener("resize", onResize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncOrbitCenter);
      resizeObserver.observe(rootElement);
      resizeObserver.observe(badgeWrapElement);
    }

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }

      window.removeEventListener("resize", onResize);

      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  React.useEffect(() => {
    const applyLayout = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const nextSafeRadius = getEffectiveSafeRadius();
      const centerPoint = {
        x: viewportWidth * orbitCenter.xRatio,
        y: viewportHeight * orbitCenter.yRatio,
      };

      setSafeRadius(nextSafeRadius);
      setFixedTools(buildFixedTools(viewportWidth, viewportHeight, nextSafeRadius, centerPoint));
    };

    applyLayout();
    window.addEventListener("resize", applyLayout);

    return () => {
      window.removeEventListener("resize", applyLayout);
    };
  }, [orbitCenter.xRatio, orbitCenter.yRatio]);

  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return undefined;
    }

    let clearStarTimeoutId = null;

    const showStar = () => {
      const starIndex = shootingCursorRef.current;
      shootingCursorRef.current += 1;

      const star = createShootingStar(starIndex, window.innerWidth, window.innerHeight);
      setShootingStar(star);

      clearStarTimeoutId = window.setTimeout(() => {
        setShootingStar((current) => (current && current.id === star.id ? null : current));
      }, 1500);
    };

    const initialTimeoutId = window.setTimeout(showStar, 1800);
    const intervalId = window.setInterval(showStar, 5000);

    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
      if (clearStarTimeoutId) {
        window.clearTimeout(clearStarTimeoutId);
      }
    };
  }, []);

  React.useEffect(() => {
    const mount = canvasRef.current;

    if (!mount) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth <= 768;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(56, mount.clientWidth / mount.clientHeight, 0.1, 80);
    camera.position.set(0, 0, 13);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x67c8ff, 0.95);
    scene.add(ambient);

    const pointLight = new THREE.PointLight(0x8fdcff, 1.4, 36);
    pointLight.position.set(0, 0, 10);
    scene.add(pointLight);

    const particlesCount = isMobile ? 100 : 180;
    const particlePositions = new Float32Array(particlesCount * 3);

    for (let index = 0; index < particlesCount; index += 1) {
      const pointer = index * 3;
      particlePositions[pointer] = (Math.random() - 0.5) * 28;
      particlePositions[pointer + 1] = (Math.random() - 0.5) * 16;
      particlePositions[pointer + 2] = (Math.random() - 0.5) * 18;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      color: 0x8fd8ff,
      size: isMobile ? 0.05 : 0.06,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    const centerGroup = new THREE.Group();

    const centerMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 40, 40),
      new THREE.MeshPhongMaterial({
        color: 0x2458d5,
        emissive: 0x153488,
        emissiveIntensity: 1.15,
        shininess: 85,
        transparent: true,
        opacity: 0.94,
      })
    );

    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.03, 18, 120),
      new THREE.MeshBasicMaterial({
        color: 0x8edbff,
        transparent: true,
        opacity: 0.7,
      })
    );
    ringMesh.rotation.x = 0;

    centerGroup.add(centerMesh);
    centerGroup.add(ringMesh);
    centerGroup.position.set(0, 0, 0);
    centerGroup.scale.setScalar(0.001);
    scene.add(centerGroup);

    const syncCenterGroupPosition = () => {
      const rootElement = rootRef.current;
      const badgeWrapElement = badgeRef.current;

      if (!rootElement || !badgeWrapElement) {
        return;
      }

      const rootRect = rootElement.getBoundingClientRect();
      const badgeRect = badgeWrapElement.getBoundingClientRect();

      if (!rootRect.width || !rootRect.height) {
        return;
      }

      const centerX = badgeRect.left + badgeRect.width / 2 - rootRect.left;
      const centerY = badgeRect.top + badgeRect.height / 2 - rootRect.top;
      const ndcX = (centerX / rootRect.width) * 2 - 1;
      const ndcY = -(centerY / rootRect.height) * 2 + 1;

      const projected = new THREE.Vector3(ndcX, ndcY, 0.5);
      projected.unproject(camera);

      const direction = projected.sub(camera.position).normalize();
      if (Math.abs(direction.z) < 0.0001) {
        return;
      }

      const distanceToScenePlane = -camera.position.z / direction.z;
      if (!Number.isFinite(distanceToScenePlane)) {
        return;
      }

      const scenePoint = camera.position.clone().add(direction.multiplyScalar(distanceToScenePlane));
      centerGroup.position.copy(scenePoint);
    };

    syncCenterGroupPosition();

    const mouse = { targetX: 0, targetY: 0 };

    const handlePointerMove = (event) => {
      const normalizedX = (event.clientX / window.innerWidth) * 2 - 1;
      const normalizedY = (event.clientY / window.innerHeight) * 2 - 1;
      mouse.targetX = normalizedX * 0.18;
      mouse.targetY = -normalizedY * 0.12;
    };

    const handleResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
      syncCenterGroupPosition();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handlePointerMove, { passive: true });

    const clock = new THREE.Clock();
    let animationFrameId = null;

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      const particlesReveal = THREE.MathUtils.clamp((elapsed - 0.05) / 0.6, 0, 1);
      particlesMaterial.opacity = particlesReveal * 0.78;

      const centerReveal = THREE.MathUtils.clamp((elapsed - 0.35) / 0.55, 0, 1);
      centerGroup.scale.setScalar(Math.max(centerReveal, 0.001));

      syncCenterGroupPosition();

      ringMesh.rotation.z += delta * 0.45;
      ringMesh.rotation.y += delta * 0.18;

      const pulse = 1 + Math.sin(elapsed * 2.6) * 0.03;
      centerMesh.scale.setScalar(pulse);

      particles.rotation.y += delta * 0.04;
      particles.rotation.x += delta * 0.02;

      centerGroup.rotation.y += (mouse.targetX * 0.4 - centerGroup.rotation.y) * 0.04;
      centerGroup.rotation.x += (mouse.targetY * 0.35 - centerGroup.rotation.x) * 0.04;

      renderer.render(scene, camera);
      animationFrameId = window.requestAnimationFrame(animate);
    };

    renderer.render(scene, camera);

    if (!prefersReducedMotion) {
      animate();
    }

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handlePointerMove);

      particlesGeometry.dispose();
      particlesMaterial.dispose();
      centerMesh.geometry.dispose();
      centerMesh.material.dispose();
      ringMesh.geometry.dispose();
      ringMesh.material.dispose();

      renderer.dispose();

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  const splashBackground = theme?.splashBg || "#081a40";
  const visibleToolsCount = fixedTools.length + (shootingStar ? 1 : 0);

  return (
    <section
      ref={rootRef}
      className={`three-splash ${isExiting ? "is-exiting" : ""}`}
      style={{
        "--splash-bg": splashBackground,
        "--safe-radius": `${safeRadius}px`,
        "--orbit-center-x": `${(orbitCenter.xRatio * 100).toFixed(2)}%`,
        "--orbit-center-y": `${(orbitCenter.yRatio * 100).toFixed(2)}%`,
      }}
      aria-label="Portfolio initialization splash"
    >
      <div className="three-splash__canvas" ref={canvasRef}></div>

      <div className="three-splash__tools-layer" aria-hidden="true">
        <div className="three-splash__orbit-rings"></div>
        <div className="three-splash__safe-zone"></div>

        {fixedTools.map((tool) => (
          <span
            key={tool.name}
            className="fixed-tool"
            style={{
              top: tool.top,
              left: tool.left,
              "--float-delay": tool.floatDelay,
            }}
          >
            {tool.name}
          </span>
        ))}

        {shootingStar && (
          <span
            key={shootingStar.id}
            className="shooting-tool"
            style={{
              "--sx": `${shootingStar.startX}px`,
              "--sy": `${shootingStar.startY}px`,
              "--ex": `${shootingStar.endX}px`,
              "--ey": `${shootingStar.endY}px`,
            }}
          >
            {shootingStar.name}
          </span>
        )}
      </div>

      <div className="three-splash__grid" aria-hidden="true"></div>
      <div className="three-splash__vignette" aria-hidden="true"></div>

      <div className="three-splash__content">
        <div className="three-splash__badge-wrap" ref={badgeWrapRef}>
          <div className="three-splash__badge" ref={badgeRef}>SDET</div>
        </div>

        <h1 className="three-splash__name">Aayush Mishra</h1>
        <p className="three-splash__role">Software Development Engineer in Test</p>
        <p className="three-splash__loading">Initializing Automation Portfolio...</p>
        <p className="three-splash__meta" aria-hidden="true">
          Tool Layer Active: {visibleToolsCount} / {MAX_VISIBLE_TOOLS}
        </p>
      </div>
    </section>
  );
}

export default ThreeOrbitSplash;