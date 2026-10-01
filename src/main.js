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
scene.fog = new THREE.FogExp2(COLORS.black, 0.032);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 2, 12);

// ─── Lighting ─────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(COLORS.white, 0.22);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(COLORS.white, 1.1);
keyLight.position.set(5, 10, 8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(COLORS.gray, 0.45);
fillLight.position.set(-6, 4, -4);
scene.add(fillLight);

const rimLight = new THREE.PointLight(COLORS.white, 0.55, 50);
rimLight.position.set(0, 8, -10);
scene.add(rimLight);

const cursorLight = new THREE.PointLight(COLORS.white, 0.9, 30);
cursorLight.position.set(0, 2, 6);
scene.add(cursorLight);

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
    metalness: 0.35,
    roughness: 0.65,
  });
}

function createEdgeLines(geometry, opacity = 0.35) {
  const edges = new THREE.EdgesGeometry(geometry);
  return new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color: COLORS.white,
      transparent: true,
      opacity,
    })
  );
}

function createGlowRing(radius, opacity = 0.3) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.025, 6, 64),
    createWireMaterial(opacity)
  );
  ring.rotation.x = Math.PI / 2;
  return ring;
}

// ─── Grid Floor ───────────────────────────────────────────────────────────────
const grid = new THREE.GridHelper(140, 70, 0x333333, 0x141414);
grid.position.y = -4;
grid.material.opacity = 0.35;
grid.material.transparent = true;
scene.add(grid);

// Secondary perspective grid (vertical wall)
const wallGrid = new THREE.GridHelper(100, 40, 0x222222, 0x111111);
wallGrid.position.set(0, -40, -18);
wallGrid.rotation.x = Math.PI / 2;
wallGrid.material.opacity = 0.15;
wallGrid.material.transparent = true;
scene.add(wallGrid);

// ─── Global Particle Layers ───────────────────────────────────────────────────
function createParticleField(count, spread, size, opacity) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread.x;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: COLORS.white,
      size,
      transparent: true,
      opacity,
      sizeAttenuation: true,
    })
  );
}

const particles = createParticleField(1200, { x: 70, y: 130, z: 50 }, 0.05, 0.45);
scene.add(particles);

const dustParticles = createParticleField(400, { x: 50, y: 100, z: 35 }, 0.12, 0.2);
scene.add(dustParticles);

// ─── Ambient Floating Shapes (replaces center spine) ─────────────────────────
function createAmbientField() {
  const group = new THREE.Group();
  const shapes = [
    () => new THREE.TetrahedronGeometry(0.3, 0),
    () => new THREE.OctahedronGeometry(0.25, 0),
    () => new THREE.BoxGeometry(0.25, 0.25, 0.25),
    () => new THREE.IcosahedronGeometry(0.2, 0),
    () => new THREE.TorusGeometry(0.2, 0.04, 6, 16),
  ];

  for (let i = 0; i < 60; i++) {
    const geo = shapes[i % shapes.length]();
    const isWire = i % 3 !== 0;
    const mesh = new THREE.Mesh(
      geo,
      isWire ? createWireMaterial(0.15 + Math.random() * 0.25) : createSolidMaterial(0x111111)
    );
    mesh.position.set(
      (Math.random() - 0.5) * 30,
      -Math.random() * SECTION_SPACING * 7.5,
      (Math.random() - 0.5) * 20 - 3
    );
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    mesh.userData = {
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.3
      ),
      floatSpeed: 0.3 + Math.random() * 0.7,
      floatOffset: Math.random() * Math.PI * 2,
      baseY: mesh.position.y,
      driftX: (Math.random() - 0.5) * 0.02,
    };
    group.add(mesh);
  }

  group.userData.animate = (t) => {
    group.children.forEach((mesh) => {
      const d = mesh.userData;
      mesh.rotation.x += d.rotSpeed.x * 0.016;
      mesh.rotation.y += d.rotSpeed.y * 0.016;
      mesh.rotation.z += d.rotSpeed.z * 0.016;
      mesh.position.y = d.baseY + Math.sin(t * d.floatSpeed + d.floatOffset) * 0.6;
      mesh.position.x += d.driftX;
      if (Math.abs(mesh.position.x) > 18) d.driftX *= -1;
    });
  };

  return group;
}

// ─── Section Accent Rings (scattered, not centered rod) ──────────────────────
function createSectionRings() {
  const group = new THREE.Group();
  for (let i = 0; i < SECTION_COUNT; i++) {
    const ringGroup = new THREE.Group();
    ringGroup.position.set(
      (i % 2 === 0 ? 1 : -1) * (6 + Math.random() * 2),
      -i * SECTION_SPACING,
      -4 - Math.random() * 3
    );

    const r1 = createGlowRing(1.5 + Math.random(), 0.2);
    const r2 = createGlowRing(2.2 + Math.random() * 0.8, 0.12);
    r2.rotation.x = Math.PI / 3;
    r2.rotation.z = Math.PI / 5;
    ringGroup.add(r1, r2);

    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      createWireMaterial(0.35)
    );
    ringGroup.add(diamond);

    ringGroup.userData = { index: i, r1, r2, diamond };
    group.add(ringGroup);
  }

  group.userData.animate = (t) => {
    group.children.forEach((rg) => {
      rg.userData.r1.rotation.z = t * 0.15 * (rg.userData.index % 2 === 0 ? 1 : -1);
      rg.userData.r2.rotation.y = t * 0.1;
      rg.userData.diamond.position.y = Math.sin(t + rg.userData.index) * 0.5;
      rg.userData.diamond.rotation.set(t * 0.5, t * 0.3, 0);
    });
  };

  return group;
}

