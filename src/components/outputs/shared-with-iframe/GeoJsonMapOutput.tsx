import { mapFitFeatures } from "geojson-map-fit-mercator";
import "maplibre-gl/dist/maplibre-gl.css";
import { useState } from "react";
import {
  RFullscreenControl,
  RLayer,
  RMap,
  RMarker,
  RNavigationControl,
  RPopup,
  RSource,
} from "maplibre-react-components";

interface GeoJsonMapOutputProps {
  data: GeoJSON.FeatureCollection;
}

export function GeoJsonMapOutput({ data }: GeoJsonMapOutputProps) {
  const { bearing, center, zoom } = mapFitFeatures(data, [600, 400]);
  return (
    // Scale height to viewport width
    <div className="h-[45vw] w-full overflow-hidden rounded-md border border-gray-200">
      <RMap
        minZoom={0}
        initialCenter={center}
        initialZoom={zoom}
        initialBearing={bearing}
        // mapStyle="https://openmaptiles.geo.data.gouv.fr/styles/osm-bright/style.json"
        mapStyle="https://tiles.openfreemap.org/styles/bright"
        scrollZoom={false}
      >
        <RFullscreenControl />
        <RNavigationControl position="top-right" visualizePitch={true} />
        <RSource key="data" id="data" type="geojson" data={data} />
        {data.features.map((feature, index) => (
          <DrawFeature
            key={feature.id || index}
            feature={feature}
            index={index}
          />
        ))}
      </RMap>
    </div>
  );
}

function DrawFeature({
  feature,
  index,
}: {
  feature: GeoJSON.Feature;
  index: number;
}) {
  const id = String(feature.id || index);
  switch (feature.geometry.type) {
    case "Point":
      return (
        <RMarker
          longitude={feature.geometry.coordinates[0]}
          latitude={feature.geometry.coordinates[1]}
        />
      );
    case "LineString":
      return (
        <RLayer
          id={id}
          source="data"
          type="line"
          paint={{
            "line-color": "#888",
            "line-width": 8,
          }}
        />
      );
    case "Polygon":
      return (
        <RLayer
          id={id}
          source="data"
          type="fill"
          paint={{
            "fill-color": "transparent",
            "fill-outline-color": "transparent",
          }}
        />
      );
    default:
      return null;
  }
}

interface DrawFeatureWithPopupProps {
  feature: GeoJSON.Feature;
  index: number;
  onFeatureClick?: (
    feature: GeoJSON.Feature,
    coordinates: [number, number]
  ) => void;
}

/**
 * DrawFeatureWithPopup component renders a GeoJSON feature on a map with popup support.
 *
 * This component supports all GeoJSON geometry types as defined in RFC 7946:
 * - Point, MultiPoint
 * - LineString, MultiLineString
 * - Polygon, MultiPolygon
 * - GeometryCollection
 *
 * When a feature is clicked, it calls the onFeatureClick callback with the feature
 * and its coordinates for popup positioning.
 *
 * @param feature - The GeoJSON feature to render
 * @param index - Index for generating unique IDs
 * @param onFeatureClick - Callback when feature is clicked (for popup display)
 */

