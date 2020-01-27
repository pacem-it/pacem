/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="../../../dist/js/pacem-maps.d.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {

    export const DEFAULT_TILES = "";
    export const DEFAULT_ATTRIBUTION = "";
    //const TILES = `//api.mapbox.com/styles/v1/cmerighi/ciwz1gib7002l2prvgpi724nk/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY21lcmlnaGkiLCJhIjoiY2lsZHIxdGJmMDAxOHc4bHowamxpZ2Z2OCJ9.7I7ndF-rAkx_1Sqi0bw3Ew`;
    //const ATTRIBUTION = `Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>`
    const REVERSE_GEOCODE_URL = 'https://nominatim.openstreetmap.org/reverse';

    export interface LatLngOptions {
        provider: 'osm' | 'leaflet' | 'azure' | 'google' | 'gmaps' | 'leafletjs',
        tiles?: string,
        attribution?: string,
        apiKey?: string,
        icon?: any
    }

    @CustomElement({
        tagName: P + '-latlng', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${PCSS}-latlng">
    <div class="${PCSS}-latlng-fields ${PCSS}-viewfinder">
        <${ P}-input-number class="${PCSS}-lat" value="{{ :host._lat, twoway }}" min="-90" max="90" step="{{ 'any' }}"></${P}-input-number>
        <${ P}-input-number class="${PCSS}-lng" value="{{ :host._lng, twoway }}" min="-180" max="180" step="{{ 'any' }}"></${P}-input-number>
    </div>
    <${ P}-panel hide="{{ Pacem.Utils.isNull(:host.value) || :host.readonly }}">
    <dl class="${PCSS}-latlng-preview">
        <dt>decimals:</dt><dd><${ P}-text text="{{ :host._getViewValue(:host.value, 12) }}"></${P}-text></dd>
        <dt>address:</dt><dd><${ P}-text text="{{ ::_fetcher.result.display_name || '?' }}"></${P}-text></dd>
        <dt>degrees:</dt><dd><${ P}-span css-class="{{ {'${PCSS}-lat-north': :host._lat > 0, '${PCSS}-lat-south': :host._lat < 0} }}" content="{{ $pacem.decToDeg(Math.abs(:host._lat)) }}"></${P}-span>,
        <${ P}-span css-class="{{ {'${PCSS}-lng-east': :host._lng > 0, '${PCSS}-lng-west': :host._lng < 0} }}" content="{{ $pacem.decToDeg(Math.abs(:host._lng)) }}"></${P}-span></dd>
    </dl>
    </${P}-panel>
    <${P}-span class="${PCSS}-readonly" hide="{{ !:host.readonly }}" content="{{ :host.viewValue + ($pacem.isNullOrEmpty(::_fetcher.result.display_name) ? '' : (' <small>'+ ::_fetcher.result.display_name +'</small>')) }}"></${P}-span>

    <${P}-map-adapter-leaflet></${P}-map-adapter-leaflet>
    <${P}-map-adapter-azure></${P}-map-adapter-azure>
    <${P}-map-adapter-google></${P}-map-adapter-google>

    <${P}-map adapter="{{ ::_adapter }}">
        <${P}-map-marker position="{{ :host._ensureValue(:host.value) }}" on-dragend=":host.changeHandler($event)" draggable="{{ !:host.readonly }}"></${P}-map-marker>
    </${P}-map>
    <${P}-fetch disabled="{{ $pacem.isNull(:host.value) }}" parameters="{{ { format: 'json', lat: :host._lat, lon: :host._lng } }}" url="${REVERSE_GEOCODE_URL}"></${P}-fetch>
</div>`
    })
    export class PacemLatLngElement extends PacemBaseElement implements OnPropertyChanged {

        protected convertValueAttributeToProperty(attr: string) {
            const regexArray = /^\s*([+-]?\d+\.?\d+)[,\s]\s*([+-]?\d+\.?\d+)\s*$/.exec(attr);
            if (regexArray && regexArray.length === 3) {
                return { lat: parseFloat(regexArray[1]), lng: parseFloat(regexArray[2]) };
            }
            throw `Invalid coordinates format for "${attr}"`;
        }

        protected compareValuePropertyValues(old, val) {
            if (old && typeof old.lat === 'number' && typeof old.lng === 'number'
                && val && typeof val.lat === 'number' && typeof val.lng === 'number') {
                return old.lat === val.lat && old.lng === val.lng;
            }
            return false;
        }

        protected getViewValue(value: any): string {
            return this._getViewValue(value);
        }

        private _getViewValue(value: any, precision: number = 8) {
            return value && typeof value.lat === 'number' && typeof value.lng === 'number' && value.lat.toFixed(precision) + ',' + value.lng.toFixed(precision) || '';
        }

        protected get inputFields(): HTMLElement[] {
            return [this._latInput, this._lngInput];
        }

        protected toggleReadonlyView(readonly: boolean): void {
            this._inputContainer.hidden = /*
            this._lngInput.hide = this._latInput.hide =*/ readonly;
        }

        // regex: 
        protected acceptValue(val) {
            let e_val = this._ensureValue(val);
            this._lat = e_val.lat;
            this._lng = e_val.lng;
        }

        private _ensureValue(val) {
            return (val && typeof val.lat === 'number' && typeof val.lng === 'number') ? val : Pacem.Components.Maps.MapConsts.DEFAULT_COORDS;
        }

        protected onChange(evt?: Event): PromiseLike<any> {
            if (evt && evt.type === 'dragend') {
                var mevt = <Maps.MapEvent>evt;
                // geocoordinate change due to map drag
                this._lat = mevt.detail.position.lat;
                this._lng = mevt.detail.position.lng;
            } // else: geocoordinate change due to text-input
            const lat = this._lat;
            const lng = this._lng;
            if (Utils.isNull(lat) || Utils.isNull(lng))
                return Utils.fromResult(this.value);
            return Utils.fromResult(this.value = { lat: lat, lng: lng });
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'options' && !first) {
                const opts = Utils.clone((val || { provider: 'osm' }) as LatLngOptions);
                this._synchronizeOptions(opts);
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._synchronizeOptions();
        }

        private _synchronizeOptions(opts: LatLngOptions = this.options) {
            const marker = this._marker, map = this._map;
            marker.icon = opts.icon;

            switch (opts && opts.provider) {
                case 'azure':
                    this._azureAdapter.subscriptionKey = opts.apiKey;
                    map.adapter = this._azureAdapter;
                    break;
                case 'google':
                case 'gmaps':
                    this._googleAdapter.apiKey = opts.apiKey;
                    map.adapter = this._googleAdapter;
                    break;
                default:
                    if (!Utils.isNullOrEmpty(opts.attribution)) {
                        this._leafletAdapter.attribution = opts.attribution;
                    }
                    if (!Utils.isNullOrEmpty(opts.tiles)) {
                        this._leafletAdapter.tiles = opts.tiles;
                    }
                    map.adapter = this._leafletAdapter;
                    break;
            }

            delete opts['provider'];
            delete opts['icon'];
            delete opts['apiKey'];
            delete opts['attribution'];
            delete opts['tiles'];

            for (let prop in opts) {
                if (prop in map) {
                    map[prop] = opts[prop];
                }
            }
        }

        @ViewChild(P + '-map-adapter-leaflet') private _leafletAdapter: Pacem.Components.Maps.PacemLeafletMapAdapterElement;
        @ViewChild(P + '-map-adapter-azure') private _azureAdapter: Pacem.Components.Maps.PacemAzureMapAdapterElement;
        @ViewChild(P + '-map-adapter-google') private _googleAdapter: Pacem.Components.Maps.PacemGoogleMapAdapterElement;
        @ViewChild(P + '-map') private _map: Pacem.Components.Maps.PacemMapElement;
        @ViewChild(P + '-map-marker') private _marker: Pacem.Components.Maps.PacemMapMarkerElement;
        @ViewChild(P + '-input-number:nth-child(1)') private _latInput: PacemNumberInputElement;
        @ViewChild(P + '-input-number:nth-child(2)') private _lngInput: PacemNumberInputElement;
        @ViewChild(`.${PCSS}-latlng-fields`) private _inputContainer: HTMLElement;
        @ViewChild(P + '-fetch') private _fetcher: PacemFetchElement;

        @Watch({ converter: PropertyConverters.Json, emit: false }) options: LatLngOptions;
        @Watch() private _lat: number;
        @Watch() private _lng: number;


    }


}