// ─── Floating Arc Lines ───────────────────────────────────────────────────────
function createArcLines() {
  const group = new THREE.Group();
  const arcs = [];

  for (let i = 0; i < 12; i++) {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3((Math.random() - 0.5) * 20, -Math.random() * 100, -5),
      new THREE.Vector3((Math.random() - 0.5) * 15, -Math.random() * 100, -2),
      new THREE.Vector3((Math.random() - 0.5) * 20, -Math.random() * 100, -6)
    );
    const points = curve.getPoints(30);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({
        color: COLORS.white,
        transparent: true,
        opacity: 0.08 + Math.random() * 0.1,
      })
    );
    line.userData = { phase: Math.random() * Math.PI * 2, baseOpacity: line.material.opacity };
    group.add(line);
    arcs.push(line);
  }

  group.userData.arcs = arcs;
  group.userData.animate = (t) => {
    arcs.forEach((line) => {
      line.material.opacity =
        line.userData.baseOpacity + Math.sin(t * 0.8 + line.userData.phase) * 0.05;
    });
  };

  return group;
}

// ─── Section 0: Hero ─────────────────────────────────────────────────────────
function createHeroGroup() {
  const group = new THREE.Group();
  group.position.set(4, 0, -2);

  const icoGeo = new THREE.IcosahedronGeometry(2.2, 1);
  const icoSolid = new THREE.Mesh(icoGeo, createSolidMaterial(0x111111));
  const icoWire = new THREE.Mesh(icoGeo, createWireMaterial(0.85));
  icoWire.scale.setScalar(1.02);
  group.add(icoSolid, icoWire);

  const outerShell = new THREE.Mesh(
    new THREE.DodecahedronGeometry(3.2, 0),
    createWireMaterial(0.15)
  );
  group.add(outerShell);

  for (let i = 0; i < 4; i++) {
    const ring = createGlowRing(2.8 + i * 0.6, 0.25 - i * 0.04);
    ring.rotation.x = Math.PI / 2 + i * 0.3;
    ring.rotation.z = i * 0.5;
    ring.userData.ringIndex = i;
    group.add(ring);
  }

  for (let i = 0; i < 8; i++) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      createSolidMaterial(0x222222)
    );
    cube.userData.orbitAngle = (i / 8) * Math.PI * 2;
    cube.userData.orbitRadius = 3.2 + (i % 2) * 0.8;
    cube.userData.orbitSpeed = 0.4 + i * 0.05;
    group.add(cube);
  }

  for (let i = 0; i < 5; i++) {
    const tetra = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.2, 0),
      createWireMaterial(0.4)
    );
    tetra.userData.tetraAngle = (i / 5) * Math.PI * 2;
    tetra.userData.tetraR = 4.5;
    group.add(tetra);
  }

  group.userData.animate = (t) => {
    icoSolid.rotation.y = t * 0.4;
    icoSolid.rotation.x = Math.sin(t * 0.3) * 0.2;
    icoWire.rotation.copy(icoSolid.rotation);
    outerShell.rotation.y = -t * 0.15;
    outerShell.rotation.x = t * 0.08;

    group.children.forEach((child) => {
      if (child.userData.orbitAngle !== undefined) {
        const a = child.userData.orbitAngle + t * child.userData.orbitSpeed;
        const r = child.userData.orbitRadius;
        child.position.set(Math.cos(a) * r, Math.sin(a * 2) * 0.4, Math.sin(a) * r);
        child.rotation.set(t, t * 2, 0);
      }
      if (child.userData.tetraAngle !== undefined) {
        const a = child.userData.tetraAngle + t * 0.2;
        const r = child.userData.tetraR;
        child.position.set(Math.cos(a) * r, Math.sin(t + child.userData.tetraAngle) * 0.8, Math.sin(a) * r);
        child.rotation.set(t * 0.5, t, t * 0.3);
      }
      if (child.userData.ringIndex !== undefined) {
        child.rotation.z += 0.003 * (child.userData.ringIndex % 2 === 0 ? 1 : -1);
      }
    });
  };

  return group;
}

