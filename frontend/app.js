/* ═══════════════════════════════════════════════════════════════
   SYNCRO — App Logic
   Landing page interactions + Leaflet map + API integration
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const API = '';  // same origin

    // ─── Scroll reveal ───
    const fadeObs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); fadeObs.unobserve(e.target); } });
    }, { threshold: .1, rootMargin: '0px 0px -40px 0px' });
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
    }, { threshold: .5 });
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
            el.textContent = prefix + (dec ? v.toFixed(dec) : Math.round(v)) + suffix;
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
            for (let i = 0; i < 30; i++) pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.5 + .6 });
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

    // DOM refs
    const $ = id => document.getElementById(id);
    const sidebar = $('sidebar');
    const sbCollapse = $('sb-collapse');
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
    const sbStatus = $('sb-status');
    const statusText = $('status-text');
    const sbInstructions = $('sb-instructions');
    const sbResults = $('sb-results');

    // State
    let map = null;
    let networkLayer = null;
    let routeLayer = null;
    let altRouteLayer = null;
    let congestionLayer = null;
    let originMarker = null;
    let destMarker = null;
    let originLatLng = null;
    let destLatLng = null;
    let mapCenter = { lat: 12.9716, lon: 77.5946 };  // Default: Bangalore
    let currentMode = 'fastest';
    let currentRouting = 'selfish';
    let currentDrivers = 500;
    let currentRadius = 1000;
    let networkLoaded = false;
    let clickPhase = 'origin';  // 'origin' or 'destination'

    // ─── Initialize map ───
    function initMap() {
        map = L.map('map', {
            center: [mapCenter.lat, mapCenter.lon],
            zoom: 15,
            zoomControl: true,
            attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Click handler for origin/destination
        map.on('click', onMapClick);
    }

    function onMapClick(e) {
        if (!networkLoaded) {
            setStatus('Load a network first', 'error');
            return;
        }

        const latlng = e.latlng;

        if (clickPhase === 'origin') {
            // Set origin
            if (originMarker) map.removeLayer(originMarker);
            originMarker = L.circleMarker([latlng.lat, latlng.lng], {
                radius: 10,
                fillColor: '#22c55e',
                fillOpacity: .9,
                color: '#fff',
                weight: 2,
            }).addTo(map).bindPopup('Origin').openPopup();

            originLatLng = latlng;
            clickPhase = 'destination';
            setStatus('Click to set destination', 'ok');
            sbInstructions.querySelector('p').innerHTML = 'Now <strong>click again</strong> to set the destination (red).';

        } else {
            // Set destination
            if (destMarker) map.removeLayer(destMarker);
            destMarker = L.circleMarker([latlng.lat, latlng.lng], {
                radius: 10,
                fillColor: '#ef4444',
                fillOpacity: .9,
                color: '#fff',
                weight: 2,
            }).addTo(map).bindPopup('Destination').openPopup();

            destLatLng = latlng;
            clickPhase = 'origin';

            // Auto-route
            findRoute();
        }
    }

    // ─── Sidebar collapse ───
    sbCollapse.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        setTimeout(() => { if (map) map.invalidateSize(); }, 400);
    });

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
    setupToggle(modeFastest, modeFuel, mode => { currentMode = mode; if (originLatLng && destLatLng) findRoute(); });
    setupToggle(routeSelfish, routeOptimal, routing => { currentRouting = routing; if (originLatLng && destLatLng) findRoute(); });

    // ─── Load Network ───
    btnLoad.addEventListener('click', loadNetwork);
    locationInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadNetwork(); });

    async function loadNetwork() {
        const query = locationInput.value.trim();
        if (!query) return;

        setStatus('Geocoding...', 'loading');
        showLoading(true);

        try {
            // Geocode using Nominatim
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                headers: { 'User-Agent': 'Syncro/1.0' }
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

            setStatus('Loading road network...', 'loading');

            // Load network from backend
            const res = await fetch(`${API}/api/network?lat=${lat}&lon=${lon}&radius=${currentRadius}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Network load failed');
            }

            const geojson = await res.json();
            displayNetwork(geojson);

            networkLoaded = true;
            clickPhase = 'origin';
            setStatus(`Network loaded: ${geojson.metadata.node_count} nodes, ${geojson.metadata.edge_count} edges`, 'ok');
            sbInstructions.querySelector('p').innerHTML = 'Network loaded! <strong>Click the map</strong> to set origin (green).';

        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message, 'error');
        }

        showLoading(false);
    }

    function displayNetwork(geojson) {
        if (networkLayer) map.removeLayer(networkLayer);
        clearRoute();

        networkLayer = L.geoJSON(geojson, {
            filter: f => f.geometry.type === 'LineString',
            style: () => ({
                color: '#3f3f46',
                weight: 1.5,
                opacity: .5,
            }),
            onEachFeature: (feature, layer) => {
                const p = feature.properties;
                if (p.name) {
                    layer.bindPopup(`
                        <div style="font-family:Inter,sans-serif;font-size:13px;color:#1a1a1a;">
                            <strong>${p.name}</strong><br>
                            ${p.speed_kmh} km/h · ${p.distance_km} km · Cap: ${p.capacity}
                        </div>
                    `);
                }
            }
        }).addTo(map);

        map.fitBounds(networkLayer.getBounds(), { padding: [30, 30] });
    }

    // ─── Find Route ───
    async function findRoute() {
        if (!originLatLng || !destLatLng) return;

        setStatus('Finding route...', 'loading');

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
                throw new Error(err.detail || 'Route not found');
            }

            const data = await res.json();
            displayRoute(data);

            setStatus('Route found', 'ok');

        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message, 'error');
        }
    }

    function displayRoute(data) {
        // Clear old routes
        if (routeLayer) map.removeLayer(routeLayer);
        if (altRouteLayer) map.removeLayer(altRouteLayer);

        // Draw alternative route first (underneath)
        if (data.alternative) {
            altRouteLayer = L.geoJSON(data.alternative, {
                style: {
                    color: '#38bdf8',
                    weight: 4,
                    opacity: .45,
                    dashArray: '8 6',
                },
            }).addTo(map);
        }

        // Draw primary route
        routeLayer = L.geoJSON(data.route, {
            style: {
                color: '#f97316',
                weight: 5,
                opacity: .85,
            },
        }).addTo(map);

        // Fit bounds
        const bounds = routeLayer.getBounds();
        if (altRouteLayer) bounds.extend(altRouteLayer.getBounds());
        map.fitBounds(bounds, { padding: [60, 60] });

        // Show results
        showResults(data);
    }

    function showResults(data) {
        const s = data.stats;
        $('rc-type').textContent = s.type === 'fastest' ? 'Fastest' : 'Fuel Efficient';
        $('rc-time').textContent = s.time_min.toFixed(1);
        $('rc-dist').textContent = s.distance_km.toFixed(2);
        $('rc-fuel').textContent = s.fuel_liters.toFixed(3);

        sbResults.hidden = false;
        sbInstructions.hidden = true;

        if (data.alt_stats) {
            const a = data.alt_stats;
            $('result-alt').hidden = false;
            $('rc-alt-type').textContent = a.type === 'fastest' ? 'Fastest' : 'Fuel Efficient';
            $('rc-alt-time').textContent = a.time_min.toFixed(1);
            $('rc-alt-dist').textContent = a.distance_km.toFixed(2);
            $('rc-alt-fuel').textContent = a.fuel_liters.toFixed(3);

            // Calculate savings
            const timeDiff = Math.abs(s.time_min - a.time_min);
            const fuelDiff = Math.abs(s.fuel_liters - a.fuel_liters);
            const savingsEl = $('result-savings');
            savingsEl.hidden = false;
            $('savings-text').textContent = `Difference: ${timeDiff.toFixed(1)} min · ${(fuelDiff * 1000).toFixed(0)} mL fuel`;
        } else {
            $('result-alt').hidden = true;
            $('result-savings').hidden = true;
        }
    }

    // ─── Show Congestion ───
    btnCongestion.addEventListener('click', showCongestion);

    async function showCongestion() {
        if (!originLatLng || !destLatLng || !networkLoaded) {
            setStatus('Set origin and destination first', 'error');
            return;
        }

        setStatus('Running equilibrium...', 'loading');

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

            if (!res.ok) throw new Error('Equilibrium failed');
            const data = await res.json();

            displayCongestion(data.network);
            setStatus('Congestion displayed', 'ok');

        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message, 'error');
        }
    }

    function displayCongestion(geojson) {
        if (congestionLayer) map.removeLayer(congestionLayer);

        congestionLayer = L.geoJSON(geojson, {
            filter: f => f.geometry.type === 'LineString' && f.properties.flow > 0,
            style: f => {
                const cong = f.properties.congestion || 0;
                let color;
                if (cong < .3) color = '#22c55e';
                else if (cong < .6) color = '#f59e0b';
                else if (cong < .9) color = '#f97316';
                else color = '#ef4444';

                return {
                    color: color,
                    weight: 2 + Math.min(cong, 1.5) * 5,
                    opacity: .4 + Math.min(cong, 1) * .5,
                };
            },
            onEachFeature: (feature, layer) => {
                const p = feature.properties;
                layer.bindPopup(`
                    <div style="font-family:Inter,sans-serif;font-size:13px;color:#1a1a1a;">
                        <strong>${p.name || 'Road'}</strong><br>
                        Flow: ${p.flow} veh/h<br>
                        Congestion: ${(p.congestion * 100).toFixed(0)}%<br>
                        Time: ${p.time.toFixed(2)} min
                    </div>
                `);
            }
        }).addTo(map);
    }

    // ─── Clear ───
    btnClear.addEventListener('click', clearRoute);

    function clearRoute() {
        if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
        if (altRouteLayer) { map.removeLayer(altRouteLayer); altRouteLayer = null; }
        if (congestionLayer) { map.removeLayer(congestionLayer); congestionLayer = null; }
        if (originMarker) { map.removeLayer(originMarker); originMarker = null; }
        if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
        originLatLng = null;
        destLatLng = null;
        clickPhase = 'origin';
        sbResults.hidden = true;
        sbInstructions.hidden = false;
        sbInstructions.querySelector('p').innerHTML = networkLoaded
            ? 'Network loaded! <strong>Click the map</strong> to set origin (green).'
            : 'Load a network, then <strong>click the map</strong> to set origin (green) and destination (red).';
        setStatus('Cleared', 'ok');
    }

    // ─── Helpers ───
    function setStatus(msg, type) {
        statusText.textContent = msg;
        sbStatus.className = 'sb-status' + (type === 'loading' ? ' loading' : type === 'error' ? ' error' : '');
    }

    function showLoading(show) {
        mapLoading.hidden = !show;
    }

    // ─── Boot ───
    initMap();
    setStatus('Ready — enter a location and load the network', 'ok');
});
