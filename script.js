/* ═══════════════════════════════════════════════════════════════
   SYNCRO — Script
   Clean, purposeful. No excess.
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    /* ─── Scroll Reveal ─── */
    const fadeEls = document.querySelectorAll('.fade-in');
    const fadeObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('is-visible');
                fadeObs.unobserve(e.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });
    fadeEls.forEach(el => fadeObs.observe(el));

    /* ─── Hero entrance delays ─── */
    document.querySelectorAll('.anim-in').forEach(el => {
        el.style.setProperty('--i', el.dataset.d || '0');
    });

    /* ─── Nav scroll state ─── */
    const header = document.getElementById('site-header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    /* ─── Mobile nav ─── */
    const burger = document.getElementById('nav-burger');
    const navCenter = document.getElementById('nav-center');
    if (burger && navCenter) {
        burger.addEventListener('click', () => {
            const open = !navCenter.classList.contains('mob-open');
            navCenter.classList.toggle('mob-open', open);
            burger.classList.toggle('open', open);
            burger.setAttribute('aria-expanded', String(open));
        });
        navCenter.querySelectorAll('.nav-item').forEach(link =>
            link.addEventListener('click', () => {
                navCenter.classList.remove('mob-open');
                burger.classList.remove('open');
                burger.setAttribute('aria-expanded', 'false');
            })
        );
    }

    /* ─── Animated counters (hero metric strip) ─── */
    const counters = document.querySelectorAll('.hm-val');
    const counterObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                animateCount(e.target);
                counterObs.unobserve(e.target);
            }
        });
    }, { threshold: 0.5 });
    counters.forEach(el => counterObs.observe(el));

    function animateCount(el) {
        const target = parseFloat(el.dataset.count);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const decimal = parseInt(el.dataset.decimal) || 0;
        const dur = 2200;
        const start = performance.now();

        function tick(now) {
            const t = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - t, 3);         // ease-out cubic
            const val = eased * target;
            el.textContent = prefix + (decimal ? val.toFixed(decimal) : Math.round(val)) + suffix;
            if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    /* ─── Hero Canvas — sparse network ─── */
    const canvas = document.getElementById('net-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let nodes = [];
        const COUNT = 35;
        const LINK_DIST = 180;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function init() {
            nodes = [];
            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            for (let i = 0; i < COUNT; i++) {
                nodes.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - .5) * .3,
                    vy: (Math.random() - .5) * .3,
                    r: Math.random() * 1.8 + .8
                });
            }
        }

        function draw() {
            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            ctx.clearRect(0, 0, w, h);

            nodes.forEach(n => {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;
            });

            // connections
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < LINK_DIST) {
                        const a = (1 - d / LINK_DIST) * .3;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(250,250,250,${a})`;
                        ctx.lineWidth = .8;
                        ctx.stroke();
                    }
                }
            }

            // dots
            ctx.fillStyle = 'rgba(250,250,250,.5)';
            nodes.forEach(n => {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(draw);
        }

        resize();
        init();
        draw();
        window.addEventListener('resize', () => { resize(); init(); });
    }

    /* ─── Toll demo animation ─── */
    const tollProgress = document.getElementById('toll-progress');
    const tollCur = document.getElementById('toll-cur');
    if (tollProgress) {
        let pct = 50, dir = 1;
        function tollTick() {
            pct += dir * .25;
            if (pct > 85) dir = -1;
            if (pct < 15) dir = 1;
            tollProgress.style.width = pct + '%';
            tollCur.textContent = '$' + (pct / 100 * 5).toFixed(2);
            requestAnimationFrame(tollTick);
        }
        tollTick();
    }

    /* ─── Smooth anchor scroll ─── */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const el = document.querySelector(a.getAttribute('href'));
            if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        });
    });

    /* ═══════════════════════════════════════════════════════════════
       BRAESS PARADOX — Interactive Demo
       ═══════════════════════════════════════════════════════════════ */
    const demoCanvas = document.getElementById('demo-canvas');
    if (!demoCanvas) return;
    const dc = demoCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    function resizeDemo() {
        const rect = demoCanvas.getBoundingClientRect();
        demoCanvas.width = rect.width * dpr;
        demoCanvas.height = rect.height * dpr;
        dc.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeDemo();

    const G = {
        nodes: [
            { id: 'S', x: .1,  y: .5,  col: '#fafafa' },
            { id: 'A', x: .42, y: .15, col: '#67e8f9' },
            { id: 'B', x: .42, y: .85, col: '#c084fc' },
            { id: 'T', x: .9,  y: .5,  col: '#fafafa' }
        ],
        edges: [
            { from: 0, to: 1, t0: 1,  cap: 400,  label: 't=f/c' },
            { from: 0, to: 2, t0: 25, cap: 9999, label: 't=25'  },
            { from: 1, to: 3, t0: 25, cap: 9999, label: 't=25'  },
            { from: 2, to: 3, t0: 1,  cap: 400,  label: 't=f/c' },
            { from: 1, to: 2, t0: 0,  cap: 9999, label: 't≈0'   }
        ]
    };

    let mode = 'selfish';
    let braessOpen = true;
    let drivers = 600;

    // Controls
    const modeUE = document.getElementById('mode-ue');
    const modeSO = document.getElementById('mode-so');
    const braessSw = document.getElementById('braess-sw');
    const swText = document.getElementById('sw-text');
    const driverRange = document.getElementById('driver-range');
    const driverVal = document.getElementById('driver-val');

    modeUE.addEventListener('click', () => { mode = 'selfish'; modeUE.classList.add('active'); modeSO.classList.remove('active'); modeUE.setAttribute('aria-checked','true'); modeSO.setAttribute('aria-checked','false'); run(); });
    modeSO.addEventListener('click', () => { mode = 'optimal'; modeSO.classList.add('active'); modeUE.classList.remove('active'); modeSO.setAttribute('aria-checked','true'); modeUE.setAttribute('aria-checked','false'); run(); });
    braessSw.addEventListener('click', () => { braessOpen = !braessOpen; braessSw.classList.toggle('active', braessOpen); braessSw.setAttribute('aria-checked', String(braessOpen)); swText.textContent = braessOpen ? 'Open' : 'Closed'; run(); });
    driverRange.addEventListener('input', () => { drivers = parseInt(driverRange.value); driverVal.textContent = drivers; run(); });

    function cost(edge, flow) {
        return edge.cap < 9999 ? edge.t0 + flow / edge.cap * 25 : edge.t0;
    }

    function simulate(modeOverride) {
        const m = modeOverride || mode;
        const edges = G.edges.map(e => ({ ...e, flow: 0, time: e.t0 }));
        if (!braessOpen) { edges[4].cap = 0; edges[4].t0 = 1e6; }
        const paths = [[0,2], [1,3]];
        if (braessOpen) paths.push([0,4,3]);
        const iters = 40;

        for (let n = 1; n <= iters; n++) {
            const costs = paths.map(p => p.reduce((s, i) => s + cost(edges[i], edges[i].flow), 0));
            const batch = new Array(edges.length).fill(0);

            if (m === 'selfish') {
                const min = Math.min(...costs);
                const idx = costs.indexOf(min);
                paths[idx].forEach(i => batch[i] += drivers);
            } else {
                const inv = costs.reduce((s, c) => s + 1 / (c + 1), 0);
                paths.forEach((p, pi) => {
                    const share = (1 / (costs[pi] + 1)) / inv;
                    p.forEach(i => batch[i] += drivers * share);
                });
            }

            edges.forEach((e, i) => {
                e.flow = ((n - 1) * e.flow + batch[i]) / n;
                e.time = cost(e, e.flow);
            });
        }

        const finalCosts = paths.map(p => p.reduce((s, i) => s + cost(edges[i], edges[i].flow), 0));
        const finalFlows = paths.map(p => Math.min(...p.map(i => edges[i].flow)));
        const totalFlow = finalFlows.reduce((a, b) => a + b, 0) || 1;
        const avgTime = finalCosts.reduce((s, c, i) => s + c * (finalFlows[i] / totalFlow), 0);

        return { edges, avgTime, iters };
    }

    function run() {
        const result = simulate();
        const so = simulate('optimal');
        const poa = so.avgTime > 0 ? result.avgTime / so.avgTime : 1;

        document.getElementById('ro-time').textContent = result.avgTime.toFixed(1) + ' min';
        document.getElementById('ro-poa').textContent = poa.toFixed(2) + '×';
        document.getElementById('ro-iter').textContent = result.iters;

        draw(result.edges);
    }

    function draw(edges) {
        const rect = demoCanvas.getBoundingClientRect();
        const w = rect.width, h = rect.height;
        dc.clearRect(0, 0, w, h);

        const pos = G.nodes.map(n => ({ x: n.x * w, y: n.y * h }));

        // Draw edges
        edges.forEach((edge, idx) => {
            const a = pos[edge.from], b = pos[edge.to];
            const ratio = Math.min(edge.flow / drivers, 1);
            const closed = idx === 4 && !braessOpen;

            // Color ramp: white → amber → hot orange
            let r, g, bl;
            if (closed) { r = 63; g = 63; bl = 70; }
            else if (ratio < .35) { r = 200; g = 210; bl = 220; }
            else if (ratio < .65) { r = 251; g = 191; bl = 36; }
            else { r = 249; g = 115; bl = 22; }

            const lw = closed ? 1 : 1.5 + ratio * 5;
            const alpha = closed ? .15 : .35 + ratio * .55;

            // Glow pass
            if (ratio > .3 && !closed) {
                dc.beginPath();
                dc.moveTo(a.x, a.y);
                dc.lineTo(b.x, b.y);
                dc.strokeStyle = `rgba(${r},${g},${bl},${ratio * .08})`;
                dc.lineWidth = lw + 12;
                dc.lineCap = 'round';
                dc.stroke();
            }

            dc.beginPath();
            dc.moveTo(a.x, a.y);
            dc.lineTo(b.x, b.y);
            dc.strokeStyle = `rgba(${r},${g},${bl},${alpha})`;
            dc.lineWidth = lw;
            dc.lineCap = 'round';
            dc.stroke();

            // Flow label
            if (!closed) {
                const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                const dx = b.x - a.x, dy = b.y - a.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = -dy / len * 18, ny = dx / len * 18;
                dc.font = '500 10px "JetBrains Mono", monospace';
                dc.textAlign = 'center';
                dc.textBaseline = 'middle';
                dc.fillStyle = `rgba(${r},${g},${bl},.7)`;
                dc.fillText(Math.round(edge.flow), mx + nx, my + ny);
            }

            // Closed badge
            if (closed) {
                const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                dc.font = '600 9px "JetBrains Mono", monospace';
                dc.textAlign = 'center';
                dc.fillStyle = 'rgba(249,115,22,.6)';
                dc.fillText('CLOSED', mx + 20, my);
            }
        });

        // Draw nodes
        G.nodes.forEach((node, idx) => {
            const p = pos[idx];

            dc.beginPath();
            dc.arc(p.x, p.y, 20, 0, Math.PI * 2);
            dc.fillStyle = '#09090b';
            dc.fill();
            dc.strokeStyle = node.col;
            dc.lineWidth = 1.5;
            dc.stroke();

            dc.font = '600 13px "Space Grotesk", sans-serif';
            dc.fillStyle = node.col;
            dc.textAlign = 'center';
            dc.textBaseline = 'middle';
            dc.fillText(node.id, p.x, p.y + 1);
        });
    }

    window.addEventListener('resize', () => { resizeDemo(); run(); });
    run();
});