// ─── Section 1: About ────────────────────────────────────────────────────────
function createAboutGroup() {
  const group = new THREE.Group();
  group.position.set(-5, -SECTION_SPACING, 0);

  const frameGeo = new THREE.BoxGeometry(4, 5, 0.3);
  group.add(new THREE.Mesh(frameGeo, createWireMaterial(0.4)));

  const innerGeo = new THREE.BoxGeometry(3.2, 4.2, 0.5);
  const inner = new THREE.Mesh(innerGeo, createSolidMaterial(0x0d0d0d));
  const edges = createEdgeLines(innerGeo, 0.6);
  group.add(inner, edges);

  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(3, 0.04, 8, 48),
    createWireMaterial(0.35)
  );
  portalRing.rotation.y = Math.PI / 2;
  group.add(portalRing);

  const hexGeo = new THREE.CylinderGeometry(2, 2, 0.05, 6);
  const hexGrid = new THREE.Mesh(hexGeo, createWireMaterial(0.2));
  hexGrid.rotation.x = Math.PI / 2;
  hexGrid.position.z = 1.5;
  group.add(hexGrid);

  for (let i = 0; i < 5; i++) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2 + i * 0.2, 0.8),
      new THREE.MeshBasicMaterial({
        color: COLORS.white,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
      })
    );
    plane.position.set(2.8, (i - 2) * 1, 1.2);
    plane.userData = { baseY: plane.position.y, index: i };
    group.add(plane);
  }

  for (let i = 0; i < 4; i++) {
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.05),
      createWireMaterial(0.5)
    );
    bracket.position.set(-2.5, (i - 1.5) * 1.5, 0.8);
    bracket.userData = { index: i };
    group.add(bracket);
  }

  group.userData = { inner, edges, portalRing, hexGrid };
  group.userData.animate = (t) => {
    const sway = Math.sin(t * 0.3) * 0.15;
    group.userData.inner.rotation.y = sway * 0.5;
    group.userData.edges.rotation.copy(group.userData.inner.rotation);
    group.userData.portalRing.rotation.x = t * 0.2;
    group.userData.hexGrid.rotation.z = t * 0.1;

    group.children.forEach((child) => {
      if (child.userData.baseY !== undefined) {
        child.position.y = child.userData.baseY + Math.sin(t * 0.8 + child.userData.index) * 0.35;
        child.rotation.y = t * 0.2;
      }
      if (child.userData.index !== undefined && child.userData.baseY === undefined) {
        child.rotation.z = Math.sin(t + child.userData.index) * 0.2;
        child.scale.setScalar(1 + Math.sin(t * 2 + child.userData.index) * 0.05);
      }
    });
  };

  return group;
}

// ─── Section 2: Experience ───────────────────────────────────────────────────
function createExperienceGroup() {
  const group = new THREE.Group();
  group.position.set(5, -SECTION_SPACING * 2, -1);

  function createPillar(x, height) {
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

    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.03, 6, 20),
        createWireMaterial(0.35)
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = height * (0.3 + i * 0.25);
      pillarGroup.add(band);
    }
    return pillarGroup;
  }

  const pillarA = createPillar(-2, 5);
  const pillarB = createPillar(2, 4.2);
  group.add(pillarA, pillarB);

  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.15, 0.8),
    createWireMaterial(0.7)
  );
  bridge.position.y = 5.5;
  group.add(bridge);

  for (let i = 0; i < 3; i++) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      createWireMaterial(0.5)
    );
    sphere.userData = { bridgeIndex: i };
    group.add(sphere);
  }

  const gearA = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.12, 6, 12),
    createWireMaterial(0.4)
  );
  gearA.position.set(-3.5, 2, 1);
  const gearB = gearA.clone();
  gearB.position.set(3.5, 3, 1);
  gearB.scale.setScalar(0.7);
  group.add(gearA, gearB);

  group.userData = { pillarA, pillarB, bridge, gearA, gearB };
  group.userData.animate = (t) => {
    group.userData.pillarA.rotation.y = Math.sin(t * 0.2) * 0.05;
    group.userData.pillarB.rotation.y = -Math.sin(t * 0.2) * 0.05;
    group.userData.bridge.position.y = 5.5 + Math.sin(t * 0.5) * 0.12;
    group.userData.gearA.rotation.z = t * 0.5;
    group.userData.gearB.rotation.z = -t * 0.7;

    group.children.forEach((child) => {
      if (child.userData.bridgeIndex !== undefined) {
        const i = child.userData.bridgeIndex;
        child.position.set((i - 1) * 2, 5.5 + Math.sin(t + i) * 0.2, 0.6);
      }
    });
  };

  return group;
}

// ─── Section 3: Projects ─────────────────────────────────────────────────────
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
    panelGroup.add(
      new THREE.Mesh(geo, createSolidMaterial(p.color)),
      new THREE.Mesh(geo, createWireMaterial(0.55)),
      createEdgeLines(geo, 0.4)
    );
    panelGroup.children[1].scale.setScalar(1.02);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 12, 12),
      createWireMaterial(0.1)
    );
    halo.position.z = -0.5;
    panelGroup.add(halo);

    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      createWireMaterial(0.6)
    );
    diamond.position.set(p.w / 2 + 0.3, p.h / 2, 0.3);
    panelGroup.add(diamond);

    panelGroup.position.set((i - 1) * 2.2, (i - 1) * 0.5, p.z);
    panelGroup.userData = { index: i, basePos: panelGroup.position.clone(), halo, diamond };
    group.add(panelGroup);
  });

  const connectorGeo = new THREE.BufferGeometry();
  const connPoints = [
    -2.2, 0, 0, 0, 0.5, -1.5,
    0, 0.5, -1.5, 2.2, 1, 1.2,
    -2.2, 0, 0, 2.2, 1, 1.2,
  ];
  connectorGeo.setAttribute("position", new THREE.Float32BufferAttribute(connPoints, 3));
  const connectors = new THREE.LineSegments(
    connectorGeo,
    new THREE.LineBasicMaterial({ color: COLORS.white, transparent: true, opacity: 0.15 })
  );
  group.add(connectors);

  group.userData.animate = (t) => {
    group.children.forEach((child) => {
      if (child.userData.basePos) {
        const i = child.userData.index;
        child.position.y = child.userData.basePos.y + Math.sin(t * 0.6 + i * 1.2) * 0.45;
        child.rotation.y = Math.sin(t * 0.3 + i) * 0.25;
        child.rotation.x = Math.sin(t * 0.4 + i * 0.5) * 0.1;
        child.userData.halo.scale.setScalar(1 + Math.sin(t + i) * 0.1);
        child.userData.halo.rotation.y = t * 0.2;
        child.userData.diamond.rotation.set(t, t * 1.5, 0);
      }
    });
    connectors.material.opacity = 0.1 + Math.sin(t) * 0.06;
  };

  return group;
}

