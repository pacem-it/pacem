/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="azure-maps.d.ts" />
/// <reference path="types.ts" />

namespace Pacem.Components.Maps {

    const consts = {
        TIMEOUT: 1000,
        API_JS: 'https://atlas.microsoft.com/sdk/javascript/mapcontrol/2/atlas.min.js',
        API_CSS: 'https://atlas.microsoft.com/sdk/javascript/mapcontrol/2/atlas.min.css'
    };

    class AtlasMapUtils {
        static getPosition(latLng: LatLng | number[]) {
            if (Array.isArray(latLng)) {
                latLng = { lat: latLng[0], lng: latLng[1] };
            }
            return atlas.data.Position.fromLatLng(latLng);
        }

        static getBounds(bounds: number[][]): atlas.data.BoundingBox {
            return atlas.data.BoundingBox.fromPositions(bounds.map(p => /* reverse */[p[1], p[0]]));
        }

        static getLatLng(position: atlas.data.Position): LatLng {
            return { lat: position[1], lng: position[0] };
        }
    }

    class PacemAzureMarkerAdapter {

        constructor(private map: PacemAzureMapAdapterElement) {
        }

        markers = new Map<PacemMapMarkerElement, atlas.HtmlMarker>();

        private _onDragEnd(item: PacemMapMarkerElement, evt: atlas.TargetedEvent) {
            var pos = (<atlas.HtmlMarker>evt.target).getOptions().position;
            item.onDragEnd(AtlasMapUtils.getLatLng(pos));
        }

        private _onInfo(item: PacemMapMarkerElement) {
            item.onInfoOpen();
        }

        private _onClose(item: PacemMapMarkerElement) {
            item.onInfoClose();
        }

        drawMarker(item: PacemMapMarkerElement): atlas.HtmlMarker {
            var ctrl = this;
            if (Utils.isNull(ctrl.map.map)) return;
            else if (Utils.isNull(item && item.position)) {
                ctrl.map.removeItem(item);
                return;
            }
            //
            var marker: atlas.HtmlMarker;
            var position = AtlasMapUtils.getPosition(item.position);
            if (!ctrl.markers.has(item)) {
                marker = new atlas.HtmlMarker();
                const map = ctrl.map.map;
                map.markers.add(marker, position);
                map.events.add('click', marker, (e) => ctrl._openInfoWindow(item, e));
                map.events.add('drag', marker, () => ctrl.map.fitBounds(true));
                map.events.add('dragend', marker, (e) => ctrl._onDragEnd(item, e));
                ctrl.markers.set(item, marker);
            } else
                marker = ctrl.markers.get(item);

            let popupOptions: atlas.PopupOptions = { position: position };
            let options: atlas.HtmlMarkerOptions = { position: position, draggable: item.draggable, popup: new atlas.Popup() };

            let fnIcon = (icon: string, w?: number, h?: number) => `<img width="${(w || 'auto')}" height="${(h || 'auto')}" style="pointer-events: none" src="${icon}" />`;//item.icon.url;

            if (typeof item.icon === 'string') {
                // icon url only
                options.htmlContent = fnIcon(item.icon);
            } else if (!Utils.isNull(item.icon)) {
                // structured icon
                const size = item.icon.size,
                    anchor = item.icon.anchor;
                options.htmlContent = fnIcon(item.icon.url, size && size.width, size && size.height);

                if (anchor) {
                    options.anchor = "top-left";
                    options.pixelOffset = [-anchor.x, -anchor.y]
                    popupOptions.pixelOffset = [0, -anchor.y];

                } else if (size && size.height) {
                    popupOptions.pixelOffset = [0, -size.height / 2];
                }
            }

            options.popup.setOptions(popupOptions);
            options.text = item.caption;
            marker.setOptions(options);
        }

        private _openInfoWindow(item: PacemMapMarkerElement, evt?: atlas.TargetedEvent) {
            var ctrl = this,
                marker = <atlas.HtmlMarker>evt.target || ctrl.markers.get(item),
                content = item.caption,
                popup = marker.getOptions().popup;
            if (!popup) {
                return;
            }

            if (!MapUtils.isContentEmpty(item)) {

                content = item.innerHTML;

            }
            if (!Utils.isNullOrEmpty(content)) {
                popup.setOptions({ content: `<div style="padding: 24px;">${content}</div>` });
                marker.togglePopup();

                ctrl._onInfo(item);

                ctrl.map.map.events.addOnce('open', popup, (e) => {
                    popup.setOptions({ content: '' });
                    ctrl._onClose(item);
                });
            }
        }

    }

    @CustomElement({ tagName: P + '-map-adapter-azure' })
    export class PacemAzureMapAdapterElement extends PacemMapAdapterElement {

        constructor() {
            super();
            this._markersAdapter = new PacemAzureMarkerAdapter(this);
        }

        setView(zoom: number);
        setView(center: LatLng, zoom?: number);
        setView(center: any, zoom?: any) {
            const map = this._map;
            if (!Utils.isNull(map)) {
                if (typeof center === 'number') {
                    map.setCamera({ zoom: center });
                } else {
                    map.setCamera({ position: AtlasMapUtils.getPosition(center), zoom: zoom });
                }
            }
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) subscriptionKey: string;

        private _markersAdapter: PacemAzureMarkerAdapter;
        private _map: atlas.Map;
        private _container: PacemMapElement;