function DrawFeatureWithPopup({
  feature,
  index,
  onFeatureClick,
}: DrawFeatureWithPopupProps) {
  const id = String(feature.id || index);

  // Get coordinates for popup positioning based on geometry type
  const getCoordinates = (
    geometry: GeoJSON.Geometry
  ): [number, number] | null => {
    switch (geometry.type) {
      case "Point":
        return [geometry.coordinates[0], geometry.coordinates[1]];
      case "LineString":
        // Use first coordinate of the line
        return [geometry.coordinates[0][0], geometry.coordinates[0][1]];
      case "Polygon":
        // Use first coordinate of the exterior ring
        return [geometry.coordinates[0][0][0], geometry.coordinates[0][0][1]];
      case "MultiPoint":
        // Use first point
        return [geometry.coordinates[0][0], geometry.coordinates[0][1]];
      case "MultiLineString":
        // Use first coordinate of first line
        return [geometry.coordinates[0][0][0], geometry.coordinates[0][0][1]];
      case "MultiPolygon":
        // Use first coordinate of first polygon's exterior ring
        return [
          geometry.coordinates[0][0][0][0],
          geometry.coordinates[0][0][0][1],
        ];
      case "GeometryCollection":
        // Use first geometry in collection
        if (geometry.geometries.length > 0) {
          return getCoordinates(geometry.geometries[0]);
        }
        return null;
      default:
        return null;
    }
  };

  const coordinates = getCoordinates(feature.geometry);

  const handleClick = () => {
    if (coordinates && onFeatureClick) {
      onFeatureClick(feature, coordinates);
    }
  };

  // Render the feature based on geometry type
  switch (feature.geometry.type) {
    case "Point":
      return (
        <RMarker
          longitude={feature.geometry.coordinates[0]}
          latitude={feature.geometry.coordinates[1]}
          onClick={handleClick}
        />
      );
    case "LineString":
      return (
        <RLayer
          id={id}
          source="data"
          type="line"
          paint={{
            "line-color": "#888",
            "line-width": 8,
          }}
          onClick={handleClick}
        />
      );
    case "Polygon":
      return (
        <RLayer
          id={id}
          source="data"
          type="fill"
          paint={{
            "fill-color": "rgba(136, 136, 136, 0.1)",
            "fill-outline-color": "#888",
          }}
          onClick={handleClick}
        />
      );
    case "MultiPoint":
      return (
        <RLayer
          id={id}
          source="data"
          type="circle"
          paint={{
            "circle-color": "#888",
            "circle-radius": 6,
          }}
          onClick={handleClick}
        />
      );
    case "MultiLineString":
      return (
        <RLayer
          id={id}
          source="data"
          type="line"
          paint={{
            "line-color": "#888",
            "line-width": 8,
          }}
          onClick={handleClick}
        />
      );
    case "MultiPolygon":
      return (
        <RLayer
          id={id}
          source="data"
          type="fill"
          paint={{
            "fill-color": "rgba(136, 136, 136, 0.1)",
            "fill-outline-color": "#888",
          }}
          onClick={handleClick}
        />
      );
    case "GeometryCollection":
      // For GeometryCollection, render each geometry individually
      return (
        <>
          {feature.geometry.geometries.map((geom, geomIndex) => (
            <DrawFeatureWithPopup
              key={`${id}-${geomIndex}`}
              feature={{
                ...feature,
                geometry: geom,
              }}
              index={index * 1000 + geomIndex}
              onFeatureClick={onFeatureClick}
            />
          ))}
        </>
      );
    default:
      return null;
  }
}

interface GeoJsonMapWithPopupsProps {
  data: GeoJSON.FeatureCollection;
}

/**
 * GeoJsonMapWithPopups component renders a complete map with GeoJSON features and popup support.
 *
 * This component uses DrawFeatureWithPopup to render each feature and displays a popup
 * when features are clicked. The popup shows:
 * - Feature name/title from properties
 * - All feature properties in a key-value format
 * - Geometry type and coordinates
 *
 * Features are clickable and the popup can be closed by clicking elsewhere on the map.
 *
 * @param data - GeoJSON FeatureCollection to display on the map
 */
export function GeoJsonMapWithPopups({ data }: GeoJsonMapWithPopupsProps) {
  const [popupInfo, setPopupInfo] = useState<{
    feature: GeoJSON.Feature;
    coordinates: [number, number];
  } | null>(null);

  const { bearing, center, zoom } = mapFitFeatures(data, [600, 400]);

  const handleFeatureClick = (
    feature: GeoJSON.Feature,
    coordinates: [number, number]
  ) => {
    setPopupInfo({ feature, coordinates });
  };

  const handleMapClick = () => {
    setPopupInfo(null);
  };

  return (
    <div className="h-[45vw] w-full overflow-hidden rounded-md border border-gray-200">
      <RMap
        minZoom={0}
        initialCenter={center}
        initialZoom={zoom}
        initialBearing={bearing}
        mapStyle="https://tiles.openfreemap.org/styles/bright"
        scrollZoom={false}
        onClick={handleMapClick}
      >
        <RFullscreenControl />
        <RNavigationControl position="top-right" visualizePitch={true} />
        <RSource key="data" id="data" type="geojson" data={data} />
        {data.features.map((feature, index) => (
          <DrawFeatureWithPopup
            key={feature.id || index}
            feature={feature}
            index={index}
            onFeatureClick={handleFeatureClick}
          />
        ))}

        {popupInfo && (
          <RPopup
            longitude={popupInfo.coordinates[0]}
            latitude={popupInfo.coordinates[1]}
            onMapClick={() => setPopupInfo(null)}
            maxWidth="300px"
          >
            <div className="p-2">
              <h3 className="mb-2 text-sm font-semibold">
                {popupInfo.feature.properties?.name ||
                  popupInfo.feature.properties?.title ||
                  `Feature ${popupInfo.feature.id || "Unknown"}`}
              </h3>

              {popupInfo.feature.properties && (
                <div className="space-y-1 text-xs">
                  {Object.entries(popupInfo.feature.properties).map(
                    ([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium text-gray-600">
                          {key}:
                        </span>
                        <span className="text-gray-800">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

              <div className="mt-2 border-t border-gray-200 pt-2">
                <div className="text-xs text-gray-500">
                  <div>Type: {popupInfo.feature.geometry.type}</div>
                  <div>
                    Coordinates: {popupInfo.coordinates[0].toFixed(6)},{" "}
                    {popupInfo.coordinates[1].toFixed(6)}
                  </div>
                </div>
              </div>
            </div>
          </RPopup>
        )}
      </RMap>
    </div>
  );
}
