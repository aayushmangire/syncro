"""
SYNCRO — FastAPI Server
Serves the frontend + REST API for the equilibrium engine.
"""

import os
import json
import traceback
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine import (
    RoadNetwork, Edge, load_network_osmnx, create_braess_network,
    run_equilibrium, bpr_time, bpr_fuel
)

app = FastAPI(title="Syncro API", version="1.0.0")

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-memory network cache ───
_networks = {}


def _get_cache_key(lat, lon, radius):
    return f"{lat:.4f}_{lon:.4f}_{radius}"


# ═══════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "syncro"}


@app.get("/api/network")
async def get_network(
    lat: float = Query(..., description="Center latitude"),
    lon: float = Query(..., description="Center longitude"),
    radius: int = Query(1000, description="Radius in meters", ge=200, le=3000),
):
    """Load a road network from OpenStreetMap and return as GeoJSON."""
    cache_key = _get_cache_key(lat, lon, radius)

    if cache_key not in _networks:
        try:
            network = load_network_osmnx(lat, lon, radius)
            _networks[cache_key] = network
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(500, f"Failed to load network: {str(e)}")

    network = _networks[cache_key]
    return network_to_geojson(network)


@app.get("/api/network/braess")
async def get_braess_network():
    """Get the synthetic Braess paradox network."""
    if 'braess' not in _networks:
        _networks['braess'] = create_braess_network()
    return network_to_geojson(_networks['braess'])


class RouteRequest(BaseModel):
    lat: float
    lon: float
    radius: int = 1000
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float
    mode: str = "fastest"        # "fastest" or "fuel_efficient"
    routing: str = "selfish"     # "selfish" or "optimal"
    drivers: int = 500


@app.post("/api/route")
async def find_route(req: RouteRequest):
    """Find a route between two points on the loaded network."""
    cache_key = _get_cache_key(req.lat, req.lon, req.radius)

    if cache_key not in _networks:
        try:
            network = load_network_osmnx(req.lat, req.lon, req.radius)
            _networks[cache_key] = network
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(500, f"Failed to load network: {str(e)}")

    network = _networks[cache_key]

    # Find nearest nodes
    origin_node = network.find_nearest_node(req.origin_lat, req.origin_lon)
    dest_node = network.find_nearest_node(req.dest_lat, req.dest_lon)

    if origin_node is None or dest_node is None:
        raise HTTPException(400, "Could not find nodes near the specified coordinates")

    if origin_node == dest_node:
        raise HTTPException(400, "Origin and destination are the same node")

    # Run equilibrium first if drivers > 0
    if req.drivers > 0:
        od_pairs = [(origin_node, dest_node, req.drivers)]
        run_equilibrium(
            network, od_pairs,
            mode=req.routing,
            iterations=25,
            weight='time' if req.mode == 'fastest' else 'fuel'
        )

    # Find routes
    weight = 'time' if req.mode == 'fastest' else 'fuel'
    path_nodes, cost, path_edges = network.shortest_path(origin_node, dest_node, weight=weight)

    if path_nodes is None:
        raise HTTPException(404, "No route found between the selected points")

    # Also compute the alternative route for comparison
    alt_weight = 'fuel' if req.mode == 'fastest' else 'time'
    alt_nodes, alt_cost, alt_edges = network.shortest_path(origin_node, dest_node, weight=alt_weight)

    # Build route GeoJSON
    route_geojson = build_route_geojson(network, path_nodes, path_edges, 'primary')
    alt_geojson = build_route_geojson(network, alt_nodes, alt_edges, 'alternative') if alt_nodes else None

    # Calculate stats for primary route
    total_distance = sum(network.edges[ek].distance for ek in path_edges)
    total_time = sum(network.edges[ek].time for ek in path_edges)
    total_fuel = sum(network.edges[ek].fuel for ek in path_edges)

    # Stats for alt route
    alt_stats = None
    if alt_nodes:
        alt_distance = sum(network.edges[ek].distance for ek in alt_edges)
        alt_time = sum(network.edges[ek].time for ek in alt_edges)
        alt_fuel = sum(network.edges[ek].fuel for ek in alt_edges)
        alt_stats = {
            'distance_km': round(alt_distance, 2),
            'time_min': round(alt_time, 1),
            'fuel_liters': round(alt_fuel, 3),
            'type': 'fuel_efficient' if req.mode == 'fastest' else 'fastest',
        }

    return {
        'route': route_geojson,
        'alternative': alt_geojson,
        'stats': {
            'distance_km': round(total_distance, 2),
            'time_min': round(total_time, 1),
            'fuel_liters': round(total_fuel, 3),
            'type': req.mode,
            'routing': req.routing,
            'drivers': req.drivers,
        },
        'alt_stats': alt_stats,
        'origin': {'lat': network.nodes[origin_node]['lat'],
                    'lon': network.nodes[origin_node]['lon'],
                    'node_id': str(origin_node)},
        'destination': {'lat': network.nodes[dest_node]['lat'],
                        'lon': network.nodes[dest_node]['lon'],
                        'node_id': str(dest_node)},
    }


