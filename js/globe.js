/* ================================================
   ROUTE GLOBE

   Progressive enhancement only. The five stops are real
   HTML and read as a complete record with this file
   absent, failed, or blocked. Nothing here is required
   to understand the career.

   The globe REACTS to scroll position. It never takes
   control of scrolling. As the reader moves through the
   stops the camera flies out, crosses to the next
   location, and settles zoomed in with the state or
   province the work happened in drawn and filled:
   Andhra Pradesh, Kerala, the UAE, Comunidad de Madrid.
   ================================================ */

(function () {
  'use strict';

  /* Three.js is vendored, tree-shaken to the symbols this file uses
     (~120KB gzipped). Self-hosted rather than pulled from a CDN: no
     third-party runtime dependency, no request to another origin, and the
     globe cannot break because someone else's CDN is having a bad day.
     Fetched lazily, desktop only, after LCP has already settled.

     Resolved against this script's own URL rather than the document's, so
     it holds wherever the page is served from. A dynamic import() needs a
     real URL: a bare 'js/three-subset.js' is read as a module specifier
     and throws. */
  var SCRIPT_BASE = (document.currentScript && document.currentScript.src) || window.location.href;
  var THREE_URL = new URL('three-subset.js', SCRIPT_BASE).href;
  var GEO_URL = new URL('../data/geo.json', SCRIPT_BASE).href;

  var ACCENT = 0xc8a05a;

  var section = document.getElementById('route');
  var stage = document.getElementById('route-stage');
  var list = document.getElementById('route-stops');
  if (!section || !stage || !list) return;

  var stops = Array.prototype.slice.call(list.querySelectorAll('.stop'));
  if (stops.length < 2) return;

  /* Which region lights up at each stop, and how close the camera sits
     when the stop is centred. Sri City and Anantapur are both Andhra
     Pradesh; Dubai carries the UAE outline (city-state scale). */
  var STOP_REGION = ['ap', 'kerala', 'uae', 'madrid', 'ap'];
  var STOP_DIST = [2.0, 1.85, 1.8, 1.75, 2.0];
  var TRANSIT_DIST = 3.0;

  /* ------------------------------------------------
     1. ACTIVE STOP TRACKING
     Runs on every device and every code path, WebGL
     or not. Drives the .is-active styling.
     ------------------------------------------------ */

  var activeIndex = 0;

  function setActive(i) {
    if (i === activeIndex) return;
    activeIndex = i;
    for (var s = 0; s < stops.length; s++) {
      stops[s].classList.toggle('is-active', s === i);
    }
  }

  stops[0].classList.add('is-active');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      var best = null;
      for (var e = 0; e < entries.length; e++) {
        if (!entries[e].isIntersecting) continue;
        if (!best || entries[e].intersectionRatio > best.intersectionRatio) best = entries[e];
      }
      if (best) setActive(stops.indexOf(best.target));
    }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] });

    stops.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------
     2. GATES
     Any one failing serves the static SVG path.
     Feature detection, never user-agent sniffing.
     ------------------------------------------------ */

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function wideEnough() {
    return window.matchMedia('(min-width: 900px)').matches;
  }

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (err) {
      return false;
    }
  }

  function enoughMemory() {
    // Undefined on browsers that do not expose it; treat that as passing.
    return navigator.deviceMemory === undefined || navigator.deviceMemory >= 4;
  }

  function fastEnough() {
    var c = navigator.connection;
    if (!c) return true;
    if (c.saveData) return false;
    var t = c.effectiveType;
    return t !== 'slow-2g' && t !== '2g' && t !== '3g';
  }

  function gatesPass() {
    return wideEnough() && !reducedMotion() && hasWebGL() && enoughMemory() && fastEnough();
  }

  /* ------------------------------------------------
     3. GEOMETRY HELPERS
     ------------------------------------------------ */

  var RADIUS = 1;

  function toVec(THREE, latDeg, lonDeg, r) {
    var phi = (90 - latDeg) * Math.PI / 180;
    var theta = (lonDeg + 180) * Math.PI / 180;
    r = r || RADIUS;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  function graticule(THREE) {
    var pts = [];
    var lat, lon, i;

    for (lat = -60; lat <= 60; lat += 30) {
      for (lon = 0; lon < 360; lon += 4) {
        pts.push(toVec(THREE, lat, lon), toVec(THREE, lat, lon + 4));
      }
    }
    for (lon = 0; lon < 360; lon += 30) {
      for (i = -90; i < 90; i += 4) {
        pts.push(toVec(THREE, i, lon), toVec(THREE, i + 4, lon));
      }
    }

    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.07
    }));
  }

  /* Land coastlines from packed polylines: [lon,lat,lon,lat,...] */
  function landLines(THREE, polylines) {
    var pts = [];
    for (var i = 0; i < polylines.length; i++) {
      var line = polylines[i];
      var prev = null;
      for (var j = 0; j < line.length; j += 2) {
        var v = toVec(THREE, line[j + 1], line[j], RADIUS * 1.001);
        if (prev) pts.push(prev, v);
        prev = v;
      }
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.32
    }));
  }

  /* A filled, outlined admin region draped just above the sphere.
     Triangulated with earcut in lon/lat space; the regions are small
     enough that planar triangulation then spherical projection is clean. */
  function buildRegion(THREE, rings) {
    var group = new THREE.Group();
    var fillMat = new THREE.MeshBasicMaterial({
      color: ACCENT, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false
    });
    var edgeMat = new THREE.LineBasicMaterial({
      color: ACCENT, transparent: true, opacity: 0
    });

    for (var r = 0; r < rings.length; r++) {
      var flat = rings[r];
      var tris = THREE.earcut(flat);

      var pos = new Float32Array(flat.length / 2 * 3);
      for (var i = 0, j = 0; i < flat.length; i += 2, j += 3) {
        var v = toVec(THREE, flat[i + 1], flat[i], RADIUS * 1.004);
        pos[j] = v.x; pos[j + 1] = v.y; pos[j + 2] = v.z;
      }
      var fillGeo = new THREE.BufferGeometry();
      fillGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      fillGeo.setIndex(tris);
      group.add(new THREE.Mesh(fillGeo, fillMat));

      var edgePts = [];
      for (var k = 0; k < flat.length; k += 2) {
        edgePts.push(toVec(THREE, flat[k + 1], flat[k], RADIUS * 1.006));
      }
      group.add(new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(edgePts), edgeMat));
    }

    return { group: group, fillMat: fillMat, edgeMat: edgeMat };
  }

  function arcPoints(THREE, a, b, segments) {
    var pts = [];
    for (var i = 0; i <= segments; i++) {
      var t = i / segments;
      var v = a.clone().lerp(b, t).normalize();
      // Lift the middle of the arc off the surface so the route reads as a path.
      v.multiplyScalar(RADIUS * (1 + 0.16 * Math.sin(Math.PI * t)));
      pts.push(v);
    }
    return pts;
  }

  /* ------------------------------------------------
     4. BUILD
     ------------------------------------------------ */

  var instance = null;

  function build(THREE, geo) {
    var canvas = document.getElementById('route-canvas');
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, TRANSIT_DIST);

    var globe = new THREE.Group();
    scene.add(globe);

    // Solid core so the far side of the lines is occluded
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 0.995, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0x0d0d0d })
    ));

    globe.add(graticule(THREE));
    globe.add(landLines(THREE, geo.land));

    // Limb glow
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.04, 48, 32),
      new THREE.MeshBasicMaterial({
        color: ACCENT, transparent: true, opacity: 0.10, side: THREE.BackSide
      })
    ));

    // Admin regions, one per distinct key
    var regions = {};
    for (var key in geo.regions) {
      regions[key] = buildRegion(THREE, geo.regions[key].rings);
      globe.add(regions[key].group);
    }

    var vectors = stops.map(function (el) {
      return toVec(THREE, parseFloat(el.dataset.lat), parseFloat(el.dataset.lon));
    });

    // Markers
    var markerGeo = new THREE.SphereGeometry(0.012, 14, 14);
    var markers = vectors.map(function (v) {
      var m = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({
        color: ACCENT, transparent: true, opacity: 0.5
      }));
      m.position.copy(v.clone().multiplyScalar(1.006));
      globe.add(m);
      return m;
    });

    // Route arcs, drawn progressively as the reader moves down the stops
    var arcs = [];
    for (var i = 0; i < vectors.length - 1; i++) {
      var segs = 96;
      var arcGeo = new THREE.BufferGeometry().setFromPoints(
        arcPoints(THREE, vectors[i], vectors[i + 1], segs)
      );
      var line = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({
        color: ACCENT, transparent: true, opacity: 0.85
      }));
      line.geometry.setDrawRange(0, 0);
      globe.add(line);
      arcs.push({ line: line, count: segs + 1 });
    }

    /* Orientation that brings each stop to face the camera with north up.
       A shortest-arc rotation would add an arbitrary roll and leave the
       Earth looking tilted; composing yaw (to the stop's longitude) then
       pitch (to its latitude) keeps the poles vertical at every stop. */
    var X_AXIS = new THREE.Vector3(1, 0, 0);
    var Y_AXIS = new THREE.Vector3(0, 1, 0);
    var quats = stops.map(function (el) {
      var lat = parseFloat(el.dataset.lat) * Math.PI / 180;
      var p = toVec(THREE, parseFloat(el.dataset.lat), parseFloat(el.dataset.lon)).normalize();
      var yaw = -Math.atan2(p.x, p.z);
      return new THREE.Quaternion().setFromAxisAngle(X_AXIS, lat)
        .multiply(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw));
    });

    globe.quaternion.copy(quats[0]);

    var target = new THREE.Quaternion().copy(quats[0]);
    var scratch = new THREE.Quaternion();
    var targetZ = STOP_DIST[0];
    var progress = 0;
    var running = false;
    var disposed = false;

    function resize() {
      var w = stage.clientWidth;
      var h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    /* Continuous position across the stop list. Read-only:
       we sample scroll, we never set it. */
    function readProgress() {
      var mid = window.innerHeight / 2;
      var first = stops[0].getBoundingClientRect();
      var last = stops[stops.length - 1].getBoundingClientRect();
      var a = first.top + first.height / 2;
      var b = last.top + last.height / 2;
      if (b === a) return 0;
      var t = (mid - a) / (b - a);
      return Math.max(0, Math.min(1, t)) * (stops.length - 1);
    }

    function apply() {
      var lo = Math.floor(progress);
      var hi = Math.min(lo + 1, quats.length - 1);
      var f = progress - lo;
      target.copy(quats[lo]).slerp(quats[hi], f);

      /* Camera flight: settled at a stop the camera sits close over the
         region; between stops it pulls back so the hop reads as travel. */
      var settled = (STOP_DIST[lo] || 2) * (1 - f) + (STOP_DIST[hi] || 2) * f;
      targetZ = settled + (TRANSIT_DIST - settled) * Math.sin(Math.PI * f);

      for (var i = 0; i < arcs.length; i++) {
        var frac = Math.max(0, Math.min(1, progress - i));
        arcs[i].line.geometry.setDrawRange(0, Math.round(arcs[i].count * frac));
      }

      // Marker pulse near the active stop; sizing happens per-frame
      for (var m = 0; m < markers.length; m++) {
        var near = Math.max(0, 1 - Math.abs(progress - m));
        markers[m].material.opacity = 0.3 + near * 0.7;
        markers[m].userData.near = near;
      }

      // Region fill fades in as its stop approaches
      var want = {};
      for (var st = 0; st < STOP_REGION.length; st++) {
        var nearR = Math.max(0, 1 - Math.abs(progress - st) * 1.4);
        var k = STOP_REGION[st];
        want[k] = Math.max(want[k] || 0, nearR);
      }
      for (var key in regions) {
        var v = want[key] || 0;
        regions[key].fillMat.opacity = v * 0.30;
        regions[key].edgeMat.opacity = v;
      }
    }

    function frame() {
      if (disposed) return;
      scratch.copy(globe.quaternion).slerp(target, 0.09);
      globe.quaternion.copy(scratch);
      camera.position.z += (targetZ - camera.position.z) * 0.09;

      /* Marker screen size stays constant through the zoom: apparent size
         goes as radius / (distance - RADIUS), so scale with that distance. */
      var depth = (camera.position.z - RADIUS) / (TRANSIT_DIST - RADIUS);
      for (var m = 0; m < markers.length; m++) {
        var s = depth * (1 + (markers[m].userData.near || 0) * 0.9);
        markers[m].scale.set(s, s, s);
      }

      renderer.render(scene, camera);

      // Settle and stop, so an idle tab costs nothing
      if (globe.quaternion.angleTo(target) < 0.0015 &&
        Math.abs(camera.position.z - targetZ) < 0.002) {
        globe.quaternion.copy(target);
        camera.position.z = targetZ;
        renderer.render(scene, camera);
        running = false;
        return;
      }
      requestAnimationFrame(frame);
    }

    function kick() {
      if (running || disposed) return;
      running = true;
      requestAnimationFrame(frame);
    }

    function onScroll() {
      progress = readProgress();
      apply();
      kick();
    }

    function onResize() {
      resize();
      onScroll();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    resize();
    onScroll();
    section.classList.add('route--webgl');

    return {
      destroy: function () {
        disposed = true;
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        section.classList.remove('route--webgl');
        scene.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
        renderer.dispose();
      }
    };
  }

  /* ------------------------------------------------
     5. LOAD, AND STAY STATIC IF ANYTHING FAILS
     ------------------------------------------------ */

  var loading = false;

  function loadGeo() {
    // The preview harness embeds the data; production fetches it.
    if (window.__GEO) return Promise.resolve(window.__GEO);
    return fetch(GEO_URL).then(function (r) {
      if (!r.ok) throw new Error('geo ' + r.status);
      return r.json();
    });
  }

  function start() {
    if (instance || loading || !gatesPass()) return;
    loading = true;
    Promise.all([import(THREE_URL), loadGeo()]).then(function (mods) {
      loading = false;
      if (!gatesPass() || instance) return;
      instance = build(mods[0], mods[1]);
    }).catch(function () {
      // Fetch blocked, offline, or module unsupported. The static SVG stands.
      loading = false;
    });
  }

  function stop() {
    if (!instance) return;
    instance.destroy();
    instance = null;
  }

  function evaluate() {
    if (gatesPass()) start();
    else stop();
  }

  // Defer the heavy fetches until the route is near view, so they never compete with LCP.
  if ('IntersectionObserver' in window) {
    var gate = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        evaluate();
      }
    }, { rootMargin: '200px' });
    gate.observe(section);
  } else {
    evaluate();
  }

  window.matchMedia('(min-width: 900px)').addEventListener('change', evaluate);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', evaluate);
})();
