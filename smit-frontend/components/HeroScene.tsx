"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

gsap.registerPlugin(ScrollTrigger);

type MouseVec = { x: number; y: number };

interface ParticleMesh extends THREE.Mesh {
  userData: { speed: number; phase: number; startX: number; startY: number; direction: THREE.Vector3 };
}

const SCREEN_MODES = ["terminal", "code", "status", "matrix", "analysis"] as const;
type ScreenMode = typeof SCREEN_MODES[number];

const TERMINAL_LINES = [
  "$ smit --analyze submission.py",
  "Initializing AI core...",
  "Loading neural pathways...",
  ">> Code review complete",
  ">> Score: 85/100",
  ">> Grade: B+",
  "Mistakes found: 3",
  "  [LOGIC] Line 12: off-by-one error",
  "  [NAMING] Line 8: variable 'x' unclear",
  "  [STYLE] Line 1: missing docstring",
  "Generating corrections...",
  "Roman Urdu: Aap ka code acha hai...",
  "Suggestions: Use meaningful names",
  "Next topic: Design Patterns",
  "",
  "$ _",
];

const CODE_LINES = [
  "def analyze_code(source):",
  '    """AI-powered code analysis."""',
  "    mistakes = []",
  "    score = 100",
  "    for i, line in enumerate(source):",
  '        if "TODO" in line:',
  '            mistakes.append({',
  '                "type": "style",',
  '                "line": i + 1,',
  '                "desc": "Remove TODOs"',
  "            })",
  "            score -= 5",
  "    return {",
  '        "score": score,',
  '        "mistakes": mistakes',
  "    }",
];

const STATUS_LINES = [
  "╔══════════════════════════════╗",
  "║    SYNAPSE SYSTEM STATUS     ║",
  "╠══════════════════════════════╣",
  "║ Agent 1: Code Review  [OK]  ║",
  "║ Agent 2: Tutor        [OK]  ║",
  "║ Agent 3: Rubric       [OK]  ║",
  "║ Agent 4: Feedback     [OK]  ║",
  "╠══════════════════════════════╣",
  "║ CPU Usage:    42%           ║",
  "║ Memory:       2.1GB / 8GB   ║",
  "║ Active Jobs:  3             ║",
  "║ Queue:        0             ║",
  "╚══════════════════════════════╝",
];

const ANALYSIS_LINES = [
  ">> SYNAPSE CODE ANALYSIS ENGINE",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "",
  "▶ Scanning submission.py...",
  "  [████████████████████░░░░] 78%",
  "",
  "✓ Syntax check:      PASS",
  "✓ Import validation: PASS",
  "✗ Logic analysis:    3 issues",
  "✓ Style compliance:  PASS",
  "",
  "📊 Score: 85/100  Grade: B+",
  "",
  "🔍 Mistakes detected:",
  "   L12: Off-by-one error [LOGIC]",
  "   L8:  Variable 'x' unclear [NAME]",
  "   L1:  Missing docstring [STYLE]",
  "",
  "💡 Generating corrections...",
  "   >> Tutor agent: Explaining...",
  "   >> Feedback agent: Ready",
  "",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "ANALYSIS COMPLETE // 2.4s",
];

function createScreenCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  return canvas;
}

function drawScreenContent(canvas: HTMLCanvasElement, mode: ScreenMode, time: number, charIndex: number) {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#0a0a12";
  ctx.fillRect(0, 0, w, h);

  if (mode === "matrix") {
    ctx.fillStyle = "#00A693";
    ctx.font = "12px monospace";
    const cols = Math.floor(w / 12);
    for (let c = 0; c < cols; c++) {
      const x = c * 12;
      const speed = 0.5 + (c % 5) * 0.3;
      const yOff = ((time * speed * 60 + c * 30) % (h + 100)) - 50;
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*";
      for (let r = 0; r < 8; r++) {
        const yy = yOff + r * 14;
        if (yy > 0 && yy < h) {
          const alpha = r === 0 ? 1.0 : Math.max(0, 1.0 - r * 0.15);
          ctx.fillStyle = `rgba(0,166,147,${alpha})`;
          const ch = chars[Math.floor((time * 3 + c + r) * 7) % chars.length];
          ctx.fillText(ch, x, yy);
        }
      }
    }
    return;
  }

  if (mode === "analysis") {
    const lines = ANALYSIS_LINES;
    ctx.font = "12px monospace";
    const lineHeight = 14;
    const startY = 12;
    const maxVisible = Math.floor((h - 24) / lineHeight);
    const visibleLines = lines.slice(0, maxVisible);

    for (let i = 0; i < visibleLines.length; i++) {
      const line = visibleLines[i];
      const y = startY + i * lineHeight;
      const drawLen = Math.min(line.length, Math.floor(charIndex - i * 2));
      if (drawLen <= 0) continue;

      const drawn = line.substring(0, drawLen);

      if (line.startsWith("✓")) ctx.fillStyle = "#00FF66";
      else if (line.startsWith("✗")) ctx.fillStyle = "#FF6B6B";
      else if (line.startsWith("▶")) ctx.fillStyle = "#FFB347";
      else if (line.startsWith("📊")) ctx.fillStyle = "#00f0ff";
      else if (line.startsWith("🔍")) ctx.fillStyle = "#7c3aed";
      else if (line.startsWith("💡")) ctx.fillStyle = "#FFB347";
      else if (line.startsWith("   L")) ctx.fillStyle = "#FF6B6B";
      else if (line.startsWith("   >>")) ctx.fillStyle = "#00A693";
      else if (line.startsWith("━")) ctx.fillStyle = "#00A693";
      else if (line.includes("[")) ctx.fillStyle = "#48CAE4";
      else ctx.fillStyle = "#00A693";

      ctx.fillText(drawn, 10, y);
    }

    if (Math.floor(time * 2) % 2 === 0) {
      const lastVisibleIdx = Math.min(visibleLines.length - 1, Math.floor(charIndex / 2));
      if (lastVisibleIdx >= 0) {
        const lastLine = visibleLines[lastVisibleIdx] || "";
        const cursorX = 10 + ctx.measureText(lastLine.substring(0, Math.min(lastLine.length, Math.floor(charIndex - lastVisibleIdx * 2)))).width;
        ctx.fillStyle = "#00A693";
        ctx.fillRect(cursorX, startY + lastVisibleIdx * lineHeight - 10, 7, 12);
      }
    }
    return;
  }

  const lines = mode === "terminal" ? TERMINAL_LINES : mode === "code" ? CODE_LINES : STATUS_LINES;
  ctx.font = "13px monospace";
  const lineHeight = 18;
  const startY = 16;
  const maxVisible = Math.floor((h - 32) / lineHeight);
  const visibleLines = lines.slice(0, maxVisible);

  for (let i = 0; i < visibleLines.length; i++) {
    const line = visibleLines[i];
    const y = startY + i * lineHeight;

    if (mode === "terminal") {
      ctx.fillStyle = line.startsWith("$") ? "#00FF66" : line.startsWith(">>") ? "#FFB347" : line.includes("[") ? "#FF6B6B" : "#00A693";
      const drawLen = Math.min(line.length, Math.floor(charIndex - i * 3));
      if (drawLen > 0) ctx.fillText(line.substring(0, drawLen), 12, y);
      if (i === visibleLines.length - 1 && Math.floor(time * 2) % 2 === 0) {
        const cursorX = 12 + ctx.measureText(line.substring(0, Math.min(drawLen, line.length))).width;
        ctx.fillStyle = "#00A693";
        ctx.fillRect(cursorX, y - 11, 8, 14);
      }
    } else if (mode === "code") {
      ctx.fillStyle = line.trim().startsWith("def ") || line.trim().startsWith("class ") ? "#FFB347" :
        line.includes('"""') || line.includes("'") ? "#48CAE4" : line.includes("#") || line.trim().startsWith("return") ? "#9B59B6" : "#00A693";
      const drawLen = Math.min(line.length, Math.floor(charIndex - i * 2));
      if (drawLen > 0) ctx.fillText(line.substring(0, drawLen), 12, y);
      if (i === visibleLines.length - 1 && Math.floor(time * 2) % 2 === 0) {
        const cursorX = 12 + ctx.measureText(line.substring(0, Math.min(drawLen, line.length))).width;
        ctx.fillStyle = "#00A693";
        ctx.fillRect(cursorX, y - 11, 8, 14);
      }
    } else {
      ctx.fillStyle = i === 0 || i === visibleLines.length - 1 ? "#00FF66" : line.includes("[OK]") ? "#00A693" : "#48CAE4";
      ctx.fillText(line, 12, y);
    }
  }
}

