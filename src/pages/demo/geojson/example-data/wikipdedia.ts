const wikipediaTestData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [102.0, 0.5],
      },
      properties: {
        prop0: "value0",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [102.0, 0.0],
          [103.0, 1.0],
          [104.0, 0.0],
          [105.0, 1.0],
        ],
      },
      properties: {
        prop0: "value0",
        prop1: 0.0,
        name: "Zigzag Line",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [100.0, 0.0],
            [101.0, 0.0],
            [101.0, 1.0],
            [100.0, 1.0],
            [100.0, 0.0],
          ],
        ],
      },
      properties: {
        prop0: "value0",
        prop1: {
          this: "that",
        },
        name: "Square Polygon",
      },
    },
  ],
};

const pointFeature = wikipediaTestData.features[0];
const lineFeature = wikipediaTestData.features[1];
const polygonFeature = wikipediaTestData.features[2];

export { wikipediaTestData, pointFeature, lineFeature, polygonFeature };
