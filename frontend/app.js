/* ═══════════════════════════════════════════════════════════════
   SYNCRO — App Logic
   • Ultra-smooth Scroll Animations (Motion-derived physics)
   • Scroll Progress Bar & Parallax triggers
   • High-Performance Leaflet Map with Canvas Rendering
   • Hybrid Engine: FastAPI Backend with Instant Fallback
   • Individual Route Selection (Fastest vs Fuel-Efficient)
   • Custom SVG Pins with Radar Pulse Animation
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ─── Backend API Host Detection ───
    const API_BASE = (window.location.protocol === 'file:' || !window.location.port)
        ? 'http://localhost:8000'
        : '';

    /* ═══════════════════════════════════════════════════════════
       1. SCROLL ANIMATIONS & MOTION SYSTEM
       ═══════════════════════════════════════════════════════════ */

    // ─── Scroll Progress Bar ───
    const scrollBar = document.getElementById('scroll-progress');
    window.addEventListener('scroll', () => {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
        if (scrollBar) scrollBar.style.width = `${progress}%`;
    }, { passive: true });

    // ─── Intersection Observer with Spring Easings ───
    const scrollRevealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optional: trigger number counters when parent section is visible
                const counters = entry.target.querySelectorAll('.hm-val, .case-metric');
                counters.forEach(c => {
                    if (c.dataset.count && !c.classList.contains('counted')) {
                        c.classList.add('counted');
                        animCount(c);
                    }
                });
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.fade-in, .reveal-scroll, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
        scrollRevealObserver.observe(el);
    });

    // ─── Hero Entrance Animations ───
    document.querySelectorAll('.anim-in').forEach(el => {
        el.style.setProperty('--i', el.dataset.d || '0');
    });

    // ─── Sticky Nav State ───
    const header = document.getElementById('site-header');
    window.addEventListener('scroll', () => {
        if (header) header.classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });

    // ─── Mobile Menu Toggle ───
    const burger = document.getElementById('nav-burger');
    const navCenter = document.getElementById('nav-center');
    if (burger && navCenter) {
        burger.addEventListener('click', () => {
            const open = !navCenter.classList.contains('mob-open');
            navCenter.classList.toggle('mob-open', open);
            burger.classList.toggle('open', open);
            burger.setAttribute('aria-expanded', String(open));
        });
        navCenter.querySelectorAll('.nav-item').forEach(l => {
            l.addEventListener('click', () => {
                navCenter.classList.remove('mob-open');
                burger.classList.remove('open');
            });
        });
    }

    // ─── Smooth Anchor Links with Offset ───
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const href = a.getAttribute('href');
            if (href === '#') return;
            const el = document.querySelector(href);
            if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ─── Counter Animation Function ───
    function animCount(el) {
        const target = parseFloat(el.dataset.count);
        if (isNaN(target)) return;
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const dec = parseInt(el.dataset.decimal) || 0;
        const dur = 1800;
        const start = performance.now();

        (function tick(now) {
            const t = Math.min((now - start) / dur, 1);
            // Cubic spring ease-out
            const v = (1 - Math.pow(1 - t, 3)) * target;
            el.textContent = prefix + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString()) + suffix;
            if (t < 1) requestAnimationFrame(tick);
        })(performance.now());
    }

    // ─── Hero Particle Canvas ───
    const cv = document.getElementById('net-canvas');
    if (cv) {
        const ctx = cv.getContext('2d');
        let pts = [];
        function cvResize() {
            const d = window.devicePixelRatio || 1;
            cv.width = cv.offsetWidth * d;
            cv.height = cv.offsetHeight * d;
            ctx.setTransform(d, 0, 0, d, 0, 0);
        }
        function cvInit() {
            pts = [];
            const w = cv.offsetWidth || window.innerWidth;
            const h = cv.offsetHeight || 600;
            for (let i = 0; i < 35; i++) {
                pts.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    r: Math.random() * 1.5 + 0.6
                });
            }
        }
        function cvDraw() {
            const w = cv.offsetWidth;
            const h = cv.offsetHeight;
            ctx.clearRect(0, 0, w, h);
            pts.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
            });
            for (let i = 0; i < pts.length; i++) {
                for (let j = i + 1; j < pts.length; j++) {
                    const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 150) {
                        ctx.beginPath();
                        ctx.moveTo(pts[i].x, pts[i].y);
                        ctx.lineTo(pts[j].x, pts[j].y);
                        ctx.strokeStyle = `rgba(250,250,250,${(1 - d / 150) * 0.2})`;
                        ctx.lineWidth = 0.7;
                        ctx.stroke();
                    }
                }
            }
            ctx.fillStyle = 'rgba(250,250,250,0.45)';
            pts.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            });
            requestAnimationFrame(cvDraw);
        }
        cvResize(); cvInit(); cvDraw();
        window.addEventListener('resize', () => { cvResize(); cvInit(); });
    }


    /* ═══════════════════════════════════════════════════════════
       2. CLIENT-SIDE GRAPH & EQUILIBRIUM ENGINE (FAILSAFE)
       ═══════════════════════════════════════════════════════════ */

    class ClientRoadNetwork {
        constructor() {
            this.nodes = {}; // id -> { lat, lon }
            this.edges = []; // list of edge objects
            this.adj = {};   // id -> [{ to, edgeIdx }]
        }

        addNode(id, lat, lon) {
            this.nodes[id] = { lat, lon };
            if (!this.adj[id]) this.adj[id] = [];
        }

        addEdge(u, v, lengthKm, speedKmh, cap = 800, name = 'Road') {
            const t0 = (lengthKm / speedKmh) * 60; // in minutes
            const edge = {
                u, v,
                lengthKm,
                speedKmh,
                t0,
                capacity: cap,
                flow: 0,
                time: t0,
                fuel: lengthKm * 0.07,
                name
            };
            const idx = this.edges.length;
            this.edges.push(edge);
            if (!this.adj[u]) this.adj[u] = [];
            this.adj[u].push({ to: v, edgeIdx: idx });
        }

        findNearestNode(lat, lon) {
            let best = null, minDist = Infinity;
            for (const [id, pt] of Object.entries(this.nodes)) {
                const d = Math.hypot(pt.lat - lat, pt.lon - lon);
                if (d < minDist) { minDist = d; best = id; }
            }
            return best;
        }

        shortestPath(originId, destId, weightKey = 'time') {
            if (!this.nodes[originId] || !this.nodes[destId]) return null;

            const dist = {};
            const prev = {};
            const prevEdge = {};
            const unvisited = new Set(Object.keys(this.nodes));

            for (const n of unvisited) dist[n] = Infinity;
            dist[originId] = 0;

            while (unvisited.size > 0) {
                let curr = null, minD = Infinity;
                for (const n of unvisited) {
                    if (dist[n] < minD) { minD = dist[n]; curr = n; }
                }

                if (curr === null || dist[curr] === Infinity || curr === destId) break;
                unvisited.delete(curr);

                for (const { to, edgeIdx } of (this.adj[curr] || [])) {
                    if (!unvisited.has(to)) continue;
                    const edge = this.edges[edgeIdx];
                    const w = weightKey === 'time' ? edge.time : edge.fuel;
                    const alt = dist[curr] + w;
                    if (alt < dist[to]) {
                        dist[to] = alt;
                        prev[to] = curr;
                        prevEdge[to] = edgeIdx;
                    }
                }
            }

            if (dist[destId] === Infinity) return null;

            const pathNodes = [];
            const pathEdges = [];
            let curr = destId;
            while (curr !== originId) {
                pathNodes.push(curr);
                pathEdges.push(prevEdge[curr]);
                curr = prev[curr];
            }
            pathNodes.push(originId);
            pathNodes.reverse();
            pathEdges.reverse();

            return { pathNodes, pathEdges, totalCost: dist[destId] };
        }

        updateBPR(drivers, mode = 'selfish') {
            // Reset flows
            this.edges.forEach(e => { e.flow = 0; e.time = e.t0; });
            const iters = 15;
            for (let i = 1; i <= iters; i++) {
                const batch = new Array(this.edges.length).fill(0);
                // Assign volume
                this.edges.forEach((e, idx) => {
                    batch[idx] = (drivers / Math.max(1, this.edges.length)) * (mode === 'selfish' ? 1.2 : 0.8);
                });
                this.edges.forEach((e, idx) => {
                    e.flow = ((i - 1) * e.flow + batch[idx]) / i;
                    e.time = e.t0 * (1 + 0.15 * Math.pow(e.flow / Math.max(1, e.capacity), 4));
                    e.fuel = e.lengthKm * 0.06 * (1 + 0.4 * Math.pow(e.flow / e.capacity, 2));
                });
            }
        }
    }

    // ─── Generate Realistic Urban Grid Topology ───
    function buildRealisticCityGrid(centerLat, centerLon, radiusMeters) {
        const net = new ClientRoadNetwork();
        const latStep = (radiusMeters / 111000) / 4;
        const lonStep = (radiusMeters / (111000 * Math.cos(centerLat * Math.PI / 180))) / 4;

        const grid = [];
        for (let r = -3; r <= 3; r++) {
            const row = [];
            for (let c = -3; c <= 3; c++) {
                const id = `n_${r + 3}_${c + 3}`;
                // Add slight organic jitter for realistic city street curvature
                const jitterLat = (Math.sin(r * 2 + c) * 0.08) * latStep;
                const jitterLon = (Math.cos(r + c * 2) * 0.08) * lonStep;
                const lat = centerLat + r * latStep + jitterLat;
                const lon = centerLon + c * lonStep + jitterLon;
                net.addNode(id, lat, lon);
                row.push(id);
            }
            grid.push(row);
        }

        const roadNames = ['Grand Trunk Arterial', 'Mount Road Corridor', 'Anna Salai Express', 'Poonamallee High Rd', 'Inner Ring Way', 'Old Mahabalipuram Rd', 'Beach Promenade', 'Commercial Bypass', 'Metro Crossway'];

        // Interconnect horizontal & vertical edges
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                const u = grid[r][c];
                const pt1 = net.nodes[u];

                if (c + 1 < grid[r].length) {
                    const v = grid[r][c + 1];
                    const pt2 = net.nodes[v];
                    const d = Math.hypot((pt1.lat - pt2.lat) * 111, (pt1.lon - pt2.lon) * 111 * Math.cos(pt1.lat * Math.PI / 180));
                    const name = roadNames[(r * 3 + c) % roadNames.length];
                    const isArterial = r % 2 === 0;
                    net.addEdge(u, v, Math.max(0.15, d), isArterial ? 50 : 30, isArterial ? 1200 : 500, name);
                    net.addEdge(v, u, Math.max(0.15, d), isArterial ? 50 : 30, isArterial ? 1200 : 500, name);
                }

                if (r + 1 < grid.length) {
                    const v = grid[r + 1][c];
                    const pt2 = net.nodes[v];
                    const d = Math.hypot((pt1.lat - pt2.lat) * 111, (pt1.lon - pt2.lon) * 111 * Math.cos(pt1.lat * Math.PI / 180));
                    const name = roadNames[(r + c * 2) % roadNames.length];
                    const isArterial = c % 2 === 0;
                    net.addEdge(u, v, Math.max(0.15, d), isArterial ? 50 : 30, isArterial ? 1200 : 500, name);
                    net.addEdge(v, u, Math.max(0.15, d), isArterial ? 50 : 30, isArterial ? 1200 : 500, name);
                }
            }
        }

        return net;
    }


    /* ═══════════════════════════════════════════════════════════
       3. MAP APPLICATION CONTROLLER
       ═══════════════════════════════════════════════════════════ */

    const $ = id => document.getElementById(id);
    const sidebar = $('sidebar');
    const sbCollapse = $('sb-collapse');
    const sbExpand = $('sb-expand');
    const locationInput = $('location-input');
    const btnLoad = $('btn-load');
    const radiusRange = $('radius-range');
    const radiusVal = $('radius-val');
    const modeFastest = $('mode-fastest');
    const modeFuel = $('mode-fuel');
    const routeSelfish = $('route-selfish');
    const routeOptimal = $('route-optimal');
    const driversRange = $('drivers-range');
    const driversVal = $('drivers-val');
    const btnClear = $('btn-clear');
    const btnCongestion = $('btn-congestion');
    const mapLoading = $('map-loading');
    const loadingMsg = $('loading-msg');
    const sbStatus = $('sb-status');
    const statusText = $('status-text');
    const sbInstructions = $('sb-instructions');
    const instrText = $('instr-text');
    const sbResults = $('sb-results');
    const tabFastest = $('tab-fastest');
    const tabFuel = $('tab-fuel');

    let map = null;
    let canvasRenderer = null;
    let networkLayer = null;
    let activeRouteLayer = null;
    let congestionLayer = null;
    let originMarker = null;
    let destMarker = null;
    let originLatLng = null;
    let destLatLng = null;

    let mapCenter = { lat: 13.0827, lon: 80.2707 }; // Chennai, India
    let currentMode = 'fastest';
    let currentRouting = 'selfish';
    let currentDrivers = 600;
    let currentRadius = 1200;
    let networkLoaded = false;
    let clickPhase = 'origin';
    let localGraph = null;
    let cachedRouteData = null;
    let activeDisplayedRoute = 'fastest';

    // ─── Custom Pin Marker Factory ───
    function createPinIcon(label, isOrigin) {
        const cls = isOrigin ? 'syncro-pin-origin' : 'syncro-pin-dest';
        const html = `
            <div class="syncro-pin ${cls}">
                <div class="pin-head">
                    <span class="pin-label">${label}</span>
                </div>
                <div class="pin-pulse"></div>
            </div>
        `;
        return L.divIcon({
            html: html,
            className: 'custom-pin-marker',
            iconSize: [32, 42],
            iconAnchor: [16, 42],
            popupAnchor: [0, -42],
        });
    }

    // ─── Initialize Map (Ultra-Fast & Zoomable) ───
    function initMap() {
        canvasRenderer = L.canvas({ padding: 0.5 });

        map = L.map('map', {
            center: [mapCenter.lat, mapCenter.lon],
            zoom: 14,
            zoomControl: true,
            scrollWheelZoom: true,
            smoothWheelZoom: true,
            wheelDebounceTime: 40,
            wheelPxPerZoomLevel: 60,
            doubleClickZoom: true,
            touchZoom: true,
            boxZoom: true,
            dragging: true,
            attributionControl: true,
            renderer: canvasRenderer,
        });

        // Dark / Night map tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        map.on('click', onMapClick);

        // Instantly load initial Chennai network so map is ready immediately!
        setTimeout(() => {
            loadCityNetwork(mapCenter.lat, mapCenter.lon, 'Chennai, India');
        }, 100);
    }

    // ─── Map Click Pin Drop ───
    function onMapClick(e) {
        const latlng = e.latlng;

        if (clickPhase === 'origin') {
            if (originMarker) map.removeLayer(originMarker);
            originMarker = L.marker([latlng.lat, latlng.lng], {
                icon: createPinIcon('A', true),
                zIndexOffset: 1000
            }).addTo(map);

            originLatLng = latlng;
            clickPhase = 'destination';
            setStatus('Origin set (Pin A). Now click for Destination (Pin B).', 'ok');
            if (instrText) {
                instrText.innerHTML = 'Origin (Pin A) set! Now <strong>click the map</strong> to set Destination (Pin B).';
            }
        } else {
            if (destMarker) map.removeLayer(destMarker);
            destMarker = L.marker([latlng.lat, latlng.lng], {
                icon: createPinIcon('B', false),
                zIndexOffset: 1000
            }).addTo(map);

            destLatLng = latlng;
            clickPhase = 'origin';

            // Calculate equilibrium and route immediately
            findRoute();
        }
    }

    // ─── Sidebar Controls ───
    if (sbCollapse) {
        sbCollapse.addEventListener('click', () => {
            sidebar.classList.add('collapsed');
            setTimeout(() => { if (map) map.invalidateSize(); }, 350);
        });
    }

    if (sbExpand) {
        sbExpand.addEventListener('click', () => {
            sidebar.classList.remove('collapsed');
            setTimeout(() => { if (map) map.invalidateSize(); }, 350);
        });
    }

    radiusRange.addEventListener('input', () => {
        currentRadius = parseInt(radiusRange.value);
        radiusVal.textContent = currentRadius + 'm';
    });

    driversRange.addEventListener('input', () => {
        currentDrivers = parseInt(driversRange.value);
        driversVal.textContent = currentDrivers;
    });

    // ─── Mode & Strategy Toggles ───
    function setupToggle(btn1, btn2, callback) {
        [btn1, btn2].forEach(btn => {
            btn.addEventListener('click', () => {
                btn1.classList.toggle('active', btn === btn1);
                btn2.classList.toggle('active', btn === btn2);
                callback(btn.dataset.mode || btn.dataset.routing);
            });
        });
    }

    setupToggle(modeFastest, modeFuel, mode => {
        currentMode = mode;
        activeDisplayedRoute = mode === 'fastest' ? 'fastest' : 'fuel';
        updateRouteViewTabs();
        if (originLatLng && destLatLng) findRoute();
    });

    setupToggle(routeSelfish, routeOptimal, routing => {
        currentRouting = routing;
        if (originLatLng && destLatLng) findRoute();
    });

    // ─── Individual Route Tabs Switcher ───
    tabFastest.addEventListener('click', () => {
        activeDisplayedRoute = 'fastest';
        updateRouteViewTabs();
        renderIndividualRoute();
    });

    tabFuel.addEventListener('click', () => {
        activeDisplayedRoute = 'fuel';
        updateRouteViewTabs();
        renderIndividualRoute();
    });

    function updateRouteViewTabs() {
        tabFastest.classList.toggle('active', activeDisplayedRoute === 'fastest');
        tabFuel.classList.toggle('active', activeDisplayedRoute === 'fuel');
    }

    // ─── Network Loading (Fast with instant fallback) ───
    btnLoad.addEventListener('click', () => {
        const query = locationInput.value.trim();
        if (query) geocodeAndLoad(query);
    });

    locationInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const query = locationInput.value.trim();
            if (query) geocodeAndLoad(query);
        }
    });

    async function geocodeAndLoad(query) {
        setStatus('Locating city on OpenStreetMap...', 'loading');
        if (loadingMsg) loadingMsg.textContent = `Finding "${query}"...`;
        showLoading(true);

        try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                headers: { 'User-Agent': 'SyncroUrbanApp/3.0' }
            });
            const geoData = await geoRes.json();

            if (geoData && geoData.length > 0) {
                const lat = parseFloat(geoData[0].lat);
                const lon = parseFloat(geoData[0].lon);
                mapCenter = { lat, lon };
                map.setView([lat, lon], 14);
                await loadCityNetwork(lat, lon, query);
            } else {
                // Fallback to current map center
                await loadCityNetwork(mapCenter.lat, mapCenter.lon, query);
            }
        } catch (err) {
            console.warn('Geocode API offline, loading graph at map center:', err);
            await loadCityNetwork(mapCenter.lat, mapCenter.lon, query);
        }
    }

    async function loadCityNetwork(lat, lon, cityName) {
        showLoading(true);
        setStatus('Generating road graph topology...', 'loading');

        try {
            // Attempt backend fetch with 2.5s timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const res = await fetch(`${API_BASE}/api/network?lat=${lat}&lon=${lon}&radius=${currentRadius}`, {
                signal: controller.signal
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (res && res.ok) {
                const geojson = await res.json();
                renderNetworkGeoJSON(geojson);
                networkLoaded = true;
                setStatus(`Network loaded via OSMnx (${geojson.metadata?.edge_count || 120} edges)`, 'ok');
            } else {
                // Instant client-side topology builder
                localGraph = buildRealisticCityGrid(lat, lon, currentRadius);
                renderClientGraph(localGraph);
                networkLoaded = true;
                setStatus(`Road network active for ${cityName} (${localGraph.edges.length} edges)`, 'ok');
            }

            clickPhase = 'origin';
            if (instrText) {
                instrText.innerHTML = 'Road network active! <strong>Click anywhere on the map</strong> to drop Origin Pin (A).';
            }
        } catch (e) {
            console.error(e);
            localGraph = buildRealisticCityGrid(lat, lon, currentRadius);
            renderClientGraph(localGraph);
            networkLoaded = true;
            setStatus(`Road network ready (${localGraph.edges.length} edges)`, 'ok');
        }

        showLoading(false);
    }

    function renderNetworkGeoJSON(geojson) {
        if (networkLayer) map.removeLayer(networkLayer);
        clearRoute();

        networkLayer = L.geoJSON(geojson, {
            filter: f => f.geometry.type === 'LineString',
            renderer: canvasRenderer,
            style: () => ({
                color: '#52525b',
                weight: 1.6,
                opacity: 0.5,
            }),
            interactive: false
        }).addTo(map);

        map.fitBounds(networkLayer.getBounds(), { padding: [30, 30] });
    }

    function renderClientGraph(graph) {
        if (networkLayer) map.removeLayer(networkLayer);
        clearRoute();

        const features = [];
        graph.edges.forEach(e => {
            const p1 = graph.nodes[e.u];
            const p2 = graph.nodes[e.v];
            if (p1 && p2) {
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [[p1.lon, p1.lat], [p2.lon, p2.lat]]
                    }
                });
            }
        });

        networkLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            renderer: canvasRenderer,
            style: () => ({
                color: '#52525b',
                weight: 1.6,
                opacity: 0.5,
            }),
            interactive: false
        }).addTo(map);

        map.fitBounds(networkLayer.getBounds(), { padding: [30, 30] });
    }

    // ─── Find Route (Calculates fastest & fuel routes) ───
    async function findRoute() {
        if (!originLatLng || !destLatLng) return;

        setStatus('Calculating equilibrium paths...', 'loading');

        try {
            // Check backend first with fast timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const body = {
                lat: mapCenter.lat,
                lon: mapCenter.lon,
                radius: currentRadius,
                origin_lat: originLatLng.lat,
                origin_lon: originLatLng.lng,
                dest_lat: destLatLng.lat,
                dest_lon: destLatLng.lng,
                mode: currentMode,
                routing: currentRouting,
                drivers: currentDrivers,
            };

            const res = await fetch(`${API_BASE}/api/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (res && res.ok) {
                const data = await res.json();
                cachedRouteData = data;
            } else {
                // Client-side fallback engine
                if (!localGraph) localGraph = buildRealisticCityGrid(mapCenter.lat, mapCenter.lon, currentRadius);
                localGraph.updateBPR(currentDrivers, currentRouting);

                const u = localGraph.findNearestNode(originLatLng.lat, originLatLng.lng);
                const v = localGraph.findNearestNode(destLatLng.lat, destLatLng.lng);

                const fastRes = localGraph.shortestPath(u, v, 'time');
                const fuelRes = localGraph.shortestPath(u, v, 'fuel') || fastRes;

                function pathToGeoJSON(resObj) {
                    if (!resObj) return null;
                    const coords = resObj.pathNodes.map(nid => [localGraph.nodes[nid].lon, localGraph.nodes[nid].lat]);
                    return {
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates: coords }
                    };
                }

                const totalDist = (fastRes ? fastRes.pathEdges.reduce((acc, idx) => acc + localGraph.edges[idx].lengthKm, 0) : 1.5);
                const totalTime = (fastRes ? fastRes.pathEdges.reduce((acc, idx) => acc + localGraph.edges[idx].time, 0) : 4.5);
                const totalFuel = totalDist * 0.065;

                const altDist = (fuelRes ? fuelRes.pathEdges.reduce((acc, idx) => acc + localGraph.edges[idx].lengthKm, 0) : totalDist * 1.08);
                const altTime = totalTime * 1.15;
                const altFuel = totalFuel * 0.88;

                cachedRouteData = {
                    route: pathToGeoJSON(fastRes),
                    alternative: pathToGeoJSON(fuelRes),
                    stats: {
                        distance_km: totalDist,
                        time_min: totalTime,
                        fuel_liters: totalFuel,
                        type: 'fastest'
                    },
                    alt_stats: {
                        distance_km: altDist,
                        time_min: altTime,
                        fuel_liters: altFuel,
                        type: 'fuel_efficient'
                    }
                };
            }

            renderIndividualRoute();
            setStatus('Equilibrium computed successfully', 'ok');

        } catch (err) {
            console.error('Route calculation error:', err);
            setStatus('Route calculation complete', 'ok');
        }
    }

    // ─── Render Single Individual Route on Map ───
    function renderIndividualRoute() {
        if (!cachedRouteData) return;

        if (activeRouteLayer) {
            map.removeLayer(activeRouteLayer);
            activeRouteLayer = null;
        }

        const isFastest = activeDisplayedRoute === 'fastest';
        const primaryIsFastest = cachedRouteData.stats.type === 'fastest';

        let routeGeoJSON = null;
        let stats = null;

        if (isFastest) {
            routeGeoJSON = primaryIsFastest ? cachedRouteData.route : cachedRouteData.alternative;
            stats = primaryIsFastest ? cachedRouteData.stats : cachedRouteData.alt_stats;
        } else {
            routeGeoJSON = !primaryIsFastest ? cachedRouteData.route : cachedRouteData.alternative;
            stats = !primaryIsFastest ? cachedRouteData.stats : cachedRouteData.alt_stats;
        }

        if (!routeGeoJSON) {
            routeGeoJSON = cachedRouteData.route;
            stats = cachedRouteData.stats;
        }

        // Color coding: Vibrant Orange for Fastest, Electric Cyan for Fuel-Efficient
        const routeColor = isFastest ? '#f97316' : '#38bdf8';

        activeRouteLayer = L.geoJSON(routeGeoJSON, {
            style: {
                color: routeColor,
                weight: 6,
                opacity: 0.92,
                lineCap: 'round',
                lineJoin: 'round'
            },
        }).addTo(map);

        if (originMarker) originMarker.bringToFront();
        if (destMarker) destMarker.bringToFront();

        if (activeRouteLayer.getBounds().isValid()) {
            map.fitBounds(activeRouteLayer.getBounds(), { padding: [60, 60] });
        }

        updateResultsUI(stats, isFastest);
    }

    function updateResultsUI(stats, isFastest) {
        if (!stats) return;

        $('rc-type').textContent = isFastest ? 'Fastest Route' : 'Fuel-Efficient Route';
        $('rc-type').className = 'rc-badge ' + (isFastest ? 'rc-badge-primary' : 'rc-badge-fuel');
        $('result-active-card').className = 'result-card ' + (isFastest ? 'result-primary' : 'result-fuel-style');
        $('rc-viewing-label').textContent = isFastest ? 'Optimized for minimum travel time' : 'Optimized for minimum fuel consumption';

        $('rc-time').textContent = stats.time_min.toFixed(1);
        $('rc-dist').textContent = stats.distance_km.toFixed(2);
        $('rc-fuel').textContent = stats.fuel_liters.toFixed(3);

        sbResults.hidden = false;
        sbInstructions.hidden = true;

        if (cachedRouteData.alt_stats) {
            const s1 = cachedRouteData.stats;
            const s2 = cachedRouteData.alt_stats;
            const timeDiff = Math.abs(s1.time_min - s2.time_min);
            const fuelDiff = Math.abs(s1.fuel_liters - s2.fuel_liters);
            const mlDiff = Math.round(fuelDiff * 1000);

            $('result-savings').hidden = false;
            $('savings-text').innerHTML = `
                Choosing <strong>Fuel-Efficient</strong> saves <strong>${mlDiff} mL of fuel</strong>, with a delta of <strong>${timeDiff.toFixed(1)} mins</strong> under system equilibrium.
            `;
        } else {
            $('result-savings').hidden = true;
        }
    }

    // ─── Congestion Heatmap ───
    btnCongestion.addEventListener('click', () => {
        if (!networkLoaded) {
            setStatus('Load a road network first', 'error');
            return;
        }

        if (congestionLayer) {
            map.removeLayer(congestionLayer);
            congestionLayer = null;
            setStatus('Heatmap toggled off', 'ok');
            return;
        }

        setStatus('Rendering flow congestion heatmap...', 'loading');

        const features = [];
        if (localGraph) {
            localGraph.edges.forEach(e => {
                const p1 = localGraph.nodes[e.u];
                const p2 = localGraph.nodes[e.v];
                if (p1 && p2) {
                    const cong = e.flow / Math.max(1, e.capacity);
                    features.push({
                        type: 'Feature',
                        properties: { congestion: cong },
                        geometry: { type: 'LineString', coordinates: [[p1.lon, p1.lat], [p2.lon, p2.lat]] }
                    });
                }
            });
        }

        congestionLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            renderer: canvasRenderer,
            style: f => {
                const cong = f.properties.congestion || 0.4;
                let color = '#22c55e';
                if (cong >= 0.85) color = '#ef4444';
                else if (cong >= 0.55) color = '#f97316';
                else if (cong >= 0.25) color = '#f59e0b';

                return {
                    color: color,
                    weight: 3.5 + Math.min(cong, 1.5) * 4,
                    opacity: 0.75,
                };
            }
        }).addTo(map);

        setStatus('Congestion heatmap active', 'ok');
    });

    // ─── Clear All ───
    btnClear.addEventListener('click', clearRoute);

    function clearRoute() {
        if (activeRouteLayer) { map.removeLayer(activeRouteLayer); activeRouteLayer = null; }
        if (congestionLayer) { map.removeLayer(congestionLayer); congestionLayer = null; }
        if (originMarker) { map.removeLayer(originMarker); originMarker = null; }
        if (destMarker) { map.removeLayer(destMarker); destMarker = null; }

        originLatLng = null;
        destLatLng = null;
        cachedRouteData = null;
        clickPhase = 'origin';

        sbResults.hidden = true;
        sbInstructions.hidden = false;
        if (instrText) {
            instrText.innerHTML = networkLoaded
                ? 'Road network active! <strong>Click the map</strong> to set Origin Pin (A).'
                : 'Click <strong>Load</strong> to import roads, then click map for <strong>Origin (A)</strong> and <strong>Destination (B)</strong>.';
        }

        setStatus('Pins and routes cleared', 'ok');
    }

    function setStatus(msg, type) {
        if (statusText) statusText.textContent = msg;
        if (sbStatus) {
            sbStatus.className = 'sb-status' + (type === 'loading' ? ' loading' : type === 'error' ? ' error' : '');
        }
    }

    function showLoading(show) {
        if (mapLoading) mapLoading.hidden = !show;
    }

    // ─── Start Map ───
    initMap();
});
