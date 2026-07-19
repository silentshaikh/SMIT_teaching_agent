function noop() {}
function noopObj() { return new Proxy({}, { get: () => noop }); }

var mockMat = { dispose: noop, clone: function() { return this; }, emissiveIntensity: 1, emissive: { setHSL: noop }, opacity: 1, transparent: false };
var mockGeom = { dispose: noop, setAttribute: noop, setFromPoints: noop, attributes: { position: { array: new Float32Array(600), needsUpdate: false } } };
var mockVec = { x: 0, y: 0, z: 0, set: noop, copy: function() { return this; }, clone: function() { return { x: 0, y: 0, z: 0, set: noop, copy: noop, clone: noop, distanceTo: noop }; }, distanceTo: function() { return 1; } };
var mockMesh = {
  rotation: { x: 0, y: 0, z: 0, set: noop, copy: noop },
  position: { x: 0, y: 0, z: 0, set: noop, copy: function() { return this; }, clone: function() { return { x: 0, y: 0, z: 0 }; }, distanceTo: function() { return 1; } },
  scale: { x: 1, y: 1, z: 1, set: noop },
  material: mockMat,
  geometry: mockGeom,
  userData: {},
  add: noop,
  children: [],
  visible: true,
  parent: null,
  name: "",
  castShadow: false,
  receiveShadow: false,
};
var mockCamera = {
  position: { x: 0, y: 0, z: 0, set: noop },
  lookAt: noop,
  aspect: 1,
  fov: 45,
  updateProjectionMatrix: noop,
};
var mockRenderer = {
  setPixelRatio: noop,
  setSize: noop,
  setClearColor: noop,
  render: noop,
  dispose: noop,
  shadowMap: { enabled: false, type: 0 },
  outputColorSpace: 0,
  toneMapping: 0,
  toneMappingExposure: 1.0,
  domElement: typeof document !== "undefined" ? document.createElement("canvas") : {},
};

function Ctor(ret) {
  function F() { return ret; }
  return F;
}

module.exports = {
  __esModule: true,
  Scene: Ctor({ background: null, add: noop, traverse: noop }),
  PerspectiveCamera: Ctor(mockCamera),
  WebGLRenderer: Ctor(mockRenderer),
  OrthographicCamera: Ctor(mockCamera),
  BoxGeometry: Ctor(mockGeom),
  SphereGeometry: Ctor(mockGeom),
  CylinderGeometry: Ctor(mockGeom),
  PlaneGeometry: Ctor(mockGeom),
  TorusGeometry: Ctor(mockGeom),
  RingGeometry: Ctor(mockGeom),
  IcosahedronGeometry: Ctor(mockGeom),
  BufferGeometry: Ctor({ dispose: noop, setAttribute: noop, setFromPoints: noop, attributes: { position: { array: new Float32Array(600), needsUpdate: false } } }),
  ShaderMaterial: Ctor(mockMat),
  MeshStandardMaterial: Ctor({ dispose: noop, clone: function() { return this; }, emissiveIntensity: 1, emissive: { setHSL: noop, set: noop }, opacity: 1, transparent: false }),
  MeshBasicMaterial: Ctor(mockMat),
  PointsMaterial: Ctor({ dispose: noop, size: 0.15, opacity: 1, transparent: false }),
  LineBasicMaterial: Ctor(mockMat),
  Mesh: Ctor(mockMesh),
  Points: Ctor(mockMesh),
  Line: Ctor(mockMesh),
  LineSegments: Ctor(mockMesh),
  Group: Ctor({ add: noop, rotation: { x: 0, y: 0, z: 0, set: noop }, position: { x: 0, y: 0, z: 0, set: noop }, visible: true, children: [] }),
  Vector3: Ctor({ x: 0, y: 0, z: 0, set: noop, copy: function() { return this; }, clone: function() { return { x: 0, y: 0, z: 0, set: noop }; }, distanceTo: function() { return 1; } }),
  Vector2: Ctor({ x: 0, y: 0 }),
  BufferAttribute: Ctor({}),
  Float32BufferAttribute: Ctor({}),
  CanvasTexture: Ctor({ needsUpdate: false, minFilter: 0, magFilter: 0 }),
  Raycaster: Ctor({ setFromCamera: noop, intersectObjects: function() { return []; } }),
  Clock: Ctor({ getElapsedTime: function() { return 0; } }),
  GridHelper: Ctor({ position: { y: 0 }, material: mockMat }),
  AmbientLight: Ctor({}),
  DirectionalLight: Ctor({ position: { x: 0, y: 0, z: 0, set: noop }, castShadow: false, shadow: { mapSize: { set: noop }, camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 } } }),
  PointLight: Ctor({ position: { x: 0, y: 0, z: 0, set: noop } }),
  CatmullRomCurve3: Ctor({}),
  TubeGeometry: Ctor(mockGeom),
  FogExp2: Ctor(),
  AdditiveBlending: 2,
  DoubleSide: 2,
  BackSide: 1,
  PCFSoftShadowMap: 0,
  SRGBColorSpace: 0,
  ACESFilmicToneMapping: 0,
  LinearFilter: 0,
};
