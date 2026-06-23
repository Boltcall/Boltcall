import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  clearPendingAgentSetup,
  readPendingAgentSetup,
} from '../lib/setup/onboarding';
import { provisionAgentSetup } from '../lib/setup/provisionAgentSetup';
import { SetupGradientBackground } from '../components/setup/SetupGradientBackground';

const TOTAL_SEGMENTS = 20;
const TOTAL_DURATION_MS = 10000;

const LOADER_WORDS = [
  'Analyzing',
  'Building',
  'Formatting',
  'Packaging',
  'Polishing',
  'Finalizing',
];

const LOADING_STEPS = [
  { at: 0, text: 'Initializing your workspace...' },
  { at: 8, text: 'Setting up your AI receptionist...' },
  { at: 22, text: 'Creating inbound and speed-to-lead agents...' },
  { at: 40, text: 'Connecting your business website and knowledge...' },
  { at: 60, text: 'Configuring call handling...' },
  { at: 80, text: 'Preparing your dashboard...' },
  { at: 100, text: 'Done!' },
];

const SetupLoading: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(LOADING_STEPS[0].text);
  const [fadeOut, setFadeOut] = useState(false);
  const [provisioningError, setProvisioningError] = useState<string | null>(
    null,
  );
  const [provisioningDone, setProvisioningDone] = useState(false);
  const [minDurationMet, setMinDurationMet] = useState(false);
  const wordLoaderRef = useRef<HTMLDivElement>(null);
  const wordLoaderStopped = useRef(false);
  const segmentsBuilt = useRef(false);
  const provisioningStarted = useRef(false);
  const hasNavigated = useRef(false);

  const buildSegments = useCallback(() => {
    const bar = document.getElementById('segmented-bar');
    if (!bar || segmentsBuilt.current) return;
    segmentsBuilt.current = true;
    bar.innerHTML = '';
    for (let i = 0; i < TOTAL_SEGMENTS; i++) {
      const seg = document.createElement('div');
      seg.className = 'setup-seg';
      bar.appendChild(seg);
    }
  }, []);

  const updateSegments = useCallback((pct: number) => {
    const filled = Math.round((pct / 100) * TOTAL_SEGMENTS);
    const segs = document.querySelectorAll('.setup-seg');
    segs.forEach((s, i) => {
      if (i < filled) {
        s.classList.add('filled');
        if (i === filled - 1) {
          s.classList.add('pop');
          setTimeout(() => s.classList.remove('pop'), 300);
        }
      } else {
        s.classList.remove('filled', 'pop');
      }
    });
  }, []);

  const animateCharsIn = useCallback(
    (wordIndex: number, duration: number): Promise<void> => {
      const chars = document.querySelectorAll(
        `.setup-word-${wordIndex} .setup-char`,
      );
      return new Promise((resolve) => {
        let completed = 0;
        if (chars.length === 0) {
          resolve();
          return;
        }
        chars.forEach((ch, i) => {
          const el = ch as HTMLElement;
          setTimeout(() => {
            el.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            completed++;
            if (completed === chars.length) setTimeout(resolve, duration);
          }, i * 40);
        });
      });
    },
    [],
  );

  const animateCharsOut = useCallback(
    (wordIndex: number, duration: number): Promise<void> => {
      const chars = document.querySelectorAll(
        `.setup-word-${wordIndex} .setup-char`,
      );
      return new Promise((resolve) => {
        let completed = 0;
        if (chars.length === 0) {
          resolve();
          return;
        }
        chars.forEach((ch, i) => {
          const el = ch as HTMLElement;
          setTimeout(() => {
            el.style.transition = `opacity ${duration}ms ease-in, transform ${duration}ms ease-in`;
            el.style.opacity = '0';
            el.style.transform = 'translateY(-8px)';
            completed++;
            if (completed === chars.length) setTimeout(resolve, duration);
          }, i * 40);
        });
      });
    },
    [],
  );

  const buildWordLoader = useCallback(() => {
    const container = wordLoaderRef.current;
    if (!container) return;
    container.innerHTML = '';
    const allWords = [...LOADER_WORDS, 'Done!'];
    allWords.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = `setup-word setup-word-${i}`;
      if (i === allWords.length - 1) span.classList.add('setup-done-word');
      word.split('').forEach((ch) => {
        const c = document.createElement('span');
        c.className = 'setup-char';
        c.textContent = ch === ' ' ? '\u00A0' : ch;
        span.appendChild(c);
      });
      container.appendChild(span);
    });
  }, []);

  const runWordLoader = useCallback(async () => {
    const allWords = [...LOADER_WORDS, 'Done!'];
    for (let i = 0; i < allWords.length; i++) {
      if (wordLoaderStopped.current) return;
      await animateCharsIn(i, 350);
      if (i < allWords.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
        await animateCharsOut(i, 300);
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }, [animateCharsIn, animateCharsOut]);

  useEffect(() => {
    buildSegments();
    buildWordLoader();
    void runWordLoader();

    const intervalMs = 80;
    const steps = TOTAL_DURATION_MS / intervalMs;
    const increment = 100 / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setMinDurationMet(true);
      }

      setProgress(current);
      updateSegments(current);

      const step = [...LOADING_STEPS].reverse().find((item) => current >= item.at);
      if (step) setCurrentStep(step.text);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [buildSegments, buildWordLoader, runWordLoader, updateSegments]);

  useEffect(() => {
    if (!user?.id || provisioningStarted.current) return;
    provisioningStarted.current = true;

    const pendingSetup = readPendingAgentSetup();
    if (!pendingSetup) {
      setProvisioningDone(true);
      return;
    }

    void provisionAgentSetup(user.id, pendingSetup)
      .then(() => {
        clearPendingAgentSetup();
        setProvisioningDone(true);
      })
      .catch((error) => {
        console.error('Setup provisioning failed:', error);
        setProvisioningError(
          error instanceof Error
            ? error.message
            : 'Setup provisioning failed. Please refresh and try again.',
        );
      });
  }, [user?.id]);

  useEffect(() => {
    if (hasNavigated.current || provisioningError || !minDurationMet || !provisioningDone) {
      return;
    }

    hasNavigated.current = true;
    setTimeout(() => {
      wordLoaderStopped.current = true;
      setFadeOut(true);
      setTimeout(() => {
        navigate('/setup/talk-to-agent', { replace: true });
      }, 800);
    }, 600);
  }, [minDurationMet, navigate, provisioningDone, provisioningError]);

  return (
    <>
      <style>{`
        .setup-loading-page {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #050507;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: opacity 700ms ease-in-out;
        }
        .setup-loading-page.fade-out {
          opacity: 0;
        }
        .setup-loading-content {
          width: 100%;
          max-width: 560px;
          padding: 0 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2.5rem;
        }
        .setup-word-loader {
          position: relative;
          height: 4rem;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          width: 100%;
        }
        .setup-word {
          position: absolute;
          display: flex;
          gap: 3px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #ffffff;
          text-transform: uppercase;
        }
        .setup-done-word {
          color: #c4b5fd;
        }
        .setup-char {
          display: inline-block;
          opacity: 0;
          transform: translateY(12px);
        }
        .setup-progress-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .setup-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .setup-progress-label {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
        }
        .setup-progress-pct {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          color: #ffffff;
          font-variant-numeric: tabular-nums;
        }
        .setup-segmented-bar {
          display: flex;
          gap: 4px;
          padding: 2px 0;
        }
        .setup-seg {
          flex: 1;
          height: 16px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.12);
          opacity: 1;
          transition: background 0.4s ease, opacity 0.4s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1);
        }
        .setup-seg.filled {
          background: #ffffff;
          opacity: 1;
        }
        .setup-seg.filled.pop {
          transform: scaleY(1.35) translateY(-1px);
        }
        .setup-loading-step {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.72);
          text-align: center;
          min-height: 1.2em;
          transition: opacity 0.3s ease;
        }
        .setup-loading-error {
          width: 100%;
          border-radius: 16px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          padding: 0.875rem 1rem;
          color: #9f1239;
          font-size: 0.9rem;
          line-height: 1.5;
          text-align: center;
        }
      `}</style>

      <div className={`setup-loading-page relative isolate overflow-hidden ${fadeOut ? 'fade-out' : ''}`}>
        <SetupGradientBackground />
        <div className="setup-loading-content">
          <div className="setup-word-loader" ref={wordLoaderRef} />

          <div className="setup-progress-wrapper">
            <div className="setup-progress-header">
              <span className="setup-progress-label">Loading</span>
              <span className="setup-progress-pct">{Math.round(progress)}%</span>
            </div>
            <div className="setup-segmented-bar" id="segmented-bar" />
            <div className="setup-loading-step">{currentStep}</div>
            {provisioningError && (
              <div className="setup-loading-error">{provisioningError}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SetupLoading;
