import { useSmriti } from "../context/SmritiContext";

export function WallpaperCanvas() {
  const { wallpaper } = useSmriti();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-950"
    >
      {/* Ambient fallback gradient while wallpaper image resolves */}
      <div
        className="absolute inset-0 bg-[radial-gradient(at_18%_20%,#312e81_0px,transparent_58%),radial-gradient(at_84%_16%,#1e3a5f_0px,transparent_54%),radial-gradient(at_50%_88%,#0f172a_0px,transparent_62%)] bg-slate-950"
      />

      {/* Active & transitioning full-bleed wallpaper layers */}
      {wallpaper.layers.map((layer) => (
        <div
          key={layer.key}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-out"
          style={{
            backgroundImage: `url("${layer.url}")`,
            opacity: layer.key === wallpaper.activeKey ? 1 : 0,
          }}
        />
      ))}
    </div>
  );
}
