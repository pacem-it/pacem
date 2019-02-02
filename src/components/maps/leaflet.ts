/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Maps {

    const consts = {
        TIMEOUT: 1000,
        API_JS: 'https://unpkg.com/leaflet@1.0.3/dist/leaflet.js',
        API_JS_INTEGRITY: 'sha512-A7vV8IFfih/D732iSSKi20u/ooOfj/AGehOKq0f4vLT1Zr2Y+RX7C+w8A1gaSasGtRUZpF/NZgzSAu4/Gc41Lg==',
        API_CSS: 'https://unpkg.com/leaflet@1.0.3/dist/leaflet.css',
        API_CSS_INTEGRITY: 'sha512-07I2e+7D8p6he1SIM+1twR5TIrhUQn9+I6yjqD53JQjFiMf8EtC93ty0/5vJTZGF8aAocvHYNEDJajGdNx1IsQ=='
    };

    class PacemLeafletMarkerAdapter {

        constructor(private map: PacemLeafletMapAdapterElement) {
        }

        markers = new Map<PacemMapMarkerElement, L.Marker>();

        private onDragEnd(item: PacemMapMarkerElement, evt: L.LeafletEvent) {
            var pos = (<L.Marker>evt.target).getLatLng();
            item.onDragEnd(pos);
        }

        private onInfo(item: PacemMapMarkerElement) {
            item.onInfoOpen();
        }

        private onClose(item: PacemMapMarkerElement) {
            item.onInfoClose();
        }

        drawMarker(item: PacemMapMarkerElement): L.Marker {
            var ctrl = this;
            if (Utils.isNull(ctrl.map.map)) return;
            else if (Utils.isNull(item && item.position)) {
                ctrl.map.removeItem(item);
                return;
            }
            //
            var marker: L.Marker;
            if (!ctrl.markers.has(item)) {
                marker = L.marker(
                    item.position
                ).addTo(ctrl.map.map);
                marker.on('click', (e) => ctrl.openInfoWindow(item, e));
                marker.on('drag', () => ctrl.map.fitBounds());
                marker.on('dragend', (e) => ctrl.onDragEnd(item, e));
                ctrl.markers.set(item, marker);
            } else
                marker = ctrl.markers.get(item);
            marker.setLatLng(item.position);
            if (typeof item.icon === 'string') {
                // icon url only
                ctrl.setIcon(marker, item.icon);
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
                        iconAnchor: [item.icon.anchor.x, item.icon.anchor.y] });
                }
                ctrl.setIcon(marker, new L.Icon(options));
            }
            ctrl.setCaption(marker, item.caption);
            ctrl.setDraggable(marker, item.draggable);
        }

        private openInfoWindow(item: PacemMapMarkerElement, evt?: L.LeafletEvent) {
            var ctrl = this,
                marker: L.Marker = evt.target || ctrl.markers.get(item);
            if (!MapUtils.isContentEmpty(item)) {
                marker
                    .bindPopup(item.innerHTML)
                    .openPopup();

                ctrl.onInfo(item);

                marker.on('popupclose', function () {
                    marker.unbindPopup();
                    ctrl.onClose(item);
                });
            }
        }

        private setDraggable(marker: L.Marker, v: boolean) {
            if (v === true)
                marker.dragging.enable();
            else
                marker.dragging.disable();
        }

        private setPosition(marker: L.Marker, p: string | number[]) {
            var position = MapUtils.parseCoords(p);
            marker.setLatLng(position);
            //
            this.map.fitBounds();
        }

        private setIcon(marker: L.Marker, v: string | L.Icon) {
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
            } else if (v) marker.setIcon(v);
        }

        private setCaption(marker: L.Marker, content: string) {
            if (marker.getPopup() && marker.getPopup().getContent() != content)
                marker.setPopupContent(content);
        }

    }

    @CustomElement({ tagName: P + '-map-adapter-leaflet' })
    export class PacemLeafletMapAdapterElement extends PacemMapAdapterElement {

        constructor() {
            super();
            this._markersAdapter = new PacemLeafletMarkerAdapter(this);
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) tiles: string = '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        @Watch({ emit: false, converter: PropertyConverters.String }) attribution: string = 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';

        private _markersAdapter: PacemLeafletMarkerAdapter;
        private _map: L.Map;
        private _container: PacemMapElement;

        get map(): L.Map {
            return this._map;
        }

        private isMapInitialized() {
            return !Utils.isNull(this._map);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'tiles')
                this.redrawMap();
            this.invalidateSize();
        }

        // #region ABSTRACT IMPLEMENTATION

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

                zoomControl: scale && !ctrl.zoomControl,

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

            if (scale && ctrl.zoomControl)
                map.addControl(L.control.zoom({
                    position: ctrl['zoomControl']
                }));

            map.on('moveend', () => this.idleFiller());
            map.on('load', () => this.idleFiller());

            this.tileLayer = L.tileLayer(this.tiles,
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
                var adapter = this._markersAdapter;
                var marker = adapter.markers.get(item);
                if (!Utils.isNull(marker)) {
                    marker.remove();
                    adapter.markers.delete(item);
                }
            }
            this.fitBounds();
        }

        drawItem(item: MapRelevantElement) {
            if (item instanceof PacemMapMarkerElement) {
                var adapter = this._markersAdapter;
                var marker = adapter.drawMarker(item);
                if (!adapter.markers.has(item))
                    adapter.markers.set(item, marker);
            }
            this.fitBounds();
        }

        //#endregion

        @Debounce(500)
        private idleFiller() {
            var ctrl = this;
            if (ctrl.map)
                ctrl.map.fire('idle');
        }

        private tileLayer: L.TileLayer = null;
        private shapes = new Map<any, L.Path>();

        @Debounce(consts.TIMEOUT)
        fitBounds() {
            if (!this.map) return;
            var ctrl = this._container;
            var markers = this._markersAdapter.markers, shapes = this.shapes;

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
            var minZoom;
            var paddingTop = ctrl.paddingTop,
                paddingLeft = ctrl.paddingLeft,
                paddingRight = ctrl.paddingRight,
                paddingBottom = ctrl.paddingBottom;
            var pads = { 'paddingTopLeft': new L.Point(paddingLeft, paddingTop), 'paddingBottomRight': new L.Point(paddingRight, paddingBottom) };
            if (bnds.length >= 2 || (bnds.length == 1 && (paddingTop || paddingLeft || paddingBottom || paddingRight)))
                this.map.fitBounds(new L.LatLngBounds(bnds), pads);
            else {
                if (bnds.length == 1)
                    this.map.setView(bnds[0], ctrl.zoom);
            }
        };

        private redrawMap() {
            var ctrl = this;
            if (!Utils.isNull(ctrl.tiles && ctrl.tileLayer))
                ctrl.tileLayer.setUrl(ctrl.tiles);
        }
    }

}