// ─── Section 4: Education ────────────────────────────────────────────────────
function createEducationGroup() {
  const group = new THREE.Group();
  group.position.set(4.5, -SECTION_SPACING * 4, 0);

  const stepCount = 5;
  for (let i = 0; i < stepCount; i++) {
    const stepGroup = new THREE.Group();
    const w = 3 - i * 0.3;
    const geo = new THREE.BoxGeometry(w, 0.5, 1.5);
    stepGroup.add(
      new THREE.Mesh(geo, createSolidMaterial(0x111111 + i * 0x030303)),
      new THREE.Mesh(geo, createWireMaterial(0.35))
    );
    stepGroup.children[1].scale.setScalar(1.01);
    stepGroup.position.set(0, i * 0.55, -i * 0.3);
    stepGroup.userData.index = i;
    group.add(stepGroup);
  }

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 4), createWireMaterial(0.6));
  cap.position.set(0, stepCount * 0.55 + 0.8, -stepCount * 0.3);
  cap.rotation.y = Math.PI / 4;
  group.add(cap);

  for (let i = 0; i < 3; i++) {
    const orbitRing = createGlowRing(2 + i * 0.5, 0.15);
    orbitRing.position.y = i * 1.5;
    orbitRing.rotation.x = Math.PI / 4 + i * 0.3;
    orbitRing.userData.orbitIdx = i;
    group.add(orbitRing);
  }

  for (let i = 0; i < 6; i++) {
    const page = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.8, 0.02),
      createWireMaterial(0.25)
    );
    page.position.set(2.5, i * 0.4, 0.5);
    page.rotation.y = -0.3 + i * 0.1;
    page.userData.pageIdx = i;
    group.add(page);
  }

  group.userData.cap = cap;
  group.userData.animate = (t) => {
    group.rotation.y = Math.sin(t * 0.15) * 0.1;
    cap.rotation.y = Math.PI / 4 + t * 0.3;
    cap.position.y = stepCount * 0.55 + 0.8 + Math.sin(t * 0.5) * 0.15;

    group.children.forEach((child) => {
      if (child.userData.orbitIdx !== undefined) {
        child.rotation.z = t * 0.15 * (child.userData.orbitIdx % 2 === 0 ? 1 : -1);
      }
      if (child.userData.pageIdx !== undefined) {
        child.position.y = child.userData.pageIdx * 0.4 + Math.sin(t + child.userData.pageIdx) * 0.15;
        child.rotation.z = Math.sin(t * 0.5 + child.userData.pageIdx) * 0.1;
      }
    });
  };

  return group;
}

// ─── Section 5: Certifications ───────────────────────────────────────────────
function createCertificationsGroup() {
  const group = new THREE.Group();
  group.position.set(-5, -SECTION_SPACING * 5, -1);

  const orbitGroup = new THREE.Group();
  const orbitGroup2 = new THREE.Group();
  group.add(orbitGroup, orbitGroup2);

  for (let i = 0; i < 10; i++) {
    const badgeGroup = new THREE.Group();
    badgeGroup.add(
      new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), createSolidMaterial(0x1a1a1a)),
      new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), createWireMaterial(0.7))
    );
    badgeGroup.userData = {
      angle: (i / 10) * Math.PI * 2,
      orbitR: 3 + (i % 3) * 0.5,
      orbitY: ((i % 4) - 1.5) * 0.6,
    };
    orbitGroup.add(badgeGroup);
  }

  for (let i = 0; i < 6; i++) {
    const star = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.2, 0),
      createWireMaterial(0.45)
    );
    star.userData = { angle: (i / 6) * Math.PI * 2, orbitR: 1.8 };
    orbitGroup2.add(star);
  }

  const centerRing = createGlowRing(1.2, 0.5);
  const pulseRing = createGlowRing(2.5, 0.15);
  pulseRing.rotation.x = Math.PI / 3;
  group.add(centerRing, pulseRing);

  for (let i = 0; i < 8; i++) {
    const ray = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 2.5, 0.02),
      createWireMaterial(0.2)
    );
    ray.rotation.z = (i / 8) * Math.PI * 2;
    ray.userData.rayIdx = i;
    group.add(ray);
  }

  group.userData = { orbitGroup, orbitGroup2, centerRing, pulseRing };
  group.userData.animate = (t) => {
    group.userData.orbitGroup.rotation.y = t * 0.25;
    group.userData.orbitGroup2.rotation.y = -t * 0.4;
    group.userData.centerRing.rotation.z = t * 0.4;
    group.userData.pulseRing.rotation.y = t * 0.2;
    group.userData.pulseRing.scale.setScalar(1 + Math.sin(t * 1.5) * 0.08);

    group.userData.orbitGroup.children.forEach((badge) => {
      const d = badge.userData;
      const a = d.angle + t * 0.3;
      badge.position.set(
        Math.cos(a) * d.orbitR,
        d.orbitY + Math.sin(t + d.angle) * 0.25,
        Math.sin(a) * d.orbitR
      );
      badge.rotation.set(t * 0.5, t, 0);
    });

    group.userData.orbitGroup2.children.forEach((star) => {
      const a = star.userData.angle + t * 0.5;
      star.position.set(Math.cos(a) * star.userData.orbitR, Math.sin(t * 2) * 0.3, Math.sin(a) * star.userData.orbitR);
      star.rotation.set(t, t * 2, 0);
    });

    group.children.forEach((child) => {
      if (child.userData.rayIdx !== undefined) {
        child.material.opacity = 0.1 + Math.sin(t * 2 + child.userData.rayIdx) * 0.12;
      }
    });
  };

  return group;
}

