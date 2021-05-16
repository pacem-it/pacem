/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Maps {

    const consts = {
        TIMEOUT: 1000,
        API_URI: '//webapi.amap.com/maps',
        UI_URI: '//webapi.amap.com/ui/1.1/main.js?v=1.1.1'
    };

    const AMapUtils = {
        getLocation(latLng: LatLng | number[]): [number, number] {
            if (Array.isArray(latLng)) {
                latLng = { lat: latLng[0], lng: latLng[1] };
            }
            // switch lng and lat
            return [latLng.lng, latLng.lat];
        },
        getLngLat(latLng: LatLng | number[]): AMap.LngLat {
            const lngLat = AMapUtils.getLocation(latLng);
            return new AMap.LngLat(lngLat[0], lngLat[1]);
        }, getPosition(pos: string): string {
            switch (pos.toLowerCase()) {
                case 'topleft':
                    return 'lt';
                case 'bottomleft':
                    return 'lb';
                case 'bottomright':
                    return 'rb';
                default:
                    return 'rt';
            }
        }, getLang(lang: string): string {
            switch (lang) {
                case 'zh-cn':
                    return 'zh_cn';
                case 'zh-en':
                    return 'zh_en';
                default:
                    // defaults to english
                    return 'en';
            }
        }, expandBounds(bnds: AMap.Bounds, lngLat: AMap.LngLat | [number, number]) {
            var sw = bnds.getSouthWest(), ne = bnds.getNorthEast();
            const pt = Utils.isArray(lngLat) ? new AMap.LngLat(lngLat[0], lngLat[1]) : lngLat,
                lat = pt.getLat(), lng = pt.getLng();
            if (sw.lat > lat) {
                sw = new AMap.LngLat(sw.lng, lat);
            }
            if (sw.lng > lng) {
                sw = new AMap.LngLat(lng, sw.lat);
            }
            if (ne.lat < lat) {
                ne = new AMap.LngLat(ne.lng, lat);
            }
            if (ne.lng < lng) {
                ne = new AMap.LngLat(lng, ne.lat);
            }
            return new AMap.Bounds(sw, ne);
        }
    }

    class PacemAMapMarkerAdapter {

        constructor(private map: PacemAMapAdapterElement) {
        }

        markers = new Map<PacemMapMarkerElement, AMap.Marker>();
        infoWindows = new Map<PacemMapMarkerElement, AMap.InfoWindow>();

        private _onDragEnd(item: PacemMapMarkerElement, evt?: AMap.Event) {
            const pos = this.markers.get(item).getPosition(),
                dpos = { lat: pos.lat, lng: pos.lng };
            item.onDragEnd(dpos);
        }

        private _onInfo(item: PacemMapMarkerElement) {
            item.onInfoOpen();
        }

        private _onClose(item: PacemMapMarkerElement) {
            item.onInfoClose();
        }

        drawMarker(item: PacemMapMarkerElement): AMap.Marker {
            var ctrl = this;
            if (Utils.isNull(ctrl.map.map)) return;
            else if (Utils.isNull(item && item.position)) {
                ctrl.map.removeItem(item);
                return;
            }
            //
            var marker: AMap.Marker;
            if (!ctrl.markers.has(item)) {
                marker = new AMap.Marker({
                    position: [0, 0],
                    map: ctrl.map.map
                });
                marker.on('click', (e) => ctrl.openInfoWindow(item, e));
                marker.on('drag', () => ctrl.map.fitBounds(true));
                marker.on('dragend', (e) => ctrl._onDragEnd(item, e));
                ctrl.markers.set(item, marker);
            } else
                marker = ctrl.markers.get(item);

            // set position
            marker.setPosition(AMapUtils.getLocation(item.position));

            if (typeof item.icon === 'string') {
                // icon url only
                marker.setIcon(item.icon);
            } else if (!Utils.isNull(item.icon)) {
                // structured icon
                const options: AMap.IconOpts = { image: item.icon.url };
                if (!Utils.isNullOrEmpty(item.icon.size)) {
                    options.size = options.imageSize = new AMap.Size(item.icon.size.width, item.icon.size.height);
                    marker.setAnchor("bottom-center");
                }
                marker.setIcon(new AMap.Icon(options));
                if (!Utils.isNullOrEmpty(item.icon.anchor)) {
                    marker.setAnchor("top-left");
                    marker.setOffset(new AMap.Pixel(-item.icon.anchor.x, -item.icon.anchor.y));
                }
            }
            marker.setLabel({ content: item.caption, offset: [0, 0], direction: 'ltr' });
            marker.setDraggable(item.draggable);
        }

        closeInfoWindow(item: PacemMapMarkerElement, evt?: AMap.Event) {
            const ctrl = this;
            if (ctrl.infoWindows.has(item)) {
                const info = ctrl.infoWindows.get(item);
                if (info.getIsOpen()) {
                    info.close();
                }
            }
        }

        openInfoWindow(item: PacemMapMarkerElement, evt?: AMap.Event) {
            var ctrl = this,
                marker: AMap.Marker = ctrl.markers.get(item),
                content = item.caption;
            if (!MapUtils.isContentEmpty(item)) {

                content = item.innerHTML;

            }
            if (!Utils.isNullOrEmpty(content)) {

                var info: AMap.InfoWindow;
                if (!ctrl.infoWindows.has(item)) {

                    let offsY = marker.getSize()[1];
                    info = new AMap.InfoWindow({
                        anchor: 'bottom-center', offset: [0, -offsY]
                    });
                    info.on('close', function () {
                        ctrl._onClose(item);
                    });
                    ctrl.infoWindows.set(item, info);
                } else {
                    info = ctrl.infoWindows.get(item);
                }
                info.setContent(content);
                const pos = marker.getPosition(),
                    loc: [number, number] = [pos.getLng(), pos.getLat()];

                info.open(ctrl.map.map, loc, 0);
                ctrl._onInfo(item);
            }
        }

    }

    const MAP_EVENTS = ['zoomend', 'moveend', 'dragend'];

    @CustomElement({ tagName: P + '-map-adapter-amap' })
    export class PacemAMapAdapterElement extends PacemMapAdapterElement {

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

        constructor() {
            super();
            this._markersAdapter = new PacemAMapMarkerAdapter(this);
        }

        private _markersAdapter: PacemAMapMarkerAdapter;
        private _map: AMap.Map;
        private _container: PacemMapElement;

        @Watch({ emit: false, converter: PropertyConverters.String }) apiKey: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) apiVersion: string;

        invalidateSize() {
            const map = this._map;
            if (map) {
                // AMap.Map.trigger(map, 'resize', {});
                map.emit("resize");
            }
        }

        destroy(_: PacemMapElement) {
            MAP_EVENTS.forEach(evt => {
                this._map.on(evt, this._mapUpdateHandler);
            });
            this._map.destroy();
        }

        async initialize(container: PacemMapElement): Promise<HTMLElement> {

            const v = this.apiVersion || '2.0',
                k = this.apiKey || '';
            await CustomElementUtils.importjs(consts.API_URI + '?v=' + v + '&key=' + k);
            await CustomElementUtils.importjs(consts.UI_URI);

            const ctrl = this._container = container;
            if (Utils.isNull(AMap))
                return;
            var scale = ctrl.scale;
            var draggable = ctrl.draggable;

            var dblClickZoom = ctrl.doubleClickZoom;

            var kbShortcuts = ctrl.keyboardShortcuts;
            //
            const centerPos = MapUtils.parseCoords(ctrl.center);

            const mapOptions: AMap.MapOptions = {
                center: AMapUtils.getLocation(centerPos),
                scrollWheel: ctrl.mousewheel,
                animateEnable: true,
                dragEnable: draggable,
                keyboardEnable: kbShortcuts,
                doubleClickZoom: dblClickZoom,
                zoomEnable: scale,
                viewMode: '2D',
                zoom: ctrl.zoom,
                langForeign: AMapUtils.getLang(Utils.lang(container)),
                layers: [AMap.createDefaultLayer()]
            };

            var canvas = ctrl.container;
            var mapElement = document.createElement('div');
            mapElement.style.width = '100%';
            mapElement.style.height = '100%';
            canvas.innerHTML = '';
            canvas.appendChild(mapElement);
            const map = this._map = new AMap.Map(mapElement, mapOptions);

            window['AMapUI'].loadUI(['control/BasicControl'], (BasicControl) => {

                if (ctrl.zoomControl) {
                    map.addControl(new BasicControl.Zoom({
                        position: AMapUtils.getPosition(ctrl.zoomControl)
                    }));
                }

            });

            map.on('complete', () => {
                container.dispatchEvent(new MapEvent("maploaded"));
            }, map, /* once */true);

            MAP_EVENTS.forEach(evt => {
                map.on(evt, this._mapUpdateHandler);
            });
            return mapElement;
        }

        drawItem(item: MapRelevantElement) {
            if (item instanceof PacemMapMarkerElement) {
                var adapter = this._markersAdapter;
                var marker = adapter.drawMarker(item);
                if (!adapter.markers.has(item))
                    adapter.markers.set(item, marker);
            }
            this.fitBounds(true);
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
            this.fitBounds(true);
        }

        get map(): AMap.Map {
            return this._map;
        }

        private _mapUpdateHandler = (e: Event) => {
            const map = this._map,
                ctrl = this._container;
            if (!Utils.isNull(map) && !Utils.isNull(ctrl)) {
                this.updateMapElement(ctrl, map.getCenter(), map.getZoom());
            }
        }

        setView(zoom: number);
        setView(center: LatLng, zoom?: number);
        setView(center: any, zoom?: any) {
            const map = this._map;
            if (!Utils.isNull(map)) {
                if (typeof center === 'number') {
                    map.setZoom(center);
                } else {
                    const amapCenter = AMapUtils.getLngLat(center);
                    map.setCenter(amapCenter);
                    if (zoom) {
                        map.setZoom(zoom);
                    }
                }
            }
        }

        // TODO: implement
        private _shapes = new Map<any, AMap.Circle | AMap.Rectangle>();

        fitBounds(onlyIfAutofit?: boolean) {
            if (!this.map) return;
            const ctrl = this._container;

            // check against autofit
            if (!ctrl.autofit && onlyIfAutofit === true) return;

            const markers = this._markersAdapter.markers, shapes = this._shapes;
            const map = this._map;
            // no markers
            if (!markers.size && !shapes.size) {
                map.setCenter(AMapUtils.getLocation(ctrl.center));
                map.setZoom(ctrl.zoom);

            } else {
                var bnds: AMap.Bounds = null;
                var j = 0;
                for (var m of markers.keys()) {
                    let marker = markers.get(m);
                    if (Utils.isNull(marker)) continue;
                    const mpos = marker.getPosition();
                    if (mpos) {
                        bnds = Utils.isNull(bnds) ? new AMap.Bounds(mpos, mpos) : AMapUtils.expandBounds(bnds, mpos);
                        j++;
                    }
                }
                for (var s of shapes.keys()) {
                    var bx = shapes.get(s).getBounds();
                    const sw = bx.getSouthWest(),
                        ne = bx.getNorthEast();
                    bnds = AMapUtils.expandBounds(bnds, sw);
                    bnds = AMapUtils.expandBounds(bnds, ne);
                    j += 2;
                }

                if (j >= 2) {
                    const bndsp = this._padBounds(bnds);
                    map.setBounds(bndsp);
                } else {
                    if (j == 1) {
                        map.setCenter(bnds.getCenter());
                        map.setZoom(ctrl.zoom);
                    }
                }
            }
        }

        private _padBounds(bnds: AMap.Bounds) {
            const ctrl = this._container;
            const paddingTop = ctrl.paddingTop || 0,
                paddingLeft = ctrl.paddingLeft || 0,
                paddingRight = ctrl.paddingRight || 0,
                paddingBottom = ctrl.paddingBottom || 0;
            const map = this._map;
            if (paddingLeft || paddingTop || paddingRight || paddingBottom) {
                //
                const nw = bnds.getNorthWest(),
                    se = bnds.getSouthEast();
                const se_px = map.lngLatToPixel(se),
                    nw_px = map.lngLatToPixel(nw);
                var n_nw = map.pixelToLngLat(new AMap.Pixel(nw_px.x - paddingLeft, nw_px.y - paddingTop));
                var n_se = map.pixelToLngLat(new AMap.Pixel(se_px.x + paddingRight, se_px.y + paddingBottom));
                //
                bnds = AMapUtils.expandBounds(bnds, n_nw);
                bnds = AMapUtils.expandBounds(bnds, n_se);
            }
            return bnds;
        }

    }
}