export default function HeroScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const animFrameIdRef = useRef<number>(0);
  const mouseTargetRef = useRef<MouseVec>({ x: 0, y: 0 });
  const mouseCurrentRef = useRef<MouseVec>({ x: 0, y: 0 });
  const screenModeRef = useRef<ScreenMode>("terminal");
  const screenOnRef = useRef(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(0, 2.8, 7.5);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // ── Post-processing (Bloom/Glow) ──
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.8,   // strength
      0.4,   // radius
      0.85   // threshold
    );
    composer.addPass(bloomPass);

    // ── Tech Universe Background ──

    // Starfield
    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      const isTeal = Math.random() > 0.3;
      starColors[i * 3] = isTeal ? 0.0 : 0.3;
      starColors[i * 3 + 1] = isTeal ? 0.65 : 0.4;
      starColors[i * 3 + 2] = isTeal ? 0.58 : 1.0;
      starSizes[i] = Math.random() * 2.0 + 0.5;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));
    const starMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Grid plane (floor grid)
    const gridHelper = new THREE.GridHelper(60, 40, 0x00A693, 0x003D36);
    gridHelper.position.y = -1.5;
    (gridHelper.material as THREE.Material).opacity = 0.15;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // Floating hexagons in background
    const hexagons: THREE.Mesh[] = [];
    const hexGeo = new THREE.RingGeometry(0.3, 0.4, 6);
    const hexMat = new THREE.MeshBasicMaterial({ color: 0x00A693, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    for (let i = 0; i < 20; i++) {
      const hex = new THREE.Mesh(hexGeo, hexMat.clone());
      hex.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 15 + 3,
        (Math.random() - 0.5) * 30 - 10
      );
      hex.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      hex.userData = { rotSpeed: 0.002 + Math.random() * 0.005, floatPhase: Math.random() * Math.PI * 2 };
      scene.add(hex);
      hexagons.push(hex);
    }

    // Laser grid lines on floor
    const laserMat = new THREE.LineBasicMaterial({ color: 0x00A693, transparent: true, opacity: 0.08 });
    for (let i = -30; i <= 30; i += 6) {
      const pts1 = [new THREE.Vector3(i, -1.49, -30), new THREE.Vector3(i, -1.49, 30)];
      const pts2 = [new THREE.Vector3(-30, -1.49, i), new THREE.Vector3(30, -1.49, i)];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), laserMat));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), laserMat));
    }

    // ── Raycaster ──
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hoverables: THREE.Object3D[] = [];

    // ── Screen Canvas Texture ──
    const screenCanvas = createScreenCanvas();
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.minFilter = THREE.LinearFilter;
    screenTexture.magFilter = THREE.LinearFilter;

    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissive: 0x00A693,
      emissiveIntensity: 0.4,
      emissiveMap: screenTexture,
      roughness: 0.0,
      metalness: 0.0,
    });

    // ── Materials ──
    const MAT = {
      desk: new THREE.MeshStandardMaterial({ color: 0x5C3D2E, roughness: 0.8, metalness: 0.05 }),
      deskTop: new THREE.MeshStandardMaterial({ color: 0x7A5230, roughness: 0.6, metalness: 0.05 }),
      monitor: new THREE.MeshStandardMaterial({ color: 0x1A1A2E, roughness: 0.3, metalness: 0.6 }),
      monitorBezel: new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.4, metalness: 0.5 }),
      keyboard: new THREE.MeshStandardMaterial({ color: 0x2A2A3A, roughness: 0.5, metalness: 0.3 }),
      keycap: new THREE.MeshStandardMaterial({ color: 0x3A3A4A, roughness: 0.4, metalness: 0.2 }),
      keycapAccent: new THREE.MeshStandardMaterial({ color: 0x00A693, roughness: 0.3, metalness: 0.3, emissive: 0x00A693, emissiveIntensity: 0.4 }),
      mouse: new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.4, metalness: 0.4 }),
      mouseBtn: new THREE.MeshStandardMaterial({ color: 0x1A1A28, roughness: 0.5, metalness: 0.2 }),
      cpu: new THREE.MeshStandardMaterial({ color: 0x1C1C2E, roughness: 0.3, metalness: 0.7 }),
      cpuPanel: new THREE.MeshStandardMaterial({ color: 0x00A693, roughness: 0.2, metalness: 0.8, emissive: 0x00A693, emissiveIntensity: 0.5 }),
      cpuVent: new THREE.MeshStandardMaterial({ color: 0x0D0D1A, roughness: 0.6, metalness: 0.4 }),
      cable: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.0 }),
      speakerMesh: new THREE.MeshStandardMaterial({ color: 0x0A0A0A, roughness: 0.9 }),
      metalDark: new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.3, metalness: 0.8 }),
      glowTeal: new THREE.MeshStandardMaterial({ color: 0x00A693, emissive: 0x00A693, emissiveIntensity: 1.2, roughness: 0, metalness: 0 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x0D1117, roughness: 0.9, metalness: 0.0 }),
      scanLine: new THREE.MeshStandardMaterial({ color: 0xDFFFFC, emissive: 0xDFFFFC, emissiveIntensity: 0.3 }),
      hddLed: new THREE.MeshStandardMaterial({ color: 0x00FFCC, emissive: 0x00FFCC, emissiveIntensity: 2.0 }),
      speakerCone: new THREE.MeshStandardMaterial({ color: 0x00A693, emissive: 0x00A693, emissiveIntensity: 0.3 }),
      mug: new THREE.MeshStandardMaterial({ color: 0x2A4A8A, roughness: 0.5 }),
      plantPot: new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }),
      soil: new THREE.MeshStandardMaterial({ color: 0x3A2010, roughness: 1.0 }),
      plant: new THREE.MeshStandardMaterial({ color: 0x1A6B2A, roughness: 0.9 }),
      notepad: new THREE.MeshStandardMaterial({ color: 0xF5F0E8, roughness: 0.9 }),
      pen: new THREE.MeshStandardMaterial({ color: 0x1A1A2E, roughness: 0.4, metalness: 0.6 }),
      steam: new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 0.2, transparent: true, opacity: 0.5 }),
    };

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0x334455, 0.8));

    const keyLight = new THREE.DirectionalLight(0xCCDDFF, 1.8);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    scene.add(keyLight);

    const screenLight = new THREE.PointLight(0x00A693, 3.0, 6, 2);
    screenLight.position.set(0, 1.8, 2.0);
    scene.add(screenLight);

    const cpuLight = new THREE.PointLight(0x00FFCC, 2.0, 4, 2);
    cpuLight.position.set(3.0, 0.6, 0.5);
    scene.add(cpuLight);

    const warmLight = new THREE.PointLight(0x7A5230, 0.6, 10, 2);
    warmLight.position.set(-3, -0.5, 3);
    scene.add(warmLight);

    const rimLight = new THREE.DirectionalLight(0x4466FF, 0.4);
    rimLight.position.set(-4, 3, -5);
    scene.add(rimLight);

    // ── Floor ──
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), MAT.floor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1.0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // ── Desk ──
    const deskGroup = new THREE.Group();
    deskGroup.name = "deskGroup";
    scene.add(deskGroup);

    const deskTopMesh = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.12, 2.2), MAT.deskTop);
    deskTopMesh.castShadow = true;
    deskTopMesh.receiveShadow = true;
    deskGroup.add(deskTopMesh);

    const legGeo = new THREE.BoxGeometry(0.12, 1.0, 0.12);
    for (const [x, y, z] of [[-2.6, -0.56, 0.9], [2.6, -0.56, 0.9], [-2.6, -0.56, -0.9], [2.6, -0.56, -0.9]] as [number, number, number][]) {
      const leg = new THREE.Mesh(legGeo, MAT.desk);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      deskGroup.add(leg);
    }

    const crossGeo = new THREE.BoxGeometry(0.08, 0.08, 1.8);
    const leftCross = new THREE.Mesh(crossGeo, MAT.desk);
    leftCross.position.set(-2.6, -0.85, 0);
    leftCross.castShadow = true;
    deskGroup.add(leftCross);
    const rightCross = new THREE.Mesh(crossGeo, MAT.desk);
    rightCross.position.set(2.6, -0.85, 0);
    rightCross.castShadow = true;
    deskGroup.add(rightCross);

    // ── Monitor ──
    const monitorGroup = new THREE.Group();
    monitorGroup.name = "monitorGroup";
    monitorGroup.position.set(0, 0.06, -0.4);
    deskGroup.add(monitorGroup);

    monitorGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.40, 0.05, 32), MAT.monitor));
    const standNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.55, 16), MAT.monitor);
    standNeck.position.set(0, 0.30, 0);
    monitorGroup.add(standNeck);
    const standArm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.40, 0.05), MAT.monitor);
    standArm.position.set(0, 0.72, -0.08);
    standArm.rotation.x = -0.15;
    monitorGroup.add(standArm);

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(2.20, 1.35, 0.07), MAT.monitorBezel);
    bezel.position.set(0, 1.35, 0);
    bezel.castShadow = true;
    bezel.receiveShadow = true;
    monitorGroup.add(bezel);

    const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(2.00, 1.16, 0.02), screenMat);
    screenMesh.position.set(0, 1.36, 0.038);
    monitorGroup.add(screenMesh);
    hoverables.push(screenMesh);

    const scanLines: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.003, 0.01), MAT.scanLine.clone());
      line.position.set(0, 0.82 + (i / 7) * (1.08), 0.050);
      monitorGroup.add(line);
      scanLines.push(line);
    }

    const topGlow = new THREE.Mesh(new THREE.BoxGeometry(2.20, 0.008, 0.02), MAT.glowTeal);
    topGlow.position.set(0, 2.04, 0.025);
    monitorGroup.add(topGlow);

    // ── Keyboard ──
    const keyboardGroup = new THREE.Group();
    keyboardGroup.name = "keyboardGroup";
    keyboardGroup.position.set(0, 0.065, 0.55);
    keyboardGroup.rotation.x = -0.08;
    deskGroup.add(keyboardGroup);

    keyboardGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.80, 0.055, 0.62), MAT.keyboard));
    const kbSlope = new THREE.Mesh(new THREE.BoxGeometry(1.80, 0.015, 0.62), MAT.keyboard);
    kbSlope.position.set(0, 0.035, 0);
    kbSlope.rotation.x = 0.06;
    keyboardGroup.add(kbSlope);

    const keyMeshes: THREE.Mesh[] = [];
    const rowConfigs = [
      { cols: 14, z: -0.24, y: 0.038 },
      { cols: 14, z: -0.14, y: 0.038 },
      { cols: 13, z: -0.04, y: 0.038 },
      { cols: 12, z: 0.06, y: 0.038 },
      { cols: 11, z: 0.16, y: 0.038 },
    ];

    const accentIndices = new Set([3, 4, 5, 20, 40, 55]);
    let keyIdx = 0;
    for (const rc of rowConfigs) {
      const totalW = rc.cols * 0.105 + (rc.cols - 1) * 0.015;
      const startX = -totalW / 2 + 0.0525;
      for (let c = 0; c < rc.cols; c++) {
        const mat = accentIndices.has(keyIdx) ? MAT.keycapAccent : MAT.keycap;
        const key = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.022, 0.095), mat);
        key.position.set(startX + c * 0.12, rc.y, rc.z);
        (key as any).userData.origY = rc.y;
        keyboardGroup.add(key);
        keyMeshes.push(key);
        hoverables.push(key);
        keyIdx++;
      }
    }

    const spaceBar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.022, 0.095), MAT.keycapAccent);
    spaceBar.position.set(0, 0.038, 0.24);
    (spaceBar as any).userData.origY = 0.038;
    keyboardGroup.add(spaceBar);
    keyMeshes.push(spaceBar);
    hoverables.push(spaceBar);

    const kbUnderglow = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.006, 0.02), MAT.glowTeal);
    kbUnderglow.position.set(0, -0.010, 0.32);
    keyboardGroup.add(kbUnderglow);

    // ── Mouse ──
    const mouseGroup = new THREE.Group();
    mouseGroup.name = "mouseGroup";
    mouseGroup.position.set(1.25, 0.065, 0.55);
    deskGroup.add(mouseGroup);

    const mouseBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.10, 32), MAT.mouse);
    mouseBody.scale.set(0.75, 1, 1.6);
    mouseBody.castShadow = true;
    mouseGroup.add(mouseBody);

    const mouseDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45), MAT.mouse);
    mouseDome.position.set(0, 0.05, 0);
    mouseDome.scale.set(0.75, 1, 1.6);
    mouseDome.castShadow = true;
    mouseGroup.add(mouseDome);

    const leftBtn = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.18), MAT.mouseBtn);
    leftBtn.position.set(-0.045, 0.090, -0.02);
    leftBtn.rotation.x = -0.15;
    (leftBtn as any).userData.origY = 0.090;
    mouseGroup.add(leftBtn);
    hoverables.push(leftBtn);

    const rightBtn = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.18), MAT.mouseBtn);
    rightBtn.position.set(0.045, 0.090, -0.02);
    rightBtn.rotation.x = -0.15;
    (rightBtn as any).userData.origY = 0.090;
    mouseGroup.add(rightBtn);
    hoverables.push(rightBtn);

    const scrollWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.045, 16), MAT.keycapAccent);
    scrollWheel.position.set(0, 0.100, -0.04);
    scrollWheel.rotation.z = Math.PI / 2;
    mouseGroup.add(scrollWheel);
    hoverables.push(scrollWheel);

    const mouseGlowDot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), MAT.glowTeal);
    mouseGlowDot.position.set(0, -0.06, 0);
    mouseGroup.add(mouseGlowDot);

    // Mouse glow ring (under mouse)
    const mouseGlowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.12, 16),
      new THREE.MeshBasicMaterial({ color: 0x00A693, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
    );
    mouseGlowRing.rotation.x = -Math.PI / 2;
    mouseGlowRing.position.y = -0.055;
    mouseGroup.add(mouseGlowRing);

    // ── CPU Tower ──
    const cpuGroup = new THREE.Group();
    cpuGroup.name = "cpuGroup";
    cpuGroup.position.set(2.6, -0.48, -0.2);
    scene.add(cpuGroup);

    const cpuBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.80, 0.85), MAT.cpu);
    cpuBody.castShadow = true;
    cpuBody.receiveShadow = true;
    cpuGroup.add(cpuBody);

    const cpuFrontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.80, 0.03), MAT.cpuPanel);
    cpuFrontPanel.position.set(0, 0, 0.44);
    cpuFrontPanel.castShadow = true;
    cpuGroup.add(cpuFrontPanel);

    const cpuVentMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.80, 0.04), MAT.cpuVent);
    cpuVentMesh.position.set(0, 0.30, 0.46);
    cpuGroup.add(cpuVentMesh);

    const powerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 24), MAT.glowTeal);
    powerBtn.position.set(0.10, 0.72, 0.455);
    powerBtn.rotation.x = Math.PI / 2;
    cpuGroup.add(powerBtn);
    hoverables.push(powerBtn);

    const hddLed = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.007, 0.01), MAT.hddLed);
    hddLed.position.set(0.10, 0.65, 0.455);
    cpuGroup.add(hddLed);

    for (let i = 0; i < 3; i++) {
      const usbSlot = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.018, 0.015), MAT.cpuVent);
      usbSlot.position.set(-0.08, 0.68 - i * 0.032, 0.455);
      cpuGroup.add(usbSlot);
    }

    const cpuGlowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 1.60, 0.02), MAT.glowTeal);
    cpuGlowStrip.position.set(-0.22, 0, 0);
    cpuGroup.add(cpuGlowStrip);

    // CPU side glow ring
    const cpuGlowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.18, 16),
      new THREE.MeshBasicMaterial({ color: 0x00A693, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    );
    cpuGlowRing.position.set(-0.23, 0, 0);
    cpuGlowRing.rotation.y = Math.PI / 2;
    cpuGroup.add(cpuGlowRing);

    for (let i = 0; i < 5; i++) {
      const sideVent = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.010, 0.60), MAT.cpuVent);
      sideVent.position.set(0, 0.55 - i * 0.22, 0);
      cpuGroup.add(sideVent);
    }

    const topExhaustMesh = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.015, 0.55), MAT.cpuVent);
    topExhaustMesh.position.set(0, 0.905, 0);
    cpuGroup.add(topExhaustMesh);

    const rearPanelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.50, 0.02), MAT.metalDark);
    rearPanelMesh.position.set(0, -0.45, -0.435);
    cpuGroup.add(rearPanelMesh);

    // ── Speakers ──
    function createSpeaker(): THREE.Group {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.20), MAT.monitor));
      const grill = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.38, 0.02), MAT.speakerMesh);
      grill.position.set(0, 0, 0.11);
      group.add(grill);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 32), MAT.speakerCone);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(0, 0, 0.12);
      group.add(cone);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), MAT.glowTeal);
      led.position.set(0.08, -0.18, 0.11);
      group.add(led);
      // Speaker glow ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.05, 0.08, 16),
        new THREE.MeshBasicMaterial({ color: 0x00A693, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
      );
      ring.position.set(0, 0, 0.13);
      group.add(ring);
      return group;
    }

    const speakerGroupL = createSpeaker();
    speakerGroupL.position.set(-2.0, 0.065, -0.30);
    deskGroup.add(speakerGroupL);

    const speakerGroupR = createSpeaker();
    speakerGroupR.position.set(2.0, 0.065, -0.30);
    deskGroup.add(speakerGroupR);

    const speakerConeL = speakerGroupL.children[2] as THREE.Mesh;
    const speakerConeR = speakerGroupR.children[2] as THREE.Mesh;

    // ── Cables ──
    const cableMat = MAT.cable;
    for (const pts of [
      [new THREE.Vector3(0, 1.0, -0.5), new THREE.Vector3(0.3, 0.6, -0.6), new THREE.Vector3(0.5, 0.2, -0.7), new THREE.Vector3(1.5, 0.05, -0.8), new THREE.Vector3(2.6, 0.05, -0.6)],
      [new THREE.Vector3(-0.8, 0.07, 0.30), new THREE.Vector3(-1.2, 0.15, -0.2), new THREE.Vector3(-1.8, 0.07, -0.50), new THREE.Vector3(-2.0, 0.07, -0.60)],
      [new THREE.Vector3(1.25, 0.07, 0.30), new THREE.Vector3(0.5, 0.15, -0.2), new THREE.Vector3(-0.5, 0.07, -0.50), new THREE.Vector3(-1.5, 0.07, -0.60)],
    ] as THREE.Vector3[][]) {
      const curve = new THREE.CatmullRomCurve3(pts);
      const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.012, 8, false), cableMat);
      cable.castShadow = true;
      scene.add(cable);
    }

    // ── Desk Accessories ──
    const mugGroup = new THREE.Group();
    mugGroup.position.set(-2.0, 0.065, 0.50);
    deskGroup.add(mugGroup);
    const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.22, 32), MAT.mug);
    mugBody.castShadow = true;
    mugGroup.add(mugBody);
    const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16, Math.PI), MAT.mug);
    mugHandle.position.set(0.09, 0.02, 0);
    mugHandle.rotation.y = Math.PI / 2;
    mugGroup.add(mugHandle);

    const steamParticles: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const steamMat = MAT.steam.clone();
      const steam = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), steamMat);
      steam.position.set((Math.random() - 0.5) * 0.04, 0.22, 0);
      steam.userData = { speed: 0.003 + Math.random() * 0.002 };
      mugGroup.add(steam);
      steamParticles.push(steam);
    }

    const plantGroup = new THREE.Group();
    plantGroup.position.set(2.3, 0.065, -0.70);
    deskGroup.add(plantGroup);
    plantGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.12, 16), MAT.plantPot));
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.01, 16), MAT.soil);
    soil.position.y = 0.06;
    plantGroup.add(soil);
    const plantBall = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), MAT.plant);
    plantBall.position.set(0, 0.18, 0);
    plantBall.castShadow = true;
    plantGroup.add(plantBall);

    const notepadMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.01, 0.45), MAT.notepad);
    notepadMesh.position.set(-1.1, 0.065, 0.50);
    notepadMesh.rotation.y = 0.15;
    notepadMesh.castShadow = true;
    deskGroup.add(notepadMesh);

    const penMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 8), MAT.pen);
    penMesh.position.set(-0.97, 0.075, 0.48);
    penMesh.rotation.z = 0.3;
    penMesh.castShadow = true;
    deskGroup.add(penMesh);

    // ── Office Chair ──
    const chairGroup = new THREE.Group();
    chairGroup.name = "chairGroup";
    chairGroup.position.set(0, -0.95, 2.2);
    scene.add(chairGroup);

    // Chair base (5-star)
    const chairBaseMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.3, metalness: 0.8 });
    const chairBaseCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.04, 24), chairBaseMat);
    chairBaseCenter.position.y = 0.02;
    chairGroup.add(chairBaseCenter);

    // Chair legs (5-star pattern)
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const legLen = 0.35;
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, legLen, 8),
        chairBaseMat
      );
      leg.rotation.z = Math.PI / 2;
      leg.rotation.y = angle;
      leg.position.set(Math.cos(angle) * legLen * 0.5, 0.02, Math.sin(angle) * legLen * 0.5);
      chairGroup.add(leg);

      // Caster wheel
      const wheel = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.3 })
      );
      wheel.position.set(Math.cos(angle) * legLen, 0.01, Math.sin(angle) * legLen);
      chairGroup.add(wheel);
    }

    // Chair stem
    const chairStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 0.45, 12),
      chairBaseMat
    );
    chairStem.position.y = 0.25;
    chairGroup.add(chairStem);

    // Chair seat
    const chairSeatMat = new THREE.MeshStandardMaterial({ color: 0x1A1A2E, roughness: 0.7, metalness: 0.1 });
    const chairSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.50, 0.06, 0.50),
      chairSeatMat
    );
    chairSeat.position.y = 0.50;
    chairSeat.castShadow = true;
    chairGroup.add(chairSeat);

    // Seat cushion
    const chairCushion = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.04, 0.46),
      new THREE.MeshStandardMaterial({ color: 0x2A2A4A, roughness: 0.9 })
    );
    chairCushion.position.y = 0.55;
    chairGroup.add(chairCushion);

    // Chair backrest
    const chairBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.55, 0.06),
      chairSeatMat
    );
    chairBack.position.set(0, 0.85, -0.22);
    chairBack.rotation.x = -0.1;
    chairBack.castShadow = true;
    chairGroup.add(chairBack);

    // Backrest cushion
    const chairBackCushion = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.50, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x2A2A4A, roughness: 0.9 })
    );
    chairBackCushion.position.set(0, 0.85, -0.19);
    chairBackCushion.rotation.x = -0.1;
    chairGroup.add(chairBackCushion);

    // Headrest
    const chairHeadrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.15, 0.05),
      chairSeatMat
    );
    chairHeadrest.position.set(0, 1.20, -0.24);
    chairGroup.add(chairHeadrest);

    // Armrests
    const armrestMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.4, metalness: 0.5 });
    for (const side of [-1, 1]) {
      // Armrest support
      const armSupport = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.25, 0.03),
        armrestMat
      );
      armSupport.position.set(side * 0.25, 0.62, -0.05);
      chairGroup.add(armSupport);

      // Armrest pad
      const armPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.03, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x2A2A4A, roughness: 0.8 })
      );
      armPad.position.set(side * 0.25, 0.75, 0.02);
      chairGroup.add(armPad);
    }

    // ── Robot Character ──
    const robotGroup = new THREE.Group();
    robotGroup.name = "robotGroup";
    robotGroup.position.set(0, 0.55, 2.2);
    robotGroup.rotation.y = Math.PI;
    scene.add(robotGroup);

    const robotBodyMat = new THREE.MeshStandardMaterial({ color: 0x3A3A5A, roughness: 0.3, metalness: 0.7 });
    const robotAccentMat = new THREE.MeshStandardMaterial({ color: 0x00FF66, emissive: 0x00FF66, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.5 });
    const robotDarkMat = new THREE.MeshStandardMaterial({ color: 0x1A1A2E, roughness: 0.5, metalness: 0.3 });

    // Robot torso
    const robotTorso = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.40, 0.25),
      robotBodyMat
    );
    robotTorso.position.y = 0.20;
    robotTorso.castShadow = true;
    robotGroup.add(robotTorso);

    // Torso accent stripe
    const robotStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.04, 0.26),
      robotAccentMat
    );
    robotStripe.position.y = 0.25;
    robotGroup.add(robotStripe);

    // Chest indicator
    const robotChestLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      robotAccentMat
    );
    robotChestLed.position.set(0, 0.30, 0.13);
    robotGroup.add(robotChestLed);

    // Robot head
    const robotHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.25, 0.24),
      robotBodyMat
    );
    robotHead.position.y = 0.52;
    robotHead.castShadow = true;
    robotGroup.add(robotHead);

    // Visor (eye area)
    const robotVisor = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.1, metalness: 0.9 })
    );
    robotVisor.position.set(0, 0.54, 0.13);
    robotGroup.add(robotVisor);

    // Eyes (glowing)
    const robotEyeL = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x00FF66, emissive: 0x00FF66, emissiveIntensity: 1.5, roughness: 0, metalness: 0 })
    );
    robotEyeL.position.set(-0.06, 0.54, 0.14);
    robotGroup.add(robotEyeL);

    const robotEyeR = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x00FF66, emissive: 0x00FF66, emissiveIntensity: 1.5, roughness: 0, metalness: 0 })
    );
    robotEyeR.position.set(0.06, 0.54, 0.14);
    robotGroup.add(robotEyeR);

    // Antenna
    const robotAntenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8),
      robotAccentMat
    );
    robotAntenna.position.set(0, 0.71, 0);
    robotGroup.add(robotAntenna);

    const robotAntennaTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 8, 8),
      robotAccentMat
    );
    robotAntennaTip.position.set(0, 0.78, 0);
    robotGroup.add(robotAntennaTip);

    // Neck
    const robotNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.08, 12),
      robotDarkMat
    );
    robotNeck.position.y = 0.38;
    robotGroup.add(robotNeck);

    // Arms
    const robotArmL = new THREE.Group();
    robotArmL.position.set(-0.22, 0.32, 0);
    robotGroup.add(robotArmL);

    const robotUpperArmL = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.22, 0.08),
      robotBodyMat
    );
    robotUpperArmL.position.y = -0.11;
    robotArmL.add(robotUpperArmL);

    const robotForearmL = new THREE.Group();
    robotForearmL.position.set(0, -0.22, 0);
    robotArmL.add(robotForearmL);

    const robotForearmMeshL = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.18, 0.07),
      robotBodyMat
    );
    robotForearmMeshL.position.y = -0.09;
    robotForearmL.add(robotForearmMeshL);

    // Hand
    const robotHandL = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 10, 10),
      robotAccentMat
    );
    robotHandL.position.set(0, -0.20, 0);
    robotForearmL.add(robotHandL);

    const robotArmR = new THREE.Group();
    robotArmR.position.set(0.22, 0.32, 0);
    robotGroup.add(robotArmR);

    const robotUpperArmR = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.22, 0.08),
      robotBodyMat
    );
    robotUpperArmR.position.y = -0.11;
    robotArmR.add(robotUpperArmR);

    const robotForearmR = new THREE.Group();
    robotForearmR.position.set(0, -0.22, 0);
    robotArmR.add(robotForearmR);

    const robotForearmMeshR = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.18, 0.07),
      robotBodyMat
    );
    robotForearmMeshR.position.y = -0.09;
    robotForearmR.add(robotForearmMeshR);

    const robotHandR = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 10, 10),
      robotAccentMat
    );
    robotHandR.position.set(0, -0.20, 0);
    robotForearmR.add(robotHandR);

    // Legs (sitting position)
    const robotLegL = new THREE.Group();
    robotLegL.position.set(-0.10, -0.05, 0.05);
    robotGroup.add(robotLegL);

    const robotThighL = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.20, 0.10),
      robotBodyMat
    );
    robotThighL.position.set(0, -0.10, 0.08);
    robotThighL.rotation.x = -Math.PI / 2 + 0.3;
    robotLegL.add(robotThighL);

    const robotShinL = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.18, 0.08),
      robotBodyMat
    );
    robotShinL.position.set(0, -0.18, 0.22);
    robotLegL.add(robotShinL);

    const robotFootL = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.04, 0.14),
      robotAccentMat
    );
    robotFootL.position.set(0, -0.28, 0.26);
    robotLegL.add(robotFootL);

    const robotLegR = new THREE.Group();
    robotLegR.position.set(0.10, -0.05, 0.05);
    robotGroup.add(robotLegR);

    const robotThighR = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.20, 0.10),
      robotBodyMat
    );
    robotThighR.position.set(0, -0.10, 0.08);
    robotThighR.rotation.x = -Math.PI / 2 + 0.3;
    robotLegR.add(robotThighR);

    const robotShinR = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.18, 0.08),
      robotBodyMat
    );
    robotShinR.position.set(0, -0.18, 0.22);
    robotLegR.add(robotShinR);

    const robotFootR = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.04, 0.14),
      robotAccentMat
    );
    robotFootR.position.set(0, -0.28, 0.26);
    robotLegR.add(robotFootR);

    // ── Floating Particles (teal dust) ──
    const particleCount = width < 640 ? 40 : 120;
    const particles: ParticleMesh[] = [];
    const particleGeo = new THREE.SphereGeometry(0.012, 4, 4);
    for (let i = 0; i < particleCount; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x00FFCC, emissive: 0x00FFCC, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 });
      const p = new THREE.Mesh(particleGeo, mat) as unknown as ParticleMesh;
      p.position.set((Math.random() - 0.5) * 8, 0.1 + Math.random() * 3.4, -3 + Math.random() * 5);
      p.userData.speed = 0.001 + Math.random() * 0.003;
      p.userData.phase = Math.random() * Math.PI * 2;
      scene.add(p);
      particles.push(p);
    }

    // ── Holographic AI Agent Orbs ──
    const agentColors = [
      { color: 0x00FF66, name: "Code Review" },
      { color: 0x00f0ff, name: "Tutor" },
      { color: 0x7c3aed, name: "Rubric" },
      { color: 0xFFB347, name: "Feedback" },
    ];

    interface AgentOrb {
      mesh: THREE.Mesh;
      ring: THREE.Mesh;
      line: THREE.Line;
      basePos: THREE.Vector3;
      phase: number;
    }

    const agentOrbs: AgentOrb[] = [];
    const agentOrbGroup = new THREE.Group();
    agentOrbGroup.name = "agentOrbs";
    scene.add(agentOrbGroup);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const radius = 1.8;
      const basePos = new THREE.Vector3(
        Math.cos(angle) * radius,
        2.2 + Math.sin(angle * 2) * 0.3,
        Math.sin(angle) * radius - 0.5
      );

      // Core orb
      const orbMat = new THREE.MeshStandardMaterial({
        color: agentColors[i].color,
        emissive: agentColors[i].color,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9,
        roughness: 0,
        metalness: 0.3,
      });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), orbMat);
      orb.position.copy(basePos);
      orb.userData = { phase: i * Math.PI * 0.5, agentIndex: i };
      agentOrbGroup.add(orb);

      // Orb ring
      const ringMat = new THREE.MeshBasicMaterial({
        color: agentColors[i].color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.22, 24), ringMat);
      ring.position.copy(basePos);
      ring.rotation.x = Math.PI / 2;
      agentOrbGroup.add(ring);

      // Connection line to screen
      const lineMat = new THREE.LineBasicMaterial({
        color: agentColors[i].color,
        transparent: true,
        opacity: 0.15,
      });
      const lineGeo = new THREE.BufferGeometry().setFromPoints([basePos, new THREE.Vector3(0, 1.36, 0.04)]);
      const line = new THREE.Line(lineGeo, lineMat);
      agentOrbGroup.add(line);

      agentOrbs.push({ mesh: orb, ring, line, basePos, phase: i * Math.PI * 0.5 });
    }

    // ── Data Stream Particles (flowing from screen) ──
    const dataStreamCount = 60;
    const dataStreams: ParticleMesh[] = [];
    const dataStreamGeo = new THREE.BoxGeometry(0.02, 0.02, 0.08);

    for (let i = 0; i < dataStreamCount; i++) {
      const hue = Math.random() > 0.5 ? 0x00FF66 : 0x00f0ff;
      const mat = new THREE.MeshBasicMaterial({
        color: hue,
        transparent: true,
        opacity: 0.7,
      });
      const p = new THREE.Mesh(dataStreamGeo, mat) as unknown as ParticleMesh;

      // Start from screen area
      const startX = (Math.random() - 0.5) * 1.8;
      const startY = 0.8 + Math.random() * 1.1;
      p.position.set(startX, startY, 0.05);

      p.userData = {
        speed: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
        startX,
        startY,
        direction: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          0.3 + Math.random() * 0.5,
          0.5 + Math.random() * 0.5
        ).normalize(),
      };
      scene.add(p);
      dataStreams.push(p);
    }

    // ── Responsive ──
    function applyResponsive(w: number) {
      if (w < 640) {
        camera.position.set(0, 2.2, 9.5);
        camera.fov = 55;
        cpuGroup.visible = false;
        speakerGroupL.visible = false;
        speakerGroupR.visible = false;
        chairGroup.visible = false;
        robotGroup.visible = false;
        agentOrbGroup.visible = false;
      } else if (w < 1024) {
        camera.position.set(0, 2.5, 8.5);
        camera.fov = 50;
        cpuGroup.visible = true;
        speakerGroupL.visible = false;
        speakerGroupR.visible = false;
        chairGroup.visible = true;
        robotGroup.visible = true;
        agentOrbGroup.visible = true;
      } else {
        camera.position.set(0, 2.8, 7.5);
        camera.fov = 45;
        cpuGroup.visible = true;
        speakerGroupL.visible = true;
        speakerGroupR.visible = true;
        chairGroup.visible = true;
        robotGroup.visible = true;
        agentOrbGroup.visible = true;
      }
      camera.updateProjectionMatrix();
    }
    applyResponsive(width);

    // ── Resize ──
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
      applyResponsive(w);
    };
    window.addEventListener("resize", handleResize);

    // ── Mouse Move ──
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseTargetRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseTargetRef.current.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;

      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(hoverables, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if ((hit === leftBtn || hit === rightBtn) && !hit.userData._hovered) {
          hit.userData._hovered = true;
          gsap.to(hit.position, { y: (hit.userData.origY ?? 0.090) - 0.005, duration: 0.1, ease: "power2.out" });
        }
      } else {
        if (leftBtn.userData._hovered) {
          leftBtn.userData._hovered = false;
          gsap.to(leftBtn.position, { y: leftBtn.userData.origY, duration: 0.15, ease: "power2.out" });
        }
        if (rightBtn.userData._hovered) {
          rightBtn.userData._hovered = false;
          gsap.to(rightBtn.position, { y: rightBtn.userData.origY, duration: 0.15, ease: "power2.out" });
        }
      }
    };
    container.addEventListener("mousemove", onMouseMove);

    // ── Click ──
    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(hoverables, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;

        if (hit === leftBtn || hit === rightBtn) {
          gsap.to(hit.position, {
            y: (hit.userData.origY ?? 0.090) - 0.012,
            duration: 0.08,
            ease: "power2.in",
            onComplete: () => gsap.to(hit.position, { y: hit.userData.origY ?? 0.090, duration: 0.15, ease: "elastic.out(1, 0.3)" }),
          });
          gsap.to(scrollWheel.rotation, { x: scrollWheel.rotation.x + Math.PI * 2, duration: 0.4, ease: "power2.out" });
          gsap.to(mouseGlowRing.material as THREE.MeshBasicMaterial, { opacity: 0.6, duration: 0.1, yoyo: true, repeat: 1 });
          return;
        }

        if (hit === spaceBar) {
          gsap.to(hit.position, {
            y: 0.030,
            duration: 0.06,
            ease: "power2.in",
            onComplete: () => gsap.to(hit.position, { y: 0.038, duration: 0.2, ease: "elastic.out(1, 0.3)" }),
          });
          return;
        }

        if (keyMeshes.includes(hit)) {
          gsap.to(hit.position, {
            y: (hit.userData.origY ?? 0.038) - 0.008,
            duration: 0.06,
            ease: "power2.in",
            onComplete: () => gsap.to(hit.position, { y: hit.userData.origY ?? 0.038, duration: 0.2, ease: "elastic.out(1, 0.3)" }),
          });
          return;
        }

        if (hit === screenMesh || hit.parent === monitorGroup) {
          const idx = SCREEN_MODES.indexOf(screenModeRef.current);
          screenModeRef.current = SCREEN_MODES[(idx + 1) % SCREEN_MODES.length];
          // Flash screen
          gsap.to(screenMat, { emissiveIntensity: 1.0, duration: 0.1, yoyo: true, repeat: 1 });
          return;
        }

        if (hit === powerBtn) {
          screenOnRef.current = !screenOnRef.current;
          gsap.to(powerBtn.scale, { x: 0.8, y: 0.8, z: 0.8, duration: 0.1, yoyo: true, repeat: 1 });
          gsap.to(cpuGlowStrip.material as THREE.MeshStandardMaterial, {
            emissiveIntensity: screenOnRef.current ? 1.2 : 0.1,
            duration: 0.3,
          });
          return;
        }
      }
    };
    container.addEventListener("click", onClick);

    // ── Keyboard typing animation ──
    let typingInterval: ReturnType<typeof setInterval> | null = null;
    let isTyping = false;

    const startTyping = () => {
      if (isTyping) return;
      isTyping = true;
      let count = 0;
      typingInterval = setInterval(() => {
        if (count > 20 || !screenOnRef.current) {
          clearInterval(typingInterval!);
          typingInterval = null;
          isTyping = false;
          return;
        }
        const key = keyMeshes[Math.floor(Math.random() * keyMeshes.length)];
        gsap.to(key.position, {
          y: (key.userData.origY ?? 0.038) - 0.008,
          duration: 0.05,
          ease: "power2.in",
          onComplete: () => gsap.to(key.position, { y: key.userData.origY ?? 0.038, duration: 0.12, ease: "power2.out" }),
        });
        count++;
      }, 80);
    };

    const typingTimer = setInterval(() => {
      if (screenOnRef.current && Math.random() > 0.4) startTyping();
    }, 3000);

    // ── GSAP Context ──
    const gsapCtx = gsap.context(() => {});

    // ── Animation Loop ──
    const clock = new THREE.Clock();
    let animFrameId = 0;
    let charRevealIndex = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Screen content
      if (screenOnRef.current) {
        charRevealIndex += 0.8;
        drawScreenContent(screenCanvas, screenModeRef.current, t, charRevealIndex);
        screenTexture.needsUpdate = true;
        screenMat.emissiveIntensity = 0.4 + 0.1 * Math.sin(t * 0.8);
        screenLight.intensity = 3.0 + 0.5 * Math.sin(t * 0.8);
      } else {
        const ctx = screenCanvas.getContext("2d")!;
        ctx.fillStyle = "#050508";
        ctx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);
        screenTexture.needsUpdate = true;
        screenMat.emissiveIntensity = 0.0;
        screenLight.intensity = 0.2;
      }

      // Starfield rotation
      stars.rotation.y = t * 0.01;
      stars.rotation.x = Math.sin(t * 0.005) * 0.05;

      // Hexagon float
      for (const hex of hexagons) {
        hex.rotation.x += hex.userData.rotSpeed;
        hex.rotation.y += hex.userData.rotSpeed * 0.7;
        hex.position.y += Math.sin(t * 0.5 + hex.userData.floatPhase) * 0.002;
        (hex.material as THREE.MeshBasicMaterial).opacity = 0.1 + 0.08 * Math.sin(t + hex.userData.floatPhase);
      }

      // Grid pulse
      (gridHelper.material as THREE.Material).opacity = 0.12 + 0.03 * Math.sin(t * 0.5);

      // Scan lines
      for (let i = 0; i < scanLines.length; i++) {
        (scanLines[i].material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + 0.15 * Math.sin(t * 2.0 + i * 0.4);
      }

      // CPU glow
      (cpuGlowStrip.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + 0.4 * Math.sin(t * 1.5);
      (cpuGlowStrip.material as THREE.MeshStandardMaterial).emissive.setHSL((t * 0.05) % 1, 1.0, 0.5);

      // CPU glow ring
      const cpuRingMat = cpuGlowRing.material as THREE.MeshBasicMaterial;
      cpuRingMat.opacity = 0.15 + 0.1 * Math.sin(t * 1.5);
      cpuGlowRing.rotation.z = t * 0.3;

      // HDD LED
      (hddLed.material as THREE.MeshStandardMaterial).emissiveIntensity = screenOnRef.current ? (Math.random() > 0.92 ? 2.5 : 0.2) : 0.0;

      // Power button
      (powerBtn.material as THREE.MeshStandardMaterial).emissiveIntensity = screenOnRef.current ? (0.6 + 0.4 * Math.sin(t * 1.2)) : 0.1;

      // Mouse glow
      mouseGlowDot.position.y = -0.06 + Math.sin(t * 2) * 0.005;
      const mouseRingMat = mouseGlowRing.material as THREE.MeshBasicMaterial;
      mouseRingMat.opacity = 0.2 + 0.1 * Math.sin(t * 2);

      // Particles
      for (const p of particles) {
        p.position.y += p.userData.speed;
        p.position.x += Math.sin(t * 0.3 + p.userData.phase) * 0.0008;
        if (p.position.y > 3.6) p.position.y = 0.1;
        (p.material as THREE.MeshStandardMaterial).opacity = 0.3 + 0.3 * Math.sin(t + p.userData.phase);
      }

      // Steam
      for (let i = 0; i < steamParticles.length; i++) {
        const s = steamParticles[i];
        s.position.y += 0.003;
        s.position.x += Math.sin(t * 1.5 + i) * 0.001;
        const sMat = s.material as THREE.MeshStandardMaterial;
        sMat.opacity = Math.max(0, sMat.opacity - 0.003);
        if (s.position.y > 0.45 || sMat.opacity <= 0) {
          s.position.y = 0.22;
          s.position.x = (Math.random() - 0.5) * 0.04;
          sMat.opacity = 0.5;
        }
      }

      // Speakers
      speakerConeL.scale.z = 1 + 0.04 * Math.sin(t * 4.3);
      speakerConeR.scale.z = 1 + 0.04 * Math.sin(t * 4.3 + 1.1);

      // Speaker glow rings
      const slRing = speakerGroupL.children[3] as THREE.Mesh;
      const srRing = speakerGroupR.children[3] as THREE.Mesh;
      if (slRing) (slRing.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.1 * Math.sin(t * 4.3);
      if (srRing) (srRing.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.1 * Math.sin(t * 4.3 + 1.1);

      // ── Robot Idle Animation ──
      // Breathing (torso scale)
      const breathScale = 1 + 0.015 * Math.sin(t * 1.8);
      robotTorso.scale.y = breathScale;
      robotStripe.scale.y = breathScale;

      // Head subtle movement
      robotHead.rotation.y = Math.sin(t * 0.4) * 0.08;
      robotHead.rotation.z = Math.sin(t * 0.3) * 0.03;

      // Eye blink (every ~4 seconds)
      const blinkCycle = t % 4;
      const isBlinking = blinkCycle > 3.8 && blinkCycle < 3.95;
      const eyeScaleY = isBlinking ? 0.1 : 1;
      robotEyeL.scale.y = eyeScaleY;
      robotEyeR.scale.y = eyeScaleY;

      // Eye glow pulse
      const eyeGlow = 1.0 + 0.5 * Math.sin(t * 1.5);
      (robotEyeL.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeGlow;
      (robotEyeR.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeGlow;

      // Antenna tip pulse
      (robotAntennaTip.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + 0.5 * Math.sin(t * 3);

      // Chest LED pulse
      (robotChestLed.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + 0.4 * Math.sin(t * 2);

      // Arm typing animation (when screen is on)
      if (screenOnRef.current) {
        // Left arm subtle movement
        robotArmL.rotation.x = Math.sin(t * 2.5) * 0.05;
        robotArmL.rotation.z = -0.15 + Math.sin(t * 1.8) * 0.03;
        robotForearmL.rotation.x = Math.sin(t * 3.2) * 0.08;

        // Right arm typing
        robotArmR.rotation.x = Math.sin(t * 3.5 + 0.5) * 0.06;
        robotArmR.rotation.z = 0.15 + Math.sin(t * 2.2) * 0.03;
        robotForearmR.rotation.x = Math.sin(t * 4.0 + 1.0) * 0.12;
      } else {
        // Resting pose
        robotArmL.rotation.x = 0;
        robotArmL.rotation.z = -0.15;
        robotForearmL.rotation.x = 0;
        robotArmR.rotation.x = 0;
        robotArmR.rotation.z = 0.15;
        robotForearmR.rotation.x = 0;
      }

      // ── Holographic AI Agent Orbs Animation ──
      for (const agent of agentOrbs) {
        const orb = agent.mesh;
        const ring = agent.ring;
        const line = agent.line;

        // Float around in a gentle orbit
        const orbitSpeed = 0.3;
        const floatY = Math.sin(t * orbitSpeed + agent.phase) * 0.15;
        const floatX = Math.cos(t * orbitSpeed * 0.7 + agent.phase) * 0.1;
        orb.position.x = agent.basePos.x + floatX;
        orb.position.y = agent.basePos.y + floatY;
        orb.position.z = agent.basePos.z + Math.sin(t * 0.5 + agent.phase) * 0.08;

        // Pulse glow
        const orbMat = orb.material as THREE.MeshStandardMaterial;
        orbMat.emissiveIntensity = 0.5 + 0.4 * Math.sin(t * 2 + agent.phase);

        // Rotate ring
        ring.position.copy(orb.position);
        ring.rotation.x = Math.PI / 2 + Math.sin(t + agent.phase) * 0.3;
        ring.rotation.z = t * 0.5 + agent.phase;
        const ringMat = ring.material as THREE.MeshBasicMaterial;
        ringMat.opacity = 0.2 + 0.15 * Math.sin(t * 1.5 + agent.phase);

        // Update connection line
        const linePositions = line.geometry.attributes.position as THREE.BufferAttribute;
        linePositions.setXYZ(0, orb.position.x, orb.position.y, orb.position.z);
        linePositions.needsUpdate = true;
        const lineMat = line.material as THREE.LineBasicMaterial;
        lineMat.opacity = 0.08 + 0.07 * Math.sin(t * 2 + agent.phase);
      }

      // ── Data Stream Particles Animation ──
      for (const ds of dataStreams) {
        const dir = ds.userData.direction as THREE.Vector3;
        ds.position.x += dir.x * ds.userData.speed;
        ds.position.y += dir.y * ds.userData.speed;
        ds.position.z += dir.z * ds.userData.speed;

        // Reset when too far
        if (ds.position.z > 4 || ds.position.y > 4) {
          ds.position.set(
            ds.userData.startX,
            ds.userData.startY,
            0.05
          );
        }

        // Fade based on distance from screen
        const dist = ds.position.z - 0.05;
        const dsMat = ds.material as THREE.MeshBasicMaterial;
        dsMat.opacity = Math.max(0, 0.7 - dist * 0.2);

        // Rotate data packet
        ds.rotation.z += 0.02;
      }

      // Camera auto-rotate + parallax
      const autoRotateSpeed = 0.06;
      camera.position.x = Math.sin(t * autoRotateSpeed) * 7.5 * 0.25 + mouseCurrentRef.current.x * 0.6;
      camera.position.z = 7.5 + Math.cos(t * autoRotateSpeed) * 0.5;
      camera.position.y = 2.8 + Math.sin(t * autoRotateSpeed * 0.5) * 0.2 + mouseCurrentRef.current.y * 0.3;

      mouseCurrentRef.current.x += (mouseTargetRef.current.x - mouseCurrentRef.current.x) * 0.05;
      mouseCurrentRef.current.y += (mouseTargetRef.current.y - mouseCurrentRef.current.y) * 0.05;

      camera.lookAt(0, 0.5, 0);

      composer.render();
    };

    animate();

    // ── Intro Animation ──
    const introTl = gsap.timeline();
    introTl.from(camera.position, { z: 3.0, y: 1.0, duration: 2.0, ease: "power3.out", onUpdate: () => camera.lookAt(0, 0.5, 0) });
    introTl.from(deskGroup.position, { y: -3, duration: 1.4, ease: "back.out(1.2)" }, "-=1.6");
    introTl.from(monitorGroup.position, { y: monitorGroup.position.y - 1.5, duration: 1.0, ease: "back.out(1.4)" }, "-=0.8");
    introTl.from(keyboardGroup.position, { z: keyboardGroup.position.z + 2.5, duration: 0.8, ease: "power3.out" }, "-=0.6");
    introTl.from(mouseGroup.position, { z: mouseGroup.position.z + 2.5, duration: 0.8, ease: "power3.out" }, "-=0.7");
    introTl.from(cpuGroup.position, { x: cpuGroup.position.x + 3, duration: 0.9, ease: "power3.out" }, "-=0.6");
    introTl.from([speakerGroupL.scale, speakerGroupR.scale], { x: 0, y: 0, z: 0, duration: 0.5, ease: "back.out(2.0)", stagger: 0.15 }, "-=0.4");
    introTl.from([mugGroup.scale, plantGroup.scale, notepadMesh.scale], { x: 0, y: 0, z: 0, duration: 0.5, ease: "back.out(1.8)", stagger: 0.10 }, "-=0.3");

    // Agent orbs intro - appear with scale animation
    for (const agent of agentOrbs) {
      agent.mesh.scale.set(0, 0, 0);
      agent.ring.scale.set(0, 0, 0);
      introTl.to(agent.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out(2.0)" }, "-=0.15");
      introTl.to(agent.ring.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: "power2.out" }, "-=0.25");
    }

    introTl.to(screenMat, { emissiveIntensity: 0.6, duration: 0.6, ease: "power2.in" }, "-=0.5");

    animFrameIdRef.current = animFrameId;

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("click", onClick);
      if (typingInterval) clearInterval(typingInterval);
      clearInterval(typingTimer);
      gsapCtx.revert();

      for (const p of particles) (p.material as THREE.Material).dispose();
      for (const ds of dataStreams) (ds.material as THREE.Material).dispose();
      for (const agent of agentOrbs) {
        (agent.mesh.material as THREE.Material).dispose();
        (agent.ring.material as THREE.Material).dispose();
        (agent.line.material as THREE.Material).dispose();
      }
      for (const s of steamParticles) (s.material as THREE.Material).dispose();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        } else if (obj instanceof THREE.Points) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        } else if (obj instanceof THREE.Line) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-cursor="hover-canvas"
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
    />
  );
}
