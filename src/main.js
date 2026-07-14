import * as THREE from "three";

// ─── Constants ───────────────────────────────────────────────────────────────
const SECTION_COUNT = 8;
const SECTION_SPACING = 14;
const COLORS = {
  white: 0xffffff,
  gray: 0x666666,
  dark: 0x1a1a1a,
  black: 0x0a0a0a,
};

// ─── Renderer & Scene ────────────────────────────────────────────────────────
const canvas = document.getElementById("webgl");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(COLORS.black, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(COLORS.black, 0.035);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 2, 12);

// ─── Lighting (monochrome) ───────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(COLORS.white, 0.25);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(COLORS.white, 1.2);
keyLight.position.set(5, 10, 8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(COLORS.gray, 0.4);
fillLight.position.set(-6, 4, -4);
scene.add(fillLight);

const rimLight = new THREE.PointLight(COLORS.white, 0.6, 40);
rimLight.position.set(0, 8, -10);
scene.add(rimLight);

// ─── Shared Materials ────────────────────────────────────────────────────────
function createWireMaterial(opacity = 0.6) {
  return new THREE.MeshBasicMaterial({
    color: COLORS.white,
    wireframe: true,
    transparent: true,
    opacity,
  });
}

function createSolidMaterial(color = COLORS.dark) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.3,
    roughness: 0.7,
  });
}

function createEdgeLines(geometry, opacity = 0.35) {
  const edges = new THREE.EdgesGeometry(geometry);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color: COLORS.white,
      transparent: true,
      opacity,
    })
  );
  return line;
}

// ─── Infinite Grid Floor ───────────────────────────────────────────────────────
function createGrid() {
  const grid = new THREE.GridHelper(120, 60, 0x333333, 0x1a1a1a);
  grid.position.y = -4;
  grid.material.opacity = 0.4;
  grid.material.transparent = true;
  return grid;
}

const grid = createGrid();
scene.add(grid);

// ─── Global Particle Field (coherent thread across sections) ───────────────────
function createParticleField(count = 800) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: COLORS.white,
    size: 0.06,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

const particles = createParticleField();
scene.add(particles);

// ─── Section 0: Hero — Icosahedron + Orbital Ring ────────────────────────────
function createHeroGroup() {
  const group = new THREE.Group();
  group.position.set(4, 0, -2);

  const icoGeo = new THREE.IcosahedronGeometry(2.2, 1);
  const icoSolid = new THREE.Mesh(icoGeo, createSolidMaterial(0x111111));
  const icoWire = new THREE.Mesh(icoGeo, createWireMaterial(0.85));
  icoWire.scale.setScalar(1.02);
  group.add(icoSolid, icoWire);

  const ringGeo = new THREE.TorusGeometry(3.5, 0.03, 8, 80);
  const ring = new THREE.Mesh(ringGeo, createWireMaterial(0.5));
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const ring2 = ring.clone();
  ring2.scale.setScalar(0.7);
  ring2.rotation.x = Math.PI / 3;
  ring2.rotation.z = Math.PI / 4;
  group.add(ring2);

  // Orbiting small cubes
  for (let i = 0; i < 6; i++) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      createSolidMaterial(0x222222)
    );
    const angle = (i / 6) * Math.PI * 2;
    cube.userData.orbitAngle = angle;
    cube.userData.orbitRadius = 3.5;
    group.add(cube);
  }

  group.userData.animate = (t) => {
    icoSolid.rotation.y = t * 0.4;
    icoSolid.rotation.x = Math.sin(t * 0.3) * 0.2;
    icoWire.rotation.copy(icoSolid.rotation);
    ring.rotation.z = t * 0.2;
    ring2.rotation.z = -t * 0.15;
    group.children.forEach((child) => {
      if (child.userData.orbitAngle !== undefined) {
        const a = child.userData.orbitAngle + t * 0.5;
        const r = child.userData.orbitRadius;
        child.position.set(Math.cos(a) * r, Math.sin(a * 2) * 0.3, Math.sin(a) * r);
        child.rotation.set(t, t * 2, 0);
      }
    });
  };

  return group;
}

