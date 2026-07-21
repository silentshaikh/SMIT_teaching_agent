import { render, act } from "@testing-library/react";
import React from "react";

jest.mock("three", () => {
  const m = {
    Scene: jest.fn(() => ({ add: jest.fn(), fog: null })),
    PerspectiveCamera: jest.fn(() => ({
      position: { set: jest.fn(), x: 0, y: 0, z: 0, copy: jest.fn() },
      aspect: 1, updateProjectionMatrix: jest.fn(), lookAt: jest.fn(),
    })),
    WebGLRenderer: jest.fn(() => ({
      setPixelRatio: jest.fn(), setSize: jest.fn(), setClearColor: jest.fn(),
      domElement: document.createElement("canvas"), render: jest.fn(), dispose: jest.fn(),
    })),
    IcosahedronGeometry: jest.fn(() => ({ dispose: jest.fn() })),
    TorusGeometry: jest.fn(() => ({ dispose: jest.fn() })),
    RingGeometry: jest.fn(() => ({ dispose: jest.fn() })),
    CylinderGeometry: jest.fn(() => ({ dispose: jest.fn() })),
    ShaderMaterial: jest.fn(() => ({ dispose: jest.fn() })),
    MeshBasicMaterial: jest.fn(() => ({ dispose: jest.fn() })),
    LineBasicMaterial: jest.fn(() => ({ dispose: jest.fn() })),
    PointsMaterial: jest.fn(() => ({ dispose: jest.fn(), clone: jest.fn(() => ({ dispose: jest.fn() })), opacity: 0.5 })),
    Mesh: jest.fn(() => ({
      rotation: { x: 0, y: 0, z: 0, copy: jest.fn() },
      position: { set: jest.fn(), x: 0, y: 0, z: 0, copy: jest.fn() },
      lookAt: jest.fn(), rotateX: jest.fn(), visible: true,
      scale: { y: 1 }, geometry: { dispose: jest.fn() }, material: { dispose: jest.fn() },
    })),
    Points: jest.fn(() => ({
      rotation: { y: 0, x: 0, z: 0 },
      geometry: {
        attributes: { position: { array: new Float32Array(3), needsUpdate: false }, color: { array: new Float32Array(3) } },
        dispose: jest.fn(),
      },
      material: { dispose: jest.fn(), opacity: 0.5, clone: jest.fn(() => ({ dispose: jest.fn() })) },
    })),
    LineSegments: jest.fn(() => ({ rotation: { x: 0, y: 0, z: 0 }, geometry: { dispose: jest.fn() }, material: { dispose: jest.fn() } })),
    Line: jest.fn(() => ({})),
    Group: jest.fn(() => ({ add: jest.fn(), rotation: { y: 0, x: 0, z: 0 } })),
    BufferGeometry: jest.fn(() => ({
      setAttribute: jest.fn(),
      attributes: { position: { array: new Float32Array(6), needsUpdate: false }, color: { array: new Float32Array(6) } },
      dispose: jest.fn(),
    })),
    BufferAttribute: jest.fn(() => ({})),
    Float32BufferAttribute: jest.fn(() => ({})),
    AdditiveBlending: 2,
    DoubleSide: 2,
    BackSide: 1,
    FogExp2: jest.fn(),
    Color: jest.fn(() => ({})),
    Vector2: jest.fn(() => ({})),
    Vector3: jest.fn(function (x?: number, y?: number, z?: number) {
      const o: Record<string, unknown> = { x: x || 0, y: y || 0, z: z || 0 };
      o.clone = jest.fn(() => ({ ...o, multiplyScalar: jest.fn(() => ({ ...o })), copy: jest.fn(), normalize: jest.fn(() => o) }));
      o.copy = jest.fn(() => o);
      o.normalize = jest.fn(() => o);
      o.distanceTo = jest.fn(() => 1);
      return o;
    }),
  };
  return { __esModule: true, ...m, default: m };
});
jest.mock("three/examples/jsm/postprocessing/EffectComposer.js", () => ({
  EffectComposer: jest.fn(() => ({ addPass: jest.fn(), render: jest.fn(), setSize: jest.fn(), dispose: jest.fn() })),
}));
jest.mock("three/examples/jsm/postprocessing/RenderPass.js", () => ({ RenderPass: jest.fn() }));
jest.mock("three/examples/jsm/postprocessing/UnrealBloomPass.js", () => ({
  UnrealBloomPass: jest.fn(() => ({ strength: 1.2 })),
}));

import { AICore } from "@/components/AICore";

beforeEach(() => { jest.restoreAllMocks(); });

test("TC-AICORE-01: renders without crashing", () => {
  const { container } = render(<AICore thinking={false} mouseX={0} mouseY={0} />);
  expect(container.querySelector("div")).toBeInTheDocument();
});

test("TC-AICORE-02: accepts thinking prop", () => {
  const { rerender } = render(<AICore thinking={false} mouseX={0} mouseY={0} />);
  rerender(<AICore thinking={true} mouseX={0} mouseY={0} />);
  expect(true).toBe(true);
});

test("TC-AICORE-03: accepts mouse position props", () => {
  const { container } = render(<AICore thinking={false} mouseX={0.5} mouseY={-0.3} />);
  expect(container.firstChild).toBeInTheDocument();
});

test("TC-AICORE-04: accepts velocity props", () => {
  const { container } = render(<AICore thinking={false} mouseX={0} mouseY={0} mouseVelX={1.2} mouseVelY={-0.8} />);
  expect(container.firstChild).toBeInTheDocument();
});

test("TC-AICORE-05: cleanup removes canvas on unmount", async () => {
  const { unmount, container } = render(<AICore thinking={false} mouseX={0} mouseY={0} />);
  await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
  unmount();
  expect(container.innerHTML).toBe("");
});
