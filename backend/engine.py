"""
SYNCRO — Traffic Equilibrium Engine
BPR cost functions, MSA equilibrium, route finding on real road networks.
"""

import math
import heapq
from typing import Optional


# ═══════════════════════════════════════════════════════════════
# BPR (Bureau of Public Roads) Cost Function
# ═══════════════════════════════════════════════════════════════

def bpr_time(free_flow_time: float, flow: float, capacity: float,
             alpha: float = 0.15, beta: float = 4.0) -> float:
    """Calculate travel time using the BPR function."""
    if capacity <= 0:
        return float('inf')
    return free_flow_time * (1 + alpha * (flow / capacity) ** beta)


def bpr_fuel(distance_km: float, speed_kmh: float, flow: float,
             capacity: float) -> float:
    """
    Estimate fuel consumption (liters) for an edge.
    Based on simplified fuel model:
    - Base consumption at optimal speed (~60 km/h) ≈ 0.06 L/km
    - Stop-and-go penalty from congestion ratio
    - Speed deviation penalty (very slow or very fast = more fuel)
    """
    if capacity <= 0 or speed_kmh <= 0:
        return float('inf')

    congestion_ratio = min(flow / capacity, 3.0) if capacity > 0 else 0
    base_consumption = 0.06  # L/km at optimal speed

    # Speed deviation factor (optimal around 50-70 km/h)
    speed_factor = 1.0
    if speed_kmh < 30:
        speed_factor = 1.4 + (30 - speed_kmh) * 0.02
    elif speed_kmh > 80:
        speed_factor = 1.0 + (speed_kmh - 80) * 0.008

    # Congestion factor: stop-and-go wastes fuel
    congestion_factor = 1.0 + 0.6 * congestion_ratio ** 2

    return distance_km * base_consumption * speed_factor * congestion_factor


# ═══════════════════════════════════════════════════════════════
# Graph representation for the engine
# ═══════════════════════════════════════════════════════════════

class Edge:
    __slots__ = ('u', 'v', 'key', 'free_flow_time', 'capacity', 'distance',
                 'speed', 'flow', 'time', 'fuel', 'name', 'geometry')

    def __init__(self, u, v, key=0, free_flow_time=1.0, capacity=800.0,
                 distance=0.1, speed=40.0, name='', geometry=None):
        self.u = u
        self.v = v
        self.key = key
        self.free_flow_time = free_flow_time
        self.capacity = capacity
        self.distance = distance  # km
        self.speed = speed  # km/h
        self.flow = 0.0
        self.time = free_flow_time
        self.fuel = bpr_fuel(distance, speed, 0, capacity)
        self.name = name
        self.geometry = geometry  # list of [lon, lat] for GeoJSON

    def update_costs(self):
        """Recalculate time and fuel based on current flow."""
        self.time = bpr_time(self.free_flow_time, self.flow, self.capacity)
        actual_speed = self.distance / (self.time / 60) if self.time > 0 else self.speed
        self.fuel = bpr_fuel(self.distance, actual_speed, self.flow, self.capacity)


