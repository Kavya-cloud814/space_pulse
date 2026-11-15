import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles, X } from 'lucide-react';
import { useSpacePulse } from '../context/SpacePulseContext';

interface WalkthroughScene {
  id: number;
  title: string;
  subtitle: string;
  accent: string;
  tip: string;
  previewLabel: string;
}

const SCENES: WalkthroughScene[] = [
  {
    id: 1,
    title: '1. Pick Your Mission Environment',
    subtitle: 'GPS detection or 1-tap planetary base switching',
    accent: '#36D6C4',
    tip: 'Choose Mars Base, Moon Base, Lunar Rover, ISS, or Spacecraft. Moving bases starts a fresh environmental cycle without mixing old history.',
    previewLabel: 'Environment Selector · GPS Aid + Base Cards',
  },
  {
    id: 2,
    title: '2. Edit Health & Context Anytime',
    subtitle: 'Playful live sliders for vitals, activity & symptoms',
    accent: '#E879C9',
    tip: 'Adjust Heart Rate, SpO₂, Body Temp, Exercise state, or toggle symptoms like Headache—and watch how context-aware analysis responds.',
    previewLabel: 'Editable Health Panel · Baselines & Overrides',
  },
  {
    id: 3,
    title: '3. Control Simulation & Trigger Events',
    subtitle: 'Start, Pause, Resume, Stop & Planetary Hazards',
    accent: '#FF9F43',
    tip: 'Run the virtual sensor stream, trigger a Mars Dust Storm or Cabin CO₂ spike, and verify Outside vs Inside Habitat stay properly isolated.',
    previewLabel: 'Simulation Controls · Return to Normal',
  },
  {
    id: 4,
    title: '4. Smart Alerts, Care & Mission Reports',
    subtitle: 'From Phase 3 findings to Ground Medical & PDF/CSV',
    accent: '#9277F5',
    tip: 'Review Advisory, Warning, and Critical notifications, offline emergency checklists, sensor failure fallbacks, and downloadable PDF/CSV reports.',
    previewLabel: 'Alerts, Recommendations & Continuous Reports',
  },
];

