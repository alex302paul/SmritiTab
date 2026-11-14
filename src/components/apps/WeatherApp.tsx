import { CloudSun, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import { describeWeatherCode, formatTemperature } from "../../services/browserApi";

export function WeatherApp() {
  const { weather, settings, updateSettings } = useSmriti();
  const [cityInput, setCityInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Respect privacy: only load forecast once the user actually opens Weather
  useEffect(() => {
    if (weather.status === "idle") {
      void weather.refresh();
    }
  }, [weather]);

  const handleSetCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;
    setSubmitting(true);
    const ok = await weather.setCity(cityInput);
    setSubmitting(false);
    if (ok) setCityInput("");
  };

  const snap = weather.snapshot;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <form
        onSubmit={handleSetCity}
        className="flex items-center gap-2 border-b border-slate-900/10 p-3 dark:border-white/10"
      >
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Search city (e.g., Tokyo, London)…"
            aria-label="City name"
            className="w-full rounded-xl border border-slate-900/10 bg-white/70 py-1.5 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Finding…" : "Set city"}
        </button>
      </form>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
        {weather.status === "loading" && !snap && (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading forecast…
          </div>
        )}

        {snap && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {formatTemperature(snap.temperature, settings.temperatureUnit)}
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {describeWeatherCode(snap.code)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{snap.city}</p>
              </div>
              <button
                type="button"
                onClick={() => void weather.refresh()}
                disabled={weather.status === "loading"}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900/6 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-900/12 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${weather.status === "loading" ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-900/5 px-3 py-2 dark:bg-white/6">
                <dt className="text-[11px] text-slate-500 dark:text-slate-400">Feels like</dt>
                <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                  {formatTemperature(snap.apparentTemperature, settings.temperatureUnit)}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-900/5 px-3 py-2 dark:bg-white/6">
                <dt className="text-[11px] text-slate-500 dark:text-slate-400">Humidity</dt>
                <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                  {snap.humidity}%
                </dd>
              </div>
              <div className="rounded-xl bg-slate-900/5 px-3 py-2 dark:bg-white/6">
                <dt className="text-[11px] text-slate-500 dark:text-slate-400">Wind</dt>
                <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                  {Math.round(snap.windSpeed)} km/h
                </dd>
              </div>
              <div className="rounded-xl bg-slate-900/5 px-3 py-2 dark:bg-white/6">
                <dt className="text-[11px] text-slate-500 dark:text-slate-400">Updated</dt>
                <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                  {new Date(snap.updatedAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between rounded-xl bg-slate-900/5 px-3 py-2 dark:bg-white/6">
              <span className="text-xs text-slate-600 dark:text-slate-300">Temperature unit</span>
              <div className="flex gap-1">
                {(["c", "f"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => updateSettings({ temperatureUnit: u })}
                    aria-pressed={settings.temperatureUnit === u}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      settings.temperatureUnit === u
                        ? "bg-indigo-600 text-white"
                        : "text-slate-500 hover:bg-slate-900/8 dark:text-slate-400 dark:hover:bg-white/10"
                    }`}
                  >
                    °{u.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {weather.error && (
          <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-2 font-medium">
              <CloudSun className="h-4 w-4 shrink-0" />
              <span>{weather.error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
