import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GeoJsonMapOutputProps {
  data: unknown;
}

export function GeoJsonMapOutput({ data }: GeoJsonMapOutputProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current);
    map.scrollWheelZoom.disable();
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      minZoom: 0,
      maxZoom: 18,
    }).addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Parse GeoJSON data
    let geoJsonData: any;
    try {
      if (typeof data === "string") {
        geoJsonData = JSON.parse(data);
      } else if (typeof data === "object" && data !== null) {
        geoJsonData = data;
      } else {
        throw new Error("Invalid GeoJSON data format");
      }

      // Handle different GeoJSON types
      if (geoJsonData.type === "FeatureCollection") {
        // Already in correct format
      } else if (geoJsonData.type === "Feature") {
        geoJsonData = {
          type: "FeatureCollection",
          features: [geoJsonData],
        };
      } else {
        // Assume it's a geometry object
        geoJsonData = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: geoJsonData,
              properties: {},
            },
          ],
        };
      }

      // Remove existing GeoJSON layer
      if (geoJsonLayerRef.current) {
        map.removeLayer(geoJsonLayerRef.current);
      }

      // Add new GeoJSON layer
      const geoJsonLayer = L.geoJSON(geoJsonData).addTo(map);
      geoJsonLayerRef.current = geoJsonLayer;

      // Fit map to bounds
      if (geoJsonLayer.getBounds().isValid()) {
        map.fitBounds(geoJsonLayer.getBounds());
      }
    } catch (error) {
      console.error("Error parsing GeoJSON:", error);
    }
  }, [data]);

  return (
    <div className="h-96 w-full overflow-hidden rounded-md border border-gray-200">
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
