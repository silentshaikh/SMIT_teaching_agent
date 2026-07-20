"use client";

import { useEffect, useRef, useCallback } from "react";

const coreVertexShader = `
  uniform float uTime;
  uniform float uPulse;
  uniform vec2  uMouse;
  uniform float uJitter;

  varying vec3  vNormal;
  varying vec2  vUv;
  varying float vDisplacement;
  varying float vFresnel;
  varying vec3  vWorldPos;

  float turb(vec3 p) {
    float n = 0.0;
    n += sin(p.x * 10.0 + p.y * 7.0 + p.z * 13.0 + uTime * 1.2) * 0.025;
    n += sin(p.x * 18.0 - p.y * 11.0 + p.z * 5.0  + uTime * 2.0) * 0.018;
    n += cos(p.x * 6.0  + p.y * 14.0 - p.z * 9.0  + uTime * 0.8) * 0.012;
    n += sin(p.x * 25.0 + p.y * 20.0 + p.z * 30.0 + uTime * 3.5) * 0.008;
    n += cos(p.x * 35.0 - p.y * 28.0 + p.z * 18.0 + uTime * 4.2) * 0.005;
    return n;
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

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

    float jX = sin(uTime * 50.0 + position.x * 100.0) * uJitter;
    float jY = cos(uTime * 45.0 + position.y * 100.0) * uJitter;
    float jZ = sin(uTime * 55.0 + position.z * 100.0) * uJitter;
    pos.xyz += vec3(jX, jY, jZ);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const coreFragmentShader = `
  uniform float uTime;
  uniform float uPulse;
  uniform vec3  uColor1;
  uniform vec3  uColor2;
  uniform vec3  uGlow;
  uniform vec3  uFresnelColor;
  uniform float uThinking;

  varying vec3  vNormal;
  varying vec2  vUv;
  varying float vDisplacement;
  varying float vFresnel;
  varying vec3  vWorldPos;

  void main() {
    float fresnel = vFresnel;

    float scale = 12.0;
    vec2 h = vUv * scale;
    float row = floor(h.y / 0.866);
    float col = floor(h.x + mod(row, 2.0) * 0.5);
    vec2 center = vec2(col + mod(row, 2.0) * 0.5, row * 0.866) + 0.5;
    float hexDist = length(h - center * scale / scale);
    float hex = 1.0 - smoothstep(0.42, 0.45, hexDist);

    float gridX = min(fract(vUv.x * 28.0), 1.0 - fract(vUv.x * 28.0));
    float gridY = min(fract(vUv.y * 28.0), 1.0 - fract(vUv.y * 28.0));
    float wire = 1.0 - min(gridX, gridY);
    wire = step(0.92, wire);

    float gridX2 = min(fract(vUv.x * 48.0), 1.0 - fract(vUv.x * 48.0));
    float gridY2 = min(fract(vUv.y * 48.0), 1.0 - fract(vUv.y * 48.0));
    float wire2 = 1.0 - min(gridX2, gridY2);
    wire2 = step(0.96, wire2);

    float scanH = step(0.90, fract(vUv.y * 60.0 - uTime * 3.0));
    float scanV = step(0.94, fract(vUv.x * 40.0 + uTime * 2.0));
    float scan = max(scanH, scanV * 0.5);

    float ring = sin(distance(vUv, vec2(0.5)) * 40.0 - uTime * 4.0) * 0.5 + 0.5;
    ring = step(0.6, ring);

    float ripple = sin(distance(vUv, vec2(0.5)) * 20.0 - uTime * 6.0) * 0.5 + 0.5;
    ripple = smoothstep(0.45, 0.55, ripple) * 0.3;

    float mixVal = 0.5 + 0.5 * sin(uTime * uPulse * 0.4);
    vec3 baseColor = mix(uColor1, uColor2, mixVal);

    float pGlow = 0.5 + 0.5 * sin(uTime * uPulse * 2.5);
    float thinkBoost = uThinking * 0.4;

    float emission = 0.3 + 0.7 * pGlow + thinkBoost;
    emission *= 1.0 - fresnel * 0.6;

    vec3 color = vec3(0.0);
    color += baseColor * (0.1 + fresnel * 0.9);
    color += uFresnelColor * fresnel * (0.7 + thinkBoost) * pGlow;
    color += uGlow * emission * 0.4;
    color += uGlow * hex * 0.25 * (1.0 + thinkBoost);
    color += baseColor * wire * 0.7;
    color += uGlow * wire2 * 0.5;
    color += uColor1 * scan * 0.6;
    color += uFresnelColor * ring * 0.4;
    color += uColor1 * ripple;
    color += uGlow * abs(vDisplacement) * 5.0;

    float ca = pow(fresnel, 4.0);
    vec3 caShift = vec3(0.1, 0.0, -0.1) * ca;
    color += caShift;

    float flicker = uThinking * sin(uTime * 30.0) * 0.05;
    color += vec3(flicker, 0.0, flicker * 0.5);

    float alpha = 0.2 + fresnel * 0.5 + wire * 0.3 + scan * 0.3 + ring * 0.2 + hex * 0.15;
    alpha += abs(vDisplacement) * 3.0;
    alpha += thinkBoost * 0.1;

    gl_FragColor = vec4(color, clamp(alpha, 0.08, 0.95));
  }
