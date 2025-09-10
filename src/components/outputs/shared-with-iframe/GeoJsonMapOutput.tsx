import { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON as LeafletGeoJSON,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface GeoJsonMapOutputProps {
  data: unknown;
}

// Default styling for GeoJSON features
const defaultStyle = {
  color: "#3388ff",
  weight: 2,
  opacity: 0.8,
  fillOpacity: 0.3,
};

// Style function for different feature types
const getFeatureStyle = (feature: any) => {
  const { geometry } = feature;

  // Different colors for different geometry types
  const typeColors: Record<string, string> = {
    Point: "#ff6b6b",
    LineString: "#4ecdc4",
    Polygon: "#45b7d1",
    MultiPoint: "#96ceb4",
    MultiLineString: "#feca57",
    MultiPolygon: "#ff9ff3",
  };

  const color = typeColors[geometry?.type] || defaultStyle.color;

  return {
    ...defaultStyle,
    color,
    fillColor: color,
  };
};

// Calculate bounds for the map to fit all features
const calculateBounds = (geoJsonData: any): L.LatLngBounds | null => {
  if (!geoJsonData || !geoJsonData.features) {
    return null;
  }

  const bounds = L.latLngBounds([]);
  let hasValidBounds = false;

  const processCoordinates = (coordinates: any, geometryType: string) => {
    if (Array.isArray(coordinates)) {
      if (geometryType === "Point") {
        bounds.extend([coordinates[1], coordinates[0]]);
        hasValidBounds = true;
      } else if (
        geometryType === "LineString" ||
        geometryType === "MultiPoint"
      ) {
        coordinates.forEach((coord: any) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            bounds.extend([coord[1], coord[0]]);
            hasValidBounds = true;
          }
        });
      } else if (
        geometryType === "Polygon" ||
        geometryType === "MultiLineString"
      ) {
        coordinates.forEach((ring: any) => {
          if (Array.isArray(ring)) {
            ring.forEach((coord: any) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                bounds.extend([coord[1], coord[0]]);
                hasValidBounds = true;
              }
            });
          }
        });
      } else if (geometryType === "MultiPolygon") {
        coordinates.forEach((polygon: any) => {
          if (Array.isArray(polygon)) {
            polygon.forEach((ring: any) => {
              if (Array.isArray(ring)) {
                ring.forEach((coord: any) => {
                  if (Array.isArray(coord) && coord.length >= 2) {
                    bounds.extend([coord[1], coord[0]]);
                    hasValidBounds = true;
                  }
                });
              }
            });
          }
        });
      }
    }
  };

  geoJsonData.features.forEach((feature: any) => {
    if (feature.geometry && feature.geometry.coordinates) {
      processCoordinates(feature.geometry.coordinates, feature.geometry.type);
    }
  });

  return hasValidBounds ? bounds : null;
};

export function GeoJsonMapOutput({ data }: GeoJsonMapOutputProps) {
  const { geoJsonData, bounds, error } = useMemo(() => {
    try {
      // Handle different data formats
      let parsedData: any;

      if (typeof data === "string") {
        parsedData = JSON.parse(data);
      } else if (typeof data === "object" && data !== null) {
        parsedData = data;
      } else {
        throw new Error("Invalid GeoJSON data format");
      }

      // Validate GeoJSON structure
      if (!parsedData || typeof parsedData !== "object") {
        throw new Error("GeoJSON data must be an object");
      }

      // Handle both FeatureCollection and single Feature
      let geoJsonData: any;
      if (parsedData.type === "FeatureCollection") {
        geoJsonData = parsedData;
      } else if (parsedData.type === "Feature") {
        geoJsonData = {
          type: "FeatureCollection",
          features: [parsedData],
        };
      } else if (parsedData.type === "GeometryCollection") {
        geoJsonData = {
          type: "FeatureCollection",
          features: parsedData.geometries.map((geom: any) => ({
            type: "Feature",
            geometry: geom,
            properties: {},
          })),
        };
      } else {
        // Assume it's a geometry object
        geoJsonData = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: parsedData,
              properties: {},
            },
          ],
        };
      }

      // Validate that we have features
      if (
        !geoJsonData.features ||
        !Array.isArray(geoJsonData.features) ||
        geoJsonData.features.length === 0
      ) {
        throw new Error("GeoJSON must contain at least one feature");
      }

      const calculatedBounds = calculateBounds(geoJsonData);

      return {
        geoJsonData,
        bounds: calculatedBounds,
        error: null,
      };
    } catch (err) {
      return {
        geoJsonData: null,
        bounds: null,
        error:
          err instanceof Error ? err.message : "Failed to parse GeoJSON data",
      };
    }
  }, [data]);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <div className="font-medium text-red-800">GeoJSON Error</div>
        <div className="mt-1 text-sm text-red-600">{error}</div>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-red-600">
            Show raw data
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto rounded bg-red-100 p-2 text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  if (!geoJsonData || !bounds) {
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
        <div className="font-medium text-yellow-800">
          No valid geographic data found
        </div>
        <div className="mt-1 text-sm text-yellow-600">
          The GeoJSON data doesn't contain valid geographic coordinates.
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 w-full overflow-hidden rounded-md border border-gray-200">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [20, 20] }}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LeafletGeoJSON
          data={geoJsonData}
          style={getFeatureStyle}
          onEachFeature={(feature, layer) => {
            // Add popup with feature properties
            if (
              feature.properties &&
              Object.keys(feature.properties).length > 0
            ) {
              const popupContent = Object.entries(feature.properties)
                .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                .join("<br/>");
              layer.bindPopup(popupContent);
            }
          }}
        />
      </MapContainer>
    </div>
  );
}