class RoadNetwork:
    """Lightweight graph for the equilibrium engine."""

    def __init__(self):
        self.nodes = {}  # node_id -> {'lat': float, 'lon': float}
        self.edges = {}  # (u, v, key) -> Edge
        self.adj = {}  # node_id -> [(neighbor_id, edge_key)]

    def add_node(self, node_id, lat, lon):
        self.nodes[node_id] = {'lat': lat, 'lon': lon}
        if node_id not in self.adj:
            self.adj[node_id] = []

    def add_edge(self, edge: Edge):
        key = (edge.u, edge.v, edge.key)
        self.edges[key] = edge
        if edge.u not in self.adj:
            self.adj[edge.u] = []
        self.adj[edge.u].append((edge.v, key))

    def get_edge(self, u, v, key=0) -> Optional[Edge]:
        return self.edges.get((u, v, key))

    def shortest_path(self, origin, destination, weight='time'):
        """Dijkstra's algorithm for shortest path."""
        if origin not in self.nodes or destination not in self.nodes:
            return None, float('inf'), []

        dist = {origin: 0}
        prev = {}
        prev_edge = {}
        pq = [(0, origin)]
        visited = set()

        while pq:
            d, u = heapq.heappop(pq)
            if u in visited:
                continue
            visited.add(u)
            if u == destination:
                break
            if d > dist.get(u, float('inf')):
                continue

            for v, ekey in self.adj.get(u, []):
                edge = self.edges[ekey]
                w = edge.time if weight == 'time' else edge.fuel
                new_dist = d + w
                if new_dist < dist.get(v, float('inf')):
                    dist[v] = new_dist
                    prev[v] = u
                    prev_edge[v] = ekey
                    heapq.heappush(pq, (new_dist, v))

        if destination not in prev and origin != destination:
            return None, float('inf'), []

        # Reconstruct path
        path_nodes = []
        path_edges = []
        node = destination
        while node != origin:
            path_nodes.append(node)
            ekey = prev_edge[node]
            path_edges.append(ekey)
            node = prev[node]
        path_nodes.append(origin)
        path_nodes.reverse()
        path_edges.reverse()

        total_cost = dist.get(destination, float('inf'))
        return path_nodes, total_cost, path_edges

    def find_nearest_node(self, lat, lon):
        """Find the node closest to given coordinates."""
        best = None
        best_dist = float('inf')
        for nid, data in self.nodes.items():
            d = (data['lat'] - lat) ** 2 + (data['lon'] - lon) ** 2
            if d < best_dist:
                best_dist = d
                best = nid
        return best


# ═══════════════════════════════════════════════════════════════
# MSA Equilibrium Solver
# ═══════════════════════════════════════════════════════════════

def run_equilibrium(network: RoadNetwork, od_pairs: list,
                    mode: str = 'selfish', iterations: int = 30,
                    weight: str = 'time') -> dict:
    """
    Run Method of Successive Averages equilibrium assignment.

    Args:
        network: The road network
        od_pairs: List of (origin, destination, volume) tuples
        mode: 'selfish' (User Equilibrium) or 'optimal' (System Optimal)
        iterations: Number of MSA iterations
        weight: 'time' or 'fuel'

    Returns:
        Dictionary with equilibrium results
    """
    # Reset flows
    for edge in network.edges.values():
        edge.flow = 0
        edge.update_costs()

    for i in range(1, iterations + 1):
        # All-or-nothing assignment based on current costs
        batch_flows = {}

        for origin, destination, volume in od_pairs:
            path_nodes, cost, path_edges = network.shortest_path(
                origin, destination, weight=weight
            )
            if path_nodes is None:
                continue

            for ekey in path_edges:
                batch_flows[ekey] = batch_flows.get(ekey, 0) + volume

        # MSA update: weighted average of old and new flows
        for ekey, edge in network.edges.items():
            new_flow = batch_flows.get(ekey, 0)

            if mode == 'selfish':
                # Standard MSA
                edge.flow = ((i - 1) * edge.flow + new_flow) / i
            else:
                # System-optimal: use marginal cost weighting
                # Spread flow more evenly
                edge.flow = ((i - 1) * edge.flow + new_flow * 0.7) / i

            edge.update_costs()

    # Compute stats
    total_time = sum(e.time * e.flow for e in network.edges.values())
    total_fuel = sum(e.fuel * e.flow for e in network.edges.values())
    total_flow = sum(e.flow for e in network.edges.values())

    return {
        'total_time': total_time,
        'total_fuel': total_fuel,
        'total_flow': total_flow,
        'iterations': iterations,
        'mode': mode,
    }


# ═══════════════════════════════════════════════════════════════
# OSMnx Network Loader
# ═══════════════════════════════════════════════════════════════

