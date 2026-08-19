/**
 * ═══════════════════════════════════════════════════════════════
 * SYNCRO — Real-World Street Routing Engine v9.0
 * Architecture: Clean Modular Controller Pattern
 * Standards: WCAG 2.1 AAA / ES2022+ / Zero-Leak Memory Design
 * 
 * Modules:
 * 1. AppConfig — Centralized application constants
 * 2. ScrollAndMotionController — Viewport triggers & progress physics
 * 3. ParticleNetworkCanvas — Interactive hero visualizer
 * 4. MapController — Leaflet engine & custom vector pin markers
 * 5. RoutingEngine — OSRM turn-by-turn road geometry & BPR equilibrium
 * 6. VoiceNavigationEngine — SpeechSynthesis & real-time maneuver sequencing
 * 7. GpsTracker — Geolocation positioning & proximity triggers
 * 8. UIController — Form bindings, sidebar controls & ARIA state sync
 * ═══════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    /* ═══════════════════════════════════════════════════════════
       1. APPLICATION CONFIGURATION & CONSTANTS
       ═══════════════════════════════════════════════════════════ */
    const AppConfig = Object.freeze({
        MAP: {
            DEFAULT_CENTER: { lat: 13.0827, lon: 80.2707 }, // Chennai, India
            DEFAULT_ZOOM: 14,
            MAX_ZOOM: 19,
            TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        },
        API: {
            OSRM_BASE_URL: 'https://router.project-osrm.org/route/v1/driving',
            NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org/search',
            USER_AGENT: 'SyncroRoadNavigator/9.0'
        },
        EQUILIBRIUM: {
            BASE_CAPACITY: 700,
            BPR_ALPHA: 0.18,
            BPR_BETA: 4,
            SELFISH_CONGESTION_PENALTY: 1.2,
            OPTIMAL_CONGESTION_PENALTY: 0.82,
            FAST_FUEL_RATE_PER_KM: 0.068,
            EFFICIENT_FUEL_RATE_PER_KM: 0.057
        },
        NAV: {
            WAYPOINT_PROXIMITY_METERS: 50,
            SIMULATED_STEP_INTERVAL_MS: 5000,
            SPEECH_RATE: 0.95,
            SPEECH_PITCH: 1.0,
            SPEECH_VOLUME: 1.0
        },
        COLORS: {
            FASTEST_ROUTE: '#f97316',
            FUEL_ROUTE: '#38bdf8',
            CONGESTION: '#f87171',
            ORIGIN_PIN: '#22c55e',
            DEST_PIN: '#f87171',
            GPS_BLUE: '#3b82f6'
        }
    });

    // Safe DOM helper
    const $ = (id) => document.getElementById(id);

    /* ═══════════════════════════════════════════════════════════
       2. SCROLL & MOTION CONTROLLER
       ═══════════════════════════════════════════════════════════ */
    const ScrollAndMotionController = (() => {
        const scrollBar = $('scroll-progress');
        const scrollContainer = $('scroll-progress-container');
        const header = $('site-header');
        const burger = $('nav-burger');
        const navCenter = $('nav-center');

        /**
         * Animates a numerical counter from 0 to target value.
         * @param {HTMLElement} el 
         */
        function animateCounter(el) {
            const target = parseFloat(el.dataset.count);
            if (Number.isNaN(target)) return;

            const prefix = el.dataset.prefix || '';
            const suffix = el.dataset.suffix || '';
            const decimals = parseInt(el.dataset.decimal, 10) || 0;
            const duration = 1800;
            const startTime = performance.now();

            function tick(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Cubic ease-out
                const easeValue = (1 - Math.pow(1 - progress, 3)) * target;
                
                el.textContent = `${prefix}${decimals ? easeValue.toFixed(decimals) : Math.round(easeValue).toLocaleString()}${suffix}`;

                if (progress < 1) {
                    requestAnimationFrame(tick);
                }
            }

            requestAnimationFrame(tick);
        }

        function initScrollProgress() {
            window.addEventListener('scroll', () => {
                const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
                const progressPercent = scrollableHeight > 0 ? Math.round((window.scrollY / scrollableHeight) * 100) : 0;
                
                if (scrollBar) scrollBar.style.width = `${progressPercent}%`;
                if (scrollContainer) scrollContainer.setAttribute('aria-valuenow', String(progressPercent));
                if (header) header.classList.toggle('scrolled', window.scrollY > 30);
            }, { passive: true });
        }

        function initIntersectionObserver() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        const counters = entry.target.querySelectorAll('.hm-val, .case-metric');
                        counters.forEach((counter) => {
                            if (counter.dataset.count && !counter.classList.contains('counted')) {
                                counter.classList.add('counted');
                                animateCounter(counter);
                            }
                        });
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

            document.querySelectorAll('.fade-in, .reveal-scroll, .reveal-left, .reveal-right, .reveal-scale').forEach((el) => {
                observer.observe(el);
            });
        }

        function initHeroElements() {
            document.querySelectorAll('.anim-in').forEach((el) => {
                el.style.setProperty('--i', el.dataset.d || '0');
            });

            // Trigger hero counters on load
            setTimeout(() => {
                document.querySelectorAll('.hm-val').forEach((counter) => {
                    if (counter.dataset.count && !counter.classList.contains('counted')) {
                        counter.classList.add('counted');
                        animateCounter(counter);
                    }
                });
            }, 250);
        }

        function initMobileMenu() {
            if (!burger || !navCenter) return;

            burger.addEventListener('click', () => {
                const isOpen = !navCenter.classList.contains('mob-open');
                navCenter.classList.toggle('mob-open', isOpen);
                burger.classList.toggle('open', isOpen);
                burger.setAttribute('aria-expanded', String(isOpen));
            });

            navCenter.querySelectorAll('.nav-item').forEach((item) => {
                item.addEventListener('click', () => {
                    navCenter.classList.remove('mob-open');
                    burger.classList.remove('open');
                    burger.setAttribute('aria-expanded', 'false');
                });
            });
        }

        function initSmoothAnchors() {
            document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
                anchor.addEventListener('click', (evt) => {
                    const href = anchor.getAttribute('href');
                    if (href === '#' || href === '#main-content') return;
                    const targetEl = document.querySelector(href);
                    if (targetEl) {
                        evt.preventDefault();
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
        }

        return {
            init() {
                initScrollProgress();
                initIntersectionObserver();
                initHeroElements();
                initMobileMenu();
                initSmoothAnchors();
            },
            animateCounter
        };
    })();

    /* ═══════════════════════════════════════════════════════════
       3. PARTICLE NETWORK CANVAS
       ═══════════════════════════════════════════════════════════ */
    const ParticleNetworkCanvas = (() => {
        const canvas = $('net-canvas');
        if (!canvas) return { init: () => {} };

        const ctx = canvas.getContext('2d');
        let particles = [];
        let mouseX = -1000;
        let mouseY = -1000;
        let animationFrameId = null;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function initParticles() {
            particles = [];
            const width = canvas.offsetWidth || window.innerWidth;
            const height = canvas.offsetHeight || 600;
            const count = 55;

            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    radius: Math.random() * 1.8 + 0.5
                });
            }
        }

        function render() {
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;
            ctx.clearRect(0, 0, width, height);

            // Update & bounce particles
            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                // Mouse repel physics
                const dx = p.x - mouseX;
                const dy = p.y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120 && dist > 0) {
                    p.vx += (dx / dist) * 0.08;
                    p.vy += (dy / dist) * 0.08;
                }

                // Damping
                p.vx *= 0.998;
                p.vy *= 0.998;
            });

            // Connect nearby nodes
            const len = particles.length;
            for (let i = 0; i < len; i++) {
                for (let j = i + 1; j < len; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 140) {
                        const alpha = (1 - dist / 140) * 0.25;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(249,115,22,${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }

            // Mouse connector rays
            if (mouseX > 0) {
                particles.forEach((p) => {
                    const dx = p.x - mouseX;
                    const dy = p.y - mouseY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 180) {
                        ctx.beginPath();
                        ctx.moveTo(mouseX, mouseY);
                        ctx.lineTo(p.x, p.y);
                        ctx.strokeStyle = `rgba(56,189,248,${(1 - dist / 180) * 0.35})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });
            }

            // Draw particle points
            ctx.fillStyle = 'rgba(250,250,250,0.5)';
            particles.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        }

        return {
            init() {
                resize();
                initParticles();
                render();

                canvas.addEventListener('mousemove', (evt) => {
                    const rect = canvas.getBoundingClientRect();
                    mouseX = evt.clientX - rect.left;
                    mouseY = evt.clientY - rect.top;
                }, { passive: true });

                canvas.addEventListener('mouseleave', () => {
                    mouseX = -1000;
                    mouseY = -1000;
                }, { passive: true });

                window.addEventListener('resize', () => {
                    resize();
                    initParticles();
                }, { passive: true });
            }
        };
    })();

    /* ═══════════════════════════════════════════════════════════
       4. MAP & VECTOR MARKERS CONTROLLER
       ═══════════════════════════════════════════════════════════ */
    const MapController = (() => {
        let mapInstance = null;
        let activeRouteLayer = null;
        let activeRouteGlowLayer = null;
        let congestionLayer = null;
        let originMarker = null;
        let destMarker = null;
        let gpsMarker = null;

        /**
         * Generates an SVG teardrop pin with radar pulse ring.
         * @param {string} label 
         * @param {boolean} isOrigin 
         * @returns {L.DivIcon}
         */
        function createPinIcon(label, isOrigin) {
            const color = isOrigin ? AppConfig.COLORS.ORIGIN_PIN : AppConfig.COLORS.DEST_PIN;
            const pulseClass = isOrigin ? 'pulse-green' : 'pulse-red';
            const ariaLabel = isOrigin ? 'Origin marker A' : 'Destination marker B';

            const html = `
                <div class="precise-map-pin" role="img" aria-label="${ariaLabel}">
                    <svg width="32" height="42" viewBox="0 0 32 42" fill="none" class="syncro-pin-svg" aria-hidden="true" focusable="false">
                        <path d="M16 0C7.16344 0 0 7.16344 0 16C0 27.25 14.5 40.5 15.35 41.28C15.72 41.62 16.28 41.62 16.65 41.28C17.5 40.5 32 27.25 32 16C32 7.16344 24.8366 0 16 0Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
                        <circle cx="16" cy="15" r="9" fill="#09090b"/>
                        <text x="16" y="19" text-anchor="middle" fill="#ffffff" font-family="'Space Grotesk', system-ui, sans-serif" font-weight="700" font-size="12">${label}</text>
                    </svg>
                    <div class="pin-radar-ring ${pulseClass}" aria-hidden="true"></div>
                </div>
            `;

            return L.divIcon({
                html,
                className: 'custom-pin-container',
                iconSize: [32, 42],
                iconAnchor: [16, 42],
                popupAnchor: [0, -42]
            });
        }

        /**
         * Generates a pulse GPS orientation marker.
         * @returns {L.DivIcon}
         */
        function createGpsIcon() {
            const html = `
                <div class="gps-arrow-pin" role="img" aria-label="Current GPS Location">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false">
                        <circle cx="14" cy="14" r="13" fill="${AppConfig.COLORS.GPS_BLUE}" stroke="#fff" stroke-width="2"/>
                        <path d="M14 6l4 10-4-3-4 3z" fill="#fff"/>
                    </svg>
                    <div class="gps-pulse-ring" aria-hidden="true"></div>
                </div>
            `;

            return L.divIcon({
                html,
                className: 'gps-marker-container',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
        }

        function init() {
            mapInstance = L.map('map', {
                center: [AppConfig.MAP.DEFAULT_CENTER.lat, AppConfig.MAP.DEFAULT_CENTER.lon],
                zoom: AppConfig.MAP.DEFAULT_ZOOM,
                zoomControl: true,
                scrollWheelZoom: true,
                smoothWheelZoom: true,
                doubleClickZoom: true,
                touchZoom: true,
                boxZoom: true,
                keyboard: true,
                dragging: true,
                attributionControl: true
            });

            L.tileLayer(AppConfig.MAP.TILE_URL, {
                maxZoom: AppConfig.MAP.MAX_ZOOM,
                attribution: AppConfig.MAP.TILE_ATTRIBUTION
            }).addTo(mapInstance);
        }

        return {
            init,
            getMap: () => mapInstance,
            createPinIcon,
            createGpsIcon,
            getActiveRouteLayer: () => activeRouteLayer,
            setActiveRouteLayer: (layer) => { activeRouteLayer = layer; },
            getActiveRouteGlowLayer: () => activeRouteGlowLayer,
            setActiveRouteGlowLayer: (layer) => { activeRouteGlowLayer = layer; },
            getCongestionLayer: () => congestionLayer,
            setCongestionLayer: (layer) => { congestionLayer = layer; },
            getOriginMarker: () => originMarker,
            setOriginMarker: (marker) => { originMarker = marker; },
            getDestMarker: () => destMarker,
            setDestMarker: (marker) => { destMarker = marker; },
            getGpsMarker: () => gpsMarker,
            setGpsMarker: (marker) => { gpsMarker = marker; },

            clearRoutePolylines() {
                if (activeRouteLayer && mapInstance) {
                    mapInstance.removeLayer(activeRouteLayer);
                    activeRouteLayer = null;
                }
                if (activeRouteGlowLayer && mapInstance) {
                    mapInstance.removeLayer(activeRouteGlowLayer);
                    activeRouteGlowLayer = null;
                }
                if (congestionLayer && mapInstance) {
                    mapInstance.removeLayer(congestionLayer);
                    congestionLayer = null;
                }
            },

            clearAll() {
                this.clearRoutePolylines();
                if (originMarker && mapInstance) {
                    mapInstance.removeLayer(originMarker);
                    originMarker = null;
                }
                if (destMarker && mapInstance) {
                    mapInstance.removeLayer(destMarker);
                    destMarker = null;
                }
                if (gpsMarker && mapInstance) {
                    mapInstance.removeLayer(gpsMarker);
                    gpsMarker = null;
                }
            }
        };
    })();

    /* ═══════════════════════════════════════════════════════════
       5. ROUTING & EQUILIBRIUM ENGINE
       ═══════════════════════════════════════════════════════════ */
    const RoutingEngine = (() => {
        let cachedRouteData = null;
        let activeDisplayedRoute = 'fastest'; // 'fastest' | 'fuel'
        let currentMode = 'fastest';
        let currentRouting = 'selfish';
        let currentDrivers = 600;
        let originLatLng = null;
        let destLatLng = null;
        let clickPhase = 'origin';

        /**
         * Translates an OSRM step maneuver into human-spoken instruction.
         */
        function formatManeuver(maneuver, streetName, distanceMeters) {
            if (!maneuver) return 'Continue on the current road';
            const type = maneuver.type || '';
            const modifier = maneuver.modifier || '';
            const roadName = streetName || 'the road';
            const distanceText = distanceMeters > 1000
                ? `${(distanceMeters / 1000).toFixed(1)} kilometers`
                : `${Math.round(distanceMeters)} meters`;

            switch (type) {
                case 'depart':
                    return `Start driving on ${roadName}. Head ${modifier || 'straight'} for ${distanceText}.`;
                case 'arrive':
                    return `You have arrived at your destination.`;
                case 'turn':
                    return `Turn ${modifier} onto ${roadName} and continue for ${distanceText}.`;
                case 'new name':
                    return `Continue onto ${roadName} for ${distanceText}.`;
                case 'merge':
                    return `Merge ${modifier} onto ${roadName}. Continue for ${distanceText}.`;
                case 'fork':
                    return `Take the ${modifier} fork onto ${roadName} for ${distanceText}.`;
                case 'roundabout':
                case 'rotary':
                    return `Enter the roundabout and take the exit onto ${roadName}. Continue for ${distanceText}.`;
                case 'end of road':
                    return `At the end of the road, turn ${modifier} onto ${roadName}. Continue for ${distanceText}.`;
                default:
                    return `Continue ${modifier ? modifier + ' ' : ''}on ${roadName} for ${distanceText}.`;
            }
        }

        /**
         * Queries OSRM road geometry and computes BPR congestion delay.
         */
        async function fetchRoadRoute() {
            if (!originLatLng || !destLatLng) return;

            UIController.setStatus('Routing along actual roads...', 'loading');

            const originLon = originLatLng.lng;
            const originLat = originLatLng.lat;
            const destLon = destLatLng.lng;
            const destLat = destLatLng.lat;

            try {
                const url = `${AppConfig.API.OSRM_BASE_URL}/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson&alternatives=true&steps=true&continue_straight=false`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('OSRM routing gateway unavailable');

                const data = await response.json();
                if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                    throw new Error('No driving route found between specified pins');
                }

                const primaryRoute = data.routes[0];
                const secondaryRoute = data.routes.length > 1 ? data.routes[1] : null;

                // BPR equilibrium congestion formula: t = t_0 * (1 + alpha * (V/C)^beta)
                const volumeRatio = currentDrivers / AppConfig.EQUILIBRIUM.BASE_CAPACITY;
                const strategyMultiplier = currentRouting === 'selfish' 
                    ? AppConfig.EQUILIBRIUM.SELFISH_CONGESTION_PENALTY 
                    : AppConfig.EQUILIBRIUM.OPTIMAL_CONGESTION_PENALTY;
                const congestionFactor = 1 + AppConfig.EQUILIBRIUM.BPR_ALPHA * Math.pow(volumeRatio, AppConfig.EQUILIBRIUM.BPR_BETA) * strategyMultiplier;

                const primaryDistKm = primaryRoute.distance / 1000;
                const primaryTimeMin = (primaryRoute.duration / 60) * congestionFactor;
                const primaryFuelLiters = primaryDistKm * AppConfig.EQUILIBRIUM.FAST_FUEL_RATE_PER_KM * congestionFactor;

                // Parse voice maneuvers
                const primarySteps = [];
                if (primaryRoute.legs) {
                    primaryRoute.legs.forEach((leg) => {
                        if (leg.steps) {
                            leg.steps.forEach((step) => {
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

                // Fuel-efficient alternative
                let altGeoJSON = primaryRoute.geometry;
                let altDistKm = primaryDistKm;
                let altTimeMin = primaryTimeMin * 1.08;
                let altFuelLiters = primaryDistKm * AppConfig.EQUILIBRIUM.EFFICIENT_FUEL_RATE_PER_KM;

                if (secondaryRoute) {
                    altGeoJSON = secondaryRoute.geometry;
                    altDistKm = secondaryRoute.distance / 1000;
                    altTimeMin = (secondaryRoute.duration / 60) * (currentRouting === 'optimal' ? 0.95 : 1.05);
                    altFuelLiters = altDistKm * 0.059;
                }

                cachedRouteData = {
                    fastest: {
                        geoJSON: primaryRoute.geometry,
                        steps: primarySteps,
                        stats: {
                            distance_km: primaryDistKm,
                            time_min: primaryTimeMin,
                            fuel_liters: primaryFuelLiters,
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

                renderActivePolyline();
                UIController.showStartRouteButton(true);
                UIController.setStatus('Road route connected along turns & curves', 'ok');

            } catch (err) {
                console.error('[RoutingEngine] Route computation failure:', err);
                UIController.setStatus('Pick points on accessible roads', 'error');
            }
        }

        /**
         * Renders the glowing and dotted polyline layers onto the map.
         */
        function renderActivePolyline() {
            if (!cachedRouteData) return;

            MapController.clearRoutePolylines();

            const isFastest = activeDisplayedRoute === 'fastest';
            const routeObj = isFastest ? cachedRouteData.fastest : cachedRouteData.fuel;
            if (!routeObj || !routeObj.geoJSON) return;

            const map = MapController.getMap();
            const color = isFastest ? AppConfig.COLORS.FASTEST_ROUTE : AppConfig.COLORS.FUEL_ROUTE;

            // 1. Soft glowing background trail
            const glowLayer = L.geoJSON(routeObj.geoJSON, {
                style: {
                    color,
                    weight: 10,
                    opacity: 0.28,
                    lineCap: 'round',
                    lineJoin: 'round'
                }
            }).addTo(map);
            MapController.setActiveRouteGlowLayer(glowLayer);

            // 2. Crisp animated dotted road polyline
            const polylineLayer = L.geoJSON(routeObj.geoJSON, {
                style: {
                    color,
                    weight: 5.5,
                    opacity: 0.98,
                    dashArray: '8, 12',
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'route-dotted-polyline'
                }
            }).addTo(map);
            MapController.setActiveRouteLayer(polylineLayer);

            // Bring markers to top
            const originMarker = MapController.getOriginMarker();
            const destMarker = MapController.getDestMarker();
            const gpsMarker = MapController.getGpsMarker();
            if (originMarker) originMarker.bringToFront();
            if (destMarker) destMarker.bringToFront();
            if (gpsMarker) gpsMarker.bringToFront();

            if (polylineLayer.getBounds().isValid()) {
                map.fitBounds(polylineLayer.getBounds(), { padding: [60, 60] });
            }

            UIController.updateResultsPanel(routeObj.stats, isFastest, cachedRouteData);
        }

        function handleMapClick(e) {
            if (VoiceNavigationEngine.isNavigating()) return;

            const latlng = e.latlng;
            const map = MapController.getMap();

            if (clickPhase === 'origin') {
                MapController.clearRoutePolylines();
                const existingOrigin = MapController.getOriginMarker();
                const existingDest = MapController.getDestMarker();
                if (existingOrigin) map.removeLayer(existingOrigin);
                if (existingDest) {
                    map.removeLayer(existingDest);
                    MapController.setDestMarker(null);
                    destLatLng = null;
                }

                const marker = L.marker([latlng.lat, latlng.lng], {
                    icon: MapController.createPinIcon('A', true),
                    draggable: true,
                    zIndexOffset: 1000,
                    alt: 'Origin Pin A'
                }).addTo(map);

                marker.on('dragend', (ev) => {
                    originLatLng = ev.target.getLatLng();
                    if (destLatLng) {
                        MapController.clearRoutePolylines();
                        fetchRoadRoute();
                    }
                });

                MapController.setOriginMarker(marker);
                originLatLng = latlng;
                clickPhase = 'destination';

                UIController.hideResultsPanel();
                UIController.showStartRouteButton(false);
                UIController.setStatus('Origin (A) placed. Now click for Destination (B).', 'ok');
                UIController.setInstructions('Origin (A) placed! Now <strong>click another road</strong> for Destination (B).');
            } else {
                MapController.clearRoutePolylines();
                const existingDest = MapController.getDestMarker();
                if (existingDest) map.removeLayer(existingDest);

                const marker = L.marker([latlng.lat, latlng.lng], {
                    icon: MapController.createPinIcon('B', false),
                    draggable: true,
                    zIndexOffset: 1000,
                    alt: 'Destination Pin B'
                }).addTo(map);

                marker.on('dragend', (ev) => {
                    destLatLng = ev.target.getLatLng();
                    if (originLatLng) {
                        MapController.clearRoutePolylines();
                        fetchRoadRoute();
                    }
                });

                MapController.setDestMarker(marker);
                destLatLng = latlng;
                clickPhase = 'origin';

                fetchRoadRoute();
            }
        }

        return {
            init() {
                const map = MapController.getMap();
                map.on('click', handleMapClick);
            },
            fetchRoadRoute,
            renderActivePolyline,
            getCachedRouteData: () => cachedRouteData,
            getActiveDisplayedRoute: () => activeDisplayedRoute,
            setActiveDisplayedRoute: (routeKey) => { activeDisplayedRoute = routeKey; },
            getCurrentMode: () => currentMode,
            setCurrentMode: (mode) => { currentMode = mode; },
            getCurrentRouting: () => currentRouting,
            setCurrentRouting: (routing) => { currentRouting = routing; },
            getCurrentDrivers: () => currentDrivers,
            setCurrentDrivers: (val) => { currentDrivers = val; },
            getOriginLatLng: () => originLatLng,
            getDestLatLng: () => destLatLng,
            resetClickPhase: () => {
                originLatLng = null;
                destLatLng = null;
                cachedRouteData = null;
                clickPhase = 'origin';
            }
        };
    })();

    /* ═══════════════════════════════════════════════════════════
       6. VOICE NAVIGATION ENGINE
       ═══════════════════════════════════════════════════════════ */
    const VoiceNavigationEngine = (() => {
        let navigating = false;
        let watchId = null;
        let simulatedTimer = null;
        let voiceEnabled = true;
        let currentSteps = [];
        let currentStepIndex = 0;
        const synth = window.speechSynthesis;

        function speak(text) {
            if (!voiceEnabled || !synth) return;
            try {
                synth.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = AppConfig.NAV.SPEECH_RATE;
                utterance.pitch = AppConfig.NAV.SPEECH_PITCH;
                utterance.volume = AppConfig.NAV.SPEECH_VOLUME;

                const voices = synth.getVoices();
                const preferredVoice = voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('google'));
                if (preferredVoice) utterance.voice = preferredVoice;

                synth.speak(utterance);
            } catch (err) {
                console.warn('[VoiceNav] TTS engine notice:', err);
            }
        }

        function updateVoiceDisplay(step) {
            const instrEl = $('voice-instruction');
            const distEl = $('voice-distance');
            if (instrEl) instrEl.textContent = step.instruction || '';
            if (distEl) {
                const dist = step.distance || 0;
                distEl.textContent = dist > 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`;
            }
        }

        function advanceStepIfNear(currentPos) {
            if (currentStepIndex >= currentSteps.length) return;

            const step = currentSteps[currentStepIndex];
            if (step.geometry && step.geometry.coordinates && step.geometry.coordinates.length > 0) {
                const coords = step.geometry.coordinates;
                const endCoord = coords[coords.length - 1];
                const stepEndLatLng = L.latLng(endCoord[1], endCoord[0]);
                const distance = currentPos.distanceTo(stepEndLatLng);

                if (distance < AppConfig.NAV.WAYPOINT_PROXIMITY_METERS) {
                    currentStepIndex++;
                    if (currentStepIndex < currentSteps.length) {
                        const nextStep = currentSteps[currentStepIndex];
                        updateVoiceDisplay(nextStep);
                        speak(nextStep.instruction);
                    } else {
                        updateVoiceDisplay({ instruction: 'You have arrived at your destination!', distance: 0 });
                        speak('You have arrived at your destination.');
                        setTimeout(stop, 4000);
                    }
                }
            }
        }

        function onGpsPositionUpdate(pos) {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const latlng = L.latLng(lat, lng);
            const map = MapController.getMap();

            let marker = MapController.getGpsMarker();
            if (marker) {
                marker.setLatLng(latlng);
            } else {
                marker = L.marker(latlng, {
                    icon: MapController.createGpsIcon(),
                    zIndexOffset: 2000,
                    alt: 'Current Location'
                }).addTo(map);
                MapController.setGpsMarker(marker);
            }

            map.panTo(latlng, { animate: true, duration: 0.5 });
            advanceStepIfNear(latlng);
        }

        function startSimulatedFallback() {
            if (currentSteps.length === 0) return;

            currentStepIndex = 0;
            updateVoiceDisplay(currentSteps[0]);
            speak(currentSteps[0].instruction);

            simulatedTimer = setInterval(() => {
                currentStepIndex++;
                if (currentStepIndex < currentSteps.length) {
                    const step = currentSteps[currentStepIndex];
                    updateVoiceDisplay(step);
                    speak(step.instruction);

                    if (step.geometry && step.geometry.coordinates && step.geometry.coordinates.length > 0) {
                        const coords = step.geometry.coordinates;
                        const midCoord = coords[Math.floor(coords.length / 2)];
                        const latlng = L.latLng(midCoord[1], midCoord[0]);
                        const map = MapController.getMap();

                        let marker = MapController.getGpsMarker();
                        if (marker) {
                            marker.setLatLng(latlng);
                        } else {
                            marker = L.marker(latlng, {
                                icon: MapController.createGpsIcon(),
                                zIndexOffset: 2000,
                                alt: 'Simulated location'
                            }).addTo(map);
                            MapController.setGpsMarker(marker);
                        }
                        map.panTo(latlng, { animate: true, duration: 0.8 });
                    }
                } else {
                    updateVoiceDisplay({ instruction: 'You have arrived at your destination!', distance: 0 });
                    speak('You have arrived at your destination.');
                    clearInterval(simulatedTimer);
                    simulatedTimer = null;
                    setTimeout(stop, 4000);
                }
            }, AppConfig.NAV.SIMULATED_STEP_INTERVAL_MS);
        }

        function start() {
            const cached = RoutingEngine.getCachedRouteData();
            if (!cached) return;

            navigating = true;
            const activeKey = RoutingEngine.getActiveDisplayedRoute();
            const routeObj = activeKey === 'fastest' ? cached.fastest : cached.fuel;
            currentSteps = routeObj.steps || [];
            currentStepIndex = 0;

            const voicePanel = $('voice-nav-panel');
            if (voicePanel) voicePanel.hidden = false;
            UIController.showStartRouteButton(false);
            UIController.setStatus('Navigation active — follow the voice instructions', 'ok');

            if (currentSteps.length > 0) {
                updateVoiceDisplay(currentSteps[0]);
                speak(currentSteps[0].instruction);
            }

            if ('geolocation' in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    onGpsPositionUpdate,
                    (err) => {
                        console.warn('[VoiceNav] Geolocation fallback triggered:', err.message);
                        UIController.setStatus('GPS unavailable — running simulated navigation', 'ok');
                        startSimulatedFallback();
                    },
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 }
                );
            } else {
                startSimulatedFallback();
            }
        }

        function stop() {
            navigating = false;

            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            if (simulatedTimer !== null) {
                clearInterval(simulatedTimer);
                simulatedTimer = null;
            }

            const gpsMarker = MapController.getGpsMarker();
            if (gpsMarker) {
                const map = MapController.getMap();
                if (map) map.removeLayer(gpsMarker);
                MapController.setGpsMarker(null);
            }

            if (synth && synth.speaking) synth.cancel();

            const voicePanel = $('voice-nav-panel');
            if (voicePanel) voicePanel.hidden = true;

            UIController.showStartRouteButton(true);
            currentSteps = [];
            currentStepIndex = 0;
            UIController.setStatus('Navigation stopped', 'ok');
        }

        function toggleMute() {
            voiceEnabled = !voiceEnabled;
            const btn = $('btn-voice-toggle');
            if (btn) {
                btn.classList.toggle('voice-muted', !voiceEnabled);
                btn.setAttribute('aria-pressed', String(voiceEnabled));
                btn.setAttribute('aria-label', voiceEnabled ? 'Mute voice announcements' : 'Unmute voice announcements');
                btn.innerHTML = voiceEnabled
                    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>'
                    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
            }
            if (!voiceEnabled && synth && synth.speaking) synth.cancel();
        }

        return {
            init() {
                if (synth) {
                    synth.getVoices();
                    synth.onvoiceschanged = () => synth.getVoices();
                }
                const startBtn = $('btn-start-route');
                const stopBtn = $('btn-stop-nav');
                const voiceToggleBtn = $('btn-voice-toggle');

                if (startBtn) startBtn.addEventListener('click', start);
                if (stopBtn) stopBtn.addEventListener('click', stop);
                if (voiceToggleBtn) voiceToggleBtn.addEventListener('click', toggleMute);
            },
            isNavigating: () => navigating,
            start,
            stop
        };
    })();

    /* ═══════════════════════════════════════════════════════════
       7. GPS LIVE TRACKER
       ═══════════════════════════════════════════════════════════ */
    const GpsTracker = (() => {
        let active = false;
        let watchId = null;

        function toggle() {
            const btn = $('btn-gps');

            if (active) {
                if (watchId !== null) {
                    navigator.geolocation.clearWatch(watchId);
                    watchId = null;
                }
                const marker = MapController.getGpsMarker();
                if (marker && !VoiceNavigationEngine.isNavigating()) {
                    const map = MapController.getMap();
                    if (map) map.removeLayer(marker);
                    MapController.setGpsMarker(null);
                }
                active = false;
                if (btn) {
                    btn.classList.remove('gps-active');
                    btn.setAttribute('aria-pressed', 'false');
                    btn.setAttribute('aria-label', 'Toggle GPS live position tracking');
                }
                UIController.setStatus('GPS tracking stopped', 'ok');
                return;
            }

            if (!('geolocation' in navigator)) {
                UIController.setStatus('GPS not available on this device', 'error');
                return;
            }

            UIController.setStatus('Acquiring GPS position...', 'loading');
            if (btn) {
                btn.classList.add('gps-active');
                btn.setAttribute('aria-pressed', 'true');
                btn.setAttribute('aria-label', 'GPS tracking active - click to stop');
            }
            active = true;

            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    const latlng = L.latLng(lat, lng);
                    const map = MapController.getMap();

                    let marker = MapController.getGpsMarker();
                    if (marker) {
                        marker.setLatLng(latlng);
                    } else {
                        marker = L.marker(latlng, {
                            icon: MapController.createGpsIcon(),
                            zIndexOffset: 2000,
                            alt: 'Current GPS Position'
                        }).addTo(map);
                        MapController.setGpsMarker(marker);
                    }

                    map.flyTo(latlng, 16, { duration: 1 });
                    UIController.setStatus(`GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 'ok');
                },
                (err) => {
                    console.warn('[GpsTracker] Position watch error:', err.message);
                    UIController.setStatus('GPS position unavailable', 'error');
                    if (btn) {
                        btn.classList.remove('gps-active');
                        btn.setAttribute('aria-pressed', 'false');
                    }
                    active = false;
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
            );
        }

        return {
            init() {
                const btn = $('btn-gps');
                if (btn) btn.addEventListener('click', toggle);
            }
        };
    })();

    /* ═══════════════════════════════════════════════════════════
       8. UI CONTROLLER & VIEW BINDINGS
       ═══════════════════════════════════════════════════════════ */
    const UIController = (() => {
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
        const mapLoading = $('map-loading');
        const loadingMsg = $('loading-msg');
        const sbStatus = $('sb-status');
        const statusText = $('status-text');
        const sbInstructions = $('sb-instructions');
        const instrText = $('instr-text');
        const sbResults = $('sb-results');
        const tabFastest = $('tab-fastest');
        const tabFuel = $('tab-fuel');

        function setupToggleButtons(btn1, btn2, callback) {
            [btn1, btn2].forEach((btn) => {
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

        async function geocodeLocation(query) {
            setStatus(`Locating "${query}"...`, 'loading');
            showLoadingOverlay(true, `Navigating to ${query}...`);

            try {
                const url = `${AppConfig.API.NOMINATIM_BASE_URL}?format=json&q=${encodeURIComponent(query)}&limit=1`;
                const res = await fetch(url, { headers: { 'User-Agent': AppConfig.API.USER_AGENT } });
                const data = await res.json();

                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    const map = MapController.getMap();
                    map.flyTo([lat, lon], AppConfig.MAP.DEFAULT_ZOOM, { duration: 1.2 });
                    setStatus(`Arrived in ${query}. Click on roads to place pins.`, 'ok');
                } else {
                    setStatus('Location not found', 'error');
                }
            } catch (err) {
                console.warn('[UIController] Geocode offline:', err);
                setStatus('Ready — click on roads to drop pins', 'ok');
            }
            showLoadingOverlay(false);
        }

        function toggleCongestionHeatmap() {
            let layer = MapController.getCongestionLayer();
            if (layer) {
                MapController.getMap().removeLayer(layer);
                MapController.setCongestionLayer(null);
                if (btnCongestion) btnCongestion.setAttribute('aria-pressed', 'false');
                setStatus('Heatmap toggled off', 'ok');
                return;
            }

            const cached = RoutingEngine.getCachedRouteData();
            if (!cached || !cached.fastest) {
                setStatus('Set origin and destination first', 'error');
                return;
            }

            setStatus('Rendering flow congestion heatmap...', 'loading');
            const map = MapController.getMap();
            layer = L.geoJSON(cached.fastest.geoJSON, {
                style: {
                    color: AppConfig.COLORS.CONGESTION,
                    weight: 9,
                    opacity: 0.65,
                    dashArray: '4, 8'
                }
            }).addTo(map);

            MapController.setCongestionLayer(layer);
            if (btnCongestion) btnCongestion.setAttribute('aria-pressed', 'true');
            setStatus('Congestion heatmap active', 'ok');
        }

        function clearAllPinsAndRoute() {
            if (VoiceNavigationEngine.isNavigating()) {
                VoiceNavigationEngine.stop();
            }

            MapController.clearAll();
            RoutingEngine.resetClickPhase();

            hideResultsPanel();
            showStartRouteButton(false);
            setInstructions('Click on any road to place <strong>Origin (Pin A)</strong>, then click again for <strong>Destination (Pin B)</strong>.');
            setStatus('Pins and routes cleared', 'ok');
        }

        function setStatus(msg, type) {
            if (statusText) statusText.textContent = msg;
            if (sbStatus) {
                sbStatus.className = `sb-status ${type === 'loading' ? 'loading' : type === 'error' ? 'error' : ''}`.trim();
            }
        }

        function setInstructions(html) {
            if (sbInstructions) sbInstructions.hidden = false;
            if (instrText) instrText.innerHTML = html;
        }

        function showLoadingOverlay(show, message = '') {
            if (!mapLoading) return;
            mapLoading.hidden = !show;
            mapLoading.classList.toggle('active', show);
            if (loadingMsg && message) loadingMsg.textContent = message;
        }

        function showStartRouteButton(show) {
            if (!btnStartRoute) return;
            btnStartRoute.hidden = !show;
            btnStartRoute.classList.toggle('visible', show);
        }

        function hideResultsPanel() {
            if (sbResults) sbResults.hidden = true;
            if (sbInstructions) sbInstructions.hidden = false;
        }

        function updateResultsPanel(stats, isFastest, cachedData) {
            if (!stats) return;

            const rcType = $('rc-type');
            const rcCard = $('result-active-card');
            const rcLabel = $('rc-viewing-label');
            const rcTime = $('rc-time');
            const rcDist = $('rc-dist');
            const rcFuel = $('rc-fuel');
            const resultSavings = $('result-savings');
            const savingsText = $('savings-text');

            if (rcType) {
                rcType.textContent = isFastest ? 'Fastest Road Route' : 'Fuel-Efficient Road Route';
                rcType.className = `rc-badge ${isFastest ? 'rc-badge-primary' : 'rc-badge-fuel'}`;
            }
            if (rcCard) {
                rcCard.className = `result-card ${isFastest ? 'result-primary' : 'result-fuel-style'}`;
            }
            if (rcLabel) {
                rcLabel.textContent = isFastest ? 'Connected via fastest roads & turns' : 'Connected via fuel-optimal road geometry';
            }
            if (rcTime) rcTime.textContent = stats.time_min.toFixed(1);
            if (rcDist) rcDist.textContent = stats.distance_km.toFixed(2);
            if (rcFuel) rcFuel.textContent = stats.fuel_liters.toFixed(3);

            if (sbResults) sbResults.hidden = false;
            if (sbInstructions) sbInstructions.hidden = true;

            if (cachedData && cachedData.fastest && cachedData.fuel && resultSavings && savingsText) {
                const f1 = cachedData.fastest.stats;
                const f2 = cachedData.fuel.stats;
                const timeDiff = Math.abs(f1.time_min - f2.time_min);
                const fuelDiff = Math.abs(f1.fuel_liters - f2.fuel_liters);
                const mlDiff = Math.round(fuelDiff * 1000);

                resultSavings.hidden = false;
                savingsText.innerHTML = `The <strong>Fuel-Efficient</strong> route burns <strong>${mlDiff} mL less fuel</strong>, trading <strong>${timeDiff.toFixed(1)} mins</strong> across real turn-by-turn road geometry.`;
            } else if (resultSavings) {
                resultSavings.hidden = true;
            }
        }

        return {
            init() {
                // Sidebar Collapse/Expand
                if (sbCollapse) {
                    sbCollapse.addEventListener('click', () => {
                        sidebar.classList.add('collapsed');
                        sbCollapse.setAttribute('aria-expanded', 'false');
                        setTimeout(() => {
                            const map = MapController.getMap();
                            if (map) map.invalidateSize();
                        }, 350);
                    });
                }

                if (sbExpand) {
                    sbExpand.addEventListener('click', () => {
                        sidebar.classList.remove('collapsed');
                        if (sbCollapse) sbCollapse.setAttribute('aria-expanded', 'true');
                        setTimeout(() => {
                            const map = MapController.getMap();
                            if (map) map.invalidateSize();
                        }, 350);
                    });
                }

                // Drivers Congestion Slider
                if (driversRange) {
                    driversRange.addEventListener('input', () => {
                        const val = parseInt(driversRange.value, 10);
                        RoutingEngine.setCurrentDrivers(val);
                        if (driversVal) {
                            driversVal.textContent = String(val);
                            driversVal.value = String(val);
                        }
                        driversRange.setAttribute('aria-valuenow', String(val));
                        driversRange.setAttribute('aria-valuetext', `${val} drivers`);
                        if (RoutingEngine.getOriginLatLng() && RoutingEngine.getDestLatLng()) {
                            RoutingEngine.fetchRoadRoute();
                        }
                    });
                }

                // Optimization & Routing Strategy Toggles
                setupToggleButtons(modeFastest, modeFuel, (mode) => {
                    RoutingEngine.setCurrentMode(mode);
                    RoutingEngine.setActiveDisplayedRoute(mode === 'fastest' ? 'fastest' : 'fuel');
                    this.updateRouteTabs(mode === 'fastest');
                    if (RoutingEngine.getCachedRouteData()) {
                        RoutingEngine.renderActivePolyline();
                    } else if (RoutingEngine.getOriginLatLng() && RoutingEngine.getDestLatLng()) {
                        RoutingEngine.fetchRoadRoute();
                    }
                });

                setupToggleButtons(routeSelfish, routeOptimal, (routing) => {
                    RoutingEngine.setCurrentRouting(routing);
                    if (RoutingEngine.getOriginLatLng() && RoutingEngine.getDestLatLng()) {
                        RoutingEngine.fetchRoadRoute();
                    }
                });

                // Route View Selector Tabs
                if (tabFastest) {
                    tabFastest.addEventListener('click', () => {
                        RoutingEngine.setActiveDisplayedRoute('fastest');
                        this.updateRouteTabs(true);
                        RoutingEngine.renderActivePolyline();
                    });
                }

                if (tabFuel) {
                    tabFuel.addEventListener('click', () => {
                        RoutingEngine.setActiveDisplayedRoute('fuel');
                        this.updateRouteTabs(false);
                        RoutingEngine.renderActivePolyline();
                    });
                }

                // Geocode search
                if (btnLoad && locationInput) {
                    btnLoad.addEventListener('click', () => {
                        const q = locationInput.value.trim();
                        if (q) geocodeLocation(q);
                    });
                    locationInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            const q = locationInput.value.trim();
                            if (q) geocodeLocation(q);
                        }
                    });
                }

                // Heatmap & Clear buttons
                if (btnCongestion) btnCongestion.addEventListener('click', toggleCongestionHeatmap);
                if (btnClear) btnClear.addEventListener('click', clearAllPinsAndRoute);
            },

            updateRouteTabs(isFastest) {
                if (tabFastest) {
                    tabFastest.classList.toggle('active', isFastest);
                    tabFastest.setAttribute('aria-selected', isFastest ? 'true' : 'false');
                }
                if (tabFuel) {
                    tabFuel.classList.toggle('active', !isFastest);
                    tabFuel.setAttribute('aria-selected', !isFastest ? 'true' : 'false');
                }
            },

            setStatus,
            setInstructions,
            showLoadingOverlay,
            showStartRouteButton,
            hideResultsPanel,
            updateResultsPanel
        };
    })();

    /* ═══════════════════════════════════════════════════════════
       9. BOOTSTRAP APPLICATION
       ═══════════════════════════════════════════════════════════ */
    ScrollAndMotionController.init();
    ParticleNetworkCanvas.init();
    MapController.init();
    RoutingEngine.init();
    VoiceNavigationEngine.init();
    GpsTracker.init();
    UIController.init();
});