// ─── Section 1: About — Wireframe Portal Frame ───────────────────────────────
function createAboutGroup() {
  const group = new THREE.Group();
  group.position.set(-5, -SECTION_SPACING, 0);

  const frameGeo = new THREE.BoxGeometry(4, 5, 0.3);
  const frame = new THREE.Mesh(frameGeo, createWireMaterial(0.4));
  group.add(frame);

  const innerGeo = new THREE.BoxGeometry(3.2, 4.2, 0.5);
  const inner = new THREE.Mesh(innerGeo, createSolidMaterial(0x0d0d0d));
  group.add(inner);

  const edges = createEdgeLines(innerGeo, 0.6);
  group.add(edges);

  // Floating planes
  for (let i = 0; i < 3; i++) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1),
      new THREE.MeshBasicMaterial({
        color: COLORS.white,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
      })
    );
    plane.position.set(2.5, (i - 1) * 1.2, 1);
    plane.userData.baseY = plane.position.y;
    plane.userData.index = i;
    group.add(plane);
  }

  group.userData.animate = (t) => {
    frame.rotation.y = Math.sin(t * 0.3) * 0.15;
    inner.rotation.y = frame.rotation.y * 0.5;
    edges.rotation.copy(inner.rotation);
    group.children.forEach((child) => {
      if (child.userData.baseY !== undefined) {
        child.position.y =
          child.userData.baseY + Math.sin(t * 0.8 + child.userData.index) * 0.3;
        child.rotation.y = t * 0.2;
      }
    });
  };

  return group;
}

// ─── Section 2: Experience — Twin Pillars + Bridge ───────────────────────────
function createExperienceGroup() {
  const group = new THREE.Group();
  group.position.set(5, -SECTION_SPACING * 2, -1);

  function createPillar(x, height, label) {
    const pillarGroup = new THREE.Group();
    pillarGroup.position.x = x;

    const geo = new THREE.CylinderGeometry(0.6, 0.8, height, 8);
    const solid = new THREE.Mesh(geo, createSolidMaterial(0x141414));
    const wire = new THREE.Mesh(geo, createWireMaterial(0.5));
    wire.scale.setScalar(1.01);
    solid.position.y = height / 2;
    wire.position.y = height / 2;
    pillarGroup.add(solid, wire);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.3, 1.4),
      createSolidMaterial(0x1f1f1f)
    );
    cap.position.y = height + 0.15;
    pillarGroup.add(cap);

    pillarGroup.userData.label = label;
    pillarGroup.userData.height = height;
    return pillarGroup;
  }

  const pillarA = createPillar(-2, 5, "Amdocs");
  const pillarB = createPillar(2, 4.2, "Journify");
  group.add(pillarA, pillarB);

  const bridgeGeo = new THREE.BoxGeometry(5, 0.15, 0.8);
  const bridge = new THREE.Mesh(bridgeGeo, createWireMaterial(0.7));
  bridge.position.y = 5.5;
  group.add(bridge);

  const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 4.5, 6);
  const beam = new THREE.Mesh(beamGeo, createWireMaterial(0.4));
  beam.rotation.z = Math.PI / 2;
  beam.position.y = 3;
  group.add(beam);

  group.userData.animate = (t) => {
    pillarA.rotation.y = Math.sin(t * 0.2) * 0.05;
    pillarB.rotation.y = -Math.sin(t * 0.2) * 0.05;
    bridge.position.y = 5.5 + Math.sin(t * 0.5) * 0.1;
    beam.material.opacity = 0.3 + Math.sin(t) * 0.15;
  };

  return group;
}

