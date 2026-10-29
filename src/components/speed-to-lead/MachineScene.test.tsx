import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const mocks = { render: vi.fn(), dispose: vi.fn(), forceContextLoss: vi.fn(), compile: vi.fn(), clear: vi.fn() };
// Only the GPU boundary is mocked; real geometry, camera and playback run.
vi.doMock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>();
  return { ...actual, WebGLRenderer: class {
    domElement = document.createElement('canvas');
    shadowMap = { enabled: false, type: 0 };
    setClearColor = mocks.clear; setPixelRatio = vi.fn(); setSize = vi.fn();
    render = mocks.render; compile = mocks.compile;
    dispose = mocks.dispose; forceContextLoss = mocks.forceContextLoss;
  } };
});
const { MachineScene } = await import('./MachineScene');
let frames: Map<number, FrameRequestCallback>, now = 0, frameId = 0;
function frame() {
  now += 50;
  const callbacks = [...frames.values()]; frames.clear();
  callbacks.forEach(callback => callback(now));
}

describe('light-mode 3D film', () => {
  beforeEach(() => {
    vi.clearAllMocks(); frames = new Map(); now = 0; frameId = 0;
    vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.spyOn(window, 'matchMedia').mockImplementation(query => Object.assign(new EventTarget(), { matches: false, media: query } as MediaQueryList));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('starts automatically on white with five stations and three input rails', () => {
    const { container } = render(<MachineScene />); frame();
    expect(mocks.clear).toHaveBeenCalledWith(0xffffff, 1);
    expect(window.__machineDebug?.getState().playing).toBe(true);
    expect(screen.getByRole('button', { name: 'Pause the animation' })).toBeVisible();
    const scene = mocks.compile.mock.calls[0][0] as import('three').Scene;
    expect(['inquiry', 'response', 'qualify', 'booked', 'confirmed'].every(name => scene.getObjectByName(name))).toBe(true);
    expect(['text', 'voice', 'website'].every(name => scene.getObjectByName(`source-${name}`))).toBe(true);
    expect(container.querySelectorAll('.station-label, .source-label, header, footer, nav, select, #progress, #time')).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('demo-sr-only');
    expect(screen.getByRole('status')).toHaveClass('demo-sr-only');
    expect(container.querySelector('#demo-description')).toHaveTextContent('Simulation only');
    expect(container.querySelector('#loading')).toHaveClass('done');
    expect(container.querySelector('#stats')).toBeNull();
    expect(container.textContent).not.toContain('Slow follow-up');
  });

  it('moves the inquiry left to right and holds the booked outcome after one play', () => {
    render(<MachineScene />);
    const start = window.__machineDebug?.getState().leadX as number;
    for (let i = 0; i < 100; i++) frame();
    expect(window.__machineDebug?.getState().leadX).toBeGreaterThan(start);
    for (let i = 0; i < 190; i++) frame();
    for (let i = 0; i < 80; i++) frame();
    expect(window.__machineDebug?.getState()).toMatchObject({ playing: false, time: 18, booked: true });
    expect(screen.getByRole('status')).toHaveTextContent('Appointment booked');
    expect(document.querySelector('#replay')).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Replay the animation' }));
    expect(window.__machineDebug?.getState()).toMatchObject({ playing: true, time: 0, source: 'voice' });
  });

  it('preserves the immediate response and booking stages and replays from the left', () => {
    render(<MachineScene />);
    for (let i = 0; i < 120; i++) frame();
    expect(window.__machineDebug?.getState()).toMatchObject({ playing: true });
    expect(screen.getByRole('status')).toHaveTextContent('Boltcall replies immediately');
    for (let i = 0; i < 140; i++) frame();
    expect(window.__machineDebug?.getState().booked).toBe(true);
    fireEvent.click(document.querySelector('#replay')!);
    expect(window.__machineDebug?.getState()).toMatchObject({ playing: true, time: 0, booked: false, leadX: -9.6 });
  });

  it('supports pause, page visibility and clean resource disposal', () => {
    const { unmount } = render(<MachineScene />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause the animation' }));
    frame(); expect(window.__machineDebug?.getState().time).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Play the animation' }));
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(window.__machineDebug?.getState().playing).toBe(false);
    unmount();
    expect(frames.size).toBe(0);
    expect(mocks.dispose).toHaveBeenCalledOnce();
    expect(window.__machineDebug).toBeUndefined();
  });

  it('shows the complete story without autoplay for reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(query => Object.assign(new EventTarget(), { matches: query.includes('prefers-reduced-motion'), media: query } as MediaQueryList));
    render(<MachineScene />); frame();
    expect(window.__machineDebug?.getState()).toMatchObject({ playing: false, time: 18, booked: true });
    expect(screen.getByRole('status')).toHaveTextContent('Appointment booked');
  });

  it('keeps the camera facing a horizontal left-to-right rail on mobile', async () => {
    vi.stubGlobal('innerWidth', 390); vi.stubGlobal('innerHeight', 844);
    render(<MachineScene />); frame();
    expect(window.__machineDebug?.getState().mobile).toBe(true);
    const camera = mocks.render.mock.calls[0][1] as import('three').OrthographicCamera;
    const { Vector3 } = await import('three');
    const left = new Vector3(-4, .5, 0).project(camera);
    const right = new Vector3(0, .5, 0).project(camera);
    expect(right.x).toBeGreaterThan(left.x);
    expect(right.y).toBeCloseTo(left.y, 5);
  });

  it('moves actual belt slats to the right and freezes them only when paused', async () => {
    render(<MachineScene />);
    const { Matrix4 } = await import('three');
    const scene = mocks.compile.mock.calls[0][0] as import('three').Scene;
    const belt = scene.children.find(object => (object as import('three').InstancedMesh).isInstancedMesh) as import('three').InstancedMesh;
    const before = new Matrix4(), after = new Matrix4();
    belt.getMatrixAt(10, before);
    for (let i = 0; i < 10; i++) frame();
    belt.getMatrixAt(10, after);
    expect(after.elements[12]).toBeGreaterThan(before.elements[12]);
    fireEvent.click(screen.getByRole('button', { name: 'Pause the animation' }));
    const paused = after.clone();
    for (let i = 0; i < 10; i++) frame();
    belt.getMatrixAt(10, after);
    expect(after.elements).toEqual(paused.elements);
  });

  it('cycles through all input channels on Replay without a source menu', () => {
    render(<MachineScene />);
    fireEvent.click(document.querySelector('#replay')!);
    expect(window.__machineDebug?.getState()).toMatchObject({ source: 'voice', time: 0, playing: true });
    fireEvent.click(document.querySelector('#replay')!);
    expect(window.__machineDebug?.getState()).toMatchObject({ source: 'website', time: 0, playing: true });
    expect(screen.getByRole('status')).toHaveTextContent('Website + Ads');
    fireEvent.click(document.querySelector('#replay')!);
    expect(window.__machineDebug?.getState().source).toBe('text');
  });

  it('fans the inputs above, straight into, and below the main rail with smooth horizontal merges', async () => {
    render(<MachineScene />);
    const { Matrix4, Vector3 } = await import('three');
    const scene = mocks.compile.mock.calls[0][0] as import('three').Scene;
    const feeds = ['text', 'voice', 'website'].map(id => scene.getObjectByName(`source-${id}`)!);
    expect(feeds.map(feed => feed.position.z)).toEqual([-2.2, 0, 2.2]);
    for (const feed of feeds) {
      const belt = feed.getObjectByName('feeder-belt') as import('three').InstancedMesh;
      const first = new Matrix4(), last = new Matrix4();
      belt.getMatrixAt(0, first); belt.getMatrixAt(belt.count - 1, last);
      const start = new Vector3().setFromMatrixPosition(first);
      const end = new Vector3().setFromMatrixPosition(last);
      expect(end.x).toBeGreaterThan(start.x);
      expect(Math.abs(end.z + feed.position.z)).toBeLessThan(.1);
      // The center input remains straight, instead of tilting down with the others.
      if (feed.position.z === 0) expect(end.z).toBeCloseTo(0);
    }
  });

  it('gives every station a detailed pedestal and animates mechanical parts with playback', () => {
    render(<MachineScene />);
    const scene = mocks.compile.mock.calls[0][0] as import('three').Scene;
    for (const name of ['inquiry', 'response', 'qualify', 'booked', 'confirmed']) {
      expect(scene.getObjectByName(name)?.getObjectByName('station-pedestal')).toBeDefined();
    }
    const roller = scene.getObjectByName('drive-roller')!;
    const rotation = roller.rotation.z;
    for (let i = 0; i < 10; i++) frame();
    expect(roller.rotation.z).not.toBe(rotation);
  });

  it('carries the inquiry along the selected curve and joins the main rail without a sideways jump', () => {
    render(<MachineScene />);
    const scene = mocks.compile.mock.calls[0][0] as import('three').Scene;
    const lead = scene.getObjectByName('traveling-inquiry')!;
    for (const [source, z] of [['text', -2.2], ['voice', 0], ['website', 2.2]] as const) {
      if (source !== 'text') fireEvent.click(document.querySelector('#replay')!);
      expect(window.__machineDebug?.getState().source).toBe(source);
      expect(lead.position.x).toBe(-9.6);
      expect(lead.position.z).toBe(z);
      now = 0;
      for (let i = 0; i < 39; i++) frame();
      expect(Math.abs(lead.position.z)).toBeLessThan(.05);
      frame();
      expect(lead.position.z).toBeCloseTo(0, 5);
      frame();
      expect(lead.position.z).toBeGreaterThanOrEqual(0);
      expect(lead.position.z).toBeLessThan(.05);
    }
  });
});
