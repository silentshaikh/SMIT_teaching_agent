"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 120;
const CONNECTION_DISTANCE = 2.5;
const NODE_COUNT = 8;

interface ThreeBackgroundProps {
  className?: string;
}

export function ThreeBackground({ className = "" }: ThreeBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x223344, 0.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00ffc8, 1.5, 20);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x8b5cf6, 1.5, 20);
    pointLight2.position.set(-5, -3, 3);
    scene.add(pointLight2);

    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const speeds: number[] = [];

    const palette = [
      new THREE.Color(0x00ffc8),
      new THREE.Color(0x8b5cf6),
      new THREE.Color(0x06b6d4),
      new THREE.Color(0xf43f5e),
      new THREE.Color(0x22d3ee),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      speeds.push(0.002 + Math.random() * 0.008);
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    const nodes: THREE.Mesh[] = [];
    const nodePositions: THREE.Vector3[] = [];
    const nodePalette = [0x00ffc8, 0x8b5cf6, 0x06b6d4, 0xf43f5e];

    for (let i = 0; i < NODE_COUNT; i++) {
      const nodeGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: nodePalette[i % nodePalette.length],
        emissive: nodePalette[i % nodePalette.length],
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0.9,
      });
      const node = new THREE.Mesh(nodeGeo, nodeMat);

      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6
      );
      node.position.copy(pos);
      node.userData = {
        basePos: pos.clone(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
      };
      scene.add(node);
      nodes.push(node);
      nodePositions.push(pos);
    }

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffc8,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const connectionLines: THREE.Line[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dist = nodePositions[i].distanceTo(nodePositions[j]);
        if (dist < CONNECTION_DISTANCE * 2) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            nodePositions[i],
            nodePositions[j],
          ]);
          const line = new THREE.Line(lineGeo, lineMaterial.clone());
          scene.add(line);
          connectionLines.push(line);
        }
      }
    }

    const ringGeometry = new THREE.RingGeometry(2.8, 3, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffc8,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    scene.add(ring);

    const ring2Geometry = new THREE.RingGeometry(4.5, 4.6, 64);
    const ring2Material = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ring2 = new THREE.Mesh(ring2Geometry, ring2Material);
    scene.add(ring2);

    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      const posAttr = particleGeometry.getAttribute(
        "position"
      ) as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        posAttr.array[i * 3 + 1] += speeds[i];
        if (posAttr.array[i * 3 + 1] > 6) {
          posAttr.array[i * 3 + 1] = -6;
        }
      }
      posAttr.needsUpdate = true;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const { basePos, phase, speed } = node.userData;
        node.position.x = basePos.x + Math.sin(elapsed * speed + phase) * 0.4;
        node.position.y = basePos.y + Math.cos(elapsed * speed * 0.7 + phase) * 0.3;
        node.position.z = basePos.z + Math.sin(elapsed * speed * 0.5 + phase * 2) * 0.2;
      }

      for (let k = 0; k < connectionLines.length; k++) {
        const line = connectionLines[k];
        const geo = line.geometry as THREE.BufferGeometry;
        const pos = geo.getAttribute("position") as THREE.BufferAttribute;
        let idx = 0;
        for (let i = 0; i < NODE_COUNT; i++) {
          for (let j = i + 1; j < NODE_COUNT; j++) {
            if (idx === k) {
              pos.setXYZ(0, nodes[i].position.x, nodes[i].position.y, nodes[i].position.z);
              pos.setXYZ(1, nodes[j].position.x, nodes[j].position.y, nodes[j].position.z);
              pos.needsUpdate = true;

              const dist = nodes[i].position.distanceTo(nodes[j].position);
              const maxDist = CONNECTION_DISTANCE * 2;
              (line.material as THREE.LineBasicMaterial).opacity = Math.max(0, 0.2 * (1 - dist / maxDist));
            }
            idx++;
          }
        }
      }

      ring.rotation.x = elapsed * 0.1;
      ring.rotation.y = elapsed * 0.15;

      ring2.rotation.x = -elapsed * 0.08;
      ring2.rotation.z = elapsed * 0.12;

      pointLight1.position.x = Math.sin(elapsed * 0.3) * 6;
      pointLight1.position.y = Math.cos(elapsed * 0.4) * 4;

      pointLight2.position.x = Math.cos(elapsed * 0.25) * 5;
      pointLight2.position.z = Math.sin(elapsed * 0.35) * 4;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      particleGeometry.dispose();
      particleMaterial.dispose();
      nodes.forEach((n) => {
        (n.geometry as THREE.BufferGeometry).dispose();
        (n.material as THREE.Material).dispose();
      });
      connectionLines.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
      ringGeometry.dispose();
      ringMaterial.dispose();
      ring2Geometry.dispose();
      ring2Material.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