// ─── Section 6: Skills ───────────────────────────────────────────────────────
function createSkillsGroup() {
  const group = new THREE.Group();
  group.position.set(5, -SECTION_SPACING * 6, 0);

  const nodeCount = 18;
  const nodes = [];
  const nodePositions = [];

  for (let i = 0; i < nodeCount; i++) {
    const phi = Math.acos(2 * (i / nodeCount) - 1);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 2.8;
    const pos = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    nodePositions.push(pos);

    const node = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), createSolidMaterial(0x222222));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), createWireMaterial(0.3));
    node.position.copy(pos);
    glow.position.copy(pos);
    group.add(node, glow);
    nodes.push({ node, glow, basePos: pos.clone() });
  }

  const linePositions = [];
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      if (nodePositions[i].distanceTo(nodePositions[j]) < 3.5) {
        linePositions.push(
          nodePositions[i].x, nodePositions[i].y, nodePositions[i].z,
          nodePositions[j].x, nodePositions[j].y, nodePositions[j].z
        );
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({ color: COLORS.white, transparent: true, opacity: 0.18 })
  );
  group.add(lines);

  const outerSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2, 2), createWireMaterial(0.12));
  group.add(outerSphere);

  for (let i = 0; i < 3; i++) {
    const ring = createGlowRing(3.5 + i * 0.4, 0.1);
    ring.rotation.x = Math.PI / 2 + i * 0.4;
    ring.userData.skillRing = i;
    group.add(ring);
  }

  group.userData = { nodes, outerSphere, lines };
  group.userData.animate = (t) => {
    group.userData.outerSphere.rotation.y = t * 0.1;
    group.userData.outerSphere.rotation.x = t * 0.05;
    group.userData.lines.material.opacity = 0.12 + Math.sin(t * 1.2) * 0.08;

    group.userData.nodes.forEach((n, i) => {
      const pulse = 1 + Math.sin(t * 2 + i * 0.5) * 0.18;
      n.node.scale.setScalar(pulse);
      n.glow.scale.setScalar(pulse * 1.4);
      n.node.position.y = n.basePos.y + Math.sin(t + i) * 0.12;
      n.glow.position.copy(n.node.position);
    });

    group.children.forEach((child) => {
      if (child.userData.skillRing !== undefined) {
        child.rotation.z = t * 0.12 * (child.userData.skillRing % 2 === 0 ? 1 : -1);
      }
    });
  };

  return group;
}

// ─── Section 7: Contact ──────────────────────────────────────────────────────
function createContactGroup() {
  const group = new THREE.Group();
  group.position.set(0, -SECTION_SPACING * 7, 2);

  const knotGeo = new THREE.TorusKnotGeometry(1.8, 0.35, 120, 16);
  const knotSolid = new THREE.Mesh(knotGeo, createSolidMaterial(0x0f0f0f));
  const knotWire = new THREE.Mesh(knotGeo, createWireMaterial(0.65));
  knotWire.scale.setScalar(1.01);
  group.add(knotSolid, knotWire);

  for (let i = 0; i < 5; i++) {
    const ring = createGlowRing(2.8 + i * 0.5, 0.2 - i * 0.03);
    ring.rotation.x = Math.PI / 2 + i * 0.25;
    ring.rotation.y = i * 0.6;
    ring.userData.contactRing = i;
    group.add(ring);
  }

  for (let i = 0; i < 12; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      createWireMaterial(0.5)
    );
    p.userData = { angle: (i / 12) * Math.PI * 2, radius: 4 };
    group.add(p);
  }

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(6, 6, 0.05),
    createWireMaterial(0.15)
  );
  frame.position.z = -1;
  group.add(frame);

  group.userData = { knotSolid, knotWire, frame };
  group.userData.animate = (t) => {
    group.userData.knotSolid.rotation.x = t * 0.3;
    group.userData.knotSolid.rotation.y = t * 0.5;
    group.userData.knotWire.rotation.copy(group.userData.knotSolid.rotation);
    group.userData.frame.rotation.z = Math.sin(t * 0.2) * 0.05;

    group.children.forEach((child) => {
      if (child.userData.contactRing !== undefined) {
        child.rotation.z += 0.004 * (child.userData.contactRing % 2 === 0 ? 1 : -1);
      }
      if (child.userData.angle !== undefined && child.userData.radius) {
        const a = child.userData.angle + t * 0.35;
        child.position.set(
          Math.cos(a) * child.userData.radius,
          Math.sin(a * 2) * 0.5,
          Math.sin(a) * child.userData.radius * 0.5
        );
      }
    });
  };

  return group;
}

// ─── Build Scene ─────────────────────────────────────────────────────────────
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

const ambientField = createAmbientField();
const sectionRings = createSectionRings();
const arcLines = createArcLines();
scene.add(ambientField, sectionRings, arcLines);

const globalEffects = [ambientField, sectionRings, arcLines];

// ─── Scroll & Camera ─────────────────────────────────────────────────────────
let scrollProgress = 0;
let targetScrollProgress = 0;
const sections = document.querySelectorAll(".section");
const progressFill = document.querySelector(".nav-progress-fill");

