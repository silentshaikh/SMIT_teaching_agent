"use client";

import { useEffect, useRef, useCallback } from "react";

const robotVertexShader = `
  uniform float uTime;
  uniform float uPulse;
  uniform vec2  uMouse;
  uniform float uThinking;

  varying vec3  vNormal;
  varying vec2  vUv;
  varying float vFresnel;
  varying float vDisplacement;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;

    float glitch = sin(position.x * 12.0 + uTime * 4.0) * 0.006;
    glitch += sin(position.y * 16.0 + uTime * 6.0) * 0.004;
    float pulse = sin(uTime * uPulse * 2.0) * 0.015;
    float mouseX = uMouse.x * 0.02;
    float mouseY = uMouse.y * 0.02;
    float think = uThinking * sin(uTime * 8.0) * 0.003;

    vec3 pos = position + normal * (glitch + pulse + mouseX + mouseY + think);
    vDisplacement = glitch + pulse;

    vec3 viewDir = normalize(cameraPosition - (modelViewMatrix * vec4(pos, 1.0)).xyz);
    vFresnel = 1.0 - max(0.0, dot(normalize(normalMatrix * normal), viewDir));
    vFresnel = pow(vFresnel, 2.5);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const robotFragmentShader = `
  uniform float uTime;
  uniform float uPulse;
  uniform vec3  uColor;
  uniform vec3  uGlow;
  uniform float uThinking;

  varying vec3  vNormal;
  varying vec2  vUv;
  varying float vFresnel;
  varying float vDisplacement;

  void main() {
    float fresnel = vFresnel;

    float gridX = step(0.96, fract(vUv.x * 20.0));
    float gridY = step(0.96, fract(vUv.y * 20.0));
    float grid = max(gridX, gridY) * 0.3;

    float pulseGlow = 0.5 + 0.5 * sin(uTime * uPulse * 1.5);

    vec3 color = uColor * (0.25 + fresnel * 0.75);
    color += uGlow * fresnel * 0.5 * pulseGlow;
    color += uColor * grid;
    color += uGlow * vDisplacement * 2.0;

    float thinkMix = uThinking * 0.3;
    color = mix(color, vec3(1.0, 0.1, 0.2), thinkMix);

    float alpha = 0.5 + fresnel * 0.45 + grid * 0.15;
    alpha += vDisplacement * 2.0;

    gl_FragColor = vec4(color, clamp(alpha, 0.2, 0.95));
  }
