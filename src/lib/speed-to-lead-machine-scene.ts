import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

declare global {
  interface Window {
    __machineDebug?: { getState: () => Record<string, unknown> };
  }
}

const DURATION = 18;
const TRACK = [[0, -9.6], [2, -6.3], [3.5, -4.8], [4.5, -4.8], [5.8, -2.4], [7, -2.4], [9, 0], [10.5, 0], [12.5, 2.4], [14, 2.4], [16, 4.8], [17, 4.8], [18, 6]];
const STAGES = [
  { name: 'inquiry', x: -4.8, label: 'Capture', copy: 'Inquiry captured. “Can you help with a burst pipe?”' },
  { name: 'response', x: -2.4, label: 'Respond', copy: 'Boltcall replies immediately.' },
  { name: 'qualify', x: 0, label: 'Qualify', copy: 'Boltcall checks the need, urgency, and address.' },
  { name: 'booked', x: 2.4, label: 'Book', copy: 'Appointment booked. A time is reserved.' },
  { name: 'confirmed', x: 4.8, label: 'Confirm', copy: 'Appointment booked. Confirmation and details sent to the team.' },
];
const SOURCES = [
  { id: 'text', label: 'Text', z: -2.2 },
  { id: 'voice', label: 'Voice', z: 0 },
  { id: 'website', label: 'Website + Ads', z: 2.2 },
];

function positionAt(time: number) {
  for (let i = 1; i < TRACK.length; i++) {
    const [end, to] = TRACK[i];
    const [start, from] = TRACK[i - 1];
    if (time <= end) {
      const t = THREE.MathUtils.clamp((time - start) / (end - start), 0, 1);
      return THREE.MathUtils.lerp(from, to, t * t * (3 - 2 * t));
    }
  }
  return 6;
}

