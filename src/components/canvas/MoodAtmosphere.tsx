import { Component, createMemo, Show } from "solid-js";

interface MoodAtmosphereProps {
  mood: string | null;
}

const moodConfig: Record<string, { warmth: string; grainOpacity: number; vignetteOpacity: number }> = {
  tension: { warmth: "rgba(100, 120, 140, 0.02)", grainOpacity: 0.06, vignetteOpacity: 0.12 },
  grief: { warmth: "rgba(80, 100, 130, 0.03)", grainOpacity: 0.04, vignetteOpacity: 0.15 },
  joy: { warmth: "rgba(255, 220, 180, 0.04)", grainOpacity: 0.01, vignetteOpacity: 0.03 },
  dread: { warmth: "rgba(60, 70, 90, 0.05)", grainOpacity: 0.07, vignetteOpacity: 0.2 },
  calm: { warmth: "rgba(200, 220, 240, 0.02)", grainOpacity: 0.01, vignetteOpacity: 0.02 },
  chaos: { warmth: "rgba(0, 0, 0, 0)", grainOpacity: 0.09, vignetteOpacity: 0.1 },
  romance: { warmth: "rgba(255, 200, 180, 0.05)", grainOpacity: 0.02, vignetteOpacity: 0.05 },
  mystery: { warmth: "rgba(50, 60, 80, 0.04)", grainOpacity: 0.05, vignetteOpacity: 0.18 },
  action: { warmth: "rgba(0, 0, 0, 0)", grainOpacity: 0.04, vignetteOpacity: 0.08 },
  reflection: { warmth: "rgba(220, 210, 190, 0.03)", grainOpacity: 0.02, vignetteOpacity: 0.06 },
};

export const MoodAtmosphere: Component<MoodAtmosphereProps> = (props) => {
  const config = createMemo(() => {
    if (!props.mood) return null;
    return moodConfig[props.mood] || null;
  });

  return (
    <Show when={config()}>
      <div class="mood-atmosphere" style={{
        background: config()!.warmth,
        "--mood-grain": config()!.grainOpacity,
        "--mood-vignette": config()!.vignetteOpacity,
      } as any}>
        <div class="mood-atmosphere__vignette" style={{ opacity: config()!.vignetteOpacity }} />
      </div>

      <style>{`
        .mood-atmosphere {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          transition: background 1s ease;
        }
        .mood-atmosphere__vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%);
          transition: opacity 1s ease;
        }
      `}</style>
    </Show>
  );
};
