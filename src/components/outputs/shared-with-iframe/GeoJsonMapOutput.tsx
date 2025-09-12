import { mapFitFeatures } from "geojson-map-fit-mercator";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  RFullscreenControl,
  RLayer,
  RMap,
  RMarker,
  RNavigationControl,
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
          data={feature}
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
          data={feature}
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
