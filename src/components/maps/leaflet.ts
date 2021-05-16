/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Maps {

    const consts = {
        TIMEOUT: 1000,
        API_JS: 'https://unpkg.com/leaflet@1.5.1/dist/leaflet.js',
        API_JS_INTEGRITY: 'sha512-GffPMF3RvMeYyc1LWMHtK8EbPv0iNZ8/oTtHPx9/cc2ILxQ+u905qIwdpULaqDkyBKgOaB57QTMg7ztg8Jm2Og==',
        API_CSS: 'https://unpkg.com/leaflet@1.5.1/dist/leaflet.css',
        API_CSS_INTEGRITY: 'sha512-xwE/Az9zrjBIphAcBb3F6JVqxf46+CDLwfLMHloNu6KEQCAWi6HcDUbeOfBIptF7tcCzusKFjFw2yuvEpDL9wQ=='
    };

    class PacemLeafletMarkerAdapter {

        constructor(private _map: PacemLeafletMapAdapterElement) {
        }

        private _markers = new Map<PacemMapMarkerElement, L.Marker>();

        get markers() {
            return this._markers;
        }

        private _onDragEnd(item: PacemMapMarkerElement, evt: L.LeafletEvent) {
            var pos = (<L.Marker>evt.target).getLatLng();
            item.onDragEnd(pos);
        }

        private _onInfo(item: PacemMapMarkerElement) {
            item.onInfoOpen();
        }

        private _onClose(item: PacemMapMarkerElement) {
            item.onInfoClose();
        }

        drawMarker(item: PacemMapMarkerElement): L.Marker {
            var ctrl = this;
            if (Utils.isNull(ctrl._map.map)) {
                return;
            } else {
                if ((Utils.isNullOrEmpty(item && item.position) || (item && item.hide))) {

                    if (!Utils.isNull(item)) {
                        ctrl._map.removeItem(item);
                        this._markers.delete(item);
                    }
                    return;
                }

            }
            //
            var marker: L.Marker;
            if (!ctrl._markers.has(item)) {
                marker = L.marker(
                    item.position
                ).addTo(ctrl._map.map);
                marker.on('click', (e) => ctrl.openInfoWindow(item, e));
                marker.on('drag', () => ctrl._map.fitBounds(true));
                marker.on('dragend', (e) => ctrl._onDragEnd(item, e));
                ctrl._markers.set(item, marker);
            } else
                marker = ctrl._markers.get(item);
            marker.setLatLng(item.position);
            if (typeof item.icon === 'string') {
                // icon url only
                ctrl._setIcon(marker, item.icon);
            } else if (!Utils.isNull(item.icon)) {
                // structured icon
                let options: L.IconOptions = { iconUrl: item.icon.url };
                if (!Utils.isNullOrEmpty(item.icon.size)) {
                    Utils.extend(options, {
                        iconSize: [item.icon.size.width, item.icon.size.height],
                        iconAnchor: [item.icon.size.width / 2, item.icon.size.height],
                        popupAnchor: [0, -item.icon.size.height]
                    });
                }
                if (!Utils.isNullOrEmpty(item.icon.anchor)) {
                    Utils.extend(options, {
                        iconAnchor: [item.icon.anchor.x, item.icon.anchor.y]
                    });
                }
                ctrl._setIcon(marker, new L.Icon(options));
            }
            ctrl._setCaption(marker, item.caption);
            ctrl._setDraggable(marker, item.draggable);
        }

        closeInfoWindow(item: PacemMapMarkerElement, evt?: L.LeafletEvent) {
            const ctrl = this,
                marker: L.Marker = evt?.target || ctrl._markers.get(item);
            marker.closePopup();
        }

        openInfoWindow(item: PacemMapMarkerElement, evt?: L.LeafletEvent) {
            var ctrl = this,
                marker: L.Marker = evt?.target || ctrl._markers.get(item),
                content = item.caption;
            if (!MapUtils.isContentEmpty(item)) {

                content = item.innerHTML;

            }
            if (!Utils.isNullOrEmpty(content)) {
                marker
                    .bindPopup(content)
                    .openPopup();

                ctrl._onInfo(item);

                marker.on('popupclose', function () {
                    marker.unbindPopup();
                    ctrl._onClose(item);
                });
            }
        }

        private _setDraggable(marker: L.Marker, v: boolean) {
            if (v === true)
                marker.dragging.enable();
            else
                marker.dragging.disable();
        }

        private _setIcon(marker: L.Marker, v: string | L.Icon) {

            // legacy (deprecated)
            if (typeof v === 'string') {
                var icon = { 'iconUrl': v }, size, anchor, popup;
                if ((size = this['size']) && /[\d]+,[\d]+/.test(size)) {
                    var ndx = -1;
                    var size0 = [parseInt(size.substring(0, (ndx = size.indexOf(',')))), parseInt(size.substring(ndx + 1))];
                    Object.assign(icon, { 'iconSize': size0 });
                }
                if ((anchor = this['anchor']) && /[\d]+,[\d]+/.test(anchor)) {
                    var ndx = -1;
                    var anchor0 = [parseInt(anchor.substring(0, (ndx = anchor.indexOf(',')))), parseInt(anchor.substring(ndx + 1))];
                    Object.assign(icon, { 'iconAnchor': anchor0, 'popupAnchor': [0, -anchor0[1]] });
                }
                if ((popup = this['popupAnchor']) && /[\d]+,[\d]+/.test(popup)) {
                    var ndx = -1;
                    var anchor0 = [parseInt(anchor.substring(0, (ndx = anchor.indexOf(',')))), parseInt(anchor.substring(ndx + 1))];
                    Object.assign(icon, { 'popupAnchor': anchor0 });
                }

                marker.setIcon(L.icon(icon));
            }
            // good
            else if (v) marker.setIcon(v);
        }

        private _setCaption(marker: L.Marker, content: string) {
            if (marker.getPopup() && marker.getPopup().getContent() != content)
                marker.setPopupContent(content);
        }

        removeMarker(item: PacemMapMarkerElement) {
            const bag = this._markers;
            if (bag.has(item)) {
                bag.get(item).remove();
                bag.delete(item);
            }
        }

    }

    class PacemLeafletLayerAdapter {

        constructor(private _map: PacemLeafletMapAdapterElement) {
        }

        private _layers = new Map<PacemMapLayerElement, L.TileLayer>();

        drawLayer(item: PacemMapLayerElement): void {
            const bag = this._layers;
            // replace:
            // remove, if any
            if (bag.has(item)) {
                let layer = bag.get(item);
                if (layer) {
                    layer.remove();
                }
            }

            // check if disabled
            if (item.hide) {
                bag.delete(item);
                return;
            }

            // then set again
            const mode = (item.mode || '').toLowerCase(),
                map = this._map.map;
            switch (mode) {
                case 'wms':
                    let wms = L.tileLayer.wms(item.url, { layers: (item.include || []).join(','), minZoom: item.minZoom, maxZoom: item.maxZoom, transparent: true, format: 'image/png' }).addTo(map);
                    bag.set(item, wms);
                    break;
                default:
                    let tms = L.tileLayer(item.url, { tms: mode === 'tms', minZoom: item.minZoom, maxZoom: item.maxZoom }).addTo(map);
                    bag.set(item, tms);
                    break;
            }
        }

        removeLayer(item: PacemMapLayerElement) {
            const bag = this._layers;
            if (bag.has(item)) {
                bag.get(item).remove();
                bag.delete(item);
            }
        }
    }

    @CustomElement({ tagName: P + '-map-adapter-leaflet' })
    export class PacemLeafletMapAdapterElement extends PacemMapAdapterElement {

        constructor() {
            super();
            this._markersAdapter = new PacemLeafletMarkerAdapter(this);
            this._layersAdapter = new PacemLeafletLayerAdapter(this);
        }

        popupInfoWindow(item: MapRelevantElement) {
            if (item instanceof PacemMapMarkerElement) {
                this._markersAdapter.openInfoWindow(item);
            }
        }

        popoutInfoWindow(item: MapRelevantElement) {
            if (item instanceof PacemMapMarkerElement) {
                this._markersAdapter.closeInfoWindow(item);
            }
        }

        setView(zoom: number);
        setView(center: LatLng, zoom?: number);
        setView(center: LatLng | number, zoom?: any) {
            const map = this._map;
            if (!Utils.isNull(map)) {
                if (typeof center === 'number') {
                    map.setZoom(center);
                } else {
                    map.setView(center, zoom || map.getZoom());
                }
            }
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) tiles: string = '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        @Watch({ emit: false, converter: PropertyConverters.String }) attribution: string = 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';

        private _layersAdapter: PacemLeafletLayerAdapter;
        private _markersAdapter: PacemLeafletMarkerAdapter;
        private _map: L.Map;
        private _container: PacemMapElement;

        get map(): L.Map {
            return this._map;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'tiles':
                    this._redrawMap();
                    break;
            }
            this.invalidateSize();
        }

        // #region ABSTRACT IMPLEMENTATION

        destroy(_: PacemMapElement) {
            this._map.clearAllEventListeners();
        }

        async initialize(container: PacemMapElement): Promise<HTMLElement> {

            await Promise.all([CustomElementUtils.importjs(consts.API_JS, consts.API_JS_INTEGRITY, true),
            CustomElementUtils.importcss(consts.API_CSS, consts.API_CSS_INTEGRITY, true)]);

            const ctrl = this._container = container;
            var scale = ctrl.scale;
            var draggable = ctrl.draggable;

            var dblClickZoom = ctrl.doubleClickZoom;

            var kbShortcuts = ctrl.keyboardShortcuts;
            //
            var center: L.LatLng = L.latLng(MapUtils.parseCoords(ctrl.center));
            var mapOptions: L.MapOptions = {

                zoomControl: scale && !Utils.isNullOrEmpty(ctrl.zoomControl),

                scrollWheelZoom: ctrl.mousewheel,

                dragging: draggable,

                doubleClickZoom: !dblClickZoom,
                keyboard: kbShortcuts
            };

            var canvas = ctrl.container;
            var mapElement = document.createElement('div');
            mapElement.style.width = '100%';
            mapElement.style.height = '100%';
            canvas.innerHTML = '';
            canvas.appendChild(mapElement);
            var map = this._map = L.map(<HTMLElement>mapElement, mapOptions);

            ['zoomend', 'moveend'].forEach(evt => {

                map.on(evt, _ => {
                    this._idleFiller();
                    this._mapUpdateHandler();
                });
            });

            map.on('load', () => {
                if (scale && ctrl.zoomControl) {
                    map.zoomControl.setPosition(ctrl['zoomControl']);
                }
                this._idleFiller()
            });

            this._tileLayer = L.tileLayer(this.tiles,
                { attribution: this.attribution }).addTo(map);

            // setting now the center and zoom, triggers the "load" event and activates the child-components, if any.
            /*
            LeafletJS docs: Map's "load" Event
            "Fired when the map is initialized (when its center and zoom are set for the first time)."
            (http://leafletjs.com/reference.html#map-events)
            */
            map.setView(center, ctrl.zoom);

            // first-load
            map.once('idle', function () {

                map.fire('resize');
                container.dispatchEvent(new MapEvent("maploaded"));
            });

            // call setView NOW to trigger the load event :(
            const cnt = MapUtils.parseCoords(ctrl.center),
                xpr: L.LatLngExpression = [cnt[0], cnt[1]];
            map.setView(xpr, ctrl.zoom);

            return mapElement;
        }

        invalidateSize() {
            var ctrl = this;
            if (ctrl.map)
                ctrl.map.invalidateSize();
        }

        removeItem(item: MapRelevantElement) {
            if (item instanceof PacemMapMarkerElement) {
                this._markersAdapter.removeMarker(item);
            } else if (item instanceof PacemMapLayerElement) {
                this._layersAdapter.removeLayer(item);
            }
            this.fitBounds(true);
        }

        drawItem(item: MapRelevantElement) {
            if (item instanceof PacemMapMarkerElement) {
                this._markersAdapter.drawMarker(item);
            } else if (item instanceof PacemMapLayerElement) {
                this._layersAdapter.drawLayer(item);
            }
            this.fitBounds(true);
        }

        //#endregion

        private _mapUpdateHandler = () => {
            const map = this._map,
                ctrl = this._container;
            if (!Utils.isNull(map) && !Utils.isNull(ctrl)) {
                this.updateMapElement(ctrl, map.getCenter(), map.getZoom());
            }
        }

        @Debounce(500)
        private _idleFiller() {
            var ctrl = this;
            if (ctrl.map) {
                ctrl.map.fire('idle');
            }
        }

        private _tileLayer: L.TileLayer = null;
        private _shapes = new Map<any, L.Path>();

        @Debounce(consts.TIMEOUT)
        fitBounds(onlyIfAutofit?: boolean) {
            if (!this.map) return;

            var ctrl = this._container;

            // check against autofit
            if (!ctrl.autofit && onlyIfAutofit === true) return;

            var markers = this._markersAdapter.markers, shapes = this._shapes;

            // no markers
            if (!markers.size && !shapes.size) {
                this._map.setView(MapUtils.parseCoords(ctrl.center), ctrl.zoom);
                return;
            }
            var bnds = [];
            for (var m of markers.keys()) {
                let marker = markers.get(m);
                if (Utils.isNull(marker)) continue;
                MapUtils.expandBounds(bnds, marker.getLatLng());
            }
            for (var s of shapes.keys()) {
                var bx = (<L.Circle | L.Polyline | L.Rectangle>shapes.get(s)).getBounds();
                MapUtils.expandBounds(bnds, bx.getSouthWest());
                MapUtils.expandBounds(bnds, bx.getNorthEast());
            }

            var paddingTop = ctrl.paddingTop,
                paddingLeft = ctrl.paddingLeft,
                paddingRight = ctrl.paddingRight,
                paddingBottom = ctrl.paddingBottom;
            var pads = { 'paddingTopLeft': new L.Point(paddingLeft, paddingTop), 'paddingBottomRight': new L.Point(paddingRight, paddingBottom) };
            if (bnds.length >= 2 || (bnds.length == 1 && (paddingTop || paddingLeft || paddingBottom || paddingRight))) {
                const bounds = L.latLngBounds(bnds),
                    ne = bounds.getNorthEast(),
                    sw = bounds.getSouthWest();
                try {
                    this.map.fitBounds([[ne.lat, ne.lng], [sw.lat, sw.lng]], pads);
                } catch (e) {
                    throw e;
                }
            } else {
                if (bnds.length == 1)
                    this.map.setView(bnds[0], ctrl.zoom);
            }
        };

        private _redrawMap() {
            var ctrl = this;
            if (!Utils.isNull(ctrl.tiles && ctrl._tileLayer))
                ctrl._tileLayer.setUrl(ctrl.tiles);
        }
    }

}