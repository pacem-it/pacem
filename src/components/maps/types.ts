﻿/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.Maps {

    export declare type LatLng = { lat: number, lng: number };

    export declare type Icon = {
        url: string, anchor: Point, size: Size, html: string | false
    };

    export const MapConsts = {
        MAP_SELECTOR: P + '-map',
        LINK_SELECTOR: P + '-map-link',
        MARKER_SELECTOR: P + '-map-marker',
        POLYLINE_SELECTOR: P + '-map-polyline',
        CIRCLE_SELECTOR: P + '-map-circle',
        LAYER_SELECTOR: P + '-map-layer',
        DEFAULT_COORDS: { lat: 44.714188025077984, lng: 10.296516444873811 }
    };

    export class MapUtils {
        static parseCoords(input: string | number[] | LatLng): [number, number] {
            if (input && !isNaN(input['lat']) && !isNaN(input['lng'])) return [input['lat'], input['lng']];
            else if (Utils.isArray(input) && (<any[]>input).length > 1) return [<number>input[0], <number>input[1]];
            else if (/^\s*(\+|-)?[\d]+(.[\d]+)?\s*,\s*(\+|-)?[\d]+(.[\d]+)?\s*$/.test(<string>input)) {
                var splitted = (<string>input).split(',');
                return [parseFloat(splitted[0]), parseFloat(splitted[1])];
            }
            return [MapConsts.DEFAULT_COORDS.lat, MapConsts.DEFAULT_COORDS.lng];
        }
        static expandBounds(bnds: any[], latLng: LatLng | number[]) {
            if (latLng) {
                if (!Array.isArray(latLng)) {
                    latLng = [latLng.lat, latLng.lng];
                }
                bnds.push(latLng);
            }
        }
        static isContentEmpty(element: HTMLElement): boolean {
            return element.children.length == 0;
        }
    };

    export abstract class MapRelevantElement extends PacemEventTarget {

        get map(): PacemMapElement {
            return this['_map'] = this['_map'] || CustomElementUtils.findAncestorOfType(this, PacemMapElement);
        }

        @Watch({ converter: PropertyConverters.Boolean }) hide: boolean;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.map && this.map.register(this);
        }

        disconnectedCallback() {
            this.map && this.map.unregister(this);
            super.disconnectedCallback();
        }
    }

    /** Geocoding contract. (Dead-end, to be used in a near future?) */
    export interface MapGeocoder {
        search: (q: string) => PromiseLike<LatLng>;
        reverse: (position: LatLng) => PromiseLike<string>;
    }

    export abstract class PacemMapAdapterElement extends PacemEventTarget {
        /**
        * When implemented in a derived class, forces the map redraw.
        */
        abstract invalidateSize();

        /**
         * Initializes the map and returns its corresponding DOM element.
         * @param map {PacemMapElement} Container for the map
         */
        abstract initialize(map: PacemMapElement): PromiseLike<HTMLElement>;

        /**
         * Disposes the resources attached to the map.
         * @param map {PacemMapElement} The map
         */
        abstract destroy(map: PacemMapElement): void;

        /**
         * When implemented in a derived class, draws a map element.
         * @param item {MapRelevantElement} item to be drawn
         */
        abstract drawItem(item: MapRelevantElement);

        /**
         * When implemented in a derived class, removes a map element.
         * @param item {MapRelevantElement} item to be removed
         */
        abstract removeItem(item: MapRelevantElement);

        /**
         * When implemented in a derived class, shows the infowindow relevant to a map element (if any).
         * @param item {MapRelevantElement} item whose infowindow must be displayed
         */
        abstract popupInfoWindow(item: MapRelevantElement);

        /**
         * When implemented in a derived class, hides the infowindow relevant to a map element (if any).
         * @param item {MapRelevantElement} item whose infowindow must be hidden
         */
        abstract popoutInfoWindow(item: MapRelevantElement);

        /** Gets the native map instance */
        abstract get map(): any;

        /**
         * When implemented in a derived class, sets the viewport of the map.
         * @param center {LatLng} position
         * @param zoom {Number} zoom level
         */
        abstract setView(zoom: number);
        abstract setView(center: LatLng, zoom?: number);

        /** When implemented in a derived class, sets the viewport of the map so that it can fit all its content. */
        abstract fitBounds(onlyIfAutofit?: boolean);

        protected updateMapElement(ctrl: PacemMapElement, center: LatLng, zoom: number) {
            const lat = center.lat, lng = center.lng;
            ctrl.zoom = zoom;
            if (lat != ctrl.center?.lat || lng != ctrl.center?.lng) {
                ctrl.center = { lat, lng };
            }
        }
    }

    export declare type MapEventArgs = { position?: LatLng };

    export class MapEvent extends CustomTypedEvent<MapEventArgs>{

        constructor(type: string, args?: MapEventArgs) {
            super(type, args);
        }

    }

    @CustomElement({ tagName: MapConsts.MARKER_SELECTOR })
    export class PacemMapMarkerElement extends MapRelevantElement {

        @Watch({ converter: PropertyConverters.Json }) position: LatLng;
        @Watch({ converter: PropertyConverters.Json }) icon: Icon | string;
        @Watch({ converter: PropertyConverters.String }) caption: string;
        @Watch({ converter: PropertyConverters.Boolean }) draggable: boolean;

        onDragEnd(position: LatLng) {
            this.position = position;
            this.dispatchEvent(new MapEvent('dragend', { position: position }));
        }

        onInfoOpen() {
            this.dispatchEvent(new MapEvent('openinfo'));
        }

        onInfoClose() {
            this.dispatchEvent(new MapEvent('closeinfo'));
        }
    }

    @CustomElement({ tagName: MapConsts.LAYER_SELECTOR })
    export class PacemMapLayerElement extends MapRelevantElement {
        @Watch({ emit: false, converter: PropertyConverters.String }) url: string;
        /** Gets or sets the names of the layers to include (mandatory for WMS layers). */
        @Watch({ emit: false, converter: PropertyConverters.Json }) include: string[];
        @Watch({ emit: false, converter: PropertyConverters.String }) mode: 'wms' | 'tms' | string;
        @Watch({ emit: false, converter: PropertyConverters.Number }) minZoom: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) maxZoom: number;
    }

    @CustomElement({ tagName: MapConsts.MAP_SELECTOR })
    export class PacemMapElement extends PacemEventTarget {

        @Watch({ emit: true, converter: PropertyConverters.Number }) zoom: number = 12;
        @Watch({ emit: true, converter: PropertyConverters.Json }) center: LatLng = MapConsts.DEFAULT_COORDS;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) scale: boolean = true;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) mousewheel: boolean = true;
        /**
        * zoom control position
        */
        @Watch({ emit: false, converter: PropertyConverters.String }) zoomControl: "topleft" | "topright" | "bottomleft" | "bottomright";
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) draggable: boolean = true;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) doubleClickZoom: boolean = true;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) keyboardShortcuts: boolean = true;
        /** Gets or sets whether to autofit the bounds whenever the map gets refreshed. */
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) autofit: boolean = true;

        @Watch({ emit: false, converter: PropertyConverters.Number }) paddingTop: number = 0;
        @Watch({ emit: false, converter: PropertyConverters.Number }) paddingLeft: number = 0;
        @Watch({ emit: false, converter: PropertyConverters.Number }) paddingRight: number = 0;
        @Watch({ emit: false, converter: PropertyConverters.Number }) paddingBottom: number = 0;

        @Watch({ emit: false, converter: PropertyConverters.Element }) adapter: PacemMapAdapterElement;

        get container() {
            return this._container;
        }

        register(item: MapRelevantElement) {
            item.addEventListener(PropertyChangeEventName, this._drawHandler, false);
            this._draw(item);
        }

        unregister(item: MapRelevantElement) {
            this._erase(item);
            item.removeEventListener(PropertyChangeEventName, this._drawHandler, false);
        }

        private _draw(item: MapRelevantElement, adapter: PacemMapAdapterElement = this.adapter) {
            this._initialized &&
                adapter &&
                adapter.drawItem(item);
        }

        private _erase(item: MapRelevantElement, adapter: PacemMapAdapterElement = this.adapter) {
            this._initialized &&
                adapter &&
                adapter.removeItem(item);
        }

        private _drawHandler = (evt: Event) => {
            this._draw(<MapRelevantElement>evt.target);
        }

        //#endregion

        //#region lifecycle
        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'adapter') {
                if (!Utils.isNull(this._container)) {
                    this._initialized = false;
                    this.adapter.initialize(this).then(_ => this._afterInit(_, old));
                }
            } else {
                switch (name) {
                    case 'zoom':
                    case 'center':
                        this.adapter && this.adapter.setView(val);
                        break;
                    case 'autofit':
                        if (val) {
                            this.adapter && this.adapter.fitBounds();
                        }
                        break;
                }
                this.adapter && this.adapter.invalidateSize();
            }
        }

        private _initialized: boolean = false;
        private _container: HTMLElement;
        private _resizer: PacemResizeElement;
        private _afterInit = (_: HTMLElement, old?: PacemMapAdapterElement) => {
            this._initialized = true;
            // loop through child element map-relevant-items
            for (var child of CustomElementUtils.findDescendants(this, n => n instanceof MapRelevantElement)) {
                this._erase(<MapRelevantElement>child, old);
                this._draw(<MapRelevantElement>child);
            }

            // dispose old, if any.
            old?.destroy(this);
        };

        viewActivatedCallback() {
            super.viewActivatedCallback();
            const container = this._container = document.createElement('div');
            Utils.addClass(container, PCSS + '-map');
            this.insertAdjacentElement('afterend', container);
            const resizer = this._resizer = <PacemResizeElement>document.createElement(P + '-resize');
            resizer.addEventListener('resize', this._resizeHandler, false);
            resizer.target = container;
            container.insertAdjacentElement('afterend', resizer);
            //
            this.adapter && this.adapter.initialize(this).then(this._afterInit);
        }

        disconnectedCallback() {
            const resizer = this._resizer;
            if (!Utils.isNull(resizer)) {
                resizer.removeEventListener('resize', this._resizeHandler, false);
                resizer.remove();
            }
            super.disconnectedCallback();
        }

        private _resizeHandler = (e: Event) => {
            this.onResize(e);
        }

        onResize(e?: Event) {
            this.adapter && this.adapter.invalidateSize();
        }

        //#endregion
    }
}