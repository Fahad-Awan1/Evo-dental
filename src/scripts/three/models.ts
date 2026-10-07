// Procedural dental models. Everything is generated in code: no model files to download.
import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { lowPower } from './stage';

const { smoothstep, lerp } = MathUtils;
const gauss = (d: number, sigma: number) => Math.exp(-(d * d) / (2 * sigma * sigma));
const detail = lowPower ? 0.65 : 1;

/* ---------- Materials ---------- */
const ENAMEL = 0xf7f2e8;
const STAINED = 0xe3c98c;

export const enamelMaterial = () =>
  new MeshPhysicalMaterial({
    color: ENAMEL,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    ior: 1.6,
    sheen: 0.35,
    sheenRoughness: 0.5,
    sheenColor: new Color(0xffd9c2),
  });

const titanium = (roughness: number) => new MeshStandardMaterial({ color: 0xc3c6cc, metalness: 1, roughness });

/** Removes the sphere/cylinder seam so glossy highlights flow across it. */
function weld(geometry: BufferGeometry): BufferGeometry {
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const welded = mergeVertices(geometry, 1e-4);
  welded.computeVertexNormals();
  return welded;
}

/* ---------- Tooth ---------- */
const CUSPS: [number, number][] = [
  [0.48, 0.4],
  [-0.48, 0.4],
  [0.48, -0.4],
  [-0.48, -0.4],
];

/**
 * A stylised molar sculpted from a single sphere: rounded-square crown with four
 * cusps and a cross fissure on top, and (optionally) two roots below.
 * `roots: false` gives a flat-based crown, `cusps: 0` a smooth front tooth.
 */
export function toothGeometry({ roots = true, cusps = 1, quality = 1 } = {}): BufferGeometry {
  const g = new SphereGeometry(1, Math.round(88 * quality * detail), Math.round(64 * quality * detail));
  const p = g.attributes.position;
  const v = new Vector3();

  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    const r = Math.hypot(v.x, v.z);
    const n = 3.2; // superellipse exponent: rounded-square cross-section
    const sq = Math.pow(Math.abs(Math.cos(a)) ** n + Math.abs(Math.sin(a)) ** n, -1 / n);
    let x = Math.cos(a) * r * sq;
    let z = Math.sin(a) * r * sq * 0.9;
    let y: number;
    let waist = 1;

    if (v.y >= 0) {
      const top = smoothstep(v.y, 0.3, 0.92);
      const bumps = CUSPS.reduce((sum, [cx, cz]) => sum + gauss(Math.hypot(x - cx, z - cz), 0.27), 0);
      const fissure = Math.max(gauss(x, 0.12), gauss(z, 0.12));
      y = v.y * 0.72 + top * cusps * (0.2 * bumps - 0.15 * fissure);
    } else if (roots) {
      const t = -v.y;
      const split = smoothstep(t, 0.15, 0.6);
      const lobe = 1 - gauss(x, 0.24); // 0 on the midline, 1 under each root
      y = -t * (0.5 + 1.45 * split * lobe);
      x = x * (1 - 0.35 * split) + Math.tanh(x * 14) * 0.12 * split;
      z *= 1 - 0.5 * smoothstep(t, 0.2, 1);
    } else {
      y = v.y * 0.3;
      const taper = 1 - 0.22 * smoothstep(-v.y, 0, 1);
      x *= taper;
      z *= taper;
    }
    if (roots) waist = 1 - 0.1 * gauss(v.y + 0.05, 0.16); // slight narrowing at the gumline
    p.setXYZ(i, x * waist, y, z * waist);
  }
  if (roots) g.translate(0, 0.38, 0);
  return weld(g);
}

export function createTooth() {
  const material = enamelMaterial();
  const mesh = new Mesh(toothGeometry(), material);
  return { group: mesh, material };
}

/* ---------- Sparkles ---------- */
export function createSparkles(count = 14, radius = 1.7) {
  const material = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const mesh = new InstancedMesh(new OctahedronGeometry(0.07), material, count);
  const dummy = new Object3D();
  const seeds = Array.from({ length: count }, (_, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const rad = radius * (0.8 + 0.35 * ((i * 7) % 5) * 0.2);
    return {
      pos: new Vector3(Math.cos(theta) * Math.sin(phi) * rad, Math.cos(phi) * rad * 0.9, Math.sin(theta) * Math.sin(phi) * rad),
      phase: i * 1.7,
      size: 0.6 + ((i * 13) % 7) / 7,
    };
  });
  const update = (time: number, intensity: number) => {
    material.opacity = intensity;
    seeds.forEach((s, i) => {
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.6 + s.phase));
      dummy.position.copy(s.pos);
      dummy.rotation.set(0, time * 0.8 + s.phase, 0);
      dummy.scale.set(0.45, 1.5, 0.45).multiplyScalar(s.size * twinkle * intensity);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0, 0);
  return { mesh, update };
}

