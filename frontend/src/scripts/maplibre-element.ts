import maplibregl from 'maplibre-gl';

class MapLibreMap extends HTMLElement {
  private _map: maplibregl.Map | null = null;

  connectedCallback() {
    const uid = this.dataset.uid ?? 'map';
    const lat = parseFloat(this.dataset.lat ?? '0');
    const lng = parseFloat(this.dataset.lng ?? '0');
    const zoom = parseFloat(this.dataset.zoom ?? '14');
    const style = this.dataset.style ?? 'https://tiles.openfreemap.org/styles/liberty';
    const interactive = this.dataset.interactive !== 'false';
    const scrollZoom = this.dataset.scrollZoom === 'true';
    const showMarker = this.dataset.marker !== 'false';
    const markerTitle = this.dataset.markerTitle ?? '';
    const markerSub = this.dataset.markerSubtitle ?? '';
    const showControls = this.dataset.controls !== 'false';

    const container = document.getElementById(uid);
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style,
      center: [lng, lat],
      zoom,
      interactive,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    });
    this._map = map;

    if (!scrollZoom) map.scrollZoom.disable();

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    if (showControls) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    }

    if (showMarker) {
      this._addMarker(map, lng, lat, markerTitle, markerSub);
    }

    const maps = ((window.__maplibreMaps ??= {}) as unknown) as Record<string, maplibregl.Map>;
    maps[uid] = map;

    this.dispatchEvent(
      new CustomEvent('maplibre:ready', {
        detail: { map },
        bubbles: true,
        composed: true,
      })
    );
  }

  disconnectedCallback() {
    const uid = this.dataset.uid;
    if (uid && window.__maplibreMaps) {
      delete (window.__maplibreMaps as Record<string, unknown>)[uid];
    }
    this._map?.remove();
    this._map = null;
  }

  private _addMarker(map: maplibregl.Map, lng: number, lat: number, title: string, subtitle: string) {
    const NS = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '36');
    svg.setAttribute('height', '44');
    svg.setAttribute('viewBox', '0 0 36 44');
    svg.setAttribute('aria-hidden', 'true');

    const shadow = document.createElementNS(NS, 'ellipse');
    shadow.setAttribute('cx', '18');
    shadow.setAttribute('cy', '42');
    shadow.setAttribute('rx', '8');
    shadow.setAttribute('ry', '2.5');
    shadow.setAttribute('fill', 'rgba(0,0,0,0.22)');
    svg.appendChild(shadow);

    const body = document.createElementNS(NS, 'path');
    body.setAttribute(
      'd',
      'M18 2C10.268 2 4 8.268 4 16c0 10 14 28 14 28S32 26 32 16C32 8.268 25.732 2 18 2z'
    );
    body.setAttribute('fill', '#00AB39');
    body.setAttribute('stroke', 'white');
    body.setAttribute('stroke-width', '2');
    svg.appendChild(body);

    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', '18');
    dot.setAttribute('cy', '16');
    dot.setAttribute('r', '5.5');
    dot.setAttribute('fill', 'white');
    svg.appendChild(dot);

    const el = document.createElement('div');
    el.style.cssText =
      'width:36px;height:44px;cursor:pointer;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.32));';
    el.appendChild(svg);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:0.4rem 0.65rem;font-size:0.82rem;line-height:1.5;';

    const strong = document.createElement('strong');
    strong.textContent = title;
    strong.style.cssText = 'display:block;color:#00AB39;margin-bottom:0.1rem;';
    wrap.appendChild(strong);

    if (subtitle) {
      const sub = document.createElement('span');
      sub.textContent = subtitle;
      sub.style.cssText = 'color:#555;font-size:0.78rem;';
      wrap.appendChild(sub);
    }

    const popup = new maplibregl.Popup({ offset: 38, closeButton: false }).setDOMContent(wrap);

    new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).setPopup(popup).addTo(map);
  }
}

if (!customElements.get('maplibre-map')) {
  customElements.define('maplibre-map', MapLibreMap);
}