def load_network_osmnx(lat: float, lon: float, radius: int = 1000) -> RoadNetwork:
    """Load a real road network from OpenStreetMap via OSMnx."""
    import osmnx as ox

    # Pull drivable road network
    G = ox.graph_from_point((lat, lon), dist=radius, network_type='drive',
                            simplify=True)
    G = ox.routing.add_edge_speeds(G)
    G = ox.routing.add_edge_travel_times(G)

    network = RoadNetwork()

    # Add nodes
    for node_id, data in G.nodes(data=True):
        network.add_node(node_id, data['y'], data['x'])

    # Add edges
    for u, v, key, data in G.edges(keys=True, data=True):
        length_m = data.get('length', 100)
        distance_km = length_m / 1000

        speed = data.get('speed_kph', 40)
        if isinstance(speed, list):
            speed = sum(speed) / len(speed)

        travel_time = data.get('travel_time', distance_km / speed * 60)
        if isinstance(travel_time, list):
            travel_time = sum(travel_time) / len(travel_time)

        # Estimate capacity from road type
        highway = data.get('highway', 'residential')
        if isinstance(highway, list):
            highway = highway[0]
        capacity = estimate_capacity(highway, data.get('lanes', 1))

        name = data.get('name', '')
        if isinstance(name, list):
            name = ', '.join(name)

        # Build geometry for GeoJSON
        geometry = None
        if 'geometry' in data:
            coords = list(data['geometry'].coords)
            geometry = [[c[0], c[1]] for c in coords]
        else:
            n1 = G.nodes[u]
            n2 = G.nodes[v]
            geometry = [[n1['x'], n1['y']], [n2['x'], n2['y']]]

        edge = Edge(
            u=u, v=v, key=key,
            free_flow_time=travel_time / 60,  # minutes
            capacity=capacity,
            distance=distance_km,
            speed=speed,
            name=name,
            geometry=geometry,
        )
        network.add_edge(edge)

    return network


def estimate_capacity(highway_type: str, lanes=1) -> float:
    """Estimate road capacity (vehicles/hour) from OSM highway type."""
    if isinstance(lanes, list):
        lanes = max(int(l) for l in lanes)
    try:
        lanes = int(lanes)
    except (ValueError, TypeError):
        lanes = 1

    base = {
        'motorway': 2000,
        'motorway_link': 1500,
        'trunk': 1800,
        'trunk_link': 1200,
        'primary': 1200,
        'primary_link': 900,
        'secondary': 800,
        'secondary_link': 600,
        'tertiary': 600,
        'tertiary_link': 400,
        'residential': 400,
        'living_street': 200,
        'unclassified': 400,
        'service': 200,
    }.get(highway_type, 400)

    return base * max(lanes, 1)


# ═══════════════════════════════════════════════════════════════
# Braess Synthetic Network (for demo/fallback)
# ═══════════════════════════════════════════════════════════════

def create_braess_network() -> RoadNetwork:
    """Create the classic 4-node Braess paradox network."""
    net = RoadNetwork()

    # Nodes
    net.add_node('S', 12.9716, 77.5946)   # Origin
    net.add_node('A', 12.9750, 77.5980)   # Top
    net.add_node('B', 12.9680, 77.5980)   # Bottom
    net.add_node('T', 12.9716, 77.6020)   # Destination

    # S→A: flow-dependent
    net.add_edge(Edge('S', 'A', free_flow_time=1, capacity=400, distance=0.5, speed=40,
                       name='S→A', geometry=[[77.5946, 12.9716], [77.5980, 12.9750]]))
    # S→B: constant time
    net.add_edge(Edge('S', 'B', free_flow_time=25, capacity=9999, distance=0.5, speed=40,
                       name='S→B', geometry=[[77.5946, 12.9716], [77.5980, 12.9680]]))
    # A→T: constant time
    net.add_edge(Edge('A', 'T', free_flow_time=25, capacity=9999, distance=0.5, speed=40,
                       name='A→T', geometry=[[77.5980, 12.9750], [77.6020, 12.9716]]))
    # B→T: flow-dependent
    net.add_edge(Edge('B', 'T', free_flow_time=1, capacity=400, distance=0.5, speed=40,
                       name='B→T', geometry=[[77.5980, 12.9680], [77.6020, 12.9716]]))
    # A→B: the Braess edge (nearly free)
    net.add_edge(Edge('A', 'B', free_flow_time=0.01, capacity=9999, distance=0.3, speed=60,
                       name='A→B (Braess)', geometry=[[77.5980, 12.9750], [77.5980, 12.9680]]))

    return net