`;

const beamVertexShader = `
  uniform float uTime;
  attribute float aOffset;
  varying float vAlpha;
  varying float vProgress;

  void main() {
    vProgress = position.y;
    float t = uTime * 2.0 + aOffset * 6.28;
    float wave = sin(t + position.y * 8.0) * 0.15;
    vec3 pos = vec3(position.x + wave, position.y, position.z + wave * 0.5);
    vAlpha = smoothstep(0.0, 0.2, position.y) * smoothstep(1.0, 0.6, position.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const beamFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  varying float vAlpha;
  varying float vProgress;

  void main() {
    float pulse = 0.6 + 0.4 * sin(uTime * 8.0 + vProgress * 20.0);
    float glow = vAlpha * pulse;
    vec3 color = uColor * (1.0 + glow * 0.5);
    gl_FragColor = vec4(color, glow * 0.6);
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
    uThinking: { value: number };
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
      const { EffectComposer } = await import("three/examples/jsm/postprocessing/EffectComposer.js");
      const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
      const { UnrealBloomPass } = await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");

      const w = container.clientWidth;
      const h = container.clientHeight;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.03);

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 50);
      camera.position.set(0, 0.5, 6.5);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        1.2, 0.5, 0.3
      );
      composer.addPass(bloomPass);

      uniformsRef.current = {
        uTime: { value: 0 },
        uPulse: { value: thinking ? 4.5 : 1.8 },
        uMouse: { value: [0, 0] },
        uJitter: { value: thinking ? 0.002 : 0.0003 },
        uColor1: { value: [0.0, 1.0, 0.4] },
        uColor2: { value: [0.0, 0.5, 1.0] },
        uGlow: { value: [0.4, 0.0, 0.9] },
        uFresnelColor: { value: [0.6, 0.0, 1.0] },
        uThinking: { value: 0 },
      };

      const u = uniformsRef.current;

      const coreMat = new THREE.ShaderMaterial({
        uniforms: u,
        vertexShader: coreVertexShader,
        fragmentShader: coreFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 3), coreMat);
      scene.add(core);

      const glowMat = new THREE.ShaderMaterial({
        uniforms: u,
        vertexShader: coreVertexShader,
        fragmentShader: coreFragmentShader.replace("clamp(alpha, 0.08, 0.95)", "0.035"),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(2.0, 1), glowMat);
      scene.add(glow);

      const ringMat = new THREE.ShaderMaterial({
        uniforms: u,
        vertexShader: coreVertexShader,
        fragmentShader: coreFragmentShader,
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

      const ring3 = new THREE.Mesh(
        new THREE.TorusGeometry(3.1, 0.02, 16, 64),
        new THREE.MeshBasicMaterial({
          color: 0x00ffc8,
          transparent: true,
          opacity: 0.15,
          blending: THREE.AdditiveBlending,
        })
      );
      ring3.rotation.x = Math.PI / 2;
      ring3.rotation.z = Math.PI / 5;
      scene.add(ring3);

      const nodeCount = 100;
      const nodePositions: THREE.Vector3[] = [];
      const nodeGroup = new THREE.Group();
      scene.add(nodeGroup);

      const nodeGeom = new THREE.BufferGeometry();
      const nPos = new Float32Array(nodeCount * 3);
      const nColors = new Float32Array(nodeCount * 3);

      for (let i = 0; i < nodeCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 2.8 + Math.random() * 2.2;
        nPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        nPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        nPos[i * 3 + 2] = r * Math.cos(phi);
        nColors[i * 3] = 0.0 + Math.random() * 0.3;
        nColors[i * 3 + 1] = 0.3 + Math.random() * 0.7;
        nColors[i * 3 + 2] = 0.3 + Math.random() * 0.7;
        nodePositions.push(new THREE.Vector3(nPos[i * 3], nPos[i * 3 + 1], nPos[i * 3 + 2]));
      }

      nodeGeom.setAttribute("position", new THREE.BufferAttribute(nPos, 3));
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

      const connPoints: number[] = [];
      const connList: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          if (nodePositions[i].distanceTo(nodePositions[j]) < 2.0) {
            connPoints.push(
              nodePositions[i].x, nodePositions[i].y, nodePositions[i].z,
              nodePositions[j].x, nodePositions[j].y, nodePositions[j].z
            );
            connList.push({ start: nodePositions[i], end: nodePositions[j] });
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

      const dataCount = 250;
      const dataGeom = new THREE.BufferGeometry();
      const dataPos = new Float32Array(dataCount * 3);
      const dataTargets: { start: THREE.Vector3; end: THREE.Vector3; offset: number }[] = [];

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

      const beamCount = 8;
      const beamGroup = new THREE.Group();
      scene.add(beamGroup);
      const beams: { mesh: THREE.Mesh; material: THREE.ShaderMaterial; offset: number; axis: THREE.Vector3 }[] = [];

      for (let i = 0; i < beamCount; i++) {
        const angle = (i / beamCount) * Math.PI * 2;
        const beamLen = 2.5 + Math.random() * 1.5;
        const beamGeo = new THREE.CylinderGeometry(0.015, 0.003, beamLen, 6, 16, true);
        const beamMat = new THREE.ShaderMaterial({
          uniforms: {
            uTime: u.uTime,
            uColor: { value: new THREE.Color(i % 2 === 0 ? 0x00ffc8 : 0x8b5cf6) },
          },
          vertexShader: beamVertexShader,
          fragmentShader: beamFragmentShader,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        const axis = new THREE.Vector3(
          Math.cos(angle),
          (Math.random() - 0.5) * 0.8,
          Math.sin(angle)
        ).normalize();
        beamMesh.position.copy(axis.clone().multiplyScalar(1.8));
        beamMesh.lookAt(axis.clone().multiplyScalar(5));
        beamMesh.rotateX(Math.PI / 2);
        beamGroup.add(beamMesh);
        beams.push({ mesh: beamMesh, material: beamMat, offset: Math.random(), axis });
      }

      const helixCount = 120;
      const helixGeo = new THREE.BufferGeometry();
      const helixPos = new Float32Array(helixCount * 3);
      const helixColors = new Float32Array(helixCount * 3);

      for (let i = 0; i < helixCount; i++) {
        const t = (i / helixCount) * Math.PI * 4;
        const y = (i / helixCount) * 4 - 2;
        const r = 1.8 + Math.sin(t * 0.5) * 0.3;
        helixPos[i * 3] = Math.cos(t) * r;
        helixPos[i * 3 + 1] = y;
        helixPos[i * 3 + 2] = Math.sin(t) * r;

        const hue = i / helixCount;
        helixColors[i * 3] = hue * 0.3;
        helixColors[i * 3 + 1] = 0.5 + hue * 0.5;
        helixColors[i * 3 + 2] = 0.8 + hue * 0.2;
      }

      helixGeo.setAttribute("position", new THREE.BufferAttribute(helixPos, 3));
      helixGeo.setAttribute("color", new THREE.BufferAttribute(helixColors, 3));

      const helixMat = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const helix = new THREE.Points(helixGeo, helixMat);
      scene.add(helix);

      const helix2Pos = new Float32Array(helixCount * 3);
      for (let i = 0; i < helixCount; i++) {
        const t = (i / helixCount) * Math.PI * 4 + Math.PI;
        const y = (i / helixCount) * 4 - 2;
        const r = 1.8 + Math.sin(t * 0.5) * 0.3;
        helix2Pos[i * 3] = Math.cos(t) * r;
        helix2Pos[i * 3 + 1] = y;
        helix2Pos[i * 3 + 2] = Math.sin(t) * r;
      }
      const helix2Geo = new THREE.BufferGeometry();
      helix2Geo.setAttribute("position", new THREE.BufferAttribute(helix2Pos, 3));
      helix2Geo.setAttribute("color", new THREE.BufferAttribute(helixColors, 3));
      const helix2 = new THREE.Points(helix2Geo, helixMat.clone());
      scene.add(helix2);

      const hudRingGeo = new THREE.RingGeometry(3.5, 3.55, 64);
      const hudRingMat = new THREE.MeshBasicMaterial({
        color: 0x00ffc8,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const hudRing = new THREE.Mesh(hudRingGeo, hudRingMat);
      hudRing.rotation.x = Math.PI / 2;
      scene.add(hudRing);

      const tickCount = 36;
      const tickGeo = new THREE.BufferGeometry();
      const tickPos = new Float32Array(tickCount * 6);
      for (let i = 0; i < tickCount; i++) {
        const a = (i / tickCount) * Math.PI * 2;
        const inner = i % 3 === 0 ? 3.35 : 3.42;
        const outer = 3.55;
        tickPos[i * 6] = Math.cos(a) * inner;
        tickPos[i * 6 + 1] = 0;
        tickPos[i * 6 + 2] = Math.sin(a) * inner;
        tickPos[i * 6 + 3] = Math.cos(a) * outer;
        tickPos[i * 6 + 4] = 0;
        tickPos[i * 6 + 5] = Math.sin(a) * outer;
      }
      tickGeo.setAttribute("position", new THREE.BufferAttribute(tickPos, 3));
      const tickMat = new THREE.LineBasicMaterial({
        color: 0x00ffc8,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
      });
      const ticks = new THREE.LineSegments(tickGeo, tickMat);
      ticks.rotation.x = Math.PI / 2;
      scene.add(ticks);

      const starCount = 800;
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

      const draw = () => {
        if (destroyed) return;
        animRef.current = requestAnimationFrame(draw);

        u.uTime.value += 0.016;

        const targetPulse = thinking ? 4.5 : 1.8;
        u.uPulse.value += (targetPulse - u.uPulse.value) * 0.05;

        u.uMouse.value = [mouseX, mouseY];
        velocityRef.current.x += (mouseVelX - velocityRef.current.x) * 0.1;
        velocityRef.current.y += (mouseVelY - velocityRef.current.y) * 0.1;

        const jitterBase = thinking ? 0.003 : 0.0003;
        const velMag = Math.abs(velocityRef.current.x) + Math.abs(velocityRef.current.y);
        u.uJitter.value = jitterBase + velMag * 0.005;

        const targetThinking = thinking ? 1.0 : 0.0;
        u.uThinking.value += (targetThinking - u.uThinking.value) * 0.04;

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

        bloomPass.strength += ((thinking ? 2.0 : 1.2) - bloomPass.strength) * 0.03;

        const rot = u.uTime.value * 0.12;
        core.rotation.x = rot * 0.6;
        core.rotation.y = rot;
        glow.rotation.copy(core.rotation);
        ring1.rotation.z += 0.005;
        ring2.rotation.z -= 0.0035;
        ring3.rotation.z += 0.002;
        nodeGroup.rotation.y += 0.0012;
        nodeGroup.rotation.x += 0.0004;

        helix.rotation.y += 0.003;
        helix2.rotation.y -= 0.003;

        const helixPosAttr = helixGeo.attributes.position;
        for (let i = 0; i < helixCount; i++) {
          const t = (i / helixCount) * Math.PI * 4 + u.uTime.value * 0.5;
          const y = (i / helixCount) * 4 - 2;
          const r = 1.8 + Math.sin(t * 0.5) * 0.3;
          helixPosAttr.array[i * 3] = Math.cos(t) * r;
          helixPosAttr.array[i * 3 + 1] = y;
          helixPosAttr.array[i * 3 + 2] = Math.sin(t) * r;
        }
        helixPosAttr.needsUpdate = true;

        const helix2PosAttr = helix2Geo.attributes.position;
        for (let i = 0; i < helixCount; i++) {
          const t = (i / helixCount) * Math.PI * 4 + Math.PI + u.uTime.value * 0.5;
          const y = (i / helixCount) * 4 - 2;
          const r = 1.8 + Math.sin(t * 0.5) * 0.3;
          helix2PosAttr.array[i * 3] = Math.cos(t) * r;
          helix2PosAttr.array[i * 3 + 1] = y;
          helix2PosAttr.array[i * 3 + 2] = Math.sin(t) * r;
        }
        helix2PosAttr.needsUpdate = true;

        hudRing.rotation.z += 0.001;
        ticks.rotation.z += 0.001;

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

        for (const b of beams) {
          const show = thinking || Math.sin(u.uTime.value * 0.5 + b.offset * 10) > 0.3;
          b.mesh.visible = show;
          if (show) {
            b.mesh.scale.y = 0.8 + 0.4 * Math.sin(u.uTime.value * 3 + b.offset * 6);
          }
        }

        const velX = velocityRef.current.x;
        const velY = velocityRef.current.y;
        const baseAngle = u.uTime.value * 0.05;
        const cx = Math.sin(baseAngle) * 0.7 + mouseX * 0.3 + velX * 0.5;
        const cy = 0.5 + Math.sin(baseAngle * 0.7) * 0.3 + mouseY * 0.2 + velY * 0.3;
        const cz = 6.5 - Math.cos(baseAngle * 0.9) * 0.3;

        camera.position.x += (cx - camera.position.x) * 0.025;
        camera.position.y += (cy - camera.position.y) * 0.025;
        camera.position.z += (cz - camera.position.z) * 0.025;
        camera.lookAt(0, 0, 0);

        composer.render();
      };

      draw();

      const onResize = () => {
        if (destroyed) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
        renderer.setSize(cw, ch);
        composer.setSize(cw, ch);
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
        ring3.geometry.dispose();
        (ring3.material as THREE.Material).dispose();
        nodeGeom.dispose();
        connGeom.dispose();
        dataGeom.dispose();
        starGeom.dispose();
        helixGeo.dispose();
        helix2Geo.dispose();
        nodeMat.dispose();
        connMat.dispose();
        dataMat.dispose();
        starMat.dispose();
        helixMat.dispose();
        (helix2.material as THREE.Material).dispose();
        hudRingGeo.dispose();
        hudRingMat.dispose();
        tickGeo.dispose();
        tickMat.dispose();
        for (const b of beams) {
          b.mesh.geometry.dispose();
          b.material.dispose();
        }
        renderer.dispose();
        composer.dispose();
      };
    };

    const p = init();
    return () => {
      p.then((fn) => fn?.());
    };
  }, [thinking, mouseX, mouseY, mouseVelX, mouseVelY, cleanup]);

  return <div ref={containerRef} className="w-full h-full" />;
}