// ─── Section 3: Projects — Three Floating Panels ─────────────────────────────
function createProjectsGroup() {
  const group = new THREE.Group();
  group.position.set(-4, -SECTION_SPACING * 3, 1);

  const projects = [
    { w: 3, h: 2, z: 0, color: 0x121212 },
    { w: 2.5, h: 1.8, z: -1.5, color: 0x181818 },
    { w: 2.8, h: 2.2, z: 1.2, color: 0x101010 },
  ];

  projects.forEach((p, i) => {
    const panelGroup = new THREE.Group();
    const geo = new THREE.BoxGeometry(p.w, p.h, 0.15);
    const solid = new THREE.Mesh(geo, createSolidMaterial(p.color));
    const wire = new THREE.Mesh(geo, createWireMaterial(0.55));
    wire.scale.setScalar(1.02);
    const edges = createEdgeLines(geo, 0.4);
    panelGroup.add(solid, wire, edges);

    panelGroup.position.set((i - 1) * 2.2, (i - 1) * 0.5, p.z);
    panelGroup.userData.index = i;
    panelGroup.userData.basePos = panelGroup.position.clone();
    group.add(panelGroup);
  });

  group.userData.animate = (t) => {
    group.children.forEach((child) => {
      if (child.userData.basePos) {
        const i = child.userData.index;
        child.position.y =
          child.userData.basePos.y + Math.sin(t * 0.6 + i * 1.2) * 0.4;
        child.rotation.y = Math.sin(t * 0.3 + i) * 0.2;
        child.rotation.x = Math.sin(t * 0.4 + i * 0.5) * 0.08;
      }
    });
  };

  return group;
}

// ─── Section 4: Education — Stacked Steps / Books ────────────────────────────
function createEducationGroup() {
  const group = new THREE.Group();
  group.position.set(4.5, -SECTION_SPACING * 4, 0);

  const stepCount = 5;
  for (let i = 0; i < stepCount; i++) {
    const w = 3 - i * 0.3;
    const geo = new THREE.BoxGeometry(w, 0.5, 1.5);
    const solid = new THREE.Mesh(geo, createSolidMaterial(0x111111 + i * 0x030303));
    const wire = new THREE.Mesh(geo, createWireMaterial(0.35));
    wire.scale.setScalar(1.01);
    const stepGroup = new THREE.Group();
    stepGroup.add(solid, wire);
    stepGroup.position.set(0, i * 0.55, -i * 0.3);
    stepGroup.userData.index = i;
    group.add(stepGroup);
  }

  const capGeo = new THREE.ConeGeometry(0.8, 1.5, 4);
  const cap = new THREE.Mesh(capGeo, createWireMaterial(0.6));
  cap.position.set(0, stepCount * 0.55 + 0.8, -stepCount * 0.3);
  cap.rotation.y = Math.PI / 4;
  group.add(cap);

  group.userData.cap = cap;
  group.userData.animate = (t) => {
    group.rotation.y = Math.sin(t * 0.15) * 0.1;
    cap.rotation.y = Math.PI / 4 + t * 0.3;
    cap.position.y = stepCount * 0.55 + 0.8 + Math.sin(t * 0.5) * 0.15;
  };

  return group;
}

// ─── Section 5: Certifications — Orbiting Badges ─────────────────────────────
function createCertificationsGroup() {
  const group = new THREE.Group();
  group.position.set(-5, -SECTION_SPACING * 5, -1);

  const certCount = 10;
  const orbitGroup = new THREE.Group();
  group.add(orbitGroup);

  for (let i = 0; i < certCount; i++) {
    const badge = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35, 0),
      createSolidMaterial(0x1a1a1a)
    );
    const wire = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.38, 0),
      createWireMaterial(0.7)
    );
    const badgeGroup = new THREE.Group();
    badgeGroup.add(badge, wire);
    badgeGroup.userData.angle = (i / certCount) * Math.PI * 2;
    badgeGroup.userData.orbitR = 3 + (i % 3) * 0.5;
    badgeGroup.userData.orbitY = (i % 4 - 1.5) * 0.6;
    orbitGroup.add(badgeGroup);
  }

  const centerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.05, 8, 40),
    createWireMaterial(0.5)
  );
  centerRing.rotation.x = Math.PI / 2;
  group.add(centerRing);

  group.userData.orbitGroup = orbitGroup;
  group.userData.centerRing = centerRing;
  group.userData.animate = (t) => {
    orbitGroup.rotation.y = t * 0.25;
    centerRing.rotation.z = t * 0.4;
    orbitGroup.children.forEach((badge) => {
      const a = badge.userData.angle + t * 0.3;
      const r = badge.userData.orbitR;
      badge.position.set(
        Math.cos(a) * r,
        badge.userData.orbitY + Math.sin(t + badge.userData.angle) * 0.2,
        Math.sin(a) * r
      );
      badge.rotation.set(t * 0.5, t, 0);
    });
  };

  return group;
}

