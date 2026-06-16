"use client";

import { useEffect, useRef, useCallback } from "react";

const vertexShader = `
  uniform float uTime;
  uniform float uPulse;
  uniform vec2  uMouse;
  uniform float uJitter;

  varying vec3  vNormal;
  varying vec2  vUv;
  varying float vDisplacement;
  varying float vFresnel;

  // 3-octave turbulent noise via sin/cos combinations
  float turb(vec3 p) {
    float n = 0.0;
    n += sin(p.x * 10.0 + p.y * 7.0 + p.z * 13.0 + uTime * 1.2) * 0.025;
    n += sin(p.x * 18.0 - p.y * 11.0 + p.z * 5.0  + uTime * 2.0) * 0.018;
    n += cos(p.x * 6.0  + p.y * 14.0 - p.z * 9.0  + uTime * 0.8) * 0.012;
    n += sin(p.x * 25.0 + p.y * 20.0 + p.z * 30.0 + uTime * 3.5) * 0.008;
    return n;
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;

    float noise = turb(position);
    float glitch = sin(position.x * 30.0 + uTime * 8.0) * 0.01
                 + cos(position.y * 25.0 + uTime * 6.0) * 0.008;
    float pulse = sin(uTime * uPulse * 2.0) * 0.025;
    float mouseOff = uMouse.x * 0.04 + uMouse.y * 0.04;

    float displace = noise + glitch + pulse + mouseOff;
    vec3 pos = position + normal * displace;
    vDisplacement = displace;

    vec3 viewDir = normalize(cameraPosition - (modelViewMatrix * vec4(pos, 1.0)).xyz);
    vFresnel = 1.0 - max(0.0, dot(normalize((normalMatrix * normal)), viewDir));
    vFresnel = pow(vFresnel, 2.8);

    // Micro-seismic jitter
    float jX = sin(uTime * 50.0 + position.x * 100.0) * uJitter;
    float jY = cos(uTime * 45.0 + position.y * 100.0) * uJitter;
    float jZ = sin(uTime * 55.0 + position.z * 100.0) * uJitter;
    pos.xyz += vec3(jX, jY, jZ);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uPulse;
  uniform vec3  uColor1;
  uniform vec3  uColor2;
  uniform vec3  uGlow;
  uniform vec3  uFresnelColor;

  varying vec3  vNormal;
  varying vec2  vUv;
  varying float vDisplacement;
  varying float vFresnel;

  void main() {
    vec3 viewDir = normalize(cameraPosition);
    float fresnel = vFresnel;

    // Holographic wireframe — edge detection on UV
    float gridX = min(fract(vUv.x * 28.0), 1.0 - fract(vUv.x * 28.0));
    float gridY = min(fract(vUv.y * 28.0), 1.0 - fract(vUv.y * 28.0));
    float wire = 1.0 - min(gridX, gridY);
    wire = step(0.92, wire);

    // Secondary finer grid
    float gridX2 = min(fract(vUv.x * 48.0), 1.0 - fract(vUv.x * 48.0));
    float gridY2 = min(fract(vUv.y * 48.0), 1.0 - fract(vUv.y * 48.0));
    float wire2 = 1.0 - min(gridX2, gridY2);
    wire2 = step(0.96, wire2);

    // Scan line
    float scan = step(0.90, fract(vUv.y * 60.0 - uTime * 3.0));

    // Data pulse rings
    float ring = sin(distance(vUv, vec2(0.5)) * 40.0 - uTime * 4.0) * 0.5 + 0.5;
    ring = step(0.6, ring);

    // Color cycling
    float mixVal = 0.5 + 0.5 * sin(uTime * uPulse * 0.4);
    vec3 baseColor = mix(uColor1, uColor2, mixVal);

    float pGlow = 0.5 + 0.5 * sin(uTime * uPulse * 2.5);

    // Volumetric emission — inner glow
    float emission = 0.3 + 0.7 * pGlow;
    emission *= 1.0 - fresnel * 0.6;

    // Build color
    vec3 color = vec3(0.0);

    // Base surface with fresnel
    color += baseColor * (0.1 + fresnel * 0.9);

    // Fresnel rim lighting (glowing edge)
    color += uFresnelColor * fresnel * 0.7 * pGlow;

    // Volumetric emission (inner glow)
    color += uGlow * emission * 0.4;

    // Holographic wireframe overlay
    color += baseColor * wire * 0.7;
    color += uGlow * wire2 * 0.5;

    // Scan lines
    color += uColor1 * scan * 0.6;

    // Data rings
    color += uFresnelColor * ring * 0.4;

    // Displacement glow
    color += uGlow * abs(vDisplacement) * 5.0;

    // Chromatic aberration on edges (red/blue shift on high fresnel)
    float ca = pow(fresnel, 4.0);
    vec3 caShift = vec3(0.1, 0.0, -0.1) * ca;
    color += caShift;

    float alpha = 0.2 + fresnel * 0.5 + wire * 0.3 + scan * 0.3 + ring * 0.2;
    alpha += abs(vDisplacement) * 3.0;

    gl_FragColor = vec4(color, clamp(alpha, 0.08, 0.95));
  }
`;

