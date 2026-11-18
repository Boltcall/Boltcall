import { useEffect, useRef } from 'react';
import { initMachineScene } from '@/lib/speed-to-lead-machine-scene';
import './machine-scene.css';

export function MachineScene() {
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    return initMachineScene(rootRef.current);
  }, []);

  return (
    <main ref={rootRef} className="stl-machine">
      <h1 className="demo-sr-only">How Boltcall turns an inquiry into a booked appointment</h1>
      <p id="demo-description" className="demo-sr-only">Simulation only. No real calls or bookings. Replay cycles through Text, Voice, and Website + Ads inquiries.</p>
      <p id="journey-status" className="demo-sr-only" role="status" aria-live="polite">A customer asks for help.</p>
      <section className="demo-film" aria-label="How Boltcall works">
        <div id="scene" role="img" aria-describedby="demo-description" aria-label="3D moving conveyor: Text, Voice, and Website + Ads feed a customer inquiry from left to right through capture, immediate response, qualification, booking, and confirmation." />
        <div id="loading"><span>Loading demo…</span></div>
        <div id="error" role="alert">
          <strong>The 3D demo couldn’t load.</strong>
          <p>WebGL needs to be available in your browser.</p>
          <button type="button" onClick={() => location.reload()}>Try again</button>
        </div>
        <div className="film-controls">
          <button id="play" type="button" aria-label="Pause the animation">Pause</button>
          <button id="replay" type="button" aria-label="Replay the animation" aria-describedby="demo-description">Replay</button>
        </div>
      </section>
    </main>
  );
}
