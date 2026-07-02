import { useEffect, useRef } from "react";

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).L));
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = LEAFLET_JS;
    s.async = true;
    s.onload = () => resolve((window as any).L);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return leafletPromise;
}

type Props = {
  lat: number | null | undefined;
  lng: number | null | undefined;
  emoji?: string;
  height?: number;
  zoom?: number;
};

export function LiveMap({ lat, lng, emoji = "🛵", height = 260, zoom = 15 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;
    if (lat == null || lng == null) return;

    loadLeaflet().then((L) => {
      if (disposed || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], zoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapRef.current);

        const icon = L.divIcon({
          className: "",
          html: `<div style="font-size:28px;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">${emoji}</div>`,
          iconSize: [1, 1],
          iconAnchor: [0, 0],
        });
        markerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
      } else {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.panTo([lat, lng]);
      }
    }).catch(() => { /* ignore */ });

    return () => { disposed = true; };
  }, [lat, lng, emoji, zoom]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className="rounded-2xl overflow-hidden border border-border/60 bg-muted"
    />
  );
}
