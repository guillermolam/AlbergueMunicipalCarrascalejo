import React, { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import DeckGL from "@deck.gl/react";
import { PolygonLayer, GeoJsonLayer, IconLayer } from "@deck.gl/layers";
import type { FeatureCollection } from "geojson";
import styles from "./Hostel3DMap.module.css";

// Hostel location and parcel polygon
const HOSTEL_COORDS: [number, number] = [-6.33643424, 39.0237316];
const HOSTEL_PARCEL = [
  [
    [-6.33683342224783, 39.0239355547523],
    [-6.33698461893749, 39.0239382886597],
    [-6.33711270189528, 39.0239598645919],
    [-6.33759893378039, 39.0241903570446],
    [-6.33760463600712, 39.0241922892074],
    [-6.33774067263712, 39.0241343139493],
    [-6.337905510814, 39.0240997949808],
    [-6.33808417875299, 39.0241706367513],
    [-6.33818883506123, 39.0242223092704],
    [-6.33825689974765, 39.0242305313978],
    [-6.33825888515365, 39.0242299461059],
    [-6.33821982095171, 39.0241906736224],
    [-6.33818395882724, 39.0241614747028],
    [-6.33814808126133, 39.0241266896211],
    [-6.33810992962716, 39.0240846450841],
    [-6.33807640784608, 39.0240454091443],
    [-6.33804633152809, 39.0240097655833],
    [-6.33786465599791, 39.0238718479061],
    [-6.33754684574956, 39.023634126659],
    [-6.33740691814011, 39.023503536999],
    [-6.33725335044535, 39.0233086691552],
    [-6.33722847533949, 39.0233081368273],
    [-6.33700413298683, 39.0232805505239],
    [-6.33689833655571, 39.0232675426925],
    [-6.33680331239796, 39.0232558576139],
    [-6.33673720182603, 39.0232477296872],
    [-6.33661879964328, 39.0232331680135],
    [-6.3364342868886, 39.0232104784132],
    [-6.33624972729918, 39.0231878057614],
    [-6.33606520860565, 39.0231651205301],
    [-6.33590128683075, 39.0231449420303],
    [-6.33588074268571, 39.0231424139811],
    [-6.33568267553717, 39.0231180587695],
    [-6.33577372015411, 39.0229469203798],
    [-6.33533589540283, 39.0231970621766],
    [-6.33536181615248, 39.0232218806287],
    [-6.33504167964385, 39.0234260923926],
    [-6.33475577374852, 39.023606837565],
    [-6.3346596931458, 39.0236697259289],
    [-6.33464608146261, 39.023793838819],
    [-6.33464057453927, 39.0239987662468],
    [-6.3345942601072, 39.0241556377655],
    [-6.33458359211148, 39.0243226935055],
    [-6.33456403766845, 39.0244466661062],
    [-6.33457750434695, 39.0244417483687],
    [-6.33473541134361, 39.0244624741503],
    [-6.33491902949468, 39.024463160448],
    [-6.33526189358185, 39.0243995546706],
    [-6.33552066829085, 39.0243240271547],
    [-6.33593832877769, 39.0242554634487],
    [-6.336293132451, 39.0241939278452],
    [-6.33643141175623, 39.0241163679082],
    [-6.33654596664503, 39.0240737583096],
    [-6.33672885058153, 39.0240537062811],
    [-6.33683342224783, 39.0239355547523]
  ]
];

// Example OSM buildings GeoJSON (replace with real data for production)
const OSM_BUILDINGS: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-6.3367, 39.0239],
            [-6.3366, 39.0239],
            [-6.3366, 39.0238],
            [-6.3367, 39.0238],
            [-6.3367, 39.0239],
          ],
        ],
      },
      properties: { "height": 8, "name": "Hostel Building" },
    },
  ],
};

const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

export default function Hostel3DMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: HOSTEL_COORDS,
      zoom: 17.2,
      pitch: 45,
      bearing: -20,
    });
    return () => mapRef.current?.remove();
  }, []);

  // Deck.gl layers
  const layers = [
    new PolygonLayer({
      id: "hostel-parcel",
      data: [HOSTEL_PARCEL],
      getPolygon: d => d,
      getFillColor: [168, 158, 120, 180], // earth color
      getLineColor: [80, 60, 20, 255],
      lineWidthMinPixels: 2,
      extruded: true,
      wireframe: true,
      elevationScale: 2,
      getElevation: 2,
      pickable: true,
    }),
    new GeoJsonLayer({
      id: "osm-buildings",
      data: OSM_BUILDINGS,
      extruded: true,
      getElevation: f => f.properties.height || 6,
      getFillColor: [240, 234, 216, 220],
      getLineColor: [120, 100, 80, 255],
      lineWidthMinPixels: 1,
      pickable: true,
    }),
    new IconLayer({
      id: "hostel-marker",
      data: [{ position: HOSTEL_COORDS }],
      getIcon: () => ({
        url: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
        width: 64,
        height: 64,
        anchorY: 64,
      }),
      getPosition: (d: { position: [number, number] }) => d.position,
      sizeScale: 8,
      pickable: true,
    }),
  ];

  return (
    <div className={styles["hostel3dmap-container"]}>
      <div ref={mapContainer} className={styles["hostel3dmap-map"]} />
      <DeckGL
        layers={layers}
        initialViewState={{
          longitude: HOSTEL_COORDS[0],
          latitude: HOSTEL_COORDS[1],
          zoom: 17.2,
          pitch: 45,
          bearing: -20,
        }}
        controller={true}
        style={{ position: "absolute", width: "100%", height: "100%", pointerEvents: "none" }}
      />
    </div>
  );
}
