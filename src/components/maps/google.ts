/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Maps {

    const consts = {
        TIMEOUT: 1000,
        API_URI: 'https://maps.googleapis.com/maps/api/js'
    };


    class GMapsUtils {
        static getPosition(latLng: LatLng | number[]) : google.maps.LatLngLiteral {
            if (Array.isArray(latLng)) {
                latLng = { lat: latLng[0], lng: latLng[1] };
            }
            return latLng;
        }

    }

    class PacemGoogleMarkerAdapter {

        constructor(private map: PacemGoogleMapAdapterElement) {
        }

        markers = new Map<PacemMapMarkerElement, google.maps.Marker>();
        infoWindows = new Map<PacemMapMarkerElement, google.maps.InfoWindow>();

        private _onDragEnd(item: PacemMapMarkerElement, evt: MouseEvent) {
            const pos = this.markers.get(item).getPosition(),
                dpos = { lat: pos.lat(), lng: pos.lng() };
            item.onDragEnd(dpos);
        }

        private _onInfo(item: PacemMapMarkerElement) {
            item.onInfoOpen();
        }

        private _onClose(item: PacemMapMarkerElement) {
            item.onInfoClose();
        }

        drawMarker(item: PacemMapMarkerElement): google.maps.Marker {
            var ctrl = this;
            if (Utils.isNull(ctrl.map.map)) return;
            else if (Utils.isNull(item && item.position)) {
                ctrl.map.removeItem(item);
                return;
            }
            //
            var marker: google.maps.Marker;
            if (!ctrl.markers.has(item)) {
                marker = new google.maps.Marker({
                    position: {lat: 0, lng: 0},
                    map: ctrl.map.map
                });
                marker.addListener('click', (e) => ctrl._openInfoWindow(item, e));
                marker.addListener('drag', () => ctrl.map.fitBounds());
                marker.addListener('dragend', (e) => ctrl._onDragEnd(item, e));
                ctrl.markers.set(item, marker);
            } else
                marker = ctrl.markers.get(item);

            // set position
            marker.setPosition(GMapsUtils.getPosition(item.position));

            if (typeof item.icon === 'string') {
                // icon url only
                marker.setIcon(item.icon);
            } else if (!Utils.isNull(item.icon)) {
                // structured icon
                let options: google.maps.Icon = { url: item.icon.url };
                if (!Utils.isNullOrEmpty(item.icon.size)) {
                    Utils.extend(options, {
                        size: new google.maps.Size(item.icon.size.width, item.icon.size.height),
                        anchor: new google.maps.Point(item.icon.size.width / 2, item.icon.size.height)
                    });
                }
                if (!Utils.isNullOrEmpty(item.icon.anchor)) {
                    Utils.extend(options, {
                        anchor: new google.maps.Point(item.icon.anchor.x, item.icon.anchor.y)
                    });
                }
                marker.setIcon(options);
            }
            marker.setLabel(item.caption);
            marker.setDraggable(item.draggable);
        }

        private _openInfoWindow(item: PacemMapMarkerElement, evt?: google.maps.MouseEvent) {
            var ctrl = this,
                marker: google.maps.Marker = ctrl.markers.get(item),
                content = item.caption;
            if (!MapUtils.isContentEmpty(item)) {

                content = item.innerHTML;

            }
            if (!Utils.isNullOrEmpty(content)) {

                var info: google.maps.InfoWindow;
                if (!ctrl.infoWindows.has(item)) {
                    info = new google.maps.InfoWindow();
                    info.addListener('closeclick', function () {
                        ctrl._onClose(item);
                    });
                    ctrl.infoWindows.set(item, info);
                } else
                    info = ctrl.infoWindows.get(item);
                info.setContent(content);
                info.open(ctrl.map.map, marker);
                ctrl._onInfo(item);
            }
        }

    }

    @CustomElement({ tagName: P + '-map-adapter-google' })
    export class PacemGoogleMapAdapterElement extends PacemMapAdapterElement {

        constructor() {
            super();
            this._markersAdapter = new PacemGoogleMarkerAdapter(this);
        }

        private _markersAdapter: PacemGoogleMarkerAdapter;
        private _map: google.maps.Map;
        private _container: PacemMapElement;

        get map(): google.maps.Map {
            return this._map;
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) apiKey: string;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                default:
                    this.invalidateSize();
                    break;
            }
        }

        // #region ABSTRACT IMPLEMENTATION

        // TODO: promisify initialization and manage the script resolution inside the adapter

        async initialize(container: PacemMapElement): Promise<HTMLElement> {

            await CustomElementUtils.importjs(consts.API_URI + '?key=' + this.apiKey);

            const ctrl = this._container = container;
            if (Utils.isNull(google && google.maps))
                return;
            var scale = ctrl.scale;
            var draggable = ctrl.draggable;

            var dblClickZoom = ctrl.doubleClickZoom;

            var kbShortcuts = ctrl.keyboardShortcuts;
            //
            const centerPos = MapUtils.parseCoords(ctrl.center);
            var center: google.maps.LatLng = new google.maps.LatLng(centerPos[0], centerPos[1]);
            var mapOptions: google.maps.MapOptions = {

                zoomControl: scale && !Utils.isNullOrEmpty(ctrl.zoomControl),
                zoomControlOptions: {
                    position: (function (zpos) {
                        switch (zpos) {
                            case 'topright':
                                return google.maps.ControlPosition.RIGHT_TOP;
                            case 'bottomleft':
                                return google.maps.ControlPosition.LEFT_BOTTOM;
                            case 'bottomright':
                                return google.maps.ControlPosition.RIGHT_BOTTOM;
                            default:
                                return google.maps.ControlPosition.LEFT_TOP;
                        }
                    })(ctrl.zoomControl)
                },
                scrollwheel: ctrl.mousewheel,
                disableDoubleClickZoom: dblClickZoom,
                keyboardShortcuts: kbShortcuts,
                draggable: draggable
            };

            var canvas = ctrl.container;
            var mapElement = document.createElement('div');
            mapElement.style.width = '100%';
            mapElement.style.height = '100%';
            canvas.innerHTML = '';
            canvas.appendChild(mapElement);
            var map = this._map = new google.maps.Map(<HTMLElement>mapElement, mapOptions);

            if (scale && ctrl.zoomControl) {
                var zPos: google.maps.ControlPosition = google.maps.ControlPosition.TOP_LEFT;
                switch (ctrl.zoomControl) {
                    case 'topright':
                        zPos = google.maps.ControlPosition.TOP_RIGHT;
                        break;
                    case 'bottomleft':
                        zPos = google.maps.ControlPosition.BOTTOM_LEFT;
                        break;
                    case 'bottomright':
                        zPos = google.maps.ControlPosition.BOTTOM_RIGHT;
                        break;
                }
                var zOptions: google.maps.ZoomControlOptions = {
                    position: zPos
                };
                map.setOptions({
                    zoomControlOptions: zOptions
                });
            }

            map.addListener('dragend', () => this._idleFiller());
            map.addListener('center_changed', () => this._idleFiller());

            // setting now the center and zoom, triggers the "load" event and activates the child-components, if any.
            map.setCenter(center);
            map.setZoom(ctrl.zoom);

            // first-load
            var listener = map.addListener('idle', function once(e) {
                listener.remove();
                container.dispatchEvent(new MapEvent("maploaded"));
            });

            // call setView NOW to trigger the load event :(
            const cnt = MapUtils.parseCoords(ctrl.center),
                xpr = new google.maps.LatLng(cnt[0], cnt[1]);
            map.setCenter(xpr);
            map.setZoom(ctrl.zoom);

            return mapElement;
        }

        invalidateSize() {
            var ctrl = this;
            if (ctrl.map)
                google.maps.event.trigger(ctrl.map, "resize");
        }

        removeItem(item: MapRelevantElement) {
            if (item instanceof PacemMapMarkerElement) {
                var adapter = this._markersAdapter;
                var marker = adapter.markers.get(item);
                if (!Utils.isNull(marker)) {
                    marker.setMap(null);
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
        private _idleFiller() {
            var ctrl = this;
            if (ctrl.map)
                google.maps.event.trigger(ctrl.map, 'idle');
        }

        private _shapes = new Map<any, google.maps.Circle | google.maps.Rectangle>();

        @Debounce(consts.TIMEOUT)
        fitBounds() {
            if (!this.map) return;
            const ctrl = this._container;
            const markers = this._markersAdapter.markers, shapes = this._shapes;
            const map = this._map;
            // no markers
            if (!markers.size && !shapes.size) {
                map.setCenter(ctrl.center);
                map.setZoom(ctrl.zoom);
                return;
            }
            var bnds = new google.maps.LatLngBounds();
            var j = 0;
            for (var m of markers.keys()) {
                let marker = markers.get(m);
                if (Utils.isNull(marker)) continue;
                const mpos = marker.getPosition();
                if (mpos) {
                    bnds.extend({ lat: mpos.lat(), lng: mpos.lng() });
                    j++;
                }
            }
            for (var s of shapes.keys()) {
                var bx = shapes.get(s).getBounds();
                const sw = bx.getSouthWest(),
                    ne = bx.getNorthEast();
                bnds.extend({ lat: sw.lat(), lng: sw.lng() });
                bnds.extend({ lat: ne.lat(), lng: ne.lng() });
                j += 2;
            }
            if (j >= 2)
                map.fitBounds(bnds);
            else {
                if (j == 1) {
                    map.setCenter(bnds.getCenter());
                    map.setZoom(ctrl.zoom);
                }
            }
            //
            this._padBounds();
        };

        private _padBounds() {
            const ctrl = this._container;
            const paddingTop = ctrl.paddingTop || 0,
                paddingLeft = ctrl.paddingLeft || 0,
                paddingRight = ctrl.paddingRight || 0,
                paddingBottom = ctrl.paddingBottom || 0;
            if (paddingLeft || paddingTop || paddingRight || paddingBottom) {
                const map = this._map;
                var bnds = map.getBounds();
                const w = map.getDiv().clientWidth,
                    h = map.getDiv().clientHeight;
                //
                var n_nw = map.getProjection().fromPointToLatLng(new google.maps.Point(-paddingLeft, -paddingTop));
                var n_se = map.getProjection().fromPointToLatLng(new google.maps.Point(w + paddingRight, h + paddingBottom));
                //
                bnds.extend(n_nw);
                bnds.extend(n_se);
            }
        }

        private _redrawMap() {
            // do nothing (no tiles)
        }
    }

}