class EquilibriumRequest(BaseModel):
    lat: float
    lon: float
    radius: int = 1000
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float
    drivers: int = 500
    mode: str = "selfish"
    weight: str = "time"


@app.post("/api/equilibrium")
async def run_equilibrium_api(req: EquilibriumRequest):
    """Run equilibrium assignment and return network with flows."""
    cache_key = _get_cache_key(req.lat, req.lon, req.radius)

    if cache_key not in _networks:
        try:
            network = load_network_osmnx(req.lat, req.lon, req.radius)
            _networks[cache_key] = network
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(500, f"Failed to load network: {str(e)}")

    network = _networks[cache_key]
    origin = network.find_nearest_node(req.origin_lat, req.origin_lon)
    dest = network.find_nearest_node(req.dest_lat, req.dest_lon)

    if not origin or not dest:
        raise HTTPException(400, "Could not find nodes")

    od_pairs = [(origin, dest, req.drivers)]
    stats = run_equilibrium(network, od_pairs, mode=req.mode,
                            iterations=25, weight=req.weight)

    # Return network with flow data
    geojson = network_to_geojson(network, include_flow=True)

    return {
        'network': geojson,
        'stats': stats,
    }


@app.post("/api/clear")
async def clear_cache():
    """Clear cached networks."""
    _networks.clear()
    return {"status": "cleared"}


# ═══════════════════════════════════════════════════════════════
# GeoJSON Helpers
# ═══════════════════════════════════════════════════════════════

def network_to_geojson(network: RoadNetwork, include_flow: bool = False) -> dict:
    """Convert network to GeoJSON FeatureCollection."""
    features = []

    for ekey, edge in network.edges.items():
        coords = edge.geometry or []
        if not coords:
            n1 = network.nodes.get(edge.u, {})
            n2 = network.nodes.get(edge.v, {})
            if n1 and n2:
                coords = [[n1['lon'], n1['lat']], [n2['lon'], n2['lat']]]

        props = {
            'name': edge.name,
            'distance_km': round(edge.distance, 3),
            'speed_kmh': round(edge.speed, 1),
            'capacity': edge.capacity,
            'free_flow_time': round(edge.free_flow_time, 3),
        }
        if include_flow:
            props['flow'] = round(edge.flow, 1)
            props['time'] = round(edge.time, 3)
            props['fuel'] = round(edge.fuel, 4)
            props['congestion'] = round(edge.flow / edge.capacity, 2) if edge.capacity > 0 else 0

        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': coords,
            },
            'properties': props,
        })

    # Also add nodes
    for nid, data in network.nodes.items():
        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [data['lon'], data['lat']],
            },
            'properties': {
                'node_id': str(nid),
                'type': 'node',
            },
        })

    return {
        'type': 'FeatureCollection',
        'features': features,
        'metadata': {
            'node_count': len(network.nodes),
            'edge_count': len(network.edges),
        }
    }


def build_route_geojson(network: RoadNetwork, path_nodes: list,
                        path_edges: list, route_type: str) -> dict:
    """Build GeoJSON for a route."""
    coordinates = []
    for ekey in path_edges:
        edge = network.edges[ekey]
        geom = edge.geometry or []
        if not geom:
            n1 = network.nodes.get(edge.u, {})
            n2 = network.nodes.get(edge.v, {})
            if n1 and n2:
                geom = [[n1['lon'], n1['lat']], [n2['lon'], n2['lat']]]
        # Append coordinates (skip first point if it duplicates the last)
        for i, coord in enumerate(geom):
            if i == 0 and coordinates and coordinates[-1] == coord:
                continue
            coordinates.append(coord)

    return {
        'type': 'Feature',
        'geometry': {
            'type': 'LineString',
            'coordinates': coordinates,
        },
        'properties': {
            'route_type': route_type,
        }
    }


# ═══════════════════════════════════════════════════════════════
# Serve Frontend
# ═══════════════════════════════════════════════════════════════

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


@app.get("/")
async def serve_index():
    return FileResponse(FRONTEND_DIR / "index.html")


# Mount static files last
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")


# ═══════════════════════════════════════════════════════════════
# Entry point
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    print("\n  >> Syncro server starting at http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
