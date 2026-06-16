"use client";

import { useEffect, useRef, useCallback } from "react";

const vertexShader = `
  uniform float uTime;
  uniform float uPulse;
  uniform vec2  uMouse;

  varying vec3  vNormal;
  varying vec2  vUv;
  varying float vDisplacement;

  void main() {
    vNormal  = normalize(normalMatrix * normal);
    vUv      = uv;

    float glitch  = sin(position.x * 12.0 + uTime * 4.0) * 0.008;
    glitch       += sin(position.y * 16.0 + uTime * 6.0) * 0.006;
    float pulse   = sin(uTime * uPulse * 2.0) * 0.02;
    float mouseX  = uMouse.x * 0.03;
    float mouseY  = uMouse.y * 0.03;

    vec3 pos = position + normal * (glitch + pulse + mouseX + mouseY);
    vDisplacement = glitch + pulse;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uPulse;
  uniform vec3  uColor;
  uniform vec3  uGlow;

  varying vec3  vNormal;
  varying vec2  vUv;
  varying float vDisplacement;

  void main() {
    vec3 viewDir  = normalize(cameraPosition);
    float fresnel = 1.0 - max(0.0, dot(viewDir, vNormal));
    fresnel       = pow(fresnel, 2.5);

    float gridX = step(0.96, fract(vUv.x * 24.0));
    float gridY = step(0.96, fract(vUv.y * 24.0));
    float grid  = max(gridX, gridY) * 0.4;

    float pulseGlow = 0.5 + 0.5 * sin(uTime * uPulse * 1.5);

    vec3 color  = uColor * (0.3 + fresnel * 0.7);
    color      += uGlow * fresnel * 0.5 * pulseGlow;
    color      += uColor * grid;
    color      += uGlow * vDisplacement * 2.0;

    float alpha = 0.4 + fresnel * 0.5 + grid * 0.2;
    alpha      += vDisplacement * 3.0;

    gl_FragColor = vec4(color, clamp(alpha, 0.15, 0.95));
  }
`;

interface RobotCoreProps {
  thinking: boolean;
  mouseX: number;
  mouseY: number;
}

export function RobotCore({ thinking, mouseX, mouseY }: RobotCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const uniformsRef = useRef<{
    uTime: { value: number };
    uPulse: { value: number };
    uMouse: { value: number[] };
    uColor: { value: number[] };
    uGlow: { value: number[] };
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

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.set(0, 0, 5.5);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      uniformsRef.current = {
        uTime: { value: 0 },
        uPulse: { value: thinking ? 3.0 : 1.0 },
        uMouse: { value: [0, 0] },
        uColor: { value: [0, 1, 0.4] },
        uGlow: { value: [0.3, 0, 0.8] },
      };

      const coreMat = new THREE.ShaderMaterial({
        uniforms: uniformsRef.current,
        vertexShader,
        fragmentShader,
        wireframe: false,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 2), coreMat);
      scene.add(core);

      const ringMat = new THREE.ShaderMaterial({
        uniforms: uniformsRef.current,
        vertexShader,
        fragmentShader,
        wireframe: false,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.06, 32, 64), ringMat);
      ring.rotation.x = Math.PI / 3;
      scene.add(ring);

      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.04, 24, 64), ringMat);
      ring2.rotation.x = -Math.PI / 4;
      ring2.rotation.z = Math.PI / 6;
      scene.add(ring2);

      const glowMat = new THREE.ShaderMaterial({
        uniforms: uniformsRef.current,
        vertexShader: vertexShader.replace("0.008", "0.002").replace("0.006", "0.002"),
        fragmentShader: fragmentShader.replace("clamp(alpha, 0.15, 0.95)", "0.06"),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      });

      const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(2.0, 1), glowMat);
      scene.add(glow);

      const draw = () => {
        if (destroyed) return;
        animRef.current = requestAnimationFrame(draw);

        uniformsRef.current!.uTime.value += 0.016;
        const targetPulse = thinking ? 3.0 : 1.0;
        uniformsRef.current!.uPulse.value += (targetPulse - uniformsRef.current!.uPulse.value) * 0.05;
        uniformsRef.current!.uMouse.value = [mouseX, mouseY];

        core.rotation.x += 0.003;
        core.rotation.y += 0.006;
        ring.rotation.z += 0.004;
        ring2.rotation.z -= 0.003;

        const c = uniformsRef.current!.uColor.value;
        if (thinking) {
          c[0] += (1 - c[0]) * 0.05;
          c[1] += (0 - c[1]) * 0.05;
          c[2] += (0 - c[2]) * 0.05;
        } else {
          c[0] += (0 - c[0]) * 0.05;
          c[1] += (1 - c[1]) * 0.05;
          c[2] += (0.4 - c[2]) * 0.05;
        }

        renderer.render(scene, camera);
      };

      draw();

      const onResize = () => {
        if (destroyed) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
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
        ringMat.dispose();
        glowMat.dispose();
        core.geometry.dispose();
        ring.geometry.dispose();
        ring2.geometry.dispose();
        glow.geometry.dispose();
        renderer.dispose();
      };
    };

    const cleanupPromise = init();
    return () => {
      cleanupPromise.then((fn) => fn?.());
    };
  }, [thinking, mouseX, mouseY, cleanup]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
    />
  );
}