`;

const visorVertexShader = `
  uniform float uTime;
  uniform float uThinking;
  varying vec2  vUv;
  varying float vFresnel;

  void main() {
    vUv = uv;
    vec3 viewDir = normalize(cameraPosition - (modelViewMatrix * vec4(position, 1.0)).xyz);
    vFresnel = 1.0 - max(0.0, dot(normalize(normalMatrix * normal), viewDir));
    vFresnel = pow(vFresnel, 3.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const visorFragmentShader = `
  uniform float uTime;
  uniform float uThinking;
  uniform vec2  uMouse;
  varying vec2  vUv;
  varying float vFresnel;

  void main() {
    float scan = step(0.92, fract(vUv.y * 30.0 - uTime * 4.0));
    float line = smoothstep(0.48, 0.5, abs(vUv.y - 0.5)) * 0.4;

    float eyeL = 1.0 - smoothstep(0.0, 0.15, length(vUv - vec2(0.28, 0.5)));
    float eyeR = 1.0 - smoothstep(0.0, 0.15, length(vUv - vec2(0.72, 0.5)));
    float eyes = max(eyeL, eyeR);

    vec3 normalColor = vec3(0.0, 0.9, 0.5);
    vec3 thinkColor = vec3(1.0, 0.15, 0.25);
    vec3 baseColor = mix(normalColor, thinkColor, uThinking);

    float blink = step(0.98, fract(uTime * 0.15));
    eyes *= (1.0 - blink * 0.7);

    float flicker = uThinking * (0.9 + 0.1 * sin(uTime * 25.0));

    vec3 color = baseColor * (0.3 + eyes * 0.7 + scan * 0.15 + line);
    color += baseColor * vFresnel * 0.4;
    color *= (1.0 + flicker * 0.2);

    float alpha = 0.4 + eyes * 0.5 + scan * 0.1 + vFresnel * 0.3;
    alpha *= flicker;

    gl_FragColor = vec4(color, clamp(alpha, 0.15, 0.98));
  }
`;

interface RobotHeroProps {
  thinking: boolean;
  mouseX: number;
  mouseY: number;
  scrollProgress?: number;
}

export function RobotHero({
  thinking,
  mouseX,
  mouseY,
  scrollProgress = 0,
}: RobotHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const velocityRef = useRef({ x: 0, y: 0 });
  const uniformsRef = useRef<{
    uTime: { value: number };
    uPulse: { value: number };
    uMouse: { value: number[] };
    uColor: { value: number[] };
    uGlow: { value: number[] };
    uThinking: { value: number };
  } | null>(null);
  const visorUniformsRef = useRef<{
    uTime: { value: number };
    uThinking: { value: number };
    uMouse: { value: number[] };
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
      scene.fog = new THREE.FogExp2(0x020a08, 0.025);

      const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 80);
      camera.position.set(0, 1.2, 6);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.setClearColor(0x020a08, 1);
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.top = "0";
      renderer.domElement.style.left = "0";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      container.appendChild(renderer.domElement);

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        1.0, 0.4, 0.3
      );
      composer.addPass(bloomPass);

      uniformsRef.current = {
        uTime: { value: 0 },
        uPulse: { value: 1.0 },
        uMouse: { value: [0, 0] },
        uColor: { value: [0, 0.85, 0.5] },
        uGlow: { value: [0.3, 0, 0.8] },
        uThinking: { value: 0 },
      };

      visorUniformsRef.current = {
        uTime: uniformsRef.current.uTime,
        uThinking: uniformsRef.current.uThinking,
        uMouse: uniformsRef.current.uMouse,
      };

      const u = uniformsRef.current;
      const vu = visorUniformsRef.current;

      const robotGroup = new THREE.Group();
      scene.add(robotGroup);

      const robotMat = new THREE.ShaderMaterial({
        uniforms: u,
        vertexShader: robotVertexShader,
        fragmentShader: robotFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const headGeo = new THREE.BoxGeometry(1.4, 1.2, 1.2, 8, 8, 8);
      const head = new THREE.Mesh(headGeo, robotMat);
      head.position.y = 2.0;
      robotGroup.add(head);

      const jawGeo = new THREE.BoxGeometry(1.0, 0.3, 0.9, 4, 2, 4);
      const jaw = new THREE.Mesh(jawGeo, robotMat);
      jaw.position.set(0, 1.25, 0.1);
      robotGroup.add(jaw);

      const antennaGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
      const antennaMat = new THREE.MeshBasicMaterial({
        color: 0x00ffc8,
        transparent: true,
        opacity: 0.6,
      });
      const antenna = new THREE.Mesh(antennaGeo, antennaMat);
      antenna.position.set(0, 2.85, 0);
      robotGroup.add(antenna);

      const antennaTipGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const antennaTipMat = new THREE.MeshBasicMaterial({
        color: 0x00ffc8,
        transparent: true,
        opacity: 0.9,
      });
      const antennaTip = new THREE.Mesh(antennaTipGeo, antennaTipMat);
      antennaTip.position.set(0, 3.12, 0);
      robotGroup.add(antennaTip);

      const visorGeo = new THREE.PlaneGeometry(1.2, 0.35, 16, 8);
      const visorMat = new THREE.ShaderMaterial({
        uniforms: vu,
        vertexShader: visorVertexShader,
        fragmentShader: visorFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 2.05, 0.61);
      robotGroup.add(visor);

      const neckGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.5, 12);
      const neck = new THREE.Mesh(neckGeo, robotMat);
      neck.position.set(0, 1.55, 0);
      robotGroup.add(neck);

      const chestGeo = new THREE.BoxGeometry(1.8, 1.0, 0.8, 8, 6, 4);
      const chest = new THREE.Mesh(chestGeo, robotMat);
      chest.position.set(0, 0.8, 0);
      robotGroup.add(chest);

      const chestAccentGeo = new THREE.PlaneGeometry(0.6, 0.15);
      const chestAccentMat = new THREE.MeshBasicMaterial({
        color: 0x00ffc8,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
      });
      const chestAccent = new THREE.Mesh(chestAccentGeo, chestAccentMat);
      chestAccent.position.set(0, 0.85, 0.41);
      robotGroup.add(chestAccent);

      const shoulderGeo = new THREE.BoxGeometry(0.4, 0.35, 0.5, 4, 4, 4);
      const shoulderL = new THREE.Mesh(shoulderGeo, robotMat);
      shoulderL.position.set(-1.1, 1.15, 0);
      robotGroup.add(shoulderL);

      const shoulderR = new THREE.Mesh(shoulderGeo, robotMat);
      shoulderR.position.set(1.1, 1.15, 0);
      robotGroup.add(shoulderR);

      const glowMat = new THREE.ShaderMaterial({
        uniforms: u,
        vertexShader: robotVertexShader.replace("0.006", "0.002").replace("0.004", "0.002"),
        fragmentShader: robotFragmentShader.replace("clamp(alpha, 0.2, 0.95)", "0.04"),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      });
      const glowHead = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 1.6, 4, 4, 4), glowMat);
      glowHead.position.copy(head.position);
      robotGroup.add(glowHead);

      const nodeCount = 80;
      const nodePositions: THREE.Vector3[] = [];
      const nodeGeom = new THREE.BufferGeometry();
      const nPos = new Float32Array(nodeCount * 3);
      const nColors = new Float32Array(nodeCount * 3);

      for (let i = 0; i < nodeCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 3.5 + Math.random() * 3;
        nPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        nPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        nPos[i * 3 + 2] = r * Math.cos(phi);
        nColors[i * 3] = 0.0 + Math.random() * 0.3;
        nColors[i * 3 + 1] = 0.4 + Math.random() * 0.6;
        nColors[i * 3 + 2] = 0.3 + Math.random() * 0.5;
        nodePositions.push(new THREE.Vector3(nPos[i * 3], nPos[i * 3 + 1], nPos[i * 3 + 2]));
      }
      nodeGeom.setAttribute("position", new THREE.BufferAttribute(nPos, 3));
      nodeGeom.setAttribute("color", new THREE.BufferAttribute(nColors, 3));
      const nodeMat = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      scene.add(new THREE.Points(nodeGeom, nodeMat));

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
        color: 0x00ffc8,
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.LineSegments(connGeom, connMat));

      const dataCount = 100;
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
        dataTargets.push({ start: c.start.clone(), end: c.end.clone(), offset: Math.random() * 100 });
        dataPos[i * 3] = c.start.x;
        dataPos[i * 3 + 1] = c.start.y;
        dataPos[i * 3 + 2] = c.start.z;
      }
      dataGeom.setAttribute("position", new THREE.BufferAttribute(dataPos, 3));
      const dataMat = new THREE.PointsMaterial({
        size: 0.03,
        color: 0x00ffc8,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      scene.add(new THREE.Points(dataGeom, dataMat));

      const starCount = 500;
      const starGeom = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 60;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
        const brightness = 0.3 + Math.random() * 0.5;
        const tint = Math.random();
        starColors[i * 3] = tint < 0.3 ? 0.1 * brightness : 0.2 * brightness;
        starColors[i * 3 + 1] = 0.5 * brightness;
        starColors[i * 3 + 2] = tint < 0.3 ? 0.6 * brightness : tint < 0.6 ? 0.3 * brightness : 0.8 * brightness;
      }
      starGeom.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      starGeom.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
      const starMat = new THREE.PointsMaterial({
        size: 0.04,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      });
      scene.add(new THREE.Points(starGeom, starMat));

      const bgPlaneGeo = new THREE.PlaneGeometry(30, 20);
      const bgPlaneMat = new THREE.ShaderMaterial({
        uniforms: { uTime: u.uTime },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;
          void main(){
            float d = distance(vUv, vec2(0.5, 0.45));
            vec3 c1 = vec3(0.0, 0.08, 0.06);
            vec3 c2 = vec3(0.02, 0.02, 0.06);
            vec3 col = mix(c1, c2, smoothstep(0.0, 0.7, d));
            float pulse = 0.02 * sin(uTime * 0.5 + d * 6.0);
            col += vec3(0.0, 0.15, 0.1) * pulse;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        depthWrite: false,
      });
      const bgPlane = new THREE.Mesh(bgPlaneGeo, bgPlaneMat);
      bgPlane.position.set(0, 1, -8);
      scene.add(bgPlane);

      const ambientLight = new THREE.AmbientLight(0x334455, 0.6);
      scene.add(ambientLight);
      const pointLight1 = new THREE.PointLight(0x00ffc8, 1.2, 20);
      pointLight1.position.set(3, 4, 5);
      scene.add(pointLight1);
      const pointLight2 = new THREE.PointLight(0x8b5cf6, 0.8, 15);
      pointLight2.position.set(-4, 2, 3);
      scene.add(pointLight2);

      const draw = () => {
        if (destroyed) return;
        animRef.current = requestAnimationFrame(draw);

        u.uTime.value += 0.016;

        const targetPulse = thinking ? 4.0 : 1.0;
        u.uPulse.value += (targetPulse - u.uPulse.value) * 0.05;

        u.uMouse.value = [mouseX, mouseY];
        velocityRef.current.x += (mouseX - velocityRef.current.x) * 0.08;
        velocityRef.current.y += (mouseY - velocityRef.current.y) * 0.08;

        const targetThinking = thinking ? 1.0 : 0.0;
        u.uThinking.value += (targetThinking - u.uThinking.value) * 0.04;

        const targetC = thinking ? [1.0, 0.1, 0.2] : [0, 0.85, 0.5];
        const targetG = thinking ? [0.9, 0.0, 0.0] : [0.3, 0, 0.8];
        for (let i = 0; i < 3; i++) {
          u.uColor.value[i] += (targetC[i] - u.uColor.value[i]) * 0.04;
          u.uGlow.value[i] += (targetG[i] - u.uGlow.value[i]) * 0.04;
        }

        bloomPass.strength += ((thinking ? 1.8 : 1.0) - bloomPass.strength) * 0.03;

        const breathe = Math.sin(u.uTime.value * 0.8) * 0.03;
        robotGroup.position.y = breathe;

        const headTiltX = velocityRef.current.y * 0.15;
        const headTiltY = velocityRef.current.x * 0.2;
        head.rotation.x += (headTiltX - head.rotation.x) * 0.05;
        head.rotation.y += (headTiltY - head.rotation.y) * 0.05;
        jaw.rotation.x = head.rotation.x * 0.6;
        jaw.rotation.y = head.rotation.y * 0.6;
        visor.rotation.x = head.rotation.x * 0.8;
        visor.rotation.y = head.rotation.y * 0.8;
        glowHead.rotation.x = head.rotation.x;
        glowHead.rotation.y = head.rotation.y;

        antennaTipMat.opacity = 0.5 + 0.4 * Math.sin(u.uTime.value * 3);

        chestAccentMat.opacity = 0.2 + 0.3 * Math.sin(u.uTime.value * 2);

        const dp = dataGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < dataCount; i++) {
          const t = dataTargets[i % dataTargets.length];
          const phase = ((u.uTime.value * 0.8 + t.offset) % 2) / 2;
          dp[i * 3] = t.start.x + (t.end.x - t.start.x) * phase;
          dp[i * 3 + 1] = t.start.y + (t.end.y - t.start.y) * phase;
          dp[i * 3 + 2] = t.start.z + (t.end.z - t.start.z) * phase;
        }
        dataGeom.attributes.position.needsUpdate = true;
        dataMat.opacity = 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(u.uTime.value * 2));

        pointLight1.position.x = Math.sin(u.uTime.value * 0.3) * 5;
        pointLight1.position.y = 4 + Math.cos(u.uTime.value * 0.4) * 2;
        pointLight2.position.x = Math.cos(u.uTime.value * 0.25) * 4;

        const scrollOffset = scrollProgress * 2;
        const baseAngle = u.uTime.value * 0.03;
        const cx = Math.sin(baseAngle) * 0.5 + velocityRef.current.x * 0.3;
        const cy = 1.2 + Math.sin(baseAngle * 0.7) * 0.2 + velocityRef.current.y * 0.15 - scrollOffset * 0.5;
        const cz = 6 - scrollOffset * 0.8;

        camera.position.x += (cx - camera.position.x) * 0.02;
        camera.position.y += (cy - camera.position.y) * 0.02;
        camera.position.z += (cz - camera.position.z) * 0.02;
        camera.lookAt(0, 1.2 - scrollOffset * 0.3, 0);

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
        bloomPass.resolution.set(cw, ch);
      };

      window.addEventListener("resize", onResize);

      return () => {
        destroyed = true;
        cancelAnimationFrame(animRef.current);
        window.removeEventListener("resize", onResize);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        robotMat.dispose();
        glowMat.dispose();
        visorMat.dispose();
        head.geometry.dispose();
        jaw.geometry.dispose();
        neck.geometry.dispose();
        chest.geometry.dispose();
        shoulderL.geometry.dispose();
        shoulderR.geometry.dispose();
        glowHead.geometry.dispose();
        visor.geometry.dispose();
        (antenna.geometry as THREE.BufferGeometry).dispose();
        antennaMat.dispose();
        (antennaTip.geometry as THREE.SphereGeometry).dispose();
        antennaTipMat.dispose();
        (chestAccent.geometry as THREE.PlaneGeometry).dispose();
        chestAccentMat.dispose();
        nodeGeom.dispose();
        connGeom.dispose();
        dataGeom.dispose();
        starGeom.dispose();
        nodeMat.dispose();
        connMat.dispose();
        dataMat.dispose();
        starMat.dispose();
        renderer.dispose();
        composer.dispose();
      };
    };

    const p = init();
    return () => {
      p.then((fn) => fn?.());
    };
  }, [thinking, mouseX, mouseY, scrollProgress, cleanup]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}