// ─── Section 6: Skills — Network Graph ───────────────────────────────────────
function createSkillsGroup() {
  const group = new THREE.Group();
  group.position.set(5, -SECTION_SPACING * 6, 0);

  const nodeCount = 14;
  const nodes = [];
  const nodePositions = [];

  for (let i = 0; i < nodeCount; i++) {
    const phi = Math.acos(2 * (i / nodeCount) - 1);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 2.5;
    const pos = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    nodePositions.push(pos);

    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      createSolidMaterial(0x222222)
    );
    node.position.copy(pos);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      createWireMaterial(0.3)
    );
    glow.position.copy(pos);
    group.add(node, glow);
    nodes.push({ node, glow, basePos: pos.clone() });
  }

  const linePositions = [];
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      if (nodePositions[i].distanceTo(nodePositions[j]) < 3.2) {
        linePositions.push(
          nodePositions[i].x, nodePositions[i].y, nodePositions[i].z,
          nodePositions[j].x, nodePositions[j].y, nodePositions[j].z
        );
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(linePositions, 3)
  );
  const lines = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({
      color: COLORS.white,
      transparent: true,
      opacity: 0.15,
    })
  );
  group.add(lines);

  const outerSphere = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3, 2),
    createWireMaterial(0.12)
  );
  group.add(outerSphere);

  group.userData.nodes = nodes;
  group.userData.outerSphere = outerSphere;
  group.userData.animate = (t) => {
    outerSphere.rotation.y = t * 0.1;
    outerSphere.rotation.x = t * 0.05;
    nodes.forEach((n, i) => {
      const pulse = 1 + Math.sin(t * 2 + i * 0.5) * 0.15;
      n.node.scale.setScalar(pulse);
      n.glow.scale.setScalar(pulse * 1.3);
      n.node.position.y = n.basePos.y + Math.sin(t + i) * 0.1;
      n.glow.position.copy(n.node.position);
    });
  };

  return group;
}

// ─── Section 7: Contact — Torus Knot Portal ──────────────────────────────────
function createContactGroup() {
  const group = new THREE.Group();
  group.position.set(0, -SECTION_SPACING * 7, 2);

  const knotGeo = new THREE.TorusKnotGeometry(1.8, 0.35, 120, 16);
  const knotSolid = new THREE.Mesh(knotGeo, createSolidMaterial(0x0f0f0f));
  const knotWire = new THREE.Mesh(knotGeo, createWireMaterial(0.65));
  knotWire.scale.setScalar(1.01);
  group.add(knotSolid, knotWire);

  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.04, 8, 64),
    createWireMaterial(0.35)
  );
  outerRing.rotation.x = Math.PI / 2;
  group.add(outerRing);

  const innerRing = outerRing.clone();
  innerRing.scale.setScalar(0.65);
  innerRing.rotation.x = Math.PI / 3;
  group.add(innerRing);

  group.userData.animate = (t) => {
    knotSolid.rotation.x = t * 0.3;
    knotSolid.rotation.y = t * 0.5;
    knotWire.rotation.copy(knotSolid.rotation);
    outerRing.rotation.z = t * 0.2;
    innerRing.rotation.z = -t * 0.3;
    innerRing.rotation.y = t * 0.15;
  };

  return group;
}