        get map(): atlas.Map {
            return this._map;
        }

        private _isMapInitialized() {
            return !Utils.isNull(this._map);
        }

        // #region ABSTRACT IMPLEMENTATION

        async initialize(container: PacemMapElement): Promise<HTMLElement> {

            await Promise.all([
                CustomElementUtils.importjs(consts.API_JS),
                CustomElementUtils.importcss(consts.API_CSS)
            ]);

            const ctrl = this._container = container;
            var scale = ctrl.scale;
            var draggable = ctrl.draggable;

            var dblClickZoom = ctrl.doubleClickZoom;

            var kbShortcuts = ctrl.keyboardShortcuts;
            //
            var center: atlas.data.Position = AtlasMapUtils.getPosition(ctrl.center);
            var mapOptions: atlas.ServiceOptions & atlas.UserInteractionOptions & atlas.CameraOptions = {

                center: center,
                zoom: ctrl.zoom,

                subscriptionKey: this.subscriptionKey,

                dragPanInteraction: draggable,

                scrollZoomInteraction: ctrl.mousewheel,

                dblClickZoomInteraction: !dblClickZoom,

                keyboardInteraction: kbShortcuts,

                language: Utils.lang(container)

            };

            var canvas = ctrl.container;
            var mapElement = document.createElement('div');
            mapElement.id = `azure-maps-${Utils.uniqueCode()}`;
            mapElement.style.width = '100%';
            mapElement.style.height = '100%';
            canvas.innerHTML = '';
            canvas.appendChild(mapElement);
            var map = this._map = new atlas.Map(mapElement.id, mapOptions);

            if (scale && ctrl.zoomControl) {
                map.events.addOnce('ready', (e) => {
                    let pos: atlas.ControlPosition = atlas.ControlPosition.NonFixed;
                    switch (ctrl.zoomControl) {
                        case 'topleft':
                            pos = atlas.ControlPosition.TopLeft;
                            break;
                        case 'topright':
                            pos = atlas.ControlPosition.TopRight;
                            break;
                        case 'bottomright':
                            pos = atlas.ControlPosition.BottomRight;
                            break;
                        case 'bottomleft':
                            pos = atlas.ControlPosition.BottomLeft;
                            break;
                    }
                    map.controls.add(new atlas.control.ZoomControl(), { position: pos });
                });
            }

            map.events.add('moveend', () => this._idleFiller());
            map.events.addOnce('ready', () => {
                container.dispatchEvent(new MapEvent("maploaded"));
                this._idleFiller()
            });

            return mapElement;
        }

        invalidateSize() {
            var ctrl = this;
            if (ctrl.map)
                ctrl.map.resize();
        }

        removeItem(item: MapRelevantElement) {
            if (item instanceof PacemMapMarkerElement) {
                var adapter = this._markersAdapter;
                var marker = adapter.markers.get(item);
                if (!Utils.isNull(marker)) {
                    this.map.markers.remove(marker);
                    adapter.markers.delete(item);
                }
            }
            this.fitBounds(true);
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

        //#endregion

        @Debounce(500)
        private _idleFiller() {
            // dunno what to do here
        }

        private _shapes = new Map<any, atlas.Shape>();

        @Debounce(consts.TIMEOUT)
        fitBounds(onlyIfAutofit?: boolean) {
            if (!this.map) return;
            var ctrl = this._container;

            // check against autofit
            if (!ctrl.autofit && onlyIfAutofit === true) return;

            var markers = this._markersAdapter.markers, shapes = this._shapes;

            // no markers
            if (!markers.size && !shapes.size) {
                this._map.setCamera({ center: AtlasMapUtils.getPosition(ctrl.center), zoom: ctrl.zoom });
                return;
            }
            var bnds = [];
            for (var m of markers.keys()) {
                let marker = markers.get(m);
                if (Utils.isNull(marker)) continue;
                MapUtils.expandBounds(bnds, AtlasMapUtils.getLatLng(marker.getOptions().position));
            }
            for (var s of shapes.keys()) {
                var bx: atlas.data.BoundingBox = (<atlas.Shape>shapes.get(s)).getBounds();
                MapUtils.expandBounds(bnds, AtlasMapUtils.getLatLng(atlas.data.BoundingBox.getSouthWest(bx)));
                MapUtils.expandBounds(bnds, AtlasMapUtils.getLatLng(atlas.data.BoundingBox.getNorthEast(bx)));
            }

            var paddingTop = ctrl.paddingTop,
                paddingLeft = ctrl.paddingLeft,
                paddingRight = ctrl.paddingRight,
                paddingBottom = ctrl.paddingBottom;
            if (bnds.length >= 2 || (bnds.length == 1 && (paddingTop || paddingLeft || paddingBottom || paddingRight))) {

                // TODO: avoid double loop (specially for large sets), just set coords in 'correct' place for Azure maps right away...
                this._map.setCamera({ bounds: AtlasMapUtils.getBounds(bnds), padding: { 'top': paddingTop, 'bottom': paddingBottom, 'left': paddingLeft, 'right': paddingRight } });

            } else {
                if (bnds.length == 1) {
                    this._map.setCamera({ center: AtlasMapUtils.getPosition(ctrl.center), zoom: ctrl.zoom });
                }
            }
        };

    }

}