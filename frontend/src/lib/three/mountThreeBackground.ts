import * as THREE from 'three';

export type ThreeMount = {
  dispose: () => void;
};

export function mountThreeBackground(canvas: HTMLCanvasElement): ThreeMount {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  camera.position.set(0, 0, 18);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.75);
  key.position.set(6, 10, 8);
  scene.add(key);

  const starsGeo = new THREE.BufferGeometry();
  const starCount = 900;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const r = 120 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.cos(phi);
    positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const starsMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.9,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const stars = new THREE.Points(starsGeo, starsMat);
  scene.add(stars);

  const glowGeo = new THREE.IcosahedronGeometry(6.4, 3);
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x00ab39,
    roughness: 0.22,
    metalness: 0.18,
    transparent: true,
    opacity: 0.12,
    emissive: 0x00ab39,
    emissiveIntensity: 0.28,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(-2.2, 0.9, -4);
  scene.add(glow);

  let raf = 0;
  let disposed = false;

  const setSize = (w: number, h: number) => {
    const width = Math.max(1, Math.floor(w));
    const height = Math.max(1, Math.floor(h));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const ro = new ResizeObserver((entries) => {
    const e = entries[0];
    if (!e) return;
    const cr = e.contentRect;
    setSize(cr.width, cr.height);
  });
  ro.observe(canvas);

  const tick = (t: number) => {
    if (disposed) return;
    const tt = t / 1000;
    stars.rotation.y = tt * 0.035;
    stars.rotation.x = tt * 0.017;
    glow.rotation.y = tt * 0.22;
    glow.rotation.x = tt * 0.12;
    glow.position.y = 0.9 + Math.sin(tt * 0.7) * 0.35;
    camera.position.x = Math.sin(tt * 0.12) * 0.8;
    camera.position.y = Math.cos(tt * 0.09) * 0.55;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    starsGeo.dispose();
    starsMat.dispose();
    glowGeo.dispose();
    glowMat.dispose();
    renderer.dispose();
  };

  return { dispose };
}