function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  targetScrollProgress = docHeight > 0 ? scrollTop / docHeight : 0;
  if (progressFill) progressFill.style.width = `${targetScrollProgress * 100}%`;

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
const cursorPos = { x: 0, y: 0 };
const cursorFollowerPos = { x: 0, y: 0 };

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  
  cursorPos.x = e.clientX;
  cursorPos.y = e.clientY;
});

// ─── Custom Cursor Implementation ──────────────────────────────────────────────
const cursor = document.querySelector('.custom-cursor');
const cursorFollower = document.querySelector('.custom-cursor-follower');

if (cursor && cursorFollower) {
  // Activate cursor after a short delay
  setTimeout(() => {
    cursor.classList.add('active');
    cursorFollower.classList.add('active');
  }, 500);

  // Smooth cursor follow
  function updateCursor() {
    cursorFollowerPos.x += (cursorPos.x - cursorFollowerPos.x) * 0.15;
    cursorFollowerPos.y += (cursorPos.y - cursorFollowerPos.y) * 0.15;

    cursor.style.left = cursorPos.x + 'px';
    cursor.style.top = cursorPos.y + 'px';
    cursor.style.transform = 'translate(-50%, -50%)';

    cursorFollower.style.left = cursorFollowerPos.x + 'px';
    cursorFollower.style.top = cursorFollowerPos.y + 'px';
    cursorFollower.style.transform = 'translate(-50%, -50%)';

    requestAnimationFrame(updateCursor);
  }
  updateCursor();

  // Hover effects
  const hoverElements = document.querySelectorAll('a, button, .btn, .nav-links a, .nav-logo, .glass-card, .project-card, .cert-item, .skill-pills span, .contact-item');
  hoverElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hover');
      cursorFollower.classList.add('hover');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hover');
      cursorFollower.classList.remove('hover');
    });
  });
}

// ─── Smooth Page Loader ──────────────────────────────────────────────────────
const loaderWrapper = document.querySelector('.loader-wrapper');

window.addEventListener('load', () => {
  setTimeout(() => {
    loaderWrapper.classList.add('loaded');
  }, 1500); // Show loader for 1.5 seconds
});

// ─── Parallax Effect for Cards ────────────────────────────────────────────────
const parallaxElements = document.querySelectorAll('.glass-card, .project-card, .contact-item');

parallaxElements.forEach(el => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
  });
  
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
  });
});

// ─── Animation Loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  scrollProgress += (targetScrollProgress - scrollProgress) * 0.06;

  const activeSection = scrollProgress * (SECTION_COUNT - 1);
  
  // Enhanced 3D camera motion with parallax
  const cameraY = 2 - activeSection * SECTION_SPACING * 0.85;
  const cameraZ = 12 - Math.sin(scrollProgress * Math.PI) * 3;
  const cameraX = mouse.x * 1.8;
  
  // Add subtle rotation based on mouse position
  const targetRotationY = mouse.x * 0.1;
  const targetRotationX = -mouse.y * 0.05;

  camera.position.x += (cameraX - camera.position.x) * 0.05;
  camera.position.y += (cameraY - camera.position.y) * 0.06;
  camera.position.z += (cameraZ - camera.position.z) * 0.06;
  
  // Enhanced camera look-at with mouse parallax
  const lookAtX = mouse.x * 0.5 + Math.sin(t * 0.2) * 0.3;
  const lookAtY = cameraY - 2 + Math.cos(t * 0.3) * 0.2;
  const lookAtZ = -2 + mouse.y * 0.3;
  camera.lookAt(lookAtX, lookAtY, lookAtZ);

  // Enhanced cursor light with pulsing effect
  const lightPulse = 1 + Math.sin(t * 2) * 0.1;
  cursorLight.intensity = 0.9 * lightPulse;
  cursorLight.position.x += (mouse.x * 8 - cursorLight.position.x) * 0.08;
  cursorLight.position.y += ((2 - mouse.y * 3) - cursorLight.position.y) * 0.08;

  // Enhanced particle motion with wave effects
  particles.rotation.y = t * 0.015;
  particles.rotation.x = Math.sin(t * 0.1) * 0.02;
  particles.position.y = Math.sin(t * 0.15) * 0.5;
  
  dustParticles.rotation.y = -t * 0.01;
  dustParticles.rotation.z = Math.cos(t * 0.08) * 0.01;
  dustParticles.position.y = Math.sin(t * 0.2) * 2;
  dustParticles.position.x = Math.cos(t * 0.1) * 0.5;

  // Animate grid with depth effect
  grid.position.y = cameraY - 6;
  grid.material.opacity = 0.35 + Math.sin(t * 0.5) * 0.05;
  
  wallGrid.position.y = cameraY - 40;
  wallGrid.material.opacity = 0.15 + Math.sin(t * 0.3) * 0.03;

  // Enhanced section animations with micro-interactions
  sectionGroups.forEach((group, i) => {
    const dist = Math.abs(activeSection - i);
    group.visible = dist < 1.8;
    
    // Add subtle breathing effect to all groups
    const breathe = 1 + Math.sin(t * 0.5 + i) * 0.02;
    group.scale.setScalar(breathe);
    
    // Add parallax offset based on mouse
    group.position.x += (mouse.x * (i % 2 === 0 ? 0.3 : -0.3) - group.position.x) * 0.02;
    
    if (group.userData.animate) group.userData.animate(t, activeSection, i);
  });

  globalEffects.forEach((fx) => {
    if (fx.userData.animate) fx.userData.animate(t);
  });

  // Enhanced rim light with dynamic positioning
  rimLight.position.y = cameraY + 6;
  rimLight.intensity = 0.55 + Math.sin(t * 0.8) * 0.1;

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

