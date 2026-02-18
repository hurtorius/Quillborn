import { Component, For, createSignal, createMemo, onMount, createEffect } from "solid-js";
import { manuscriptStore, ManuscriptNode } from "@/stores/manuscript";
import { planningStore } from "@/stores/planning";

interface Star {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  status: string;
  mood?: string;
  wordCount: number;
  connections: string[];
}

export const ConstellationMap: Component = () => {
  const { store } = manuscriptStore;
  let canvasRef: HTMLCanvasElement | undefined;
  let animFrame: number;
  const [hoveredStar, setHoveredStar] = createSignal<string | null>(null);
  const [filterBy, setFilterBy] = createSignal<"status" | "mood" | "pov" | null>(null);

  const chapters = createMemo(() => {
    if (!store.project) return [];
    return Object.values(store.project.structure.nodes).filter(
      (n) => n.node_type === "chapter"
    );
  });

  // Build stars with simple force-directed positions
  const buildStars = (): Star[] => {
    const chaps = chapters();
    const characters = Object.values(planningStore.characters);
    const w = 800, h = 600;

    return chaps.map((c, i) => {
      const angle = (i / Math.max(chaps.length, 1)) * Math.PI * 2;
      const radius = 120 + Math.random() * 100;
      const connections: string[] = [];

      // Find connections: shared characters, mood, etc.
      for (const other of chaps) {
        if (other.id === c.id) continue;
        // Same mood = connection
        if (c.mood && c.mood === other.mood) connections.push(other.id);
        // Same POV = connection
        if (c.pov && c.pov === other.pov) connections.push(other.id);
      }

      return {
        id: c.id,
        title: c.title,
        x: w / 2 + Math.cos(angle) * radius,
        y: h / 2 + Math.sin(angle) * radius,
        vx: 0, vy: 0,
        status: c.status,
        mood: c.mood || undefined,
        wordCount: c.word_count,
        connections: [...new Set(connections)],
      };
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "revised": return "#5A7A51";
      case "final": return "#4A6A8B";
      case "trash": return "#8B4A4A";
      default: return "#C8C2BA";
    }
  };

  const draw = (stars: Star[]) => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;
    const w = canvasRef.width;
    const h = canvasRef.height;

    // Dark sky background
    ctx.fillStyle = "#0A0908";
    ctx.fillRect(0, 0, w, h);

    // Stars background
    for (let i = 0; i < 100; i++) {
      const x = (Math.sin(i * 127.1) * 0.5 + 0.5) * w;
      const y = (Math.cos(i * 311.7) * 0.5 + 0.5) * h;
      const size = Math.random() * 1.5;
      ctx.fillStyle = `rgba(200, 190, 170, ${0.1 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw connections (ink lines)
    const starMap = new Map(stars.map((s) => [s.id, s]));
    for (const star of stars) {
      for (const connId of star.connections) {
        const other = starMap.get(connId);
        if (!other) continue;
        // Shared connections = thicker lines
        const thickness = star.connections.filter((c) => other.connections.includes(star.id)).length > 0 ? 1.5 : 0.5;
        ctx.strokeStyle = `rgba(200, 190, 170, ${hoveredStar() === star.id || hoveredStar() === connId ? 0.4 : 0.08})`;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
      }
    }

    // Draw stars
    for (const star of stars) {
      const isHovered = hoveredStar() === star.id;
      const isOrphan = star.connections.length === 0;
      const size = 3 + (star.wordCount / 2000) * 4;
      const color = statusColor(star.status);

      // Glow
      if (isHovered || isOrphan) {
        const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, size * 4);
        gradient.addColorStop(0, isOrphan ? "rgba(200, 150, 100, 0.3)" : "rgba(200, 190, 170, 0.3)");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, size * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Star dot
      ctx.fillStyle = isHovered ? "#E8DCC8" : color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, isHovered ? size + 2 : size, 0, Math.PI * 2);
      ctx.fill();

      // Label
      if (isHovered) {
        ctx.fillStyle = "#E8DCC8";
        ctx.font = "12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(star.title, star.x, star.y - size - 8);
        ctx.font = "10px Inter, sans-serif";
        ctx.fillStyle = "rgba(200, 190, 170, 0.6)";
        ctx.fillText(`${star.wordCount} words`, star.x, star.y - size - 22);
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.height / rect.height);
    const stars = buildStars();
    let found: string | null = null;
    for (const star of stars) {
      const dist = Math.sqrt((star.x - x) ** 2 + (star.y - y) ** 2);
      if (dist < 15) { found = star.id; break; }
    }
    setHoveredStar(found);
  };

  const handleClick = async () => {
    const id = hoveredStar();
    if (!id || !store.project) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const chapter = await invoke("get_chapter_content", {
        projectPath: store.project.path,
        chapterId: id,
      });
      manuscriptStore.setActiveChapter(chapter as any);
    } catch (e) {
      console.error(e);
    }
  };

  onMount(() => {
    const render = () => {
      draw(buildStars());
      animFrame = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animFrame);
  });

  return (
    <div class="constellation-map">
      <div class="constellation-map__toolbar">
        <span class="constellation-map__title">Constellation Map</span>
        <span class="constellation-map__hint">Each star is a chapter. Lines connect shared elements.</span>
      </div>
      <canvas
        ref={canvasRef}
        class="constellation-map__canvas"
        width={800}
        height={600}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{ cursor: hoveredStar() ? "pointer" : "default" }}
      />

      <style>{`
        .constellation-map {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #0A0908;
          overflow: hidden;
        }
        .constellation-map__toolbar {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid rgba(200, 190, 170, 0.1);
          flex-shrink: 0;
        }
        .constellation-map__title {
          font-family: var(--font-display);
          font-size: var(--font-size-base);
          font-weight: 600;
          color: #E8DCC8;
        }
        .constellation-map__hint {
          font-size: var(--font-size-xs);
          color: rgba(200, 190, 170, 0.4);
        }
        .constellation-map__canvas {
          flex: 1;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
};