/** Tooth that can shift from stained to bright white, with sparkles. */
export function createWhitening() {
  const { group: tooth, material } = createTooth();
  const sparkles = createSparkles();
  const group = new Group();
  group.add(tooth, sparkles.mesh);
  const from = new Color(STAINED);
  const to = new Color(0xfdfcf8);
  let amount = 0;
  const setWhite = (k: number) => {
    amount = k;
    material.color.copy(from).lerp(to, k);
  };
  setWhite(0);
  return { group, setWhite, update: (time: number) => sparkles.update(time, amount) };
}

/* ---------- Implant ---------- */
function fixtureGeometry(): BufferGeometry {
  const height = 1.9;
  const g = new CylinderGeometry(1, 1, height, Math.round(72 * detail), Math.round(200 * detail), true);
  const p = g.attributes.position;
  const turns = 8;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const yN = y / height + 0.5; // 0 at the tip, 1 at the collar
    const angle = Math.atan2(p.getZ(i), p.getX(i));
    let phase = yN * turns + angle / (Math.PI * 2);
    phase -= Math.floor(phase);
    const ridge = Math.pow(1 - Math.abs(2 * phase - 1), 1.5); // V-shaped helical thread
    const mask = smoothstep(yN, 0.05, 0.16) * (1 - smoothstep(yN, 0.84, 0.94));
    const core = lerp(0.25, 0.4, smoothstep(yN, 0, 0.75)) * Math.sqrt(Math.min(1, yN / 0.045));
    const radius = core + 0.085 * ridge * mask;
    p.setXYZ(i, Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  }
  g.translate(0, -height / 2, 0); // collar at y = 0
  return weld(g);
}

export function createImplant() {
  const fixture = new Mesh(fixtureGeometry(), titanium(0.42));

  const profile = [
    [0.4, 0],
    [0.47, 0.04],
    [0.47, 0.16],
    [0.37, 0.24],
    [0.3, 0.34],
    [0.24, 0.84],
    [0.2, 0.9],
    [0, 0.9],
  ].map(([r, y]) => new Vector2(r, y));
  const abutment = new Mesh(new LatheGeometry(profile, 48), titanium(0.16));

  const crown = new Mesh(toothGeometry({ roots: false }), enamelMaterial());
  crown.scale.setScalar(0.74);
  const CROWN_Y = 0.56;

  const inner = new Group();
  inner.add(fixture, abutment, crown);
  inner.position.y = 0.42;
  inner.scale.setScalar(1.05);
  const group = new Group();
  group.add(inner);
  group.rotation.z = -0.18;

  /** 0 = assembled, 1 = fully separated along the implant axis. */
  const explode = (k: number) => {
    crown.position.y = CROWN_Y + k * 0.95;
    abutment.position.y = k * 0.32;
    fixture.position.y = -k * 0.38;
  };
  explode(0);
  return { group, explode };
}

/* ---------- Dental arch (aligner + braces) ---------- */
interface ToothSpec {
  w: number; // width along the arch
  d: number; // depth (front to back)
  h: number; // height scale
  cusped: boolean;
}
const HALF_ARCH: ToothSpec[] = [
  { w: 0.5, d: 0.24, h: 0.62, cusped: false }, // central incisor
  { w: 0.42, d: 0.22, h: 0.56, cusped: false }, // lateral incisor
  { w: 0.46, d: 0.32, h: 0.64, cusped: false }, // canine
  { w: 0.44, d: 0.42, h: 0.5, cusped: true }, // premolars
  { w: 0.44, d: 0.44, h: 0.5, cusped: true },
  { w: 0.6, d: 0.56, h: 0.48, cusped: true }, // molars
  { w: 0.6, d: 0.56, h: 0.46, cusped: true },
];

interface Placement extends ToothSpec {
  pos: Vector3;
  normal: Vector3;
  yaw: number;
}

/** Places teeth along a half-ellipse by arc length, mirrored left and right. */
function layoutArch(): Placement[] {
  const A = 1.95;
  const B = 2.55;
  const point = (t: number) => new Vector3(A * Math.sin(t), 0, B * Math.cos(t));
  const SAMPLES = 400;
  const MAX = Math.PI * 0.56;
  const table: number[] = [0];
  let prev = point(0);
  for (let i = 1; i <= SAMPLES; i++) {
    const cur = point((i / SAMPLES) * MAX);
    table.push(table[i - 1] + cur.distanceTo(prev));
    prev = cur;
  }
  const angleAt = (len: number) => {
    let i = 1;
    while (i < SAMPLES && table[i] < len) i++;
    const f = (len - table[i - 1]) / (table[i] - table[i - 1] || 1);
    return ((i - 1 + f) / SAMPLES) * MAX;
  };

  const out: Placement[] = [];
  const gap = 0.035;
  let cursor = gap / 2;
  for (const spec of HALF_ARCH) {
    const t = angleAt(cursor + spec.w / 2);
    cursor += spec.w + gap;
    for (const side of [1, -1]) {
      const pos = point(t * side);
      const normal = new Vector3(B * Math.sin(t * side), 0, A * Math.cos(t * side)).normalize();
      out.push({ ...spec, pos, normal, yaw: Math.atan2(normal.x, normal.z) });
    }
  }
  return out;
}

