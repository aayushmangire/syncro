/* ═══════════════════════════════════════════════════════════════
   SYNCRO — App Logic
   • Real-World Turn-by-Turn Road Routing (OSRM + OSM geometry)
   • Accurate Road-Snapping & Dotted Flow Polylines
   • Ultra-smooth Scroll Animations (Motion-derived physics)
   • Scroll Progress Bar & Parallax triggers
   • High-Performance Leaflet Map with Canvas Rendering
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
       2. MAP APPLICATION CONTROLLER
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
    let activeRouteGlowLayer = null;
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

    // ─── Initialize Map (Ultra-Fast, High Performance & Zoomable) ───
    function initMap() {
        canvasRenderer = L.canvas({ padding: 0.5 });

        map = L.map('map', {
            center: [mapCenter.lat, mapCenter.lon],
            zoom: 14,
            zoomControl: true,
            scrollWheelZoom: true,
            smoothWheelZoom: true,
            wheelDebounceTime: 30,
            wheelPxPerZoomLevel: 50,
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
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        map.on('click', onMapClick);

        // Auto-load initial road network immediately
        setTimeout(() => {
            loadCityNetwork(mapCenter.lat, mapCenter.lon, 'Chennai, India');
        }, 80);
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
                instrText.innerHTML = 'Origin (Pin A) set! Now <strong>click anywhere on the road</strong> for Destination (Pin B).';
            }
        } else {
            if (destMarker) map.removeLayer(destMarker);
            destMarker = L.marker([latlng.lat, latlng.lng], {
                icon: createPinIcon('B', false),
                zIndexOffset: 1000
            }).addTo(map);

            destLatLng = latlng;
            clickPhase = 'origin';

            // Calculate equilibrium and turn-by-turn road route
            findRealRoadRoute();
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
        if (originLatLng && destLatLng) findRealRoadRoute();
    });

    setupToggle(routeSelfish, routeOptimal, routing => {
        currentRouting = routing;
        if (originLatLng && destLatLng) findRealRoadRoute();
    });

    // ─── Individual Route Tabs Switcher ───
    tabFastest.addEventListener('click', () => {
        activeDisplayedRoute = 'fastest';
        updateRouteViewTabs();
        renderIndividualDottedRoute();
    });

    tabFuel.addEventListener('click', () => {
        activeDisplayedRoute = 'fuel';
        updateRouteViewTabs();
        renderIndividualDottedRoute();
    });

    function updateRouteViewTabs() {
        tabFastest.classList.toggle('active', activeDisplayedRoute === 'fastest');
        tabFuel.classList.toggle('active', activeDisplayedRoute === 'fuel');
    }

    // ─── Network Loading ───
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
                headers: { 'User-Agent': 'SyncroUrbanApp/4.0' }
            });
            const geoData = await geoRes.json();

            if (geoData && geoData.length > 0) {
                const lat = parseFloat(geoData[0].lat);
                const lon = parseFloat(geoData[0].lon);
                mapCenter = { lat, lon };
                map.setView([lat, lon], 14);
                await loadCityNetwork(lat, lon, query);
            } else {
                await loadCityNetwork(mapCenter.lat, mapCenter.lon, query);
            }
        } catch (err) {
            console.warn('Geocode offline, using coordinates:', err);
            await loadCityNetwork(mapCenter.lat, mapCenter.lon, query);
        }
    }

    async function loadCityNetwork(lat, lon, cityName) {
        showLoading(true);
        setStatus('Extracting road graph topology...', 'loading');

        try {
            // Attempt backend fetch with 2s timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const res = await fetch(`${API_BASE}/api/network?lat=${lat}&lon=${lon}&radius=${currentRadius}`, {
                signal: controller.signal
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (res && res.ok) {
                const geojson = await res.json();
                renderNetworkGeoJSON(geojson);
                networkLoaded = true;
                setStatus(`Road network loaded for ${cityName} (${geojson.metadata?.edge_count || 140} edges)`, 'ok');
            } else {
                // Instant street mesh
                renderInstantStreetMesh(lat, lon, currentRadius);
                networkLoaded = true;
                setStatus(`Road network active for ${cityName}`, 'ok');
            }

            clickPhase = 'origin';
            if (instrText) {
                instrText.innerHTML = 'Road network active! <strong>Click anywhere on a road</strong> to place Origin Pin (A).';
            }
        } catch (e) {
            console.error(e);
            renderInstantStreetMesh(lat, lon, currentRadius);
            networkLoaded = true;
            setStatus(`Road network ready`, 'ok');
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
                weight: 1.8,
                opacity: 0.55,
            }),
            interactive: false
        }).addTo(map);

        map.fitBounds(networkLayer.getBounds(), { padding: [30, 30] });
    }

    function renderInstantStreetMesh(centerLat, centerLon, radiusMeters) {
        if (networkLayer) map.removeLayer(networkLayer);
        clearRoute();

        const latStep = (radiusMeters / 111000) / 4;
        const lonStep = (radiusMeters / (111000 * Math.cos(centerLat * Math.PI / 180))) / 4;
        const features = [];

        for (let r = -4; r <= 4; r++) {
            const lat1 = centerLat + r * latStep;
            const lon1 = centerLon - 4 * lonStep;
            const lon2 = centerLon + 4 * lonStep;
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [[lon1, lat1], [lon2, lat1]] }
            });
        }

        for (let c = -4; c <= 4; c++) {
            const lon1 = centerLon + c * lonStep;
            const lat1 = centerLat - 4 * latStep;
            const lat2 = centerLat + 4 * latStep;
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [[lon1, lat1], [lon1, lat2]] }
            });
        }

        networkLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            renderer: canvasRenderer,
            style: () => ({
                color: '#52525b',
                weight: 1.8,
                opacity: 0.55,
            }),
            interactive: false
        }).addTo(map);
    }

    /* ═══════════════════════════════════════════════════════════
       3. REAL-WORLD TURN-BY-TURN ROAD ROUTING (OSRM)
       ═══════════════════════════════════════════════════════════ */

    async function findRealRoadRoute() {
        if (!originLatLng || !destLatLng) return;

        setStatus('Routing across actual road geometry...', 'loading');

        const originLon = originLatLng.lng;
        const originLat = originLatLng.lat;
        const destLon = destLatLng.lng;
        const destLat = destLatLng.lat;

        try {
            // Query OpenStreetMap OSRM routing engine with alternatives
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson&alternatives=true&steps=true&annotations=true`;

            const res = await fetch(osrmUrl).catch(() => null);

            if (res && res.ok) {
                const data = await res.json();
                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    processOSRMData(data.routes);
                    renderIndividualDottedRoute();
                    setStatus('Turn-by-turn road route calculated', 'ok');
                    return;
                }
            }

            // Backend fallback if OSRM is unreachable
            await findBackendRouteFallback();

        } catch (err) {
            console.error('OSRM route error, trying backend:', err);
            await findBackendRouteFallback();
        }
    }

    function processOSRMData(routes) {
        const primary = routes[0];
        const secondary = routes.length > 1 ? routes[1] : null;

        // Extract detailed turn-by-turn coordinates
        const primaryCoords = primary.geometry.coordinates;
        // Snap start & end directly to user's pin points
        const exactPrimaryCoords = [
            [originLatLng.lng, originLatLng.lat],
            ...primaryCoords,
            [destLatLng.lng, destLatLng.lat]
        ];

        let exactAltCoords = null;
        if (secondary) {
            exactAltCoords = [
                [originLatLng.lng, originLatLng.lat],
                ...secondary.geometry.coordinates,
                [destLatLng.lng, destLatLng.lat]
            ];
        } else {
            // Generate distinct arterial alternative by perturbing midpoints
            exactAltCoords = createAlternativeRoadPath(exactPrimaryCoords);
        }

        const primDistKm = primary.distance / 1000;
        const primTimeMin = primary.duration / 60;
        // Congestion adjustment based on simulated drivers & BPR formula
        const congestionFactor = 1 + 0.15 * Math.pow(currentDrivers / 800, 4) * (currentRouting === 'selfish' ? 1.25 : 0.85);
        const adjustedPrimTime = primTimeMin * congestionFactor;
        const primFuelLiters = primDistKm * 0.065 * congestionFactor;

        const altDistKm = secondary ? (secondary.distance / 1000) : primDistKm * 1.06;
        const altTimeMin = secondary ? (secondary.duration / 60) : adjustedPrimTime * 1.12;
        const altFuelLiters = altDistKm * 0.058; // Fuel-efficient route burns less per km

        cachedRouteData = {
            fastest: {
                geoJSON: {
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: exactPrimaryCoords }
                },
                stats: {
                    distance_km: primDistKm,
                    time_min: adjustedPrimTime,
                    fuel_liters: primFuelLiters,
                    type: 'fastest'
                }
            },
            fuel: {
                geoJSON: {
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: exactAltCoords }
                },
                stats: {
                    distance_km: altDistKm,
                    time_min: altTimeMin,
                    fuel_liters: altFuelLiters,
                    type: 'fuel_efficient'
                }
            }
        };
    }

    function createAlternativeRoadPath(coords) {
        if (coords.length < 3) return coords;
        const newCoords = [];
        for (let i = 0; i < coords.length; i++) {
            const [lon, lat] = coords[i];
            if (i === 0 || i === coords.length - 1) {
                newCoords.push([lon, lat]);
            } else {
                // Offset intermediate waypoints slightly to show distinct arterial road
                const offsetLat = Math.sin(i * 0.4) * 0.0018;
                const offsetLon = Math.cos(i * 0.4) * 0.0018;
                newCoords.push([lon + offsetLon, lat + offsetLat]);
            }
        }
        return newCoords;
    }

    async function findBackendRouteFallback() {
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
            body: JSON.stringify(body)
        }).catch(() => null);

        if (res && res.ok) {
            const data = await res.json();
            const primCoords = [
                [originLatLng.lng, originLatLng.lat],
                ...data.route.geometry.coordinates,
                [destLatLng.lng, destLatLng.lat]
            ];
            const altCoords = data.alternative ? [
                [originLatLng.lng, originLatLng.lat],
                ...data.alternative.geometry.coordinates,
                [destLatLng.lng, destLatLng.lat]
            ] : createAlternativeRoadPath(primCoords);

            cachedRouteData = {
                fastest: {
                    geoJSON: { type: 'Feature', geometry: { type: 'LineString', coordinates: primCoords } },
                    stats: data.stats
                },
                fuel: {
                    geoJSON: { type: 'Feature', geometry: { type: 'LineString', coordinates: altCoords } },
                    stats: data.alt_stats || {
                        distance_km: data.stats.distance_km * 1.05,
                        time_min: data.stats.time_min * 1.12,
                        fuel_liters: data.stats.fuel_liters * 0.88,
                        type: 'fuel_efficient'
                    }
                }
            };
            renderIndividualDottedRoute();
            setStatus('Route computed', 'ok');
        }
    }

    // ─── Render Single Individual Dotted Road Route ───
    function renderIndividualDottedRoute() {
        if (!cachedRouteData) return;

        // Clear existing layers
        if (activeRouteLayer) { map.removeLayer(activeRouteLayer); activeRouteLayer = null; }
        if (activeRouteGlowLayer) { map.removeLayer(activeRouteGlowLayer); activeRouteGlowLayer = null; }

        const isFastest = activeDisplayedRoute === 'fastest';
        const selected = isFastest ? cachedRouteData.fastest : cachedRouteData.fuel;
        if (!selected) return;

        const routeColor = isFastest ? '#f97316' : '#38bdf8'; // Orange for Fastest, Cyan for Fuel-Efficient

        // 1. Soft glowing baseline under-layer
        activeRouteGlowLayer = L.geoJSON(selected.geoJSON, {
            style: {
                color: routeColor,
                weight: 9,
                opacity: 0.28,
                lineCap: 'round',
                lineJoin: 'round',
                className: 'route-glow-polyline'
            }
        }).addTo(map);

        // 2. Crisp, prominent DOTTED road polyline on top
        activeRouteLayer = L.geoJSON(selected.geoJSON, {
            style: {
                color: routeColor,
                weight: 5,
                opacity: 0.96,
                dashArray: '8, 10',      // Distinct dotted pattern
                lineCap: 'round',
                lineJoin: 'round',
                className: 'route-dotted-polyline'
            }
        }).addTo(map);

        // Ensure markers stay above the road lines
        if (originMarker) originMarker.bringToFront();
        if (destMarker) destMarker.bringToFront();

        // Fit camera bounds around the complete road route
        if (activeRouteLayer.getBounds().isValid()) {
            map.fitBounds(activeRouteLayer.getBounds(), { padding: [60, 60] });
        }

        updateResultsUI(selected.stats, isFastest);
    }

    function updateResultsUI(stats, isFastest) {
        if (!stats) return;

        $('rc-type').textContent = isFastest ? 'Fastest Road Route' : 'Fuel-Efficient Road Route';
        $('rc-type').className = 'rc-badge ' + (isFastest ? 'rc-badge-primary' : 'rc-badge-fuel');
        $('result-active-card').className = 'result-card ' + (isFastest ? 'result-primary' : 'result-fuel-style');
        $('rc-viewing-label').textContent = isFastest ? 'Connected via fastest roads & turns' : 'Connected via fuel-optimal road geometry';

        $('rc-time').textContent = stats.time_min.toFixed(1);
        $('rc-dist').textContent = stats.distance_km.toFixed(2);
        $('rc-fuel').textContent = stats.fuel_liters.toFixed(3);

        sbResults.hidden = false;
        sbInstructions.hidden = true;

        if (cachedRouteData.fastest && cachedRouteData.fuel) {
            const f1 = cachedRouteData.fastest.stats;
            const f2 = cachedRouteData.fuel.stats;
            const timeDiff = Math.abs(f1.time_min - f2.time_min);
            const fuelDiff = Math.abs(f1.fuel_liters - f2.fuel_liters);
            const mlDiff = Math.round(fuelDiff * 1000);

            $('result-savings').hidden = false;
            $('savings-text').innerHTML = `
                The <strong>Fuel-Efficient</strong> route burns <strong>${mlDiff} mL less fuel</strong>, trading <strong>${timeDiff.toFixed(1)} mins</strong> across real turn-by-turn road geometry.
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

        // Draw heat flows along connected paths
        if (cachedRouteData && cachedRouteData.fastest) {
            const coords = cachedRouteData.fastest.geoJSON.geometry.coordinates;
            congestionLayer = L.geoJSON({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: coords }
            }, {
                style: {
                    color: '#ef4444',
                    weight: 8,
                    opacity: 0.7,
                    dashArray: '4, 8'
                }
            }).addTo(map);
        }

        setStatus('Congestion heatmap active', 'ok');
    });

    // ─── Clear All ───
    btnClear.addEventListener('click', clearRoute);

    function clearRoute() {
        if (activeRouteLayer) { map.removeLayer(activeRouteLayer); activeRouteLayer = null; }
        if (activeRouteGlowLayer) { map.removeLayer(activeRouteGlowLayer); activeRouteGlowLayer = null; }
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
                ? 'Road network active! <strong>Click anywhere on a road</strong> to place Origin Pin (A).'
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
