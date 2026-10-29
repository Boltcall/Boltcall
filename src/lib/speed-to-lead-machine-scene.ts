import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'

// Source-station icons, extruded into 3D meshes (SVGLoader + ExtrudeGeometry,
// see iconMesh() below) — not canvas textures, not HTML. Brand marks are
// path data from simple-icons (github.com/simple-icons/simple-icons, CC0);
// generic pictograms are from Heroicons solid (github.com/tailwindlabs/heroicons, MIT).
const SVG = (d: string) => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`
const ICON = {
  sms: SVG(
    'M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97ZM6.75 8.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H7.5Z'
  ),
  whatsapp: SVG(
    'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'
  ),
  messenger: SVG(
    'M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13'
  ),
  instagram: SVG(
    'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077'
  ),
  phone: SVG(
    'M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z'
  ),
  phoneMissed: SVG(
    'M15.22 3.22a.75.75 0 0 1 1.06 0L18 4.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L19.06 6l1.72 1.72a.75.75 0 0 1-1.06 1.06L18 7.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L16.94 6l-1.72-1.72a.75.75 0 0 1 0-1.06ZM1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z'
  ),
  voicemail: SVG(
    'M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5ZM6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z'
  ),
  form: SVG(
    'M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25ZM12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z'
  ),
  chat: SVG(
    'M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979ZM15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z'
  ),
  googleAds: SVG(
    'M3.9998 22.9291C1.7908 22.9291 0 21.1383 0 18.9293s1.7908-3.9998 3.9998-3.9998 3.9998 1.7908 3.9998 3.9998-1.7908 3.9998-3.9998 3.9998zm19.4643-6.0004L15.4632 3.072C14.3586 1.1587 11.9121.5028 9.9988 1.6074S7.4295 5.1585 8.5341 7.0718l8.0009 13.8567c1.1046 1.9133 3.5511 2.5679 5.4644 1.4646 1.9134-1.1046 2.568-3.5511 1.4647-5.4644zM7.5137 4.8438L1.5645 15.1484A4.5 4.5 0 0 1 4 14.4297c2.5597-.0075 4.6248 2.1585 4.4941 4.7148l3.2168-5.5723-3.6094-6.25c-.4499-.7793-.6322-1.6394-.5878-2.4784z'
  ),
  meta: SVG(
    'M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z'
  ),
} as const

const svgLoader = new SVGLoader()
// Extrudes an icon SVG string into a small beveled 3D mesh, centered on its
// own origin and sized to `size` world units across its longest side. SVG
// y-down is flipped to three's y-up as part of the same scale step.
function iconMesh(svg: string, color: number, size = 0.22) {
  const paths = svgLoader.parse(svg).paths
  const shapes = paths.flatMap((p) => p.toShapes())
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 6,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 0.8,
    bevelSegments: 2,
    curveSegments: 8,
  })
  geo.center()
  geo.computeBoundingBox()
  const bbox = geo.boundingBox!
  const raw = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y) || 1
  geo.scale(size / raw, -size / raw, size / raw)
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.4 }))
  mesh.castShadow = true
  return mesh
}

// Boltcall speed-to-lead engine, v2: a straight two-lane belt (rebuilt from
// the closed-loop "Agentic Factory 3D" layout by Eugene Shilow,
// https://github.com/eugeneshilow/agentic-3d-templates). One lead card runs
// the Boltcall lane left to right, pausing at five stations; a second, muted
// lead card crawls a parallel lane behind it, stalls, and fades out. Every
// readable string is a projected HTML label, not a canvas texture. Geometry
// is procedural only: no models, no images.

export type StationId = 'lead-in' | 'instant-answer' | 'qualify' | 'book' | 'job-won'

declare global {
  interface Window {
    __machineDebug?: { getState: () => Record<string, unknown> }
  }
}

export function initMachineScene(root: HTMLElement): () => void {
  const cleanups: Array<() => void> = []
  const listen = (target: EventTarget, type: string, handler: (event: never) => void) => {
    const fn = handler as unknown as EventListener
    target.addEventListener(type, fn)
    cleanups.push(() => target.removeEventListener(type, fn))
  }
  function $<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = root.querySelector<T>(`#${id}`)
    if (!el) throw new Error(`Scene markup is missing #${id}`)
    return el
  }
  function showError(message?: string) {
    $('loading').classList.add('done')
    $('error').style.display = 'block'
    if (message) $('error').querySelector('p')!.textContent = message
  }
  const dispose = () => {
    for (const fn of cleanups.reverse()) fn()
    cleanups.length = 0
  }
  try {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 100)
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch (e) {
      showError('WebGL is not available. Turn on hardware acceleration in your browser settings and reload the page.')
      throw e
    }
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 900 ? 1.5 : 1.75))
    renderer.setSize(innerWidth, innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    $('scene').appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 8
    controls.maxDistance = 26
    controls.minPolarAngle = 0.5
    controls.maxPolarAngle = 1.3
    controls.rotateSpeed = 0.45
    controls.enableDamping = !reduceMotion

    // Simple three-point lighting — no environment map, no clipping planes.
    scene.add(new THREE.HemisphereLight(0xdbe5f4, 0x191d24, 1.7))
    const key = new THREE.DirectionalLight(0xffffff, 3.1)
    key.position.set(-4, 11, 6)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 0.5, far: 30 })
    key.shadow.radius = 6
    key.shadow.bias = -0.0003
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x9db8ff, 1.3)
    rim.position.set(7, 5, -5)
    scene.add(rim)
    const fill = new THREE.DirectionalLight(0xffffff, 0.55)
    fill.position.set(2, 4, 9)
    scene.add(fill)

    // ---- Materials: soft, low-metalness, few colors ----------------------
    const mat = (color: number, metalness = 0.08, roughness = 0.6, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra })
    const M = {
      body: mat(0x2b3340, 0.12, 0.55),
      ivory: mat(0xece9e1, 0.04, 0.65),
      blue: mat(0x2563eb, 0.1, 0.35, { emissive: 0x2563eb, emissiveIntensity: 0.35 }),
      blueGlow: mat(0x2563eb, 0.05, 0.3, { emissive: 0x2563eb, emissiveIntensity: 1.6 }),
      chrome: mat(0xcfd5da, 0.4, 0.32),
      grey: mat(0x565b63, 0.08, 0.75),
      greyGlow: mat(0x7a8087, 0.05, 0.6, { emissive: 0x4a4e54, emissiveIntensity: 0.7 }),
      dark: mat(0x14171c, 0.1, 0.6),
    }

    // ---- Geometry helpers --------------------------------------------------
    const geometries = new Map<string, THREE.BufferGeometry>()
    function boxGeo(w: number, h: number, d: number, r = 0.06) {
      const k = `b${w},${h},${d},${r}`
      if (!geometries.has(k))
        geometries.set(k, r ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d))
      return geometries.get(k)!
    }
    function box(
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      m: THREE.Material = M.body,
      r = 0.06
    ) {
      const o = new THREE.Mesh(boxGeo(w, h, d, r), m)
      o.position.set(x, y, z)
      o.castShadow = true
      o.receiveShadow = true
      parent.add(o)
      return o
    }
    function cyl(
      parent: THREE.Object3D,
      r: number,
      h: number,
      x: number,
      y: number,
      z: number,
      m: THREE.Material = M.chrome,
      segments = 28
    ) {
      const k = `c${r},${h},${segments}`
      if (!geometries.has(k)) geometries.set(k, new THREE.CylinderGeometry(r, r, h, segments))
      const o = new THREE.Mesh(geometries.get(k)!, m)
      o.position.set(x, y, z)
      o.castShadow = true
      o.receiveShadow = true
      parent.add(o)
      return o
    }
    function tube(parent: THREE.Object3D, pts: [number, number, number][], r: number, m: THREE.Material = M.chrome) {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)))
      const o = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, pts.length * 7), r, 8, false), m)
      o.castShadow = true
      parent.add(o)
      return o
    }

    const machine = new THREE.Group()
    scene.add(machine)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.22 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // ---- Layout -------------------------------------------------------------
    const LANE_A_Z = 0 // Boltcall
    const LANE_B_Z = -3.4 // "Your business today" — well behind lane A so it never hides behind it
    const START_X = -6.3
    const FINISH_X = 6.3
    const STATION_X = [-3.7, -1.85, 0, 1.85, 3.7]
    const LANE_B_STOP_X = -2.6
    const BELT_LENGTH = 13.4

    // A belt is a track + two chrome side rails + an instanced strip of
    // slats that slide along it (updated per frame in animate()).
    const beltDummy = new THREE.Object3D()
    function belt(z: number, trackMat: THREE.Material, railMat: THREE.Material, slatMat: THREE.Material) {
      const g = new THREE.Group()
      g.position.set(0, 0, z)
      machine.add(g)
      box(g, BELT_LENGTH, 0.12, 1.5, 0, 0, 0, trackMat, 0.07)
      for (const side of [-1, 1]) box(g, BELT_LENGTH, 0.05, 0.05, 0, 0.095, side * 0.7, railMat, 0.02)
      const count = 26
      const slats = new THREE.InstancedMesh(boxGeo(0.14, 0.03, 1.2, 0.01), slatMat, count)
      slats.receiveShadow = true
      slats.castShadow = false
      g.add(slats)
      return { slats, count }
    }
    const beltA = belt(LANE_A_Z, M.body, M.chrome, M.dark)
    const beltB = belt(LANE_B_Z, M.dark, M.grey, M.dark)
    function updateBeltSlats(b: { slats: THREE.InstancedMesh; count: number }, offset: number) {
      const spacing = BELT_LENGTH / b.count
      for (let i = 0; i < b.count; i++) {
        const local = (((i * spacing + offset) % BELT_LENGTH) + BELT_LENGTH) % BELT_LENGTH
        beltDummy.position.set(START_X - 0.7 + local, 0.075, 0)
        beltDummy.rotation.set(0, 0, 0)
        beltDummy.updateMatrix()
        b.slats.setMatrixAt(i, beltDummy.matrix)
      }
      b.slats.instanceMatrix.needsUpdate = true
    }

    function gate(x: number, z: number, m: THREE.Material) {
      const g = new THREE.Group()
      g.position.set(x, 0, z)
      machine.add(g)
      for (const side of [-1, 1]) box(g, 0.14, 1.5, 0.14, 0, 0.75, side * 0.72, m, 0.06)
      box(g, 0.14, 0.14, 1.58, 0, 1.42, 0, m, 0.06)
      return g
    }
    gate(START_X, LANE_A_Z, M.ivory)
    gate(FINISH_X, LANE_A_Z, M.blue)

    // ---- Three source stations merging into "Capture the lead" ------------
    // Text / Voice / Website+Ads: each is a small station with its own set
    // of 3D extruded-icon signage and its own moving rail (same instanced-
    // slat system as the main belts), converging on the start gate like a
    // trident. The traveling lead spawns on whichever source is "live" that
    // loop (feedIndex, with the rest of the playback state below) and eases
    // onto the main lane as it approaches the start gate.
    type Feed = { id: 'text' | 'voice' | 'website'; z: number; name: string; icons: { svg: string; color: number }[] }
    const FEED_ORIGIN_X = START_X - 3.1
    const FEEDS: Feed[] = [
      {
        id: 'text',
        z: 1.35,
        name: 'Text',
        icons: [
          { svg: ICON.sms, color: 0x2563eb },
          { svg: ICON.whatsapp, color: 0x25d366 },
          { svg: ICON.messenger, color: 0x0084ff },
          { svg: ICON.instagram, color: 0xe4405f },
        ],
      },
      {
        id: 'voice',
        z: 2.55,
        name: 'Voice',
        icons: [
          { svg: ICON.phone, color: 0x2563eb },
          { svg: ICON.phoneMissed, color: 0x2563eb },
          { svg: ICON.voicemail, color: 0x2563eb },
        ],
      },
      {
        id: 'website',
        z: 3.75,
        name: 'Website + Ads',
        icons: [
          { svg: ICON.form, color: 0x2563eb },
          { svg: ICON.chat, color: 0x2563eb },
          { svg: ICON.googleAds, color: 0x4285f4 },
          { svg: ICON.meta, color: 0x0668e1 },
        ],
      },
    ]
    const feedIconGroups: THREE.Group[] = []
    const feedIcons: { m: THREE.Mesh; seed: number }[] = []
    const feedRails: { slats: THREE.InstancedMesh; count: number; dx: number; dz: number; len: number; z: number }[] = []
    FEEDS.forEach((feed, fi) => {
      const dx = START_X - FEED_ORIGIN_X,
        dz = LANE_A_Z - feed.z,
        len = Math.hypot(dx, dz),
        angle = Math.atan2(-dz, dx)
      const rail = box(machine, len, 0.07, 0.4, (FEED_ORIGIN_X + START_X) / 2, 0.02, (feed.z + LANE_A_Z) / 2, M.dark, 0.03)
      rail.rotation.y = angle
      const count = 6
      const slats = new THREE.InstancedMesh(boxGeo(0.09, 0.025, 0.24, 0.008), M.chrome, count)
      slats.castShadow = false
      machine.add(slats)
      feedRails.push({ slats, count, dx, dz, len, z: feed.z })

      const platform = new THREE.Group()
      platform.position.set(FEED_ORIGIN_X, 0, feed.z)
      machine.add(platform)
      box(platform, 1.0, 0.14, 1.0, 0, 0.07, 0, M.ivory, 0.1)
      cyl(platform, 0.05, 0.4, 0, 0.34, 0, M.chrome)
      const iconGroup = new THREE.Group()
      iconGroup.position.set(0, 0.72, 0)
      platform.add(iconGroup)
      feedIconGroups.push(iconGroup)
      feed.icons.forEach((ic, i) => {
        const m = iconMesh(ic.svg, ic.color)
        m.position.x = (i - (feed.icons.length - 1) / 2) * 0.27
        iconGroup.add(m)
        feedIcons.push({ m, seed: fi * 4 + i })
      })
    })
    function updateFeedSlats(fr: (typeof feedRails)[number], offset: number) {
      const spacing = fr.len / fr.count
      for (let i = 0; i < fr.count; i++) {
        const local = (((i * spacing + offset) % fr.len) + fr.len) % fr.len
        const f = local / fr.len
        beltDummy.position.set(FEED_ORIGIN_X + fr.dx * f, 0.065, fr.z + fr.dz * f)
        beltDummy.rotation.set(0, Math.atan2(-fr.dz, fr.dx), 0)
        beltDummy.updateMatrix()
        fr.slats.setMatrixAt(i, beltDummy.matrix)
      }
      fr.slats.instanceMatrix.needsUpdate = true
    }

    // ---- Stations (Boltcall lane only) --------------------------------------
    type Station = { id: StationId; name: string; step: number; x: number }
    const STATIONS: Station[] = [
      { id: 'lead-in', name: 'Capture', step: 1, x: STATION_X[0] },
      { id: 'instant-answer', name: 'Respond', step: 2, x: STATION_X[1] },
      { id: 'qualify', name: 'Qualify', step: 3, x: STATION_X[2] },
      { id: 'book', name: 'Book', step: 4, x: STATION_X[3] },
      { id: 'job-won', name: 'Confirmed', step: 5, x: STATION_X[4] },
    ]
    const stationGlow: THREE.MeshStandardMaterial[] = []
    const ringPulses: THREE.Mesh[] = []
    const typingDots: { m: THREE.Mesh; baseY: number }[] = []

    function riser(x: number) {
      const g = new THREE.Group()
      g.position.set(x, 0, LANE_A_Z)
      machine.add(g)
      box(g, 1.3, 0.16, 1.3, 0, 0.08, 0, M.ivory, 0.1)
      return g
    }

    // 1. Lead In — phone on a stand, with a ringing pulse.
    {
      const g = riser(STATION_X[0])
      cyl(g, 0.32, 0.5, 0, 0.32, 0, M.ivory, 24)
      box(g, 0.62, 1.0, 0.1, 0, 1.0, 0, M.body, 0.16)
      const face = box(g, 0.5, 0.82, 0.02, 0, 1.02, 0.06, M.blue, 0.1)
      face.material = (face.material as THREE.MeshStandardMaterial).clone()
      stationGlow.push(face.material as THREE.MeshStandardMaterial)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.44, 0.48, 40),
        new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
      )
      ring.position.set(STATION_X[0], 1.0, LANE_A_Z + 0.07)
      machine.add(ring)
      ringPulses.push(ring)
    }
    // 2. Instant Answer — speaker puck + a rounded chat bubble with 3 typing dots.
    {
      const g = riser(STATION_X[1])
      cyl(g, 0.4, 0.4, 0, 0.28, 0, M.ivory, 24)
      box(g, 0.98, 0.78, 0.4, 0, 0.98, 0, M.body, 0.36)
      const tail = box(g, 0.24, 0.24, 0.26, -0.3, 0.58, 0.1, M.body, 0.08)
      tail.rotation.z = Math.PI / 4
      const face = box(g, 0.78, 0.56, 0.05, 0, 0.98, 0.21, M.blue, 0.28)
      face.material = (face.material as THREE.MeshStandardMaterial).clone()
      stationGlow.push(face.material as THREE.MeshStandardMaterial)
      for (let i = 0; i < 3; i++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), M.ivory)
        dot.position.set(-0.2 + i * 0.2, 0.98, 0.25)
        dot.castShadow = true
        g.add(dot)
        typingDots.push({ m: dot, baseY: 0.98 })
      }
    }
    // 3. Qualify — a clipboard.
    {
      const g = riser(STATION_X[2])
      const board = new THREE.Group()
      board.position.set(0, 0.95, 0)
      board.rotation.x = -0.22
      g.add(board)
      box(board, 1.15, 1.5, 0.08, 0, 0, 0, M.ivory, 0.1)
      box(board, 0.42, 0.13, 0.09, 0, 0.72, 0.05, M.chrome, 0.04)
    }
    // 4. Book — a light desk calendar: ring binders on top, a date grid on
    // the face, one cell lit blue for "today".
    {
      const g = riser(STATION_X[3])
      box(g, 1.1, 1.0, 0.55, 0, 0.62, 0, M.ivory, 0.12)
      for (const dx of [-0.4, -0.13, 0.13, 0.4]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 20), M.chrome)
        ring.rotation.y = Math.PI / 2
        ring.position.set(dx, 1.16, 0)
        g.add(ring)
      }
      box(g, 0.9, 0.78, 0.03, 0, 0.62, 0.29, M.dark, 0.06)
      let todayFace: THREE.Mesh | undefined
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++) {
          const today = row === 0 && col === 1
          const cell = box(g, 0.24, 0.2, 0.02, -0.3 + col * 0.3, 0.9 - row * 0.26, 0.31, today ? M.blue : M.ivory, 0.03)
          if (today) todayFace = cell
        }
      todayFace!.material = (todayFace!.material as THREE.MeshStandardMaterial).clone()
      stationGlow.push(todayFace!.material as THREE.MeshStandardMaterial)
    }
    // 5. Job Won — a trophy: a stepped base, a stem, a curved goblet cup
    // (lathed, not a cone) and two handles that clearly stick out past it.
    {
      const g = riser(STATION_X[4])
      box(g, 0.72, 0.14, 0.62, 0, 0.3, 0, M.ivory, 0.08)
      box(g, 0.52, 0.12, 0.44, 0, 0.42, 0, M.body, 0.06)
      cyl(g, 0.05, 0.5, 0, 0.72, 0, M.chrome)
      const cupProfile = [
        [0.04, 0.0],
        [0.07, 0.04],
        [0.2, 0.16],
        [0.36, 0.36],
        [0.43, 0.52],
        [0.4, 0.6],
        [0.44, 0.64],
      ].map(([r, y]) => new THREE.Vector2(r, y))
      const cup = new THREE.Mesh(new THREE.LatheGeometry(cupProfile, 32), M.blue)
      cup.position.set(0, 0.97, 0)
      cup.castShadow = true
      g.add(cup)
      cup.material = (cup.material as THREE.MeshStandardMaterial).clone()
      stationGlow.push(cup.material as THREE.MeshStandardMaterial)
      const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.024, 8, 28), M.chrome)
      rimMesh.rotation.x = Math.PI / 2
      rimMesh.position.set(0, 1.61, 0)
      g.add(rimMesh)
      for (const side of [-1, 1])
        tube(
          g,
          [
            [side * 0.4, 1.28, 0],
            [side * 0.76, 1.42, 0],
            [side * 0.76, 1.58, 0],
            [side * 0.42, 1.68, 0],
          ],
          0.046,
          M.chrome
        )
    }

    // ---- Lane B stall marker --------------------------------------------
    const stallMarker = new THREE.Group()
    stallMarker.position.set(LANE_B_STOP_X, 0, LANE_B_Z)
    machine.add(stallMarker)
    box(stallMarker, 0.9, 0.12, 0.9, 0, 0.06, 0, M.dark, 0.08)
    cyl(stallMarker, 0.05, 0.85, 0, 0.5, 0, M.grey)

    // ---- The two traveling lead cards --------------------------------------
    const leadAMat = M.blueGlow.clone()
    leadAMat.transparent = true
    const leadA = new THREE.Group()
    machine.add(leadA)
    const leadACard = box(leadA, 0.5, 0.32, 0.06, 0, 0, 0, leadAMat, 0.1)
    leadACard.castShadow = true

    const leadBMat = M.greyGlow.clone()
    leadBMat.transparent = true
    const leadB = new THREE.Group()
    machine.add(leadB)
    const leadBCard = box(leadB, 0.46, 0.3, 0.06, 0, 0, 0, leadBMat, 0.1)
    leadBCard.castShadow = true

    // ---- Timeline (seconds) ------------------------------------------------
    // Compressed illustrative playback, not measured product response time.
    // Play once and keep the final booking visible until Replay is selected.
    const CYCLE = 12
    const laneAKeys: [number, number][] = [
      [0, START_X],
      [0.6, STATION_X[0]],
      [1.8, STATION_X[0]],
      [2.4, STATION_X[1]],
      [3.6, STATION_X[1]],
      [4.2, STATION_X[2]],
      [5.4, STATION_X[2]],
      [6.0, STATION_X[3]],
      [7.2, STATION_X[3]],
      [7.8, STATION_X[4]],
      [9.0, STATION_X[4]],
      [9.6, FINISH_X],
      [12.0, FINISH_X],
    ]
    const laneBKeys: [number, number][] = [
      [0, START_X],
      [9, LANE_B_STOP_X],
      [10.5, LANE_B_STOP_X],
    ]
    const PAUSES: { id: StationId; t0: number; t1: number }[] = [
      { id: 'lead-in', t0: 0.6, t1: 1.8 },
      { id: 'instant-answer', t0: 2.4, t1: 3.6 },
      { id: 'qualify', t0: 4.2, t1: 5.4 },
      { id: 'book', t0: 6.0, t1: 7.2 },
      { id: 'job-won', t0: 7.8, t1: 9.0 },
    ]
    const CAPTIONS: Record<StationId, string> = {
      'lead-in': 'Mike asks for help with a burst pipe. Inquiry captured.',
      'instant-answer': 'Boltcall: “Hi Mike, I’m the AI assistant. I can help arrange a visit.”',
      qualify: 'Boltcall checks the request, urgency and service address.',
      book: 'Mike accepts an available appointment. Booking confirmed.',
      'job-won': 'Appointment booked. Confirmation and details sent to the team.',
    }
    // The lead-in caption names the channel it just arrived from — the
    // channel rotates every loop (text, voice, website + ads).
    const FEED_CAPTIONS: Record<Feed['id'], string> = {
      text: 'Inquiry via text: Mike needs help with a burst pipe.',
      voice: 'Inquiry via a missed call: Mike needs help with a burst pipe.',
      website: 'Inquiry via a website or ad form: Mike needs help with a burst pipe.',
    }
    function sampleKeys(keys: [number, number][], t: number) {
      for (let i = 0; i < keys.length - 1; i++) {
        const [t0, x0] = keys[i],
          [t1, x1] = keys[i + 1]
        if (t <= t1) {
          const f = t1 > t0 ? THREE.MathUtils.smoothstep((t - t0) / (t1 - t0), 0, 1) : 1
          return THREE.MathUtils.lerp(x0, x1, f)
        }
      }
      return keys[keys.length - 1][1]
    }

    // ---- Projected HTML labels ---------------------------------------------
    const labelsRoot = $('labels')
    // Station pills carry a numbered dot plus a name (the name hides at
    // narrow widths via CSS — the number alone still says "step 3 is here").
    function makeBadge(text: string, num: number | null, muted: boolean) {
      const el = document.createElement('div')
      el.className = 'badge' + (muted ? ' muted' : '')
      el.innerHTML = num
        ? `<div class="badge-pill"><span class="num">${num}</span><span class="name">${text}</span></div>`
        : `<div class="badge-pill">${text}</div>`
      labelsRoot.appendChild(el)
      cleanups.push(() => el.remove())
      return el
    }
    const stationBadges = STATIONS.map((s) => ({
      el: makeBadge(s.name, s.step, false),
      anchor: new THREE.Vector3(s.x, 4.3, LANE_A_Z),
    }))
    const gateBadges = [
      // "Lead comes in" is dropped here — station 1, "Capture the lead", now
      // says that job right where the three sources actually merge.
      { el: makeBadge('Appointment booked', null, false), anchor: new THREE.Vector3(FINISH_X, 0.95, LANE_A_Z) },
      { el: makeBadge('Boltcall', null, false), anchor: new THREE.Vector3(START_X, 4.3, LANE_A_Z) },
      { el: makeBadge('Slow follow-up · example', null, true), anchor: new THREE.Vector3(START_X, 0.5, LANE_B_Z) },
    ]
    const feedBadges = FEEDS.map((feed) => ({
      el: makeBadge(feed.name, null, false),
      anchor: new THREE.Vector3(FEED_ORIGIN_X, 1.35, feed.z),
    }))
    const allBadges = [...stationBadges, ...gateBadges, ...feedBadges]

    const captionA = $('caption-a')
    const captionAText = $('caption-a-text')
    const captionB = $('caption-b')
    const captionBText = $('caption-b-text')
    const stopwatch = $('stopwatch')
    const statIn = $('stat-in')
    const statBooked = $('stat-booked')
    const statCaptured = $('stat-captured')
    const statLost = $('stat-lost')

    const projected = new THREE.Vector3()
    let width = innerWidth,
      height = innerHeight,
      mobile = width <= 900
    function project(pos: THREE.Vector3) {
      projected.copy(pos).project(camera)
      const margin = mobile ? 112 : 150
      return {
        x: THREE.MathUtils.clamp((projected.x * 0.5 + 0.5) * width, margin, width - margin),
        y: (-projected.y * 0.5 + 0.5) * height,
        inFront: projected.z < 1,
      }
    }
    function placeBadge(el: HTMLDivElement, anchor: THREE.Vector3) {
      const p = project(anchor)
      el.classList.toggle('visible', p.inFront)
      el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%, -100%)`
    }

    // ---- Camera: static framing that always shows the whole belt ----------
    // Desktop: a wide 3/4 view — belt length maps to screen width, both
    // gates always in frame. Mobile: the camera sits out past one end of
    // the belt looking back down its length, so belt-length (the dominant
    // 14-unit dimension) maps to screen HEIGHT (the dominant dimension on a
    // portrait phone) instead of fighting a narrow horizontal FOV — the two
    // lanes land side by side on screen. No tracking/panning: a fixed frame
    // can't lose the start gate, and there is nothing to desync on resize.
    // Target + distance widened to also fit the three feed rails (which
    // extend left of the start gate and spread further in z than lane B).
    const camTarget = new THREE.Vector3(-1.5, 1.2, 0.2)
    const camOffset = new THREE.Vector3()
    function setCamOffset() {
      if (mobile) camOffset.set(15.5, 8.6, 1.8)
      else camOffset.set(-3.2, 8.4, 18.8)
    }
    function layout() {
      width = innerWidth
      height = innerHeight
      mobile = width <= 900
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.zoom = mobile ? 0.62 : 1
      camera.updateProjectionMatrix()
      setCamOffset()
      camera.position.copy(camTarget).add(camOffset)
      controls.target.copy(camTarget)
      controls.update()
    }
    layout()
    listen(window, 'resize', layout)

    // ---- Playback state -----------------------------------------------------
    let playing = false,
      simTime = reduceMotion ? 11.6 : 0.35,
      feedIndex = 0,
      visible = true,
      contextLost = false,
      lastFrame = performance.now()

    function syncPlayback() {
      const b = $('play')
      b.setAttribute('aria-label', playing ? 'Pause the animation' : simTime >= CYCLE ? 'Replay the animation' : 'Play the animation')
      b.setAttribute('aria-pressed', String(!playing))
      b.innerHTML = playing
        ? '<svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="2" y="1" width="2.5" height="10" rx=".5"/><rect x="7.5" y="1" width="2.5" height="10" rx=".5"/></svg>Pause'
        : '<svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M3 1l8 5-8 5z"/></svg>Play'
      $('status').classList.toggle('paused', !playing)
      $('status-text').textContent = playing ? 'Simulation running' : simTime >= CYCLE ? 'Appointment booked' : 'Select a step or press Play'
    }
    listen($('play'), 'click', () => {
      if (simTime >= CYCLE) simTime = 0.35
      playing = !playing
      syncPlayback()
    })
    listen($('replay'), 'click', () => {
      simTime = 0.35
      playing = true
      syncPlayback()
    })
    function seek(time: number) {
      simTime = time
      playing = false
      syncPlayback()
      updateStats()
    }
    listen($('step-inquiry'), 'click', () => seek(1.0))
    listen($('step-response'), 'click', () => seek(3.0))
    listen($('step-booked'), 'click', () => seek(11.6))
    listen($('rail-source'), 'change', () => {
      feedIndex = Number($<HTMLSelectElement>('rail-source').value)
      seek(0.35)
    })
    syncPlayback()
    updateStats()

    function formatTime(t: number) {
      const s = Math.max(0, t)
      return `Demo 0:${s < 10 ? '0' : ''}${s.toFixed(1)}`
    }
    function updateStats() {
      statIn.textContent = '1'
      statBooked.textContent = simTime >= 6.0 ? '1' : '0'
      statCaptured.textContent = simTime >= 2.4 ? '1' : '0'
      statLost.textContent = simTime > 9 ? 'Unanswered' : 'Waiting'
      const stage = simTime < 2.4 ? 0 : simTime < 6 ? 1 : 2
      ;['step-inquiry', 'step-response', 'step-booked'].forEach((id, index) => {
        if (index === stage) $(id).setAttribute('aria-current', 'step')
        else $(id).removeAttribute('aria-current')
      })
      const status = stage === 0 ? FEED_CAPTIONS[FEEDS[feedIndex].id] : stage === 1 ? CAPTIONS['instant-answer'] : CAPTIONS['job-won']
      if ($('journey-status').textContent !== status) $('journey-status').textContent = status
    }

    listen(document, 'visibilitychange', () => {
      visible = !document.hidden
      if (!visible) { playing = false; syncPlayback() }
      lastFrame = performance.now()
    })
    listen(window.matchMedia('(prefers-reduced-motion: reduce)'), 'change', (event: MediaQueryListEvent) => {
      if (event.matches) { playing = false; controls.enableDamping = false; syncPlayback() }
    })
    listen(renderer.domElement, 'webglcontextlost', (e: Event) => {
      e.preventDefault()
      contextLost = true
      playing = false
      syncPlayback()
      showError('The graphics context was interrupted. The scene comes back on its own once WebGL is available again.')
    })
    listen(renderer.domElement, 'webglcontextrestored', () => {
      contextLost = false
      $('error').style.display = 'none'
      lastFrame = performance.now()
    })

    let rafId = 0
    function animate(now: number) {
      rafId = requestAnimationFrame(animate)
      const dt = Math.max(0, Math.min((now - lastFrame) / 1000, 0.05))
      lastFrame = now
      if (!visible || contextLost) return
      if (playing) {
        simTime = Math.min(CYCLE, simTime + dt)
        if (simTime >= CYCLE) { playing = false; syncPlayback() }
      }
      const t = simTime
      const feed = FEEDS[feedIndex]
      updateStats()

      // Belts: lane A slides steadily, lane B stutters along much slower.
      updateBeltSlats(beltA, simTime * 2.4)
      updateBeltSlats(beltB, Math.floor(simTime * 2.6) / 2.6)
      feedRails.forEach((fr) => updateFeedSlats(fr, simTime * 2.4))

      // Source-station icons idle-bob and slow-rotate; the icon row for
      // whichever source is firing this loop pulses while its lead spawns.
      feedIcons.forEach(({ m, seed }) => {
        m.position.y = Math.sin(t * 1.6 + seed) * 0.035
        if (playing && !reduceMotion) m.rotation.y += dt * 0.5
      })
      feedIconGroups.forEach((g, i) => {
        const active = i === feedIndex && t < 0.9
        const target = active ? 1.18 + Math.sin(t * 14) * 0.06 : 1
        g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, target, 1 - Math.exp(-dt * 8)))
      })

      // Lane A (Boltcall). The card spawns on this cycle's source station,
      // rides that rail in, and merges onto the main lane — both x and z
      // ease from the feed's platform to the main line by the time it
      // reaches "Capture the lead".
      const mergeF = THREE.MathUtils.smoothstep(Math.min(t, 0.6), 0, 0.6)
      const ax = THREE.MathUtils.lerp(FEED_ORIGIN_X, sampleKeys(laneAKeys, t), mergeF)
      const az = THREE.MathUtils.lerp(feed.z, LANE_A_Z, mergeF)
      leadA.position.set(ax, 2.15 + Math.sin(t * 6) * 0.03, az)
      const aFade = t < 0.3 ? t / 0.3 : t > 12.0 ? Math.max(0, 1 - (t - 12.0) / 0.6) : 1
      leadAMat.opacity = aFade

      // Lane B (today) — crawls once to the stall point, holds, fades.
      const bx = sampleKeys(laneBKeys, Math.min(t, 10.5))
      leadB.position.set(bx, 1.55, LANE_B_Z)
      const bFade = t < 0.3 ? t / 0.3 : t > 10.5 ? Math.max(0, 1 - (t - 10.5) / 1.0) : 1
      leadBMat.opacity = bFade

      // Station glow + waveform + ringing pulse.
      const activePause = PAUSES.find((p) => t >= p.t0 - 0.3 && t <= p.t1 + 0.1)
      const activeIndex = activePause ? STATIONS.findIndex((s) => s.id === activePause.id) : -1
      stationGlow.forEach((m, i) => {
        m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, [0, 1, 3, 4][i] === activeIndex ? 2.0 : 0.35, 1 - Math.exp(-dt * 6))
      })
      typingDots.forEach(({ m, baseY }, i) => {
        m.position.y = baseY + Math.max(0, Math.sin(t * 4 - i * 0.6)) * 0.05
      })
      ringPulses.forEach((ring) => {
        const p = (t % 1.6) / 1.6
        ring.scale.setScalar(1 + p * 2.2)
        ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - p)
      })

      // Caption follows the lead; the confirmed outcome remains readable.
      if (activePause) {
        captionAText.textContent = activePause.id === 'lead-in' ? FEED_CAPTIONS[feed.id] : CAPTIONS[activePause.id]
        captionA.classList.add('visible')
      } else if (t >= 9.6) {
        captionAText.textContent = CAPTIONS['job-won']
        captionA.classList.add('visible')
      } else {
        captionA.classList.remove('visible')
      }
      const capA = project(new THREE.Vector3(ax, 2.75, az))
      captionA.style.transform = `translate(${capA.x}px,${capA.y}px) translate(-50%, -112%)`

      if (t > 10.5) {
        captionBText.textContent = 'Still waiting for a response · illustrative'
        captionB.classList.add('visible')
      } else if (t > 9) {
        captionBText.textContent = 'Voicemail — call back tomorrow'
        captionB.classList.add('visible')
      } else {
        captionB.classList.remove('visible')
      }
      const capB = project(new THREE.Vector3(bx, 2.05, LANE_B_Z))
      captionB.style.transform = `translate(${capB.x}px,${capB.y}px) translate(-50%, -112%)`

      const swT = Math.min(t, 12)
      stopwatch.textContent = formatTime(swT)
      // Hidden during the brief spawn/merge window — at that point it would
      // sit right on top of the firing source station's own name badge.
      stopwatch.classList.toggle('visible', t > 0.5 && t < 12.6)
      const sw = project(new THREE.Vector3(ax, 1.78, az))
      stopwatch.style.transform = `translate(${sw.x}px,${sw.y}px) translate(-50%, -100%)`

      allBadges.forEach(({ el, anchor }) => placeBadge(el, anchor))

      controls.update(dt)

      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(animate)

    cleanups.push(() => {
      cancelAnimationFrame(rafId)
      controls.dispose()
      const textures = new Set<THREE.Texture>()
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const list = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : []
        for (const material of list) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
          material.dispose()
        }
      })
      geometries.forEach((g) => g.dispose())
      textures.forEach((t) => t.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    })
    renderer.compile(scene, camera)
    $('loading').classList.add('done')
    $('error').style.display = 'none'

    Object.defineProperty(window, '__machineDebug', {
      value: { getState: () => ({ playing, time: simTime, feedIndex, booked: simTime >= 6, width, height }) },
      configurable: true,
    })
    cleanups.push(() => {
      delete window.__machineDebug
    })
  } catch (error) {
    console.error('Machine: failed to start', error)
    showError()
  }
  return dispose
}

