import { GeoJsonMapWithPopups } from "@/components/outputs/shared-with-iframe/GeoJsonMapOutput";

const exampleGeoJsonData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "point-1",
      geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749], // San Francisco
      },
      properties: {
        name: "San Francisco",
        population: 873965,
        description: "A major city in California",
      },
    },
    {
      type: "Feature",
      id: "polygon-1",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.5, 37.7],
            [-122.3, 37.7],
            [-122.3, 37.8],
            [-122.5, 37.8],
            [-122.5, 37.7],
          ],
        ],
      },
      properties: {
        name: "Downtown Area",
        type: "commercial",
      },
    },
  ],
};

export const GeoJsonDemoPage = () => {
  return (
    <div>
      <GeoJsonMapWithPopups data={exampleGeoJsonData} />
    </div>
  );
};