document.querySelector("#hero")?.classList.add("in-view");

// ─── Smooth Scroll for Navigation Links ─────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ─── Add stagger animation for list items ───────────────────────────────────
const observerOptions = {
  threshold: 0.2,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const items = entry.target.querySelectorAll('li, .cert-item, .skill-pills span');
      items.forEach((item, index) => {
        setTimeout(() => {
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';
        }, index * 50);
      });
    }
  });
}, observerOptions);

// Observe sections for stagger animations
document.querySelectorAll('.section').forEach(section => {
  const items = section.querySelectorAll('li, .cert-item:not(.section.in-view .cert-item), .skill-pills span');
  items.forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    item.style.transition = 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
  });
  observer.observe(section);
});

// ─── Add ripple effect on click ──────────────────────────────────────────────
document.querySelectorAll('.btn, .contact-item, .nav-logo').forEach(element => {
  element.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
      transform: scale(0);
      animation: ripple-effect 0.6s ease-out;
    `;
    
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });
});

// Add ripple animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple-effect {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ─── Performance optimization: Reduce animations on low-end devices ──────────
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('*').forEach(el => {
    el.style.animation = 'none';
    el.style.transition = 'none';
  });
}

console.log('🚀 Enhanced 3D Portfolio Loaded - All effects active!');

// ─── Magnetic Button Effect ──────────────────────────────────────────────────
const magneticElements = document.querySelectorAll('.btn, .nav-logo, .contact-item');

magneticElements.forEach(el => {
  el.addEventListener('mousemove', function(e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = Math.max(rect.width, rect.height);
    
    if (distance < maxDistance) {
      const strength = 0.3;
      this.style.transform = `translate(${x * strength}px, ${y * strength}px) scale(1.05)`;
    }
  });
  
  el.addEventListener('mouseleave', function() {
    this.style.transform = '';
  });
});

// ─── Tilt Effect on Cards with 3D Depth ─────────────────────────────────────
const tiltElements = document.querySelectorAll('.glass-card, .project-card, .edu-card');

tiltElements.forEach(el => {
  const children = el.querySelectorAll('h3, p, .tech-tags, .card-meta');
  
  el.addEventListener('mousemove', function(e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    
    this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
    
    // Add depth to child elements
    children.forEach((child, index) => {
      const depth = (index + 1) * 5;
      child.style.transform = `translateZ(${depth}px)`;
    });
  });
  
  el.addEventListener('mouseleave', function() {
    this.style.transform = '';
    children.forEach(child => {
      child.style.transform = '';
    });
  });
});

// ─── Parallax Scroll Effect for Background Elements ─────────────────────────
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const parallaxSpeed = 0.5;
  
  // Parallax for grain
  const grain = document.querySelector('.grain');
  if (grain) {
    grain.style.transform = `translateY(${scrolled * parallaxSpeed * 0.3}px)`;
  }
  
  // Parallax for hero elements
  const heroTitle = document.querySelector('.hero-title');
  const heroSub = document.querySelector('.hero-sub');
  const heroCta = document.querySelector('.hero-cta');
  
  if (heroTitle) heroTitle.style.transform = `translateY(${scrolled * parallaxSpeed * 0.5}px)`;
  if (heroSub) heroSub.style.transform = `translateY(${scrolled * parallaxSpeed * 0.7}px)`;
  if (heroCta) heroCta.style.transform = `translateY(${scrolled * parallaxSpeed * 0.9}px)`;
}, { passive: true });

// ─── Text Reveal Animation on Scroll ─────────────────────────────────────────
const textElements = document.querySelectorAll('p, h1, h2, h3, h4');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
});

textElements.forEach(el => {
  if (!el.closest('.hero-inner')) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.8s cubic-bezier(0.23, 1, 0.32, 1), transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
    revealObserver.observe(el);
  }
});

// ─── Add Glow Effect on Scroll Progress ─────────────────────────────────────
const progressFillElement = document.querySelector('.nav-progress-fill');
if (progressFillElement) {
  window.addEventListener('scroll', () => {
    const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    const glowIntensity = Math.min(scrollPercent / 10, 3);
    progressFillElement.style.boxShadow = `0 0 ${glowIntensity * 5}px var(--fg), 0 0 ${glowIntensity * 10}px var(--fg)`;
  }, { passive: true });
}

// ─── Easter Egg: Konami Code ─────────────────────────────────────────────────
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
  konamiCode.push(e.key);
  konamiCode = konamiCode.slice(-konamiSequence.length);
  
  if (konamiCode.join(',') === konamiSequence.join(',')) {
    // Activate rainbow mode
    document.body.style.animation = 'rainbow 5s linear infinite';
    const style = document.createElement('style');
    style.textContent = `
      @keyframes rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
      document.body.style.animation = '';
    }, 5000);
  }
});

console.log('✨ All enhanced effects loaded successfully!');
console.log('📊 Active effects: Loader, Custom Cursor, Glowing Buttons, Parallax, 3D Motion, Micro-interactions, Entrance Reveals');

// ─── 3D Corner and Edge Motion Effects ───────────────────────────────────────
const cornerDecorations = document.querySelector('.corner-decorations');
const corners = document.querySelectorAll('.corner');
const edges = document.querySelectorAll('.edge');

