/* ═══════════════════════════════════════════════════════════════
   SYNCRO — App Logic
   Landing page animations + Leaflet map + Fast/Fuel Individual Routing
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const API = '';  // same origin

    // ─── Scroll reveal ───
    const fadeObs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); fadeObs.unobserve(e.target); } });
    }, { threshold: .08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in').forEach(el => fadeObs.observe(el));

    // Hero anim delays
    document.querySelectorAll('.anim-in').forEach(el => {
        el.style.setProperty('--i', el.dataset.d || '0');
    });

    // ─── Nav scroll ───
    const header = document.getElementById('site-header');
    window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 30), { passive: true });

    // ─── Mobile nav ───
    const burger = document.getElementById('nav-burger');
    const navCenter = document.getElementById('nav-center');
    if (burger) {
        burger.addEventListener('click', () => {
            const open = !navCenter.classList.contains('mob-open');
            navCenter.classList.toggle('mob-open', open);
            burger.classList.toggle('open', open);
            burger.setAttribute('aria-expanded', String(open));
        });
        navCenter.querySelectorAll('.nav-item').forEach(l =>
            l.addEventListener('click', () => { navCenter.classList.remove('mob-open'); burger.classList.remove('open'); })
        );
    }

    // ─── Smooth scroll ───
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const el = document.querySelector(a.getAttribute('href'));
            if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        });
    });

    // ─── Animated counters ───
    const counterObs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { animCount(e.target); counterObs.unobserve(e.target); } });
    }, { threshold: .4 });
    document.querySelectorAll('.hm-val').forEach(el => counterObs.observe(el));

    function animCount(el) {
        const target = parseFloat(el.dataset.count);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const dec = parseInt(el.dataset.decimal) || 0;
        const dur = 2000;
        const start = performance.now();
        (function tick(now) {
            const t = Math.min((now - start) / dur, 1);
            const v = (1 - Math.pow(1 - t, 3)) * target;
            el.textContent = prefix + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString()) + suffix;
            if (t < 1) requestAnimationFrame(tick);
        })(performance.now());
    }

    // ─── Hero canvas ───
    const cv = document.getElementById('net-canvas');
    if (cv) {
        const ctx = cv.getContext('2d');
        let pts = [];
        function cvResize() {
            const d = devicePixelRatio || 1;
            cv.width = cv.offsetWidth * d;
            cv.height = cv.offsetHeight * d;
            ctx.setTransform(d, 0, 0, d, 0, 0);
        }
        function cvInit() {
            pts = [];
            const w = cv.offsetWidth, h = cv.offsetHeight;
            for (let i = 0; i < 32; i++) pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.5 + .6 });
        }
        function cvDraw() {
            const w = cv.offsetWidth, h = cv.offsetHeight;
            ctx.clearRect(0, 0, w, h);
            pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; });
            for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
                if (d < 160) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(250,250,250,${(1 - d / 160) * .25})`; ctx.lineWidth = .7; ctx.stroke(); }
            }
            ctx.fillStyle = 'rgba(250,250,250,.4)';
            pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
            requestAnimationFrame(cvDraw);
        }
        cvResize(); cvInit(); cvDraw();
        window.addEventListener('resize', () => { cvResize(); cvInit(); });
    }


    /* ═══════════════════════════════════════════════════════════
       MAP APPLICATION
       ═══════════════════════════════════════════════════════════ */

    // DOM Elements
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

    // State
    let map = null;
    let canvasRenderer = null;
    let networkLayer = null;
    let activeRouteLayer = null;
    let congestionLayer = null;
    let originMarker = null;
    let destMarker = null;
    let originLatLng = null;
    let destLatLng = null;
    let mapCenter = { lat: 13.0827, lon: 80.2707 };  // Default: Chennai, India
    let currentMode = 'fastest';                     // 'fastest' or 'fuel_efficient'
    let currentRouting = 'selfish';                  // 'selfish' or 'optimal'
    let currentDrivers = 600;
    let currentRadius = 1200;
    let networkLoaded = false;
    let clickPhase = 'origin';                       // 'origin' or 'destination'
    let cachedRouteData = null;                      // Stores both fastest and fuel routes from API
    let activeDisplayedRoute = 'fastest';            // Which single route is currently visible on map

    // ─── Custom Pin Icons ───
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

    // ─── Initialize map with smooth zoom and panning ───
    function initMap() {
        // High-performance canvas renderer for fast vector lines without DOM lag
        canvasRenderer = L.canvas({ padding: 0.5 });

        map = L.map('map', {
            center: [mapCenter.lat, mapCenter.lon],
            zoom: 14,
            zoomControl: true,
            scrollWheelZoom: true,
            smoothWheelZoom: true,
            doubleClickZoom: true,
            touchZoom: true,
            boxZoom: true,
            dragging: true,
            attributionControl: true,
            renderer: canvasRenderer,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Click handler for responsive pin placement
        map.on('click', onMapClick);
    }

    function onMapClick(e) {
        if (!networkLoaded) {
            setStatus('Please load a road network first', 'error');
            return;
        }

        const latlng = e.latlng;

        if (clickPhase === 'origin') {
            // Set Origin (Pin A)
            if (originMarker) map.removeLayer(originMarker);
            originMarker = L.marker([latlng.lat, latlng.lng], {
                icon: createPinIcon('A', true),
                zIndexOffset: 1000
            }).addTo(map);

            originLatLng = latlng;
            clickPhase = 'destination';
            setStatus('Origin set. Now click destination (Pin B)', 'ok');
            instrText.innerHTML = 'Origin (A) selected! <strong>Click again</strong> on the map to set Destination (B).';

        } else {
            // Set Destination (Pin B)
            if (destMarker) map.removeLayer(destMarker);
            destMarker = L.marker([latlng.lat, latlng.lng], {
                icon: createPinIcon('B', false),
                zIndexOffset: 1000
            }).addTo(map);

            destLatLng = latlng;
            clickPhase = 'origin';

            // Auto-calculate route immediately
            findRoute();
        }
    }

    // ─── Sidebar collapse/expand ───
    sbCollapse.addEventListener('click', () => {
        sidebar.classList.add('collapsed');
        setTimeout(() => { if (map) map.invalidateSize(); }, 350);
    });

    if (sbExpand) {
        sbExpand.addEventListener('click', () => {
            sidebar.classList.remove('collapsed');
            setTimeout(() => { if (map) map.invalidateSize(); }, 350);
        });
    }

    // ─── Range updates ───
    radiusRange.addEventListener('input', () => {
        currentRadius = parseInt(radiusRange.value);
        radiusVal.textContent = currentRadius + 'm';
    });
    driversRange.addEventListener('input', () => {
        currentDrivers = parseInt(driversRange.value);
        driversVal.textContent = currentDrivers;
    });

    // ─── Mode toggles ───
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

    // ─── Load Network from OpenStreetMap ───
    btnLoad.addEventListener('click', loadNetwork);
    locationInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadNetwork(); });

    async function loadNetwork() {
        const query = locationInput.value.trim();
        if (!query) return;

        setStatus('Geocoding location...', 'loading');
        loadingMsg.textContent = `Locating "${query}" on OpenStreetMap...`;
        showLoading(true);

        try {
            // Geocode using Nominatim
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                headers: { 'User-Agent': 'SyncroApp/2.0' }
            });
            const geoData = await geoRes.json();

            if (!geoData.length) {
                setStatus('Location not found', 'error');
                showLoading(false);
                return;
            }

            const lat = parseFloat(geoData[0].lat);
            const lon = parseFloat(geoData[0].lon);
            mapCenter = { lat, lon };

            // Pan map
            map.setView([lat, lon], 15);

            setStatus('Extracting network topology...', 'loading');
            loadingMsg.textContent = `Extracting ${currentRadius}m road network via OSMnx...`;

            // Load network from FastAPI backend
            const res = await fetch(`${API}/api/network?lat=${lat}&lon=${lon}&radius=${currentRadius}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Network load failed');
            }

            const geojson = await res.json();
            displayNetwork(geojson);

            networkLoaded = true;
            clickPhase = 'origin';
            setStatus(`Loaded: ${geojson.metadata.node_count} nodes, ${geojson.metadata.edge_count} edges`, 'ok');
            instrText.innerHTML = 'Road network ready! <strong>Click the map</strong> to set Origin Pin (A).';

        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message, 'error');
        }

        showLoading(false);
    }

    // ─── High-performance Canvas Network Display ───
    function displayNetwork(geojson) {
        if (networkLayer) map.removeLayer(networkLayer);
        clearRoute();

        // Use canvas renderer for zero DOM click lag
        networkLayer = L.geoJSON(geojson, {
            filter: f => f.geometry.type === 'LineString',
            renderer: canvasRenderer,
            style: () => ({
                color: '#3f3f46',
                weight: 1.5,
                opacity: 0.45,
            }),
            interactive: false  // Keeps map clicks instantaneous!
        }).addTo(map);

        map.fitBounds(networkLayer.getBounds(), { padding: [30, 30] });
    }

    // ─── Find Route (computes both, stores data) ───
    async function findRoute() {
        if (!originLatLng || !destLatLng) return;

        setStatus('Calculating equilibrium paths...', 'loading');

        try {
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

            const res = await fetch(`${API}/api/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'No navigable route found');
            }

            const data = await res.json();
            cachedRouteData = data;

            // Render ONLY the selected route on the map
            renderIndividualRoute();
            setStatus('Route computed successfully', 'ok');

        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message, 'error');
        }
    }

    // ─── Render Individual Route onto Map ───
    function renderIndividualRoute() {
        if (!cachedRouteData) return;

        // Clear existing route polyline
        if (activeRouteLayer) {
            map.removeLayer(activeRouteLayer);
            activeRouteLayer = null;
        }

        const isFastest = activeDisplayedRoute === 'fastest';
        const primaryIsFastest = cachedRouteData.stats.type === 'fastest';

        // Select the appropriate GeoJSON geometry & stats
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

        // Draw the SINGLE selected route
        const routeColor = isFastest ? '#f97316' : '#38bdf8'; // Orange for Fastest, Cyan for Fuel-Efficient

        activeRouteLayer = L.geoJSON(routeGeoJSON, {
            style: {
                color: routeColor,
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
            },
        }).addTo(map);

        // Bring markers to front
        if (originMarker) originMarker.bringToFront();
        if (destMarker) destMarker.bringToFront();

        // Fit map bounds cleanly to the route
        map.fitBounds(activeRouteLayer.getBounds(), { padding: [60, 60] });

        // Update result card and comparison
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

        // Trade-off comparison
        if (cachedRouteData.alt_stats) {
            const s1 = cachedRouteData.stats;
            const s2 = cachedRouteData.alt_stats;
            const timeDiff = Math.abs(s1.time_min - s2.time_min);
            const fuelDiff = Math.abs(s1.fuel_liters - s2.fuel_liters);
            const mlDiff = Math.round(fuelDiff * 1000);

            $('result-savings').hidden = false;
            $('savings-text').innerHTML = `
                Choosing <strong>Fuel-Efficient</strong> burns <strong>${mlDiff} mL less fuel</strong>, trading <strong>${timeDiff.toFixed(1)} mins</strong> of travel time under current traffic equilibrium.
            `;
        } else {
            $('result-savings').hidden = true;
        }
    }

    // ─── Show Congestion Heatmap ───
    btnCongestion.addEventListener('click', showCongestion);

    async function showCongestion() {
        if (!originLatLng || !destLatLng || !networkLoaded) {
            setStatus('Set origin & destination pins first', 'error');
            return;
        }

        setStatus('Simulating traffic equilibrium...', 'loading');

        try {
            const body = {
                lat: mapCenter.lat,
                lon: mapCenter.lon,
                radius: currentRadius,
                origin_lat: originLatLng.lat,
                origin_lon: originLatLng.lng,
                dest_lat: destLatLng.lat,
                dest_lon: destLatLng.lng,
                drivers: currentDrivers,
                mode: currentRouting,
                weight: currentMode === 'fastest' ? 'time' : 'fuel',
            };

            const res = await fetch(`${API}/api/equilibrium`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error('Equilibrium simulation failed');
            const data = await res.json();

            displayCongestion(data.network);
            setStatus('Congestion heatmap active', 'ok');

        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message, 'error');
        }
    }

    function displayCongestion(geojson) {
        if (congestionLayer) map.removeLayer(congestionLayer);

        congestionLayer = L.geoJSON(geojson, {
            filter: f => f.geometry.type === 'LineString' && f.properties.flow > 0,
            renderer: canvasRenderer,
            style: f => {
                const cong = f.properties.congestion || 0;
                let color = '#22c55e';
                if (cong >= 0.9) color = '#ef4444';
                else if (cong >= 0.6) color = '#f97316';
                else if (cong >= 0.3) color = '#f59e0b';

                return {
                    color: color,
                    weight: 3 + Math.min(cong, 1.5) * 5,
                    opacity: 0.7 + Math.min(cong, 1) * 0.3,
                };
            }
        }).addTo(map);
    }

    // ─── Clear All Pins and Routes ───
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
        instrText.innerHTML = networkLoaded
            ? 'Road network ready! <strong>Click the map</strong> to set Origin Pin (A).'
            : 'Click <strong>Load</strong> to import roads, then click map for <strong>Origin (A)</strong> and <strong>Destination (B)</strong>.';

        setStatus('Pins and routes cleared', 'ok');
    }

    // ─── Helpers ───
    function setStatus(msg, type) {
        statusText.textContent = msg;
        sbStatus.className = 'sb-status' + (type === 'loading' ? ' loading' : type === 'error' ? ' error' : '');
    }

    function showLoading(show) {
        mapLoading.hidden = !show;
    }

    // ─── Initialize Map on Load ───
    initMap();
    setStatus('Ready — enter location and click Load', 'ok');
});
