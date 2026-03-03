import { Fragment, useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, Rectangle, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import type { Geofence, Vehicle } from '../../types';
import { STATUS_META } from '../../utils/format';

interface MineMapProps {
  vehicles: Vehicle[];
  geofences: Geofence[];
  selectedVehicleId?: string;
  showTrails?: boolean;
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

interface RenderedGeofence {
  id: string;
  name: string;
  color: string;
  bounds: LatLngBoundsExpression;
}

const DEFAULT_CENTER: LatLngExpression = [-12.0643, -76.9725];
const DEFAULT_ZOOM = 13;

function isValidLatLon(lat: number, lon: number) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function computeTrail(vehicle: Vehicle): LatLngExpression[] | null {
  if (!isValidLatLon(vehicle.lat, vehicle.lon) || vehicle.speedKmh <= 0) return null;
  const heading = Number.isFinite(vehicle.headingDeg) ? vehicle.headingDeg : 0;
  const backwards = (heading + 180) * (Math.PI / 180);
  const distance = Math.max(0.0002, Math.min(0.0018, vehicle.speedKmh / 50000));
  const latOffset = Math.cos(backwards) * distance;
  const lonOffset = Math.sin(backwards) * distance;
  return [
    [vehicle.lat, vehicle.lon],
    [vehicle.lat + latOffset, vehicle.lon + lonOffset],
  ];
}

function buildGeofenceBounds(vehicles: Vehicle[], geofences: Geofence[]): RenderedGeofence[] {
  if (!geofences.length) return [];
  const points = vehicles.filter((vehicle) => isValidLatLon(vehicle.lat, vehicle.lon));
  if (!points.length) return [];

  const latitudes = points.map((vehicle) => vehicle.lat);
  const longitudes = points.map((vehicle) => vehicle.lon);
  const rawMinLat = Math.min(...latitudes);
  const rawMaxLat = Math.max(...latitudes);
  const rawMinLon = Math.min(...longitudes);
  const rawMaxLon = Math.max(...longitudes);

  const latSpan = Math.max(rawMaxLat - rawMinLat, 0.01);
  const lonSpan = Math.max(rawMaxLon - rawMinLon, 0.01);
  const minLat = rawMinLat - latSpan * 0.18;
  const maxLat = rawMaxLat + latSpan * 0.18;
  const minLon = rawMinLon - lonSpan * 0.18;
  const maxLon = rawMaxLon + lonSpan * 0.18;

  return geofences.map((fence) => {
    const x1 = clamp01(fence.x / 100);
    const x2 = clamp01((fence.x + fence.width) / 100);
    const y1 = clamp01(fence.y / 100);
    const y2 = clamp01((fence.y + fence.height) / 100);

    const north = maxLat - y1 * (maxLat - minLat);
    const south = maxLat - y2 * (maxLat - minLat);
    const west = minLon + x1 * (maxLon - minLon);
    const east = minLon + x2 * (maxLon - minLon);

    return {
      id: fence.id,
      name: fence.name,
      color: fence.color,
      bounds: [
        [south, west],
        [north, east],
      ] as LatLngBoundsExpression,
    };
  });
}

function MapAutoView({ points }: { points: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }

    map.fitBounds(points as LatLngBoundsExpression, {
      padding: [28, 28],
      maxZoom: 16,
    });
  }, [map, points]);

  return null;
}

export function MineMap({
  vehicles,
  geofences,
  selectedVehicleId,
  showTrails = false,
  onSelectVehicle,
}: MineMapProps) {
  const validVehicles = useMemo(
    () => vehicles.filter((vehicle) => isValidLatLon(vehicle.lat, vehicle.lon)),
    [vehicles]
  );

  const markerPoints = useMemo<LatLngExpression[]>(
    () => validVehicles.map((vehicle) => [vehicle.lat, vehicle.lon]),
    [validVehicles]
  );

  const renderedGeofences = useMemo(
    () => buildGeofenceBounds(validVehicles, geofences),
    [geofences, validVehicles]
  );

  return (
    <MapContainer className="mine-map" center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapAutoView points={markerPoints} />

      {renderedGeofences.map((fence) => (
        <Rectangle
          key={fence.id}
          bounds={fence.bounds}
          pathOptions={{ color: fence.color, weight: 1.2, dashArray: '6 4', fillOpacity: 0.14 }}
        >
          <Tooltip sticky>{fence.name}</Tooltip>
        </Rectangle>
      ))}

      {validVehicles.map((vehicle) => {
        const statusMeta = STATUS_META[vehicle.status];
        const trail = showTrails ? computeTrail(vehicle) : null;

        return (
          <Fragment key={vehicle.id}>
            {trail ? <Polyline positions={trail} pathOptions={{ color: statusMeta.dot, opacity: 0.8, weight: 3 }} /> : null}

            <CircleMarker
              center={[vehicle.lat, vehicle.lon]}
              radius={vehicle.id === selectedVehicleId ? 9 : 7}
              pathOptions={{
                color: '#0b0f14',
                weight: 1.5,
                fillColor: statusMeta.dot,
                fillOpacity: 0.95,
              }}
              eventHandlers={{
                click: () => onSelectVehicle?.(vehicle),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <div className="map-tooltip">
                  <strong>{vehicle.id}</strong>
                  <div>{vehicle.typeLabel}</div>
                  <div>{vehicle.speedKmh.toFixed(1)} km/h</div>
                  <div>Temp {vehicle.tempC.toFixed(1)} C</div>
                </div>
              </Tooltip>
            </CircleMarker>
          </Fragment>
        );
      })}
    </MapContainer>
  );
}