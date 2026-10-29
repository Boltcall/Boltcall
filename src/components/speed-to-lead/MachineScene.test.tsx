import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const mocks = {
  render: vi.fn(), dispose: vi.fn(), forceContextLoss: vi.fn(),
  compile: vi.fn(), controlsDispose: vi.fn(),
};
// Only the GPU/browser boundary is mocked. Geometry, scene construction,
// timeline, DOM listeners, label placement and resource disposal run for real.
vi.doMock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>();
  class Renderer {
    domElement = document.createElement('canvas');
    shadowMap = { enabled: false, type: 0 };
    setClearColor = vi.fn(); setPixelRatio = vi.fn(); setSize = vi.fn();
    render = mocks.render; compile = mocks.compile;
    dispose = mocks.dispose; forceContextLoss = mocks.forceContextLoss;
  }
  return { ...actual, WebGLRenderer: Renderer };
});
vi.doMock('three/addons/controls/OrbitControls.js', async () => {
  const { Vector3 } = await import('three');
  return { OrbitControls: class { target = new Vector3(); update = vi.fn(); dispose = mocks.controlsDispose; } };
});
const { MachineScene } = await import('./MachineScene');

let frames: Map<number, FrameRequestCallback>;
let frameId = 0;
let now = 0;
function frame() {
  now += 50;
  const callbacks = [...frames.values()]; frames.clear();
  callbacks.forEach(callback => callback(now));
}
describe('actual 3D conveyor rails', () => {
  beforeEach(() => {
    vi.clearAllMocks(); frames = new Map(); now = 0; frameId = 0;
    vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('constructs real rails, five stations and three source feeders without auto-playing', () => {
    const { container } = render(<MachineScene />); frame();
    expect(mocks.compile).toHaveBeenCalledOnce();
    const scene = mocks.compile.mock.calls[0][0] as import('three').Scene;
    let rails = 0;
    scene.traverse(object => { if ((object as import('three').InstancedMesh).isInstancedMesh) rails++; });
    expect(rails).toBe(5);
    expect(container.querySelector('canvas')).not.toBeNull();
    expect(container.querySelectorAll('.badge .num')).toHaveLength(5);
    expect(container.querySelector('#loading')).toHaveClass('done');
    expect(container.querySelector('#error')).toHaveStyle({ display: 'none' });
    expect(window.__machineDebug?.getState().playing).toBe(false);
    expect(screen.getByRole('button', { name: 'Play the animation' })).toBeVisible();
  });

  it('jumps immediately to a response or booked appointment and changes the source', () => {
    const { container } = render(<MachineScene />);
    fireEvent.click(screen.getByRole('button', { name: /immediate response/i })); frame();
    expect(window.__machineDebug?.getState().time).toBe(3);
    expect(container.querySelector('#caption-a-text')).toHaveTextContent('Hi Mike');
    fireEvent.click(screen.getByRole('button', { name: /appointment booked/i })); frame();
    expect(container.querySelector('#stat-booked')).toHaveTextContent('1');
    expect(container.querySelector('#caption-a-text')).toHaveTextContent('Appointment booked');
    fireEvent.change(screen.getByRole('combobox', { name: 'Example source' }), { target: { value: '2' } }); frame();
    expect(window.__machineDebug?.getState()).toMatchObject({ feedIndex: 2, playing: false, booked: false });
    expect(container.querySelector('#stat-booked')).toHaveTextContent('0');
  });

  it('plays once, keeps the finish visible and replays without accumulating fake revenue', () => {
    const { container } = render(<MachineScene />);
    fireEvent.click(screen.getByRole('button', { name: 'Play the animation' }));
    for (let i = 0; i < 250; i++) frame();
    expect(window.__machineDebug?.getState()).toMatchObject({ playing: false, time: 12, booked: true });
    expect(container.querySelector('#stat-in')).toHaveTextContent('1');
    expect(container.querySelector('#caption-a')).toHaveClass('visible');
    fireEvent.click(container.querySelector<HTMLButtonElement>('#replay')!); frame();
    expect(window.__machineDebug?.getState()).toMatchObject({ playing: true, booked: false });
    expect(container.querySelector('#stat-booked')).toHaveTextContent('0');
    expect(container.textContent).not.toContain('$1,200');
  });

  it('pauses on a hidden page and disposes scene resources and animation frames', () => {
    const { unmount } = render(<MachineScene />);
    fireEvent.click(screen.getByRole('button', { name: 'Play the animation' }));
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(window.__machineDebug?.getState().playing).toBe(false);
    unmount();
    expect(frames.size).toBe(0);
    expect(mocks.dispose).toHaveBeenCalledOnce();
    expect(mocks.controlsDispose).toHaveBeenCalledOnce();
    expect(window.__machineDebug).toBeUndefined();
  });
});

