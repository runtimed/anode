import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import {
  GeoJSON as LeafletGeoJSON,
  MapContainer,
  TileLayer,
} from "react-leaflet";

interface GeoJsonMapOutputProps {
  data: unknown;
}

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
  const bounds = useMemo(() => calculateBounds(data), [data]);

  return (
    <div className="h-96 w-full overflow-hidden rounded-md border border-gray-200">
      <div className="h-96 w-full overflow-hidden rounded-md border border-gray-200">
        <MapContainer
          bounds={bounds ?? undefined}
          boundsOptions={{ padding: [20, 20] }}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          scrollWheelZoom={false}
          doubleClickZoom={true}
          dragging={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LeafletGeoJSON
            data={data as GeoJSON.GeoJSON}
            // style={getFeatureStyle}
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
    </div>
  );
}