export const IntroWalkthroughModal: React.FC = () => {
  const { showIntroModal, closeIntroModal } = useSpacePulse();
  const [sceneIdx, setSceneIdx] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!showIntroModal || !autoPlaying) return;
    const stepMs = 100;
    const totalMs = 4500;
    const id = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + (stepMs / totalMs) * 100;
        if (next >= 100) {
          setSceneIdx((idx) => (idx + 1) % SCENES.length);
          return 0;
        }
        return next;
      });
    }, stepMs);
    return () => window.clearInterval(id);
  }, [showIntroModal, autoPlaying]);

  if (!showIntroModal) return null;

  const scene = SCENES[sceneIdx];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-walkthrough-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090D19]/80 backdrop-blur-md p-4"
    >
      <div className="cosmic-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#36D6C4]" />
            <h2 id="intro-walkthrough-title" className="text-lg font-semibold text-[#F4F0FF]">
              Quick Simulation Guide
            </h2>
          </div>
          <button
            onClick={closeIntroModal}
            aria-label="Close guide"
            className="p-2 rounded-lg text-[#91A1B8] hover:text-[#F3F8FB] hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Animated video-like storyboard viewport */}
        <div className="p-6 space-y-5">
          <div
            className="relative rounded-xl overflow-hidden border border-white/10 p-6 min-h-[210px] flex flex-col justify-between"
            style={{
              background: `radial-gradient(circle at 20% 25%, ${scene.accent}2b, rgba(16, 26, 48, 0.92) 70%)`,
            }}
          >
            <div className="flex items-center justify-between text-xs text-[#91A1B8] font-mono">
              <span>{scene.previewLabel}</span>
              <span>
                Scene {sceneIdx + 1} / {SCENES.length}
              </span>
            </div>

            {/* Playful interactive animated miniature visual */}
            <div className="my-4 grid grid-cols-3 gap-3">
              {sceneIdx === 0 && (
                <>
                  {['Mars Base', 'Moon Base', 'Lunar Rover'].map((name, i) => (
                    <div
                      key={name}
                      className={`rounded-lg p-3 border transition-transform duration-300 ${
                        i === 0
                          ? 'bg-[#CD7055]/20 border-[#CD7055]/60 scale-[1.03]'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="text-xs font-semibold text-[#F3F8FB]">{name}</div>
                      <div className="text-[11px] text-[#91A1B8] mt-1">
                        {i === 0 ? 'GPS Suggested' : 'Manual Ready'}
                      </div>
                    </div>
                  ))}
                </>
              )}
              {sceneIdx === 1 && (
                <>
                  <div className="col-span-2 rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#91A1B8]">Heart Rate Override</span>
                      <span className="font-mono text-[#E879C9]">94 BPM</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#36D6C4] to-[#E879C9]" />
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#9277F5]/20 border border-[#9277F5]/40 p-3">
                    <div className="text-xs font-semibold text-[#F3F8FB]">Activity</div>
                    <div className="text-xs text-[#C4B5FD] mt-1">Exercise / EVA</div>
                  </div>
                </>
              )}
              {sceneIdx === 2 && (
                <>
                  <div className="rounded-lg bg-[#36D6C4]/20 border border-[#36D6C4]/50 p-3">
                    <div className="text-xs font-semibold text-[#36D6C4]">Start / Pause</div>
                    <div className="text-[11px] text-[#91A1B8] mt-1">3s Live Stream</div>
                  </div>
                  <div className="rounded-lg bg-[#FF9F43]/20 border border-[#FF9F43]/50 p-3">
                    <div className="text-xs font-semibold text-[#FF9F43]">Dust Storm</div>
                    <div className="text-[11px] text-[#91A1B8] mt-1">Outside Only</div>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <div className="text-xs font-semibold text-[#F3F8FB]">Inside Hab</div>
                    <div className="text-[11px] text-[#43D6A0] mt-1">Protected</div>
                  </div>
                </>
              )}
              {sceneIdx === 3 && (
                <>
                  <div className="rounded-lg bg-[#43D6A0]/15 border border-[#43D6A0]/40 p-3">
                    <div className="text-xs font-semibold text-[#43D6A0]">Advisory</div>
                    <div className="text-[11px] text-[#91A1B8] mt-1">Astronaut</div>
                  </div>
                  <div className="rounded-lg bg-[#FFC857]/15 border border-[#FFC857]/40 p-3">
                    <div className="text-xs font-semibold text-[#FFC857]">Warning</div>
                    <div className="text-[11px] text-[#91A1B8] mt-1">+ Ground Med</div>
                  </div>
                  <div className="rounded-lg bg-[#FF5874]/15 border border-[#FF5874]/40 p-3">
                    <div className="text-xs font-semibold text-[#FF5874]">Critical</div>
                    <div className="text-[11px] text-[#91A1B8] mt-1">PDF & CSV Ready</div>
                  </div>
                </>
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#F4F0FF]">{scene.title}</h3>
              <p className="text-sm text-[#74C7E8] mt-0.5">{scene.subtitle}</p>
            </div>

            {/* Video playback progress bar */}
            <div className="mt-4 h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full transition-all duration-100 rounded-full"
                style={{ width: `${progress}%`, backgroundColor: scene.accent }}
              />
            </div>
          </div>

          <p className="text-sm text-[#91A1B8] leading-relaxed">{scene.tip}</p>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setProgress(0);
                  setSceneIdx((idx) => (idx - 1 + SCENES.length) % SCENES.length);
                }}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-[#F3F8FB] flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => setAutoPlaying((v) => !v)}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-[#F3F8FB] flex items-center gap-1.5 transition-colors"
              >
                {autoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {autoPlaying ? 'Pause Intro' : 'Play Intro'}
              </button>
              <button
                onClick={() => {
                  setProgress(0);
                  setSceneIdx((idx) => (idx + 1) % SCENES.length);
                }}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-[#F3F8FB] flex items-center gap-1 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={closeIntroModal}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#91A1B8] hover:text-[#F3F8FB] transition-colors"
              >
                Skip Intro
              </button>
              <button
                onClick={closeIntroModal}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#090D19] bg-gradient-to-r from-[#36D6C4] to-[#74C7E8] hover:opacity-95 transition-opacity shadow-lg shadow-[#36D6C4]/20"
              >
                Start Using SPACE PULSE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
