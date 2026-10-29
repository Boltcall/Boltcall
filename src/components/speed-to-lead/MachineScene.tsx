import { useEffect, useRef } from 'react';
import { initMachineScene } from '@/lib/speed-to-lead-machine-scene';
import './machine-scene.css';

// Boltcall speed-to-lead engine: a straight two-lane belt fed by three 3D
// source stations (Text / Voice / Website + Ads) that merge into "Capture
// the lead". lib/speed-to-lead-machine-scene.ts builds the three.js scene
// into #scene and wires every projected label by id — including the three
// source-station name badges, created the same way as the station badges.
// This file is static markup only. The whole page is this one full-screen
// scene — no scroll, no separate sections below.

export function MachineScene() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const dispose = initMachineScene(root);
    return () => dispose();
  }, []);

  return (
    <div ref={rootRef} className="stl-machine">
      <main
        id="scene"
        role="img"
        aria-label="Interactive 3D conveyor rails: a simulated inquiry arrives from Text, Voice, or Website and Ads, travels through Capture the inquiry, Immediate response, Understand the need, Book appointment and Confirmed. A second rail illustrates slow follow-up. Drag to rotate; select a step or use Play, Pause and Replay."
      />
      <div className="vignette" />
      <header className="topbar">
        <a className="identity" href="/" aria-label="Boltcall home">
          <div className="mark">
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 5l7 11 7-11M7 5l3 5 3-5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <strong>Boltcall</strong>
            <small>Speed-to-lead engine</small>
          </div>
        </a>
        <div className="status" id="status">
          <i />
          <span id="status-text">Ready to play</span>
          <span>SIMULATED DEMO</span>
        </div>
      </header>
      {/* Visually-hidden h1: the visible heading below is a div because Boltcall's
          global index.css forces `h1{font-size:clamp(28px,7vw,48px)!important}`
          on mobile, which blew up this small eyebrow label. */}
      <h1 className="sr-only">Boltcall 3D rails: inquiry, immediate response, booked appointment</h1>
      <div className="scene-heading">
        How Boltcall works <span className="index">3D RAILS · 5 STATIONS</span>
      </div>
      <nav className="story-steps" aria-label="Explore the 3D journey">
        <button id="step-inquiry" type="button" aria-current="step">01 <span>Inquiry</span></button>
        <span aria-hidden="true">→</span>
        <button id="step-response" type="button">02 <span>Immediate response</span></button>
        <span aria-hidden="true">→</span>
        <button id="step-booked" type="button">03 <span>Appointment booked</span></button>
      </nav>
      <div className="source-picker">
        <label htmlFor="rail-source">Example source</label>
        <select id="rail-source" defaultValue="0">
          <option value="0">Text</option>
          <option value="1">Voice</option>
          <option value="2">Website + Ads</option>
        </select>
      </div>
      <div className="stats" id="stats" aria-hidden="true">
        <div>
          <strong id="stat-in">0</strong>
          <span>Leads in</span>
        </div>
        <div>
          <strong id="stat-booked">0</strong>
          <span>Booked</span>
        </div>
        <div>
          <strong id="stat-captured">0</strong>
          <span>Responded</span>
        </div>
        <div>
          <strong className="dim" id="stat-lost">
            Waiting
          </strong>
          <span>Slow follow-up</span>
        </div>
      </div>
      <p id="journey-status" className="sr-only" role="status" aria-live="polite">Inquiry ready at the source rail.</p>
      <div id="labels" />
      <div id="floaters">
        <div className="caption" id="caption-a">
          <p id="caption-a-text" />
        </div>
        <div className="caption muted" id="caption-b">
          <p id="caption-b-text" />
        </div>
        <div className="stopwatch" id="stopwatch">
          0:00
        </div>
      </div>
      <nav className="controls" aria-label="Playback">
        <button id="play" aria-label="Play the animation" aria-pressed="true">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M3 1l8 5-8 5z" />
          </svg>
          Play
        </button>
        <button id="replay" aria-label="Replay the animation">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M13.5 8A5.5 5.5 0 1 1 11.8 4M13.5 2v3.5H10"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Replay
        </button>
      </nav>
      <footer className="footer">
        <a className="wordmark" href="/pricing">
          speed-to-lead engine · <span>boltcall.org</span>
        </a>
        <span className="footer-center">EXAMPLE ONLY · NO REAL CALLS OR BOOKINGS</span>
        <span className="hint">Drag to rotate.</span>
      </footer>
      <div id="loading">
        <i />
        <span>Loading the speed-to-lead engine</span>
      </div>
      <div id="error" role="alert">
        <strong>Could not start the 3D scene</strong>
        <p>Check that WebGL is turned on in your browser.</p>
        <button onClick={() => location.reload()}>Try again</button>
      </div>
    </div>
  );
}

