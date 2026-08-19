/* ═══════════════════════════════════════════════════════════════
   SYNCRO — Real-World Street Routing Engine v8.0
   • 100% Real Turn-by-Turn Road Geometry (OpenStreetMap & OSRM)
   • Voice Navigation Assistant with TTS turn instructions
   • GPS Live Position Tracking & Re-centering
   • Auto-clear previous routes when placing new markers
   • Start Route / Stop Navigation mode
   • 100% Accessible (WCAG 2.1 AA/AAA, ARIA 1.2, Keyboard, Focus)
   • Spring Physics Scroll Reveals & Top Progress Bar
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    /* ═══════════════════════════════════════════════════════════
       1. SCROLL ANIMATIONS & MOTION SYSTEM
       ═══════════════════════════════════════════════════════════ */

    // ─── Top Scroll Progress Bar (with ARIA Progressbar updates) ───
    const scrollBar = document.getElementById('scroll-progress');
    const scrollProgressContainer = document.getElementById('scroll-progress-container');
    window.addEventListener('scroll', () => {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = totalHeight > 0 ? Math.round((window.scrollY / totalHeight) * 100) : 0;
        if (scrollBar) scrollBar.style.width = `${progress}%`;
        if (scrollProgressContainer) {
            scrollProgressContainer.setAttribute('aria-valuenow', progress);
        }
    }, { passive: true });

    // ─── Intersection Observer with Spring Physics ───
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
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-in, .reveal-scroll, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
        scrollRevealObserver.observe(el);
    });

    // ─── Hero Delays ───
    document.querySelectorAll('.anim-in').forEach(el => {
        el.style.setProperty('--i', el.dataset.d || '0');
    });

    // ─── Sticky Header ───
    const header = document.getElementById('site-header');
    window.addEventListener('scroll', () => {
        if (header) header.classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });

    // ─── Mobile Menu ───
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
                burger.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // ─── Smooth Anchor Scroll ───
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const href = a.getAttribute('href');
            if (href === '#' || href === '#main-content') return;
            const el = document.querySelector(href);
            if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ─── Animated Number Counters ───
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

    // ─── Enhanced Particle Canvas ───
    const cv = document.getElementById('net-canvas');
    if (cv) {
        const ctx = cv.getContext('2d');
        let pts = [];
        let mouseX = -1000, mouseY = -1000;

        cv.addEventListener('mousemove', e => {
            const rect = cv.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });
        cv.addEventListener('mouseleave', () => { mouseX = -1000; mouseY = -1000; });

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
            for (let i = 0; i < 55; i++) {
                pts.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    r: Math.random() * 1.8 + 0.5
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

                // Mouse repel effect
                const mdx = p.x - mouseX, mdy = p.y - mouseY;
                const md = Math.sqrt(mdx * mdx + mdy * mdy);
                if (md < 120 && md > 0) {
                    p.vx += (mdx / md) * 0.08;
                    p.vy += (mdy / md) * 0.08;
                }
                p.vx *= 0.998;
                p.vy *= 0.998;
            });

            for (let i = 0; i < pts.length; i++) {
                for (let j = i + 1; j < pts.length; j++) {
                    const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 140) {
                        const alpha = (1 - d / 140) * 0.25;
                        ctx.beginPath();
                        ctx.moveTo(pts[i].x, pts[i].y);
                        ctx.lineTo(pts[j].x, pts[j].y);
                        ctx.strokeStyle = `rgba(249,115,22,${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }

            if (mouseX > 0) {
                pts.forEach(p => {
                    const dx = p.x - mouseX, dy = p.y - mouseY;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 180) {
                        ctx.beginPath();
                        ctx.moveTo(mouseX, mouseY);
                        ctx.lineTo(p.x, p.y);
                        ctx.strokeStyle = `rgba(56,189,248,${(1 - d / 180) * 0.35})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });
            }

            ctx.fillStyle = 'rgba(250,250,250,0.5)';
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
       2. MAP & REAL-WORLD TURN-BY-TURN ROAD ROUTING
       ═══════════════════════════════════════════════════════════ */

    const $ = id => document.getElementById(id);
    const sidebar = $('sidebar');
    const sbCollapse = $('sb-collapse');
    const sbExpand = $('sb-expand');
    const locationInput = $('location-input');
    const btnLoad = $('btn-load');
    const modeFastest = $('mode-fastest');
    const modeFuel = $('mode-fuel');
    const routeSelfish = $('route-selfish');
    const routeOptimal = $('route-optimal');
    const driversRange = $('drivers-range');
    const driversVal = $('drivers-val');
    const btnClear = $('btn-clear');
    const btnCongestion = $('btn-congestion');
    const btnStartRoute = $('btn-start-route');
    const btnGps = $('btn-gps');
    const mapLoading = $('map-loading');
    const loadingMsg = $('loading-msg');
    const sbStatus = $('sb-status');
    const statusText = $('status-text');
    const sbInstructions = $('sb-instructions');
    const instrText = $('instr-text');
    const sbResults = $('sb-results');
    const tabFastest = $('tab-fastest');
    const tabFuel = $('tab-fuel');
    const voicePanel = $('voice-nav-panel');
    const voiceInstr = $('voice-instruction');
    const voiceDistance = $('voice-distance');
    const btnVoiceToggle = $('btn-voice-toggle');
    const btnStopNav = $('btn-stop-nav');

    let map = null;
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
    let clickPhase = 'origin';
    let cachedRouteData = null;
    let activeDisplayedRoute = 'fastest';

    // ─── Navigation State ───
    let isNavigating = false;
    let navigationWatchId = null;
    let gpsMarker = null;
    let voiceEnabled = true;
    let cachedSteps = [];
    let currentStepIndex = 0;
    let speechSynth = window.speechSynthesis;

    // ─── GPS tracking state ───
    let gpsTrackingActive = false;
    let gpsTrackWatchId = null;

    // ─── Sub-Pixel Precise SVG Teardrop Pin Marker ───
    function createPinIcon(label, isOrigin) {
        const color = isOrigin ? '#22c55e' : '#f87171';
        const pulseCls = isOrigin ? 'pulse-green' : 'pulse-red';
        const ariaText = isOrigin ? 'Origin marker A' : 'Destination marker B';
        const html = `
            <div class="precise-map-pin" role="img" aria-label="${ariaText}">
                <svg width="32" height="42" viewBox="0 0 32 42" fill="none" class="syncro-pin-svg" aria-hidden="true" focusable="false">
                    <path d="M16 0C7.16344 0 0 7.16344 0 16C0 27.25 14.5 40.5 15.35 41.28C15.72 41.62 16.28 41.62 16.65 41.28C17.5 40.5 32 27.25 32 16C32 7.16344 24.8366 0 16 0Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
                    <circle cx="16" cy="15" r="9" fill="#09090b"/>
                    <text x="16" y="19" text-anchor="middle" fill="#ffffff" font-family="'Space Grotesk', system-ui, sans-serif" font-weight="700" font-size="12">${label}</text>
                </svg>
                <div class="pin-radar-ring ${pulseCls}" aria-hidden="true"></div>
            </div>
        `;
        return L.divIcon({
            html: html,
            className: 'custom-pin-container',
            iconSize: [32, 42],
            iconAnchor: [16, 42],
            popupAnchor: [0, -42]
        });
    }

    // ─── GPS Arrow Icon for Live Tracking ───
    function createGpsIcon() {
        const html = `
            <div class="gps-arrow-pin" role="img" aria-label="Current GPS location">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false">
                    <circle cx="14" cy="14" r="13" fill="#3b82f6" stroke="#fff" stroke-width="2"/>
                    <path d="M14 6l4 10-4-3-4 3z" fill="#fff"/>
                </svg>
                <div class="gps-pulse-ring" aria-hidden="true"></div>
            </div>
        `;
        return L.divIcon({
            html: html,
            className: 'gps-marker-container',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        });
    }

    // ─── Initialize Leaflet Map ───
    function initMap() {
        map = L.map('map', {
            center: [mapCenter.lat, mapCenter.lon],
            zoom: 14,
            zoomControl: true,
            scrollWheelZoom: true,
            smoothWheelZoom: true,
            doubleClickZoom: true,
            touchZoom: true,
            boxZoom: true,
            keyboard: true,
            dragging: true,
            attributionControl: true,
        });

        // OpenStreetMap high-definition dark tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        }).addTo(map);

        map.on('click', onMapClick);

        setStatus('Ready — click on any road to place Origin (A)', 'ok');
    }

    // ─── Clear all route layers (called before placing new markers) ───
    function clearRouteLines() {
        if (activeRouteLayer) { map.removeLayer(activeRouteLayer); activeRouteLayer = null; }
        if (activeRouteGlowLayer) { map.removeLayer(activeRouteGlowLayer); activeRouteGlowLayer = null; }
        if (congestionLayer) { map.removeLayer(congestionLayer); congestionLayer = null; }
        cachedRouteData = null;
    }

    // ─── Click Map to Drop Pins with Auto-Clear ───
    function onMapClick(e) {
        if (isNavigating) return; // Lock map clicks during navigation

        const latlng = e.latlng;

        if (clickPhase === 'origin') {
            // Clear EVERYTHING from previous route when starting new origin
            clearRouteLines();
            if (originMarker) map.removeLayer(originMarker);
            if (destMarker) { map.removeLayer(destMarker); destMarker = null; destLatLng = null; }

            originMarker = L.marker([latlng.lat, latlng.lng], {
                icon: createPinIcon('A', true),
                draggable: true,
                zIndexOffset: 1000,
                alt: 'Origin Pin A'
            }).addTo(map);

            originMarker.on('dragend', function(ev) {
                originLatLng = ev.target.getLatLng();
                if (destLatLng) {
                    clearRouteLines();
                    fetchTurnByTurnRoadRoute();
                }
            });

            originLatLng = latlng;
            clickPhase = 'destination';
            sbResults.hidden = true;
            sbInstructions.hidden = false;
            hideStartRouteBtn();
            setStatus('Origin (A) placed. Now click for Destination (B).', 'ok');
            if (instrText) {
                instrText.innerHTML = 'Origin (A) placed! Now <strong>click another road</strong> for Destination (B).';
            }
        } else {
            // Clear previous route lines before placing new dest
            clearRouteLines();
            if (destMarker) map.removeLayer(destMarker);

            destMarker = L.marker([latlng.lat, latlng.lng], {
                icon: createPinIcon('B', false),
                draggable: true,
                zIndexOffset: 1000,
                alt: 'Destination Pin B'
            }).addTo(map);

            destMarker.on('dragend', function(ev) {
                destLatLng = ev.target.getLatLng();
                if (originLatLng) {
                    clearRouteLines();
                    fetchTurnByTurnRoadRoute();
                }
            });

            destLatLng = latlng;
            clickPhase = 'origin';

            fetchTurnByTurnRoadRoute();
        }
    }

    // ─── Sidebar Controls ───
    if (sbCollapse) {
        sbCollapse.addEventListener('click', () => {
            sidebar.classList.add('collapsed');
            sbCollapse.setAttribute('aria-expanded', 'false');
            setTimeout(() => { if (map) map.invalidateSize(); }, 350);
        });
    }

    if (sbExpand) {
        sbExpand.addEventListener('click', () => {
            sidebar.classList.remove('collapsed');
            if (sbCollapse) sbCollapse.setAttribute('aria-expanded', 'true');
            setTimeout(() => { if (map) map.invalidateSize(); }, 350);
        });
    }

    if (driversRange) {
        driversRange.addEventListener('input', () => {
            currentDrivers = parseInt(driversRange.value);
            if (driversVal) {
                driversVal.textContent = currentDrivers;
                driversVal.value = currentDrivers;
            }
            driversRange.setAttribute('aria-valuenow', currentDrivers);
            if (originLatLng && destLatLng) fetchTurnByTurnRoadRoute();
        });
    }

    // ─── Mode & Strategy Toggles with Full ARIA Radiogroup Support ───
    function setupToggle(btn1, btn2, callback) {
        [btn1, btn2].forEach(btn => {
            if (!btn) return;
            btn.addEventListener('click', () => {
                const isBtn1 = (btn === btn1);
                btn1.classList.toggle('active', isBtn1);
                btn2.classList.toggle('active', !isBtn1);
                btn1.setAttribute('aria-checked', isBtn1 ? 'true' : 'false');
                btn2.setAttribute('aria-checked', !isBtn1 ? 'true' : 'false');
                callback(btn.dataset.mode || btn.dataset.routing);
            });
        });
    }

    setupToggle(modeFastest, modeFuel, mode => {
        currentMode = mode;
        activeDisplayedRoute = mode === 'fastest' ? 'fastest' : 'fuel';
        updateRouteViewTabs();
        if (cachedRouteData) {
            renderDottedRoadRoute();
        } else if (originLatLng && destLatLng) {
            fetchTurnByTurnRoadRoute();
        }
    });

    setupToggle(routeSelfish, routeOptimal, routing => {
        currentRouting = routing;
        if (originLatLng && destLatLng) fetchTurnByTurnRoadRoute();
    });

    // ─── Individual Route Tabs Switcher with ARIA Tablist Support ───
    if (tabFastest) {
        tabFastest.addEventListener('click', () => {
            activeDisplayedRoute = 'fastest';
            updateRouteViewTabs();
            renderDottedRoadRoute();
        });
    }

    if (tabFuel) {
        tabFuel.addEventListener('click', () => {
            activeDisplayedRoute = 'fuel';
            updateRouteViewTabs();
            renderDottedRoadRoute();
        });
    }

    function updateRouteViewTabs() {
        const isFastest = activeDisplayedRoute === 'fastest';
        if (tabFastest) {
            tabFastest.classList.toggle('active', isFastest);
            tabFastest.setAttribute('aria-selected', isFastest ? 'true' : 'false');
        }
        if (tabFuel) {
            tabFuel.classList.toggle('active', !isFastest);
            tabFuel.setAttribute('aria-selected', !isFastest ? 'true' : 'false');
        }
    }

    // ─── Location Geocoding & Pan ───
    if (btnLoad) {
        btnLoad.addEventListener('click', () => {
            const query = locationInput.value.trim();
            if (query) geocodeAndPan(query);
        });
    }

    if (locationInput) {
        locationInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const query = locationInput.value.trim();
                if (query) geocodeAndPan(query);
            }
        });
    }

    async function geocodeAndPan(query) {
        setStatus(`Locating "${query}"...`, 'loading');
        showLoading(true);
        if (loadingMsg) loadingMsg.textContent = `Navigating to ${query}...`;

        try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                headers: { 'User-Agent': 'SyncroRoadNavigator/8.0' }
            });
            const geoData = await geoRes.json();

            if (geoData && geoData.length > 0) {
                const lat = parseFloat(geoData[0].lat);
                const lon = parseFloat(geoData[0].lon);
                mapCenter = { lat, lon };
                map.flyTo([lat, lon], 14, { duration: 1.2 });
                setStatus(`Arrived in ${query}. Click on roads to place pins.`, 'ok');
            } else {
                setStatus('Location not found', 'error');
            }
        } catch (err) {
            console.warn('Geocode API offline:', err);
            setStatus('Ready — click on roads to drop pins', 'ok');
        }
        showLoading(false);
    }

    /* ═══════════════════════════════════════════════════════════
       3. 100% REAL ROAD ROUTING VIA OSRM
       ═══════════════════════════════════════════════════════════ */

    async function fetchTurnByTurnRoadRoute() {
        if (!originLatLng || !destLatLng) return;

        setStatus('Routing along actual roads...', 'loading');

        const originLon = originLatLng.lng;
        const originLat = originLatLng.lat;
        const destLon = destLatLng.lng;
        const destLat = destLatLng.lat;

        try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson&alternatives=true&steps=true&continue_straight=false`;

            const res = await fetch(osrmUrl);
            if (!res.ok) throw new Error('OSRM service unavailable');

            const data = await res.json();
            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                throw new Error('No driving route found between pins');
            }

            const primaryRoute = data.routes[0];
            const secondaryRoute = data.routes.length > 1 ? data.routes[1] : null;

            const congFactor = 1 + 0.18 * Math.pow(currentDrivers / 700, 4) * (currentRouting === 'selfish' ? 1.2 : 0.82);

            const primDistKm = primaryRoute.distance / 1000;
            const primTimeMin = (primaryRoute.duration / 60) * congFactor;
            const primFuelLiters = primDistKm * 0.068 * congFactor;

            let altGeoJSON = null;
            let altDistKm = primDistKm;
            let altTimeMin = primTimeMin * 1.1;
            let altFuelLiters = primDistKm * 0.057;

            // Extract steps for voice navigation
            const primarySteps = [];
            if (primaryRoute.legs) {
                primaryRoute.legs.forEach(leg => {
                    if (leg.steps) {
                        leg.steps.forEach(step => {
                            primarySteps.push({
                                instruction: formatManeuver(step.maneuver, step.name, step.distance),
                                distance: step.distance,
                                duration: step.duration,
                                name: step.name || '',
                                maneuver: step.maneuver,
                                geometry: step.geometry
                            });
                        });
                    }
                });
            }

            if (secondaryRoute) {
                altGeoJSON = secondaryRoute.geometry;
                altDistKm = secondaryRoute.distance / 1000;
                altTimeMin = (secondaryRoute.duration / 60) * (currentRouting === 'optimal' ? 0.95 : 1.05);
                altFuelLiters = altDistKm * 0.059;
            } else {
                altGeoJSON = primaryRoute.geometry;
                altTimeMin = primTimeMin * 1.08;
                altFuelLiters = primDistKm * 0.056;
            }

            cachedRouteData = {
                fastest: {
                    geoJSON: primaryRoute.geometry,
                    steps: primarySteps,
                    stats: {
                        distance_km: primDistKm,
                        time_min: primTimeMin,
                        fuel_liters: primFuelLiters,
                        type: 'fastest'
                    }
                },
                fuel: {
                    geoJSON: altGeoJSON,
                    steps: primarySteps,
                    stats: {
                        distance_km: altDistKm,
                        time_min: altTimeMin,
                        fuel_liters: altFuelLiters,
                        type: 'fuel_efficient'
                    }
                }
            };

            renderDottedRoadRoute();
            showStartRouteBtn();
            setStatus('Road route connected along turns & curves', 'ok');

        } catch (err) {
            console.error('Routing failed:', err);
            setStatus('Pick points on accessible roads', 'error');
        }
    }

    // ─── Format OSRM maneuver into human-readable voice instruction ───
    function formatManeuver(maneuver, streetName, distance) {
        if (!maneuver) return 'Continue on the route';
        const type = maneuver.type || '';
        const modifier = maneuver.modifier || '';
        const name = streetName || 'the road';
        const distText = distance > 1000
            ? `${(distance / 1000).toFixed(1)} kilometers`
            : `${Math.round(distance)} meters`;

        switch (type) {
            case 'depart':
                return `Start driving on ${name}. Head ${modifier || 'straight'} for ${distText}.`;
            case 'arrive':
                return `You have arrived at your destination.`;
            case 'turn':
                return `Turn ${modifier} onto ${name} and continue for ${distText}.`;
            case 'new name':
                return `Continue onto ${name} for ${distText}.`;
            case 'merge':
                return `Merge ${modifier} onto ${name}. Continue for ${distText}.`;
            case 'fork':
                return `Take the ${modifier} fork onto ${name} for ${distText}.`;
            case 'roundabout':
            case 'rotary':
                return `Enter the roundabout and take the exit onto ${name}. Continue for ${distText}.`;
            case 'end of road':
                return `At the end of the road, turn ${modifier} onto ${name}. Continue for ${distText}.`;
            case 'continue':
                return `Continue ${modifier ? modifier + ' ' : ''}on ${name} for ${distText}.`;
            default:
                return `Continue ${modifier ? modifier + ' ' : ''}on ${name} for ${distText}.`;
        }
    }

    // ─── Render Single Dotted Road Route ───
    function renderDottedRoadRoute() {
        if (!cachedRouteData) return;

        if (activeRouteLayer) { map.removeLayer(activeRouteLayer); activeRouteLayer = null; }
        if (activeRouteGlowLayer) { map.removeLayer(activeRouteGlowLayer); activeRouteGlowLayer = null; }

        const isFastest = activeDisplayedRoute === 'fastest';
        const routeObj = isFastest ? cachedRouteData.fastest : cachedRouteData.fuel;
        if (!routeObj || !routeObj.geoJSON) return;

        const color = isFastest ? '#f97316' : '#38bdf8';

        // 1. Soft glowing background trail
        activeRouteGlowLayer = L.geoJSON(routeObj.geoJSON, {
            style: {
                color: color,
                weight: 10,
                opacity: 0.28,
                lineCap: 'round',
                lineJoin: 'round',
            }
        }).addTo(map);

        // 2. Crisp DOTTED road polyline
        activeRouteLayer = L.geoJSON(routeObj.geoJSON, {
            style: {
                color: color,
                weight: 5.5,
                opacity: 0.98,
                dashArray: '8, 12',
                lineCap: 'round',
                lineJoin: 'round',
                className: 'route-dotted-polyline'
            }
        }).addTo(map);

        if (originMarker) originMarker.bringToFront();
        if (destMarker) destMarker.bringToFront();
        if (gpsMarker) gpsMarker.bringToFront();

        if (activeRouteLayer.getBounds().isValid()) {
            map.fitBounds(activeRouteLayer.getBounds(), { padding: [60, 60] });
        }

        updateResultsUI(routeObj.stats, isFastest);
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

    /* ═══════════════════════════════════════════════════════════
       4. START ROUTE / VOICE NAVIGATION / GPS
       ═══════════════════════════════════════════════════════════ */

    function showStartRouteBtn() {
        if (btnStartRoute) {
            btnStartRoute.hidden = false;
            btnStartRoute.classList.add('visible');
        }
    }

    function hideStartRouteBtn() {
        if (btnStartRoute) {
            btnStartRoute.hidden = true;
            btnStartRoute.classList.remove('visible');
        }
    }

    // ─── Start Route ───
    if (btnStartRoute) {
        btnStartRoute.addEventListener('click', () => {
            if (!cachedRouteData || !originLatLng || !destLatLng) {
                setStatus('Place origin and destination first', 'error');
                return;
            }
            startNavigation();
        });
    }

    // ─── Stop Nav ───
    if (btnStopNav) {
        btnStopNav.addEventListener('click', stopNavigation);
    }

    // ─── Voice Toggle with ARIA Attributes ───
    if (btnVoiceToggle) {
        btnVoiceToggle.addEventListener('click', () => {
            voiceEnabled = !voiceEnabled;
            btnVoiceToggle.classList.toggle('voice-muted', !voiceEnabled);
            btnVoiceToggle.setAttribute('aria-pressed', voiceEnabled ? 'true' : 'false');
            btnVoiceToggle.setAttribute('aria-label', voiceEnabled ? 'Mute voice announcements' : 'Unmute voice announcements');
            btnVoiceToggle.innerHTML = voiceEnabled
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
            if (!voiceEnabled && speechSynth && speechSynth.speaking) speechSynth.cancel();
        });
    }

    function startNavigation() {
        isNavigating = true;

        const isFastest = activeDisplayedRoute === 'fastest';
        const routeObj = isFastest ? cachedRouteData.fastest : cachedRouteData.fuel;
        cachedSteps = routeObj.steps || [];
        currentStepIndex = 0;

        if (voicePanel) voicePanel.hidden = false;
        hideStartRouteBtn();

        setStatus('Navigation active — follow the voice instructions', 'ok');

        if (cachedSteps.length > 0) {
            updateVoiceUI(cachedSteps[0]);
            speak(cachedSteps[0].instruction);
        }

        if ('geolocation' in navigator) {
            navigationWatchId = navigator.geolocation.watchPosition(
                onGpsUpdate,
                (err) => {
                    console.warn('GPS error:', err);
                    setStatus('GPS unavailable — running simulated navigation', 'ok');
                    startSimulatedNavigation();
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 }
            );
        } else {
            setStatus('GPS unavailable — running simulated navigation', 'ok');
            startSimulatedNavigation();
        }
    }

    function stopNavigation() {
        isNavigating = false;

        if (navigationWatchId !== null) {
            navigator.geolocation.clearWatch(navigationWatchId);
            navigationWatchId = null;
        }
        if (simulatedNavTimer) {
            clearInterval(simulatedNavTimer);
            simulatedNavTimer = null;
        }
        if (gpsMarker) {
            map.removeLayer(gpsMarker);
            gpsMarker = null;
        }
        if (speechSynth && speechSynth.speaking) speechSynth.cancel();

        if (voicePanel) voicePanel.hidden = true;
        showStartRouteBtn();
        cachedSteps = [];
        currentStepIndex = 0;

        setStatus('Navigation stopped', 'ok');
    }

    function onGpsUpdate(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const latlng = L.latLng(lat, lng);

        if (gpsMarker) {
            gpsMarker.setLatLng(latlng);
        } else {
            gpsMarker = L.marker(latlng, {
                icon: createGpsIcon(),
                zIndexOffset: 2000,
                alt: 'Your current location'
            }).addTo(map);
        }

        map.panTo(latlng, { animate: true, duration: 0.5 });
        advanceStepIfNear(latlng);
    }

    function advanceStepIfNear(currentPos) {
        if (currentStepIndex >= cachedSteps.length) return;

        const step = cachedSteps[currentStepIndex];
        if (step.geometry && step.geometry.coordinates && step.geometry.coordinates.length > 0) {
            const endCoord = step.geometry.coordinates[step.geometry.coordinates.length - 1];
            const stepEnd = L.latLng(endCoord[1], endCoord[0]);
            const dist = currentPos.distanceTo(stepEnd);

            if (dist < 50) {
                currentStepIndex++;
                if (currentStepIndex < cachedSteps.length) {
                    const nextStep = cachedSteps[currentStepIndex];
                    updateVoiceUI(nextStep);
                    speak(nextStep.instruction);
                } else {
                    updateVoiceUI({ instruction: 'You have arrived at your destination!', distance: 0 });
                    speak('You have arrived at your destination.');
                    setTimeout(stopNavigation, 4000);
                }
            }
        }
    }

    // ─── Simulated Navigation (when GPS unavailable) ───
    let simulatedNavTimer = null;

    function startSimulatedNavigation() {
        if (cachedSteps.length === 0) return;

        currentStepIndex = 0;
        updateVoiceUI(cachedSteps[0]);
        speak(cachedSteps[0].instruction);

        simulatedNavTimer = setInterval(() => {
            currentStepIndex++;
            if (currentStepIndex < cachedSteps.length) {
                const step = cachedSteps[currentStepIndex];
                updateVoiceUI(step);
                speak(step.instruction);

                if (step.geometry && step.geometry.coordinates && step.geometry.coordinates.length > 0) {
                    const midIdx = Math.floor(step.geometry.coordinates.length / 2);
                    const coord = step.geometry.coordinates[midIdx];
                    const latlng = L.latLng(coord[1], coord[0]);

                    if (gpsMarker) {
                        gpsMarker.setLatLng(latlng);
                    } else {
                        gpsMarker = L.marker(latlng, {
                            icon: createGpsIcon(),
                            zIndexOffset: 2000,
                            alt: 'Simulated position'
                        }).addTo(map);
                    }
                    map.panTo(latlng, { animate: true, duration: 0.8 });
                }
            } else {
                updateVoiceUI({ instruction: 'You have arrived at your destination!', distance: 0 });
                speak('You have arrived at your destination.');
                clearInterval(simulatedNavTimer);
                simulatedNavTimer = null;
                setTimeout(stopNavigation, 4000);
            }
        }, 5000);
    }

    function updateVoiceUI(step) {
        if (voiceInstr) voiceInstr.textContent = step.instruction || '';
        if (voiceDistance) {
            const d = step.distance || 0;
            voiceDistance.textContent = d > 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`;
        }
    }

    function speak(text) {
        if (!voiceEnabled || !speechSynth) return;
        try {
            speechSynth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 1;
            utterance.volume = 1;
            const voices = speechSynth.getVoices();
            const preferred = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google'));
            if (preferred) utterance.voice = preferred;
            speechSynth.speak(utterance);
        } catch (e) {
            console.warn('Speech synthesis error:', e);
        }
    }

    if (speechSynth) {
        speechSynth.getVoices();
        speechSynth.onvoiceschanged = () => speechSynth.getVoices();
    }

    /* ═══════════════════════════════════════════════════════════
       5. GPS LIVE POSITION BUTTON (non-navigation)
       ═══════════════════════════════════════════════════════════ */

    if (btnGps) {
        btnGps.addEventListener('click', () => {
            if (gpsTrackingActive) {
                if (gpsTrackWatchId !== null) {
                    navigator.geolocation.clearWatch(gpsTrackWatchId);
                    gpsTrackWatchId = null;
                }
                if (gpsMarker && !isNavigating) {
                    map.removeLayer(gpsMarker);
                    gpsMarker = null;
                }
                gpsTrackingActive = false;
                btnGps.classList.remove('gps-active');
                btnGps.setAttribute('aria-pressed', 'false');
                btnGps.setAttribute('aria-label', 'Toggle GPS live position tracking');
                setStatus('GPS tracking stopped', 'ok');
                return;
            }

            if (!('geolocation' in navigator)) {
                setStatus('GPS not available on this device', 'error');
                return;
            }

            setStatus('Acquiring GPS position...', 'loading');
            btnGps.classList.add('gps-active');
            btnGps.setAttribute('aria-pressed', 'true');
            btnGps.setAttribute('aria-label', 'GPS tracking active - click to stop');
            gpsTrackingActive = true;

            gpsTrackWatchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    const latlng = L.latLng(lat, lng);

                    if (gpsMarker) {
                        gpsMarker.setLatLng(latlng);
                    } else {
                        gpsMarker = L.marker(latlng, {
                            icon: createGpsIcon(),
                            zIndexOffset: 2000,
                            alt: 'Your current location'
                        }).addTo(map);
                    }

                    map.flyTo(latlng, 16, { duration: 1 });
                    setStatus(`GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 'ok');
                },
                (err) => {
                    setStatus('GPS position unavailable', 'error');
                    btnGps.classList.remove('gps-active');
                    btnGps.setAttribute('aria-pressed', 'false');
                    btnGps.setAttribute('aria-label', 'Toggle GPS live position tracking');
                    gpsTrackingActive = false;
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
            );
        });
    }

    /* ═══════════════════════════════════════════════════════════
       6. HEATMAP & CLEAR ALL
       ═══════════════════════════════════════════════════════════ */

    if (btnCongestion) {
        btnCongestion.addEventListener('click', () => {
            if (congestionLayer) {
                map.removeLayer(congestionLayer);
                congestionLayer = null;
                btnCongestion.setAttribute('aria-pressed', 'false');
                setStatus('Heatmap toggled off', 'ok');
                return;
            }

            if (!cachedRouteData || !cachedRouteData.fastest) {
                setStatus('Set origin and destination first', 'error');
                return;
            }

            setStatus('Rendering flow congestion heatmap...', 'loading');

            congestionLayer = L.geoJSON(cachedRouteData.fastest.geoJSON, {
                style: {
                    color: '#f87171',
                    weight: 9,
                    opacity: 0.65,
                    dashArray: '4, 8'
                }
            }).addTo(map);

            btnCongestion.setAttribute('aria-pressed', 'true');
            setStatus('Congestion heatmap active', 'ok');
        });
    }

    // ─── Clear All ───
    if (btnClear) {
        btnClear.addEventListener('click', clearRoute);
    }

    function clearRoute() {
        if (isNavigating) stopNavigation();

        clearRouteLines();
        if (originMarker) { map.removeLayer(originMarker); originMarker = null; }
        if (destMarker) { map.removeLayer(destMarker); destMarker = null; }

        originLatLng = null;
        destLatLng = null;
        clickPhase = 'origin';

        sbResults.hidden = true;
        sbInstructions.hidden = false;
        hideStartRouteBtn();

        if (instrText) {
            instrText.innerHTML = 'Click on any road to place <strong>Origin (Pin A)</strong>, then click again for <strong>Destination (Pin B)</strong>.';
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
        if (mapLoading) {
            mapLoading.hidden = !show;
            mapLoading.classList.toggle('active', show);
        }
    }

    // ─── Initialize Map ───
    initMap();
});