// A light-mode moving conveyor, three inputs and five useful process stations.
// Desktop shows the whole left-to-right journey; narrow screens track the
// inquiry horizontally instead of turning the rail into a vertical layout.
export function initMachineScene(root: HTMLElement): () => void {
  const cleanups: (() => void)[] = [];
  function get<T extends HTMLElement = HTMLElement>(id: string) {
    const element = root.querySelector<T>(`#${id}`);
    if (!element) throw new Error(`Missing demo element #${id}`);
    return element;
  }
  function listen(target: EventTarget, type: string, callback: EventListener) {
    target.addEventListener(type, callback);
    cleanups.push(() => target.removeEventListener(type, callback));
  }
  const dispose = () => { cleanups.splice(0).reverse().forEach(cleanup => cleanup()); };
  const scene = new THREE.Scene();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  cleanups.push(() => {
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  });

  try {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const host = get('scene');
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
    renderer.setClearColor(0xffffff, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);
    cleanups.push(() => { renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); });

    const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, .1, 100);
    scene.add(new THREE.HemisphereLight(0xf4f8ff, 0xaab6c8, 1.9));
    const key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(-5, 10, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: .1, far: 30 });
    key.shadow.bias = -.0004;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb5cdff, 1.2);
    rim.position.set(2, 5, -8); scene.add(rim);

    const material = (color: number, options: THREE.MeshStandardMaterialParameters = {}) => {
      const result = new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .04, ...options });
      materials.add(result);
      return result;
    };
    const white = material(0xf7f8fa);
    const edge = material(0xdce2ea);
    const beltMaterial = material(0xc1ccd9);
    const blue = material(0x2563eb);
    const ink = material(0x27364b);
    const chrome = material(0xb5c2d2, { metalness: .65, roughness: .28 });
    const porcelain = material(0xffffff, { roughness: .32 });
    const led = material(0x3e88ff, { emissive: 0x2563eb, emissiveIntensity: .7 });
    const green = material(0x13865d);
    const translucent = material(0x2563eb, { transparent: true, opacity: .12, depthWrite: false });

    function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
      geometries.add(geometry);
      const result = new THREE.Mesh(geometry, mat);
      result.position.set(x, y, z);
      result.castShadow = true;
      result.receiveShadow = true;
      parent.add(result);
      return result;
    }
    const boxGeometries = new Map<string, THREE.BufferGeometry>();
    function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat = white, radius = .07) {
      const key = `${w},${h},${d},${radius}`;
      if (!boxGeometries.has(key)) boxGeometries.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)));
      return mesh(parent, boxGeometries.get(key)!, mat, x, y, z);
    }
    function cylinder(parent: THREE.Object3D, radius: number, height: number, x: number, y: number, z: number, mat = white) {
      return mesh(parent, new THREE.CylinderGeometry(radius, radius, height, 40), mat, x, y, z);
    }

    const floorMaterial = new THREE.ShadowMaterial({ opacity: .15 });
    materials.add(floorMaterial);
    const floor = mesh(scene, new THREE.PlaneGeometry(60, 60), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;
    floor.position.y = -.35;

    // Side rails stay fixed; conveyor slats circulate from left to right.
    box(scene, 12.6, .28, 1.55, 0, -.05, 0, white, .08);
    for (const z of [-.75, .75]) {
      box(scene, 12.65, .07, .07, 0, .15, z, chrome, .025);
      box(scene, 12.4, .07, .025, 0, -.07, z * 1.04, ink, .008);
      for (let x = -6; x <= 6; x += .6) {
        const bolt = cylinder(scene, .025, .016, x, -.07, z * 1.065, chrome);
        bolt.rotation.x = Math.PI / 2;
      }
    }
    // Exposed drive rollers make the mechanism read as a conveyor.
    const rollers = [-6.1, 6.1].map(x => {
      const roller = new THREE.Group(); roller.name = 'drive-roller';
      roller.position.set(x, .07, 0); scene.add(roller);
      const drum = cylinder(roller, .16, 1.38, 0, 0, 0, chrome); drum.rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) {
        const angle = i / 8 * Math.PI * 2;
        box(roller, .018, .025, 1.34, Math.cos(angle) * .155, Math.sin(angle) * .155, 0, ink, .005);
      }
      return roller;
    });
    const slatGeometry = new RoundedBoxGeometry(.13, .035, 1.32, 1, .01);
    geometries.add(slatGeometry);
    const slats = new THREE.InstancedMesh(slatGeometry, beltMaterial, 36);
    slats.name = 'moving-belt';
    scene.add(slats);
    const dummy = new THREE.Object3D();
    function moveSlats(belt: THREE.InstancedMesh, length: number, offset: number) {
      for (let i = 0; i < belt.count; i++) {
        const x = -length / 2 + (i * length / belt.count + offset) % length;
        dummy.position.set(x, .135, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix(); belt.setMatrixAt(i, dummy.matrix);
      }
      belt.instanceMatrix.needsUpdate = true;
    }
    moveSlats(slats, 12.6, 0);

    // Balanced horizontal fan: upper and lower inputs curve inward, center
    // stays straight. Identical paths drive the rails, slats and inquiry.
    const feeders = SOURCES.map((source, index) => {
      const group = new THREE.Group(); group.name = `source-${source.id}`;
      group.position.set(-9.6, 0, source.z);
      scene.add(group);
      const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.1, 0, 0), new THREE.Vector3(2.3, 0, -source.z), new THREE.Vector3(3.3, 0, -source.z));
      const length = curve.getLength();
      const segments = 28;
      for (let i = 0; i < segments; i++) {
        const a = curve.getPoint(i / segments), b = curve.getPoint((i + 1) / segments), center = a.clone().add(b).multiplyScalar(.5);
        const slab = box(group, a.distanceTo(b) + .025, .15, .62, center.x, .015, center.z, white, .025);
        slab.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      }
      for (const side of [-1, 1]) {
        const points = Array.from({ length: 41 }, (_, i) => {
          const t = i / 40, p = curve.getPoint(t), tangent = curve.getTangent(t);
          return p.add(new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(side * .29)).add(new THREE.Vector3(0, .13, 0));
        });
        mesh(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, .028, 8, false), chrome);
      }
      const geometry = new RoundedBoxGeometry(.1, .025, .43, 1, .008);
      geometries.add(geometry);
      const belt = new THREE.InstancedMesh(geometry, beltMaterial, Math.ceil(length / .32));
      belt.name = 'feeder-belt'; group.add(belt);
      const move = (offset: number) => {
        for (let i = 0; i < belt.count; i++) {
          const t = (i * length / belt.count + offset) % length / length;
          const p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
          dummy.position.copy(p).add(new THREE.Vector3(0, .135, 0));
          dummy.rotation.set(0, -Math.atan2(tangent.z, tangent.x), 0);
          dummy.updateMatrix(); belt.setMatrixAt(i, dummy.matrix);
        }
        belt.instanceMatrix.needsUpdate = true;
      };
      move(0);
      box(group, 1.05, .22, .88, -.42, .04, 0, white, .1);
      box(group, .82, .035, .66, -.42, .17, 0, porcelain, .06);
      box(group, .48, .045, .025, -.42, .07, .45, led, .01);
      const icon = new THREE.Group(); icon.position.set(-.42, .23, 0); group.add(icon);
      icon.scale.setScalar(1.25);
      if (index === 0) {
        box(icon, .48, .32, .1, 0, .22, 0, blue, .08);
        for (const x of [-.11, 0, .11]) mesh(icon, new THREE.SphereGeometry(.025, 12, 8), white, x, .22, .065);
        const tail = box(icon, .1, .1, .08, -.12, .06, 0, blue, .02); tail.rotation.z = Math.PI / 4;
      } else if (index === 1) {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.2, .4, 0), new THREE.Vector3(-.2, .15, 0), new THREE.Vector3(.08, .08, 0), new THREE.Vector3(.2, .22, 0)]);
        mesh(icon, new THREE.TubeGeometry(curve, 16, .055, 8, false), blue);
        box(icon, .16, .12, .11, -.2, .4, 0, blue, .04);
        box(icon, .16, .12, .11, .2, .22, 0, blue, .04);
      } else {
        box(icon, .51, .38, .07, 0, .26, 0, blue, .05);
        box(icon, .43, .26, .02, 0, .23, .05, white, .02);
        for (const x of [-.16, -.1, -.04]) mesh(icon, new THREE.SphereGeometry(.015, 8, 6), white, x, .4, .05);
      }
      return { belt, length, curve, move, group };
    });

    const stations = STAGES.map(stage => {
      const group = new THREE.Group();
      group.name = stage.name;
      group.position.set(stage.x, 0, -.13);
      scene.add(group);
      const pedestal = new THREE.Group(); pedestal.name = 'station-pedestal'; group.add(pedestal);
      cylinder(pedestal, .79, .11, 0, .2, 0, chrome);
      cylinder(pedestal, .73, .1, 0, .29, 0, porcelain);
      box(pedestal, .73, .13, .36, 0, .39, -.1, white, .055);
      box(pedestal, .52, .035, .025, 0, .42, .095, led, .01);
      for (const x of [-.5, .5]) {
        cylinder(pedestal, .035, .02, x, .35, .22, chrome);
        cylinder(pedestal, .035, .02, x, .35, -.22, chrome);
      }
      for (const x of [-.22, -.11, 0, .11, .22]) box(pedestal, .05, .055, .025, x, .21, .78, ink, .008);
      const ring = mesh(group, new THREE.TorusGeometry(.72, .018, 8, 64), edge, 0, .28, 0);
      ring.rotation.x = Math.PI / 2;
      return { group, ring };
    });

    // Inquiry: a simple phone with a short message on its screen.
    const phone = stations[0].group;
    box(phone, .72, 1.25, .13, 0, .96, 0, ink, .11);
    box(phone, .61, 1.03, .035, 0, .99, .084, white, .06);
    box(phone, .38, .045, .014, -.06, 1.16, .11, edge, .015);
    box(phone, .32, .045, .014, -.09, 1.04, .11, edge, .015);
    box(phone, .29, .18, .025, .09, .78, .11, blue, .04);
    box(phone, .65, 1.19, .035, 0, .96, -.083, chrome, .08);
    box(phone, .22, .05, .016, 0, 1.46, .11, ink, .02);
    const cameraLens = cylinder(phone, .025, .02, .2, 1.47, .11, ink); cameraLens.rotation.x = Math.PI / 2;
    box(phone, .14, .022, .025, 0, .5, .11, chrome, .01);
    box(phone, .026, .15, .05, -.377, 1.05, 0, chrome, .008);
    // Message rows animate in as the inquiry is captured.
    const phoneMessage = new THREE.Group(); phoneMessage.position.set(0, .86, .12); phone.add(phoneMessage);
    box(phoneMessage, .46, .16, .025, -.02, .38, 0, edge, .04);
    box(phoneMessage, .27, .018, .014, -.08, .4, .025, ink, .005);
    box(phoneMessage, .32, .018, .014, -.055, .35, .025, ink, .005);

    // Immediate response: a sculpted blue speech bubble and typing dots.
    const response = stations[1].group;
    box(response, 1.04, .7, .22, 0, 1.05, 0, blue, .15);
    const tail = box(response, .23, .23, .16, -.28, .7, 0, blue, .025);
    tail.rotation.z = Math.PI / 4;
    const dots = [-.25, 0, .25].map(x => mesh(response, new THREE.SphereGeometry(.055, 16, 12), white, x, 1.05, .13));
    const pulse = cylinder(response, .9, .018, 0, .3, 0, translucent);
    pulse.castShadow = false;
    const responseCore = cylinder(response, .32, .13, 0, .52, -.05, ink);
    for (const x of [-.22, -.11, 0, .11, .22]) box(response, .055, .03, .04, x, .53, .28, led, .008);
    const waveBars = Array.from({ length: 11 }, (_, i) => box(response, .045, .2, .035, (i - 5) * .085, .75, .17, chrome, .012));

    // Appointment: a white calendar with a green confirmation check.
    // Qualification: a short checklist, not another dashboard panel.
    const checklist = stations[2].group;
    box(checklist, .72, 1.08, .12, 0, .91, 0, white, .08);
    box(checklist, .29, .13, .13, 0, 1.46, 0, edge, .03);
    box(checklist, .58, .88, .025, 0, .91, .08, porcelain, .04);
    const qualificationTicks: THREE.Mesh[] = [];
    for (const y of [.65, .92, 1.19]) {
      box(checklist, .1, .1, .025, -.2, y, .08, blue, .02);
      box(checklist, .29, .035, .025, .06, y, .08, edge, .01);
      const tick = box(checklist, .045, .045, .03, -.2, y, .105, green, .012);
      qualificationTicks.push(tick);
    }
    const scanner = box(checklist, .65, .024, .018, 0, 1.3, .13, led, .008);

    const calendar = stations[3].group;
    box(calendar, .95, 1.03, .15, 0, .95, 0, white, .1);
    box(calendar, .94, .2, .16, 0, 1.37, 0, blue, .055);
    for (const x of [-.26, .26]) box(calendar, .07, .28, .07, x, 1.49, .03, ink, .03);
    for (const x of [-.26, .26]) {
      const loop = mesh(calendar, new THREE.TorusGeometry(.095, .028, 8, 24), chrome, x, 1.47, .025);
      loop.rotation.y = Math.PI / 2;
    }
    const calendarPage = box(calendar, .83, .75, .025, 0, .88, .096, porcelain, .035);
    const appointmentSlot = box(calendar, .18, .15, .022, .25, .94, .13, blue, .025);
    for (const x of [-.25, 0, .25]) for (const y of [.71, .94, 1.16]) box(calendar, .08, .06, .025, x, y, .09, edge, .02);
    const check = new THREE.Group();
    check.position.set(.36, .7, .21);
    calendar.add(check);
    const disc = cylinder(check, .24, .06, 0, 0, 0, green);
    disc.rotation.x = Math.PI / 2;
    const short = box(check, .07, .2, .025, -.06, -.015, .04, white, .02);
    short.rotation.z = Math.PI / 4;
    const long = box(check, .07, .32, .025, .065, .025, .04, white, .02);
    long.rotation.z = -Math.PI / 4;

    // Confirmation: the appointment details reach the customer and team.
    const confirmation = stations[4].group;
    box(confirmation, 1.04, .68, .14, 0, .98, 0, white, .09);
    const flap = mesh(confirmation, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.46, 1.21, .1), new THREE.Vector3(0, .9, .1), new THREE.Vector3(.46, 1.21, .1),
    ]), 2, .02, 6, false), blue);
    flap.castShadow = false;
    box(confirmation, .89, .51, .03, 0, .98, -.09, chrome, .05);
    const sentDetails = new THREE.Group(); confirmation.add(sentDetails);
    box(sentDetails, .58, .69, .035, 0, 1.15, -.055, porcelain, .03);
    for (const y of [1, 1.14, 1.28]) box(sentDetails, .36, .022, .016, 0, y, -.03, edge, .005);
    const sentSeal = cylinder(confirmation, .13, .05, .41, .81, .15, green); sentSeal.rotation.x = Math.PI / 2;

    // The inquiry rides its selected feeder before joining the main conveyor.
    const lead = new THREE.Group();
    lead.name = 'traveling-inquiry';
    scene.add(lead);
    const cardMaterial = material(0x2563eb);
    box(lead, .6, .79, .12, 0, .73, 0, porcelain, .075);
    box(lead, .61, .17, .13, 0, 1.02, 0, cardMaterial, .05);
    const avatar = cylinder(lead, .055, .022, -.16, .86, .077, chrome); avatar.rotation.x = Math.PI / 2;
    box(lead, .13, .06, .015, -.16, .775, .081, chrome, .025);
    for (const [y, w] of [[.86, .2], [.78, .16], [.63, .39], [.55, .29]]) box(lead, w, .022, .016, y > .7 ? .1 : -.04, y, .08, edge, .005);
    box(lead, .17, .055, .025, .14, .43, .085, cardMaterial, .015);
    box(lead, .77, .12, .44, 0, .21, 0, ink, .065);
    for (const x of [-.26, .26]) for (const z of [-.2, .2]) {
      const wheel = cylinder(lead, .075, .035, x, .12, z, chrome); wheel.rotation.x = Math.PI / 2;
    }
    const leadOffsetZ = .57;

    let width = 0, height = 0, mobile = false;
    let time = motion.matches ? DURATION : 0;
    let sourceIndex = 0;
    let playing = !motion.matches && !document.hidden;
    let visible = !document.hidden, contextLost = false;
    let lastFrame = performance.now(), raf = 0;
    const cameraTarget = new THREE.Vector3();

    function stageIndex() { return time < 5 ? 0 : time < 8 ? 1 : time < 11.5 ? 2 : time < 15 ? 3 : 4; }
    function resize() {
      width = host.clientWidth || window.innerWidth;
      height = host.clientHeight || window.innerHeight;
      mobile = width < 650;
      renderer.setSize(width, height);
      const halfWidth = mobile ? 3.8 : 9.8;
      const halfHeight = halfWidth * height / width;
      camera.left = -halfWidth; camera.right = halfWidth;
      camera.top = halfHeight; camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
    }
    function update() {
      const stage = stageIndex(), x = positionAt(time);
      lead.position.x = x;
      // Ease onto the front carrying lane instead of jumping sideways at merge.
      lead.position.z = leadOffsetZ * THREE.MathUtils.smoothstep(x, -6.3, -5.7);
      if (x < -6.3) {
        const t = THREE.MathUtils.clamp((x + 9.6) / 3.3, 0, 1);
        const feeder = feeders[sourceIndex], p = feeder.curve.getPoint(t);
        lead.position.x = feeder.group.position.x + p.x;
        lead.position.z = feeder.group.position.z + p.z;
      }
      moveSlats(slats, 12.6, time * 1.15);
      feeders.forEach(feeder => feeder.move(time * 1.15));
      rollers.forEach(roller => { roller.rotation.z = -time * 1.15 / .16; });
      cardMaterial.color.setHex(stage >= 3 ? 0x13865d : 0x2563eb);
      check.scale.setScalar(time >= 11.5 ? 1 : .001);
      pulse.scale.setScalar(1 + Math.sin(time * 2) * .05);
      dots.forEach((dot, i) => { dot.position.y = 1.05 + (stage === 1 ? Math.max(0, Math.sin(time * 5 - i)) * .05 : 0); });
      phoneMessage.scale.setScalar(time > 2 ? 1 : .001);
      responseCore.rotation.y = time * .45;
      waveBars.forEach((bar, i) => { bar.scale.y = stage === 1 ? .5 + Math.abs(Math.sin(time * 6 + i * .7)) * 1.5 : .5; });
      qualificationTicks.forEach((tick, i) => { tick.visible = time > 8.2 + (2 - i) * .7; });
      scanner.position.y = stage === 2 ? 1.3 - (time % 1.8) / 1.8 * .7 : 1.3;
      scanner.visible = stage === 2;
      calendarPage.rotation.x = time > 11.5 && time < 12.5 ? Math.sin((time - 11.5) * Math.PI) * -.16 : 0;
      appointmentSlot.scale.setScalar(time > 11.5 ? 1 : .001);
      sentDetails.position.y = time > 15 ? Math.min(.3, (time - 15) * .2) : 0;
      sentSeal.scale.setScalar(time > 15 ? 1 : .001);
      stations.forEach((station, i) => { station.ring.material = i === stage ? blue : edge; });
      // Hold the fan in view at the opening, then smoothly follow the inquiry.
      const followX = THREE.MathUtils.lerp(-8.1, x, THREE.MathUtils.smoothstep(x, -6.3, -4.8));
      cameraTarget.set(mobile ? THREE.MathUtils.clamp(followX, -8.4, 4.8) : -1.8, .6, 0);
      camera.position.copy(cameraTarget).add(new THREE.Vector3(0, 7.5, 13));
      camera.lookAt(cameraTarget);
      camera.updateMatrixWorld();
      const status = get('journey-status');
      const copy = time < 2.5 ? `${SOURCES[sourceIndex].label}: “Can you help with a burst pipe?”` : STAGES[stage].copy;
      if (status.textContent !== copy) status.textContent = copy;
      const play = get('play');
      const caption = playing ? 'Pause' : time >= DURATION ? 'Replay' : 'Play';
      play.textContent = caption;
      play.setAttribute('aria-label', `${caption} the animation`);
      get('replay').hidden = time >= DURATION;
    }
    function replay() {
      sourceIndex = (sourceIndex + 1) % SOURCES.length;
      time = 0; playing = true; lastFrame = performance.now(); update();
    }
    listen(get('play'), 'click', () => {
      if (time >= DURATION) { replay(); return; }
      playing = !playing; lastFrame = performance.now(); update();
    });
    listen(get('replay'), 'click', replay);
    listen(document, 'visibilitychange', () => {
      visible = !document.hidden;
      if (!visible) playing = false;
      lastFrame = performance.now(); update();
    });
    listen(motion, 'change', event => {
      if ((event as MediaQueryListEvent).matches) { time = DURATION; playing = false; update(); }
    });
    listen(window, 'resize', () => { resize(); update(); });
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => { resize(); update(); });
      observer.observe(host); cleanups.push(() => observer.disconnect());
    }
    listen(renderer.domElement, 'webglcontextlost', event => {
      event.preventDefault(); contextLost = true; playing = false; update(); get('error').style.display = 'block';
    });
    listen(renderer.domElement, 'webglcontextrestored', () => { contextLost = false; get('error').style.display = 'none'; });
    function animate(timestamp: number) {
      raf = requestAnimationFrame(animate);
      const delta = Math.max(0, (timestamp - lastFrame) / 1000);
      lastFrame = timestamp;
      if (!visible || contextLost) return;
      if (playing) { time = Math.min(DURATION, time + delta); if (time >= DURATION) playing = false; }
      update(); renderer.render(scene, camera);
    }
    resize(); update(); renderer.compile(scene, camera);
    get('loading').classList.add('done'); get('error').style.display = 'none';
    raf = requestAnimationFrame(animate);
    cleanups.push(() => cancelAnimationFrame(raf));
    Object.defineProperty(window, '__machineDebug', { configurable: true, value: {
      getState: () => ({ playing, time, source: SOURCES[sourceIndex].id, leadX: positionAt(time), booked: time >= 11.5, width, height, mobile }),
    } });
    cleanups.push(() => { delete window.__machineDebug; });
  } catch (error) {
    console.error('Boltcall demo could not start', error);
    get('loading').classList.add('done'); get('error').style.display = 'block';
  }
  return dispose;
}