// ─── Connecting Spine (coherent vertical structure) ────────────────────────────
function createSpine() {
  const group = new THREE.Group();
  const spineGeo = new THREE.CylinderGeometry(0.05, 0.05, SECTION_SPACING * 7.5, 8);
  const spine = new THREE.Mesh(spineGeo, createWireMaterial(0.2));
  spine.position.y = -SECTION_SPACING * 3.75;
  group.add(spine);

  for (let i = 0; i < SECTION_COUNT; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.02, 6, 32),
      createWireMaterial(0.25)
    );
    ring.position.y = -i * SECTION_SPACING;
    ring.rotation.x = Math.PI / 2;
    ring.userData.index = i;
    group.add(ring);
  }

  group.position.x = 0;
  group.position.z = -5;
  group.userData.animate = (t) => {
    group.children.forEach((child) => {
      if (child.userData.index !== undefined) {
        child.rotation.z = t * 0.1 * (child.userData.index % 2 === 0 ? 1 : -1);
        child.material.opacity = 0.15 + Math.sin(t + child.userData.index) * 0.1;
      }
    });
  };

  return group;
}

// ─── Build Scene Groups ────────────────────────────────────────────────────────
const sectionGroups = [
  createHeroGroup(),
  createAboutGroup(),
  createExperienceGroup(),
  createProjectsGroup(),
  createEducationGroup(),
  createCertificationsGroup(),
  createSkillsGroup(),
  createContactGroup(),
];

sectionGroups.forEach((g) => scene.add(g));
const spine = createSpine();
scene.add(spine);

const allAnimatedGroups = [...sectionGroups, spine, { userData: { animate: () => {} } }];

// ─── Scroll & Camera ─────────────────────────────────────────────────────────
let scrollProgress = 0;
let targetScrollProgress = 0;
const sections = document.querySelectorAll(".section");
const progressFill = document.querySelector(".nav-progress-fill");

function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  targetScrollProgress = docHeight > 0 ? scrollTop / docHeight : 0;
  if (progressFill) {
    progressFill.style.width = `${targetScrollProgress * 100}%`;
  }

  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.25;
    section.classList.toggle("in-view", inView);
  });
}

window.addEventListener("scroll", updateScrollProgress, { passive: true });
updateScrollProgress();

// ─── Mouse Parallax ────────────────────────────────────────────────────────────
const mouse = { x: 0, y: 0 };
window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

// ─── Animation Loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  scrollProgress += (targetScrollProgress - scrollProgress) * 0.06;

  const activeSection = scrollProgress * (SECTION_COUNT - 1);
  const cameraY = 2 - activeSection * SECTION_SPACING * 0.85;
  const cameraZ = 12 - Math.sin(scrollProgress * Math.PI) * 3;
  const cameraX = mouse.x * 1.5;

  camera.position.x += (cameraX - camera.position.x) * 0.05;
  camera.position.y += (cameraY - camera.position.y) * 0.06;
  camera.position.z += (cameraZ - camera.position.z) * 0.06;
  camera.lookAt(mouse.x * 0.5, cameraY - 2, -2);

  particles.rotation.y = t * 0.02;
  grid.position.y = cameraY - 6;

  sectionGroups.forEach((group, i) => {
    const dist = Math.abs(activeSection - i);
    const visibility = Math.max(0, 1 - dist * 0.6);
    group.visible = visibility > 0.05;

    if (group.userData.animate) {
      group.userData.animate(t);
    }

    group.children.forEach((child) => {
      if (child.material && child.material.opacity !== undefined && child !== group) {
        // subtle fade based on active section
      }
    });
  });

  if (spine.userData.animate) spine.userData.animate(t);

  renderer.render(scene, camera);
}

animate();

// ─── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ─── Initial hero in-view ─────────────────────────────────────────────────────
document.querySelector("#hero")?.classList.add("in-view");