function buildTeeth(placements: Placement[], material: MeshPhysicalMaterial, inflate = 1) {
  const group = new Group();
  const dummy = new Object3D();
  for (const cusped of [false, true]) {
    const set = placements.filter((pl) => pl.cusped === cusped);
    const geometry = toothGeometry({ roots: false, cusps: cusped ? 1 : 0, quality: 0.42 });
    const mesh = new InstancedMesh(geometry, material, set.length);
    set.forEach((pl, i) => {
      dummy.position.copy(pl.pos);
      dummy.rotation.set(0, pl.yaw, 0);
      dummy.scale.set((pl.w / 2) * inflate, pl.h * inflate, (pl.d / 2 / 0.9) * inflate);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    group.add(mesh);
  }
  return group;
}

export function createArch({ shell = false, brackets = false } = {}) {
  const placements = layoutArch();
  const group = new Group();
  const arch = new Group();
  arch.add(buildTeeth(placements, enamelMaterial()));

  // Gum ridge under the teeth, following the same curve.
  const ordered = [...placements].sort((a, b) => Math.atan2(a.pos.x, a.pos.z) - Math.atan2(b.pos.x, b.pos.z));
  const gumCurve = new CatmullRomCurve3(ordered.map((pl) => pl.pos.clone().setY(-0.26)));
  const gum = new Mesh(
    new TubeGeometry(gumCurve, 96, 0.3, 14, false),
    new MeshPhysicalMaterial({ color: 0xe58f86, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
  );
  gum.scale.y = 0.7;
  arch.add(gum);

  let shellGroup: Group | null = null;
  if (shell) {
    shellGroup = buildTeeth(
      placements,
      new MeshPhysicalMaterial({
        color: 0xd8efff,
        roughness: 0.05,
        clearcoat: 1,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      }),
      1.1,
    );
    arch.add(shellGroup);
  }

  let bracketMesh: InstancedMesh | null = null;
  let wire: Mesh | null = null;
  let wireCount = 0;
  const dummy = new Object3D();
  const bracketAt = (pl: Placement) => pl.pos.clone().addScaledVector(pl.normal, pl.d / 2 + 0.015).setY(pl.h * 0.3);
  if (brackets) {
    bracketMesh = new InstancedMesh(new BoxGeometry(0.17, 0.15, 0.07), titanium(0.25), ordered.length);
    const wirePoints = ordered.map((pl) => bracketAt(pl).addScaledVector(pl.normal, 0.03));
    const wireGeometry = new TubeGeometry(new CatmullRomCurve3(wirePoints), 180, 0.017, 6, false);
    wireCount = wireGeometry.index?.count ?? 0;
    wire = new Mesh(wireGeometry, titanium(0.2));
    arch.add(bracketMesh, wire);
  }

  /** Braces: brackets pop on one by one, then the wire threads through. */
  const setBraces = (k: number) => {
    if (!bracketMesh || !wire) return;
    ordered.forEach((pl, i) => {
      const local = MathUtils.clamp(k * 1.8 * ordered.length - i * 0.9, 0, 1);
      dummy.position.copy(bracketAt(pl));
      dummy.rotation.set(0, pl.yaw, 0);
      dummy.scale.setScalar(Math.max(0.0001, local));
      dummy.updateMatrix();
      bracketMesh!.setMatrixAt(i, dummy.matrix);
    });
    bracketMesh.instanceMatrix.needsUpdate = true;
    const drawn = MathUtils.clamp((k - 0.45) / 0.55, 0, 1);
    wire.geometry.setDrawRange(0, Math.floor((wireCount * drawn) / 3) * 3);
  };
  /** Aligner: 1 = tray hovering above the teeth, 0 = fully seated. */
  const setShell = (k: number) => {
    if (shellGroup) shellGroup.position.y = k * 1.25;
  };
  setBraces(brackets ? 1 : 0);
  setShell(0);

  arch.position.z = -0.95; // centre the horseshoe on the pivot
  arch.scale.setScalar(0.78);
  group.add(arch);
  group.rotation.x = 0.62; // tip towards the camera so the biting surfaces show
  return { group, setBraces, setShell };
}
