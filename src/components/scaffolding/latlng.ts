/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="../../../dist/js/pacem-maps.d.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {

    const TILES = `//api.mapbox.com/styles/v1/cmerighi/ciwz1gib7002l2prvgpi724nk/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY21lcmlnaGkiLCJhIjoiY2lsZHIxdGJmMDAxOHc4bHowamxpZ2Z2OCJ9.7I7ndF-rAkx_1Sqi0bw3Ew`;
    const ATTRIBUTION = `Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>`
    const REVERSE_GEOCODE_URL = 'https://nominatim.openstreetmap.org/reverse';

    @CustomElement({
        tagName: 'pacem-latlng', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="pacem-latlng">
    <div class="pacem-latlng-fields pacem-viewfinder">
        <pacem-input-number class="pacem-lat" value="{{ :host._lat, twoway }}" min="-90" max="90" step="{{ 'any' }}"></pacem-input-number>
        <pacem-input-number class="pacem-lng" value="{{ :host._lng, twoway }}" min="-180" max="180" step="{{ 'any' }}"></pacem-input-number>
    </div>
    <pacem-panel hide="{{ Pacem.Utils.isNull(:host.value) || :host.readonly }}">
    <dl class="pacem-latlng-preview">
        <dt>decimals:</dt><dd><pacem-text text="{{ :host._getViewValue(:host.value, 12) }}"></pacem-text></dd>
        <dt>address:</dt><dd><pacem-text text="{{ ::_fetcher.result.display_name || '?' }}"></pacem-text></dd>
        <dt>degrees:</dt><dd><pacem-span css-class="{{ {'pacem-lat-north': :host._lat > 0, 'pacem-lat-south': :host._lat < 0} }}" content="{{ $pacem.decToDeg(Math.abs(:host._lat)) }}"></pacem-span>,
        <pacem-span css-class="{{ {'pacem-lng-east': :host._lng > 0, 'pacem-lng-west': :host._lng < 0} }}" content="{{ $pacem.decToDeg(Math.abs(:host._lng)) }}"></pacem-span></dd>
    </dl>
    </pacem-panel>
    <pacem-span class="pacem-readonly" hide="{{ !:host.readonly }}" content="{{ :host.viewValue + (Pacem.Utils.isNullOrEmpty(::_fetcher.result.display_name) ? '' : (' <small>'+ ::_fetcher.result.display_name +'</small>')) }}"></pacem-span>
    <pacem-map-adapter-leaflet
    tiles="{{ :host._tiles }}" attribution="{{ :host._attribution }}"></pacem-map-adapter-leaflet>
    <pacem-map adapter="{{ ::_adapter }}" mousewheel="false">
        <pacem-map-marker position="{{ :host.value || Pacem.Components.Maps.MapConsts.DEFAULT_COORDS }}" on-dragend=":host.changeHandler($event)" draggable="{{ !:host.readonly }}">
        </pacem-map-marker>
    </pacem-map>
    <pacem-fetch disabled="{{ Pacem.Utils.isNull(:host.value) }}" parameters="{{ { format: 'json', lat: :host._lat, lon: :host._lng } }}" url="${ REVERSE_GEOCODE_URL}"></pacem-fetch>
</div>`
    })
    export class PacemLatLngElement extends PacemBaseElement implements OnPropertyChanged {

        protected convertValueAttributeToProperty(attr: string) {
            const regexArray = /^\s*([+-]?[\d.])+[,\s]+([+-]?[\d].)\s*$/.exec(attr);
            if (regexArray.length === 3) {
                return { lat: parseFloat(regexArray[1]), lng: parseFloat(regexArray[2]) };
            }
            throw `Invalid coordinates format for "${attr}"`;
        }

        protected getViewValue(value: any): string {
            return this._getViewValue(value);
        }

        private _getViewValue(value: any, precision: number = 8) {
            return value && value.lat.toFixed(precision) + ',' + value.lng.toFixed(precision);
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
            this._lat = val && val.lat;
            this._lng = val && val.lng;
        }

        protected onChange(evt?: Event): PromiseLike<any> {
            if (CustomEventUtils.isInstanceOf(evt, Maps.MapEvent)) {
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

        @ViewChild('pacem-map-adapter-leaflet') private _adapter;
        @ViewChild('pacem-input-number:nth-child(1)') private _latInput: PacemNumberInputElement;
        @ViewChild('pacem-input-number:nth-child(2)') private _lngInput: PacemNumberInputElement;
        @ViewChild('.pacem-latlng-fields') private _inputContainer: HTMLElement;
        @ViewChild('pacem-fetch') private _fetcher: PacemFetchElement;

        @Watch() private _tiles = TILES;
        @Watch() private _attribution = ATTRIBUTION;
        @Watch() private _lat: number;
        @Watch() private _lng: number;

    }


}