interface AICoreProps {
  thinking: boolean;
  mouseX: number;
  mouseY: number;
  mouseVelX?: number;
  mouseVelY?: number;
}

export function AICore({
  thinking,
  mouseX,
  mouseY,
  mouseVelX = 0,
  mouseVelY = 0,
}: AICoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const uniformsRef = useRef<{
    uTime: { value: number };
    uPulse: { value: number };
    uMouse: { value: number[] };
    uJitter: { value: number };
    uColor1: { value: number[] };
    uColor2: { value: number[] };
    uGlow: { value: number[] };
    uFresnelColor: { value: number[] };
  } | null>(null);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    const init = async () => {
      const THREE = await import("three");

      const w = container.clientWidth;
      const h = container.clientHeight;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.04);

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 50);
      camera.position.set(0, 0.5, 6.5);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      uniformsRef.current = {
        uTime: { value: 0 },
        uPulse: { value: thinking ? 4.5 : 1.8 },
        uMouse: { value: [0, 0] },
        uJitter: { value: thinking ? 0.002 : 0.0003 },
        uColor1: { value: [0.0, 1.0, 0.4] },
        uColor2: { value: [0.0, 0.5, 1.0] },
        uGlow: { value: [0.4, 0.0, 0.9] },
        uFresnelColor: { value: [0.6, 0.0, 1.0] },
      };

      const u = uniformsRef.current;

      // --- Core (high-detail icosahedron for hard-surface look) ---
      const coreMat = new THREE.ShaderMaterial({
        uniforms: u,
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 3), coreMat);
      scene.add(core);

      // --- Outer glow shell ---
      const glowMat = new THREE.ShaderMaterial({
        uniforms: u,
        vertexShader,
        fragmentShader: fragmentShader.replace("clamp(alpha, 0.08, 0.95)", "0.035"),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(2.0, 1), glowMat);
      scene.add(glow);

      // --- Rings ---
      const ringMat = new THREE.ShaderMaterial({
        uniforms: u,
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.05, 32, 64), ringMat);
      ring1.rotation.x = Math.PI / 3;
      scene.add(ring1);

      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.035, 24, 64), ringMat);
      ring2.rotation.x = -Math.PI / 4;
      ring2.rotation.z = Math.PI / 6;
      scene.add(ring2);

      // --- Neural network particles ---
      const nodeCount = 80;
      const nodePositions: THREE.Vector3[] = [];
      const nodeGroup = new THREE.Group();
      scene.add(nodeGroup);

      const nodeGeom = new THREE.BufferGeometry();
      const nPos = new Float32Array(nodeCount * 3);
      const nSizes = new Float32Array(nodeCount);
      const nColors = new Float32Array(nodeCount * 3);

      for (let i = 0; i < nodeCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 2.8 + Math.random() * 2.2;
        nPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        nPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        nPos[i * 3 + 2] = r * Math.cos(phi);
        nSizes[i] = 0.04 + Math.random() * 0.08;
        nColors[i * 3] = 0.0 + Math.random() * 0.3;
        nColors[i * 3 + 1] = 0.3 + Math.random() * 0.7;
        nColors[i * 3 + 2] = 0.3 + Math.random() * 0.7;
        nodePositions.push(new THREE.Vector3(nPos[i * 3], nPos[i * 3 + 1], nPos[i * 3 + 2]));
      }

      nodeGeom.setAttribute("position", new THREE.BufferAttribute(nPos, 3));
      nodeGeom.setAttribute("size", new THREE.BufferAttribute(nSizes, 1));
      nodeGeom.setAttribute("color", new THREE.BufferAttribute(nColors, 3));

      const nodeMat = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      nodeGroup.add(new THREE.Points(nodeGeom, nodeMat));

      // --- Connections ---
      const connPoints: number[] = [];
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          if (nodePositions[i].distanceTo(nodePositions[j]) < 2.0) {
            connPoints.push(
              nodePositions[i].x, nodePositions[i].y, nodePositions[i].z,
              nodePositions[j].x, nodePositions[j].y, nodePositions[j].z
            );
          }
        }
      }

      const connGeom = new THREE.BufferGeometry();
      connGeom.setAttribute("position", new THREE.Float32BufferAttribute(connPoints, 3));
      const connMat = new THREE.LineBasicMaterial({
        color: 0x00ff66,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
      });
      nodeGroup.add(new THREE.LineSegments(connGeom, connMat));

      // --- Data flow particles ---
      const dataCount = 200;
      const dataGeom = new THREE.BufferGeometry();
      const dataPos = new Float32Array(dataCount * 3);
      const dataTargets: { start: THREE.Vector3; end: THREE.Vector3; offset: number }[] = [];

      const connList: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          if (nodePositions[i].distanceTo(nodePositions[j]) < 2.0) {
            connList.push({ start: nodePositions[i], end: nodePositions[j] });
          }
        }
      }

      for (let i = 0; i < dataCount; i++) {
        const c = connList[i % connList.length];
        dataTargets.push({
          start: c.start.clone(),
          end: c.end.clone(),
          offset: Math.random() * 100,
        });
        dataPos[i * 3] = c.start.x;
        dataPos[i * 3 + 1] = c.start.y;
        dataPos[i * 3 + 2] = c.start.z;
      }
      dataGeom.setAttribute("position", new THREE.BufferAttribute(dataPos, 3));

      const dataMat = new THREE.PointsMaterial({
        size: 0.035,
        color: 0x00ff66,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      nodeGroup.add(new THREE.Points(dataGeom, dataMat));

      // --- Background stars ---
      const starCount = 600;
      const starGeom = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i++) {
        starPos[i] = (Math.random() - 0.5) * 60;
      }
      starGeom.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({
        size: 0.04,
        color: 0x444466,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(starGeom, starMat));

      // --- Draw loop ---
      const draw = () => {
        if (destroyed) return;
        animRef.current = requestAnimationFrame(draw);

        u.uTime.value += 0.016;

        // Pulse transition
        const targetPulse = thinking ? 4.5 : 1.8;
        u.uPulse.value += (targetPulse - u.uPulse.value) * 0.05;

        // Mouse + velocity
        u.uMouse.value = [mouseX, mouseY];
        velocityRef.current.x += (mouseVelX - velocityRef.current.x) * 0.1;
        velocityRef.current.y += (mouseVelY - velocityRef.current.y) * 0.1;

        // Jitter — amplified by thinking + velocity
        const jitterBase = thinking ? 0.003 : 0.0003;
        const velMag = Math.abs(velocityRef.current.x) + Math.abs(velocityRef.current.y);
        u.uJitter.value = jitterBase + velMag * 0.005;

        // Color transition to crimson when thinking
        const targetC1 = thinking ? [1.0, 0.0, 0.3] : [0.0, 1.0, 0.4];
        const targetC2 = thinking ? [0.6, 0.0, 0.2] : [0.0, 0.5, 1.0];
        const targetGlow = thinking ? [0.9, 0.0, 0.0] : [0.4, 0.0, 0.9];
        const targetFresnel = thinking ? [1.0, 0.0, 0.2] : [0.6, 0.0, 1.0];

        for (let i = 0; i < 3; i++) {
          u.uColor1.value[i] += (targetC1[i] - u.uColor1.value[i]) * 0.05;
          u.uColor2.value[i] += (targetC2[i] - u.uColor2.value[i]) * 0.05;
          u.uGlow.value[i] += (targetGlow[i] - u.uGlow.value[i]) * 0.05;
          u.uFresnelColor.value[i] += (targetFresnel[i] - u.uFresnelColor.value[i]) * 0.05;
        }

        // Rotation
        const rot = u.uTime.value * 0.12;
        core.rotation.x = rot * 0.6;
        core.rotation.y = rot;
        glow.rotation.copy(core.rotation);
        ring1.rotation.z += 0.005;
        ring2.rotation.z -= 0.0035;
        nodeGroup.rotation.y += 0.0012;
        nodeGroup.rotation.x += 0.0004;

        // Animate data particles
        const dp = dataGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < dataCount; i++) {
          const t = dataTargets[i % dataTargets.length];
          const phase = ((u.uTime.value * 0.8 + t.offset) % 2) / 2;
          dp[i * 3] = t.start.x + (t.end.x - t.start.x) * phase;
          dp[i * 3 + 1] = t.start.y + (t.end.y - t.start.y) * phase;
          dp[i * 3 + 2] = t.start.z + (t.end.z - t.start.z) * phase;
        }
        dataGeom.attributes.position.needsUpdate = true;
        dataMat.opacity = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(u.uTime.value * 2));

        // --- Kinetic Parallax Camera ---
        const velX = velocityRef.current.x;
        const velY = velocityRef.current.y;

        // Base orbit from time
        const baseAngle = u.uTime.value * 0.05;
        const cx = Math.sin(baseAngle) * 0.7 + mouseX * 0.3 + velX * 0.5;
        const cy = 0.5 + Math.sin(baseAngle * 0.7) * 0.3 + mouseY * 0.2 + velY * 0.3;
        const cz = 6.5 - Math.cos(baseAngle * 0.9) * 0.3;

        camera.position.x += (cx - camera.position.x) * 0.025;
        camera.position.y += (cy - camera.position.y) * 0.025;
        camera.position.z += (cz - camera.position.z) * 0.025;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };

      draw();

      const onResize = () => {
        if (destroyed) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
        renderer.setSize(cw, ch);
      };

      window.addEventListener("resize", onResize);

      return () => {
        destroyed = true;
        cancelAnimationFrame(animRef.current);
        window.removeEventListener("resize", onResize);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        coreMat.dispose();
        glowMat.dispose();
        ringMat.dispose();
        core.geometry.dispose();
        glow.geometry.dispose();
        ring1.geometry.dispose();
        ring2.geometry.dispose();
        nodeGeom.dispose();
        connGeom.dispose();
        dataGeom.dispose();
        starGeom.dispose();
        nodeMat.dispose();
        connMat.dispose();
        dataMat.dispose();
        starMat.dispose();
        renderer.dispose();
      };
    };

    const p = init();
    return () => {
      p.then((fn) => fn?.());
    };
  }, [thinking, mouseX, mouseY, mouseVelX, mouseVelY, cleanup]);

  return <div ref={containerRef} className="w-full h-full" />;
}