// Mouse parallax for corners
window.addEventListener('mousemove', (e) => {
  const mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  const mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  
  corners.forEach((corner, index) => {
    const speed = 0.5 + (index * 0.1);
    const direction = index % 2 === 0 ? 1 : -1;
    
    const offsetX = mouseX * 10 * speed * direction;
    const offsetY = mouseY * 10 * speed * direction;
    const rotateZ = mouseX * 5 * direction;
    
    corner.style.transform = `translate(${offsetX}px, ${offsetY}px) rotateZ(${rotateZ}deg)`;
  });
  
  // Edge wave effect based on mouse position
  edges.forEach((edge, index) => {
    const intensity = 0.3 + (Math.abs(mouseX) + Math.abs(mouseY)) * 0.2;
    edge.style.opacity = intensity;
  });
});

// Scroll-based intensity
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const scrollSpeed = Math.abs(scrollY - lastScrollY);
  lastScrollY = scrollY;
  
  // Add scrolled class for enhanced effects
  if (scrollY > 100) {
    cornerDecorations.classList.add('scrolled');
  } else {
    cornerDecorations.classList.remove('scrolled');
  }
  
  // Pulse corners on fast scroll
  if (scrollSpeed > 50) {
    corners.forEach(corner => {
      corner.style.filter = 'drop-shadow(0 0 30px rgba(255, 255, 255, 1))';
      setTimeout(() => {
        corner.style.filter = '';
      }, 300);
    });
  }
}, { passive: true });

// Corner breathing effect with requestAnimationFrame
let cornerTime = 0;
function animateCorners() {
  cornerTime += 0.01;
  
  corners.forEach((corner, index) => {
    const phase = (index * Math.PI / 2) + cornerTime;
    const scale = 1 + Math.sin(phase) * 0.05;
    const currentTransform = corner.style.transform || '';
    
    // Preserve mouse offset and add breathing
    if (!currentTransform.includes('scale')) {
      corner.style.transform = `${currentTransform} scale(${scale})`;
    }
  });
  
  requestAnimationFrame(animateCorners);
}
animateCorners();

// Create floating particles at corners
function createCornerParticles() {
  corners.forEach(corner => {
    for (let i = 0; i < 3; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: var(--fg);
        border-radius: 50%;
        pointer-events: none;
        box-shadow: 0 0 10px var(--fg);
        animation: corner-particle-float ${3 + i}s ease-in-out infinite;
        animation-delay: ${i * 0.5}s;
        opacity: 0.6;
      `;
      
      // Position based on corner
      if (corner.classList.contains('corner-tl')) {
        particle.style.top = `${20 + i * 15}px`;
        particle.style.left = `${20 + i * 15}px`;
      } else if (corner.classList.contains('corner-tr')) {
        particle.style.top = `${20 + i * 15}px`;
        particle.style.right = `${20 + i * 15}px`;
      } else if (corner.classList.contains('corner-bl')) {
        particle.style.bottom = `${20 + i * 15}px`;
        particle.style.left = `${20 + i * 15}px`;
      } else if (corner.classList.contains('corner-br')) {
        particle.style.bottom = `${20 + i * 15}px`;
        particle.style.right = `${20 + i * 15}px`;
      }
      
      corner.appendChild(particle);
    }
  });
}

// Add particle animation
const particleStyle = document.createElement('style');
particleStyle.textContent = `
  @keyframes corner-particle-float {
    0%, 100% {
      transform: translate(0, 0) scale(1);
      opacity: 0.6;
    }
    25% {
      transform: translate(5px, -5px) scale(1.2);
      opacity: 0.8;
    }
    50% {
      transform: translate(0, -10px) scale(0.8);
      opacity: 0.4;
    }
    75% {
      transform: translate(-5px, -5px) scale(1.1);
      opacity: 0.7;
    }
  }
`;
document.head.appendChild(particleStyle);

createCornerParticles();

// Edge scanning effect
let edgeScanPosition = 0;
function animateEdgeScan() {
  edgeScanPosition += 0.5;
  
  edges.forEach((edge, index) => {
    const isHorizontal = edge.classList.contains('edge-top') || edge.classList.contains('edge-bottom');
    const gradientPosition = (edgeScanPosition + (index * 25)) % 100;
    
    if (isHorizontal) {
      edge.style.backgroundPosition = `${gradientPosition}% 0%`;
    } else {
      edge.style.backgroundPosition = `0% ${gradientPosition}%`;
    }
  });
  
  requestAnimationFrame(animateEdgeScan);
}
animateEdgeScan();

// Corner click interaction
corners.forEach(corner => {
  corner.style.cursor = 'pointer';
  corner.style.pointerEvents = 'auto';
  
  corner.addEventListener('click', () => {
    // Create ripple burst effect
    for (let i = 0; i < 8; i++) {
      const burst = document.createElement('div');
      const angle = (i / 8) * Math.PI * 2;
      const distance = 50;
      
      burst.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: var(--fg);
        border-radius: 50%;
        box-shadow: 0 0 10px var(--fg);
        left: 50%;
        top: 50%;
        pointer-events: none;
      `;
      
      corner.appendChild(burst);
      
      setTimeout(() => {
        burst.style.transition = 'all 0.6s ease-out';
        burst.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
        burst.style.opacity = '0';
      }, 10);
      
      setTimeout(() => burst.remove(), 700);
    }
    
    // Pulse effect
    corner.style.transform = 'scale(1.3)';
    corner.style.filter = 'drop-shadow(0 0 40px rgba(255, 255, 255, 1))';
    setTimeout(() => {
      corner.style.transform = '';
      corner.style.filter = '';
    }, 300);
  });
});

console.log('🔲 3D Corner and Edge effects activated!');
