/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-a'
    })
    export class PacemAnchorElement extends PacemElement implements Pacem.Net.OAuthFetchable {

        @Watch({ emit: false, converter: PropertyConverters.String }) fetchCredentials: RequestCredentials;
        @Watch({ emit: false, converter: PropertyConverters.Json }) fetchHeaders: { [key: string]: string; };

        constructor() {
            super('link');
        }

        @Watch({ reflectBack: false, converter: PropertyConverters.String }) href: string;
        @Watch({ reflectBack: false, converter: PropertyConverters.String }) target: string;
        @Watch({
            reflectBack: false, converter: {
                convert: (attr) => {
                    switch (attr) {
                        case 'true':
                            return true;
                        case 'false':
                            return false;
                        default:
                            return attr;
                    }
                }, convertBack: (prop) => prop
            }
        }) download: string | boolean;
        @Watch({ reflectBack: false, converter: PropertyConverters.Element }) router: PacemRouterElement;

        private _fetching: boolean = false;

        ///
        get fetching() {
            return this._fetching;
        }

        connectedCallback() {
            super.connectedCallback();
            if (!this.hasAttribute('tab-order')) {
                this.tabOrder = 0;
            }
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'target':
                    (Utils.isNullOrEmpty(val) ? Utils.removeClass : Utils.addClass)(this, 'a-target');
                    break;
                case 'href':
                    (Utils.isNull(val) ? Utils.removeClass : Utils.addClass)(this, 'a-url');
                    break;
                case 'download':
                    (Utils.isNullOrEmpty(val) ? Utils.removeClass : Utils.addClass)(this, 'a-download');
                    break;
            }
        }

        protected emit(evt: Event) {
            super.emit(evt);
            switch (evt.type) {
                case 'mousedown':
                    Utils.addClass(this, PCSS + '-active');
                    break;
                case 'keydown':
                    if ((<KeyboardEvent>evt).keyCode === 13) {
                        evt.preventDefault();
                        Utils.addClass(this, PCSS + '-active');
                    }
                    break;
                case 'blur':
                case 'mouseup':
                    Utils.removeClass(this, PCSS + '-active');
                    break;
                case 'keyup':
                    if ((<KeyboardEvent>evt).keyCode === 13) {
                        this.click();
                        Utils.removeClass(this, PCSS + '-active');
                    }
                    break;
            }
            const url = this.href, target = this.target, router = this.router, filename = this.download;
            if (!Utils.isNull(url) && !evt.defaultPrevented) {
                if ((evt.type === 'click' && (<MouseEvent>evt).ctrlKey) || (evt.type === 'mousedown' && (<MouseEvent>evt).button === 1)) {
                    window.open(url, '_blank');
                } else if (evt.type === 'click') {
                    if (filename === true) {
                        this._download(url);
                    } else if (typeof filename === 'string' && !Utils.isNullOrEmpty(filename)) {
                        this._download(url, filename);
                    }
                    else if (!Utils.isNull(router)) {
                        // old implementation memento: Pacem.preventDefaultHandler(evt);
                        // trigger router `navigate()`
                        router.path = url;
                    } else {
                        if (!Utils.isNullOrEmpty(target)) {
                            window.open(url, target || '_blank');
                        } else {
                            location.assign(url);
                        }
                    }
                }
            }
        }

        private async _download(url: string, filename?: string) {
            this.dispatchEvent(new PropertyChangeEvent({
                propertyName: 'fetching', oldValue: this._fetching, currentValue: this._fetching = true
            }));
            var response = await fetch(url, { credentials: this.fetchCredentials, headers: this.fetchHeaders });
            if (response.ok) {
                if (Utils.isNullOrEmpty(filename)) {
                    const headerName = 'Content-Disposition';
                    if (response.headers.has(headerName)) {
                        const header = response.headers.get(headerName),
                            results = /^attachment; filename=([^;]+)(;|$)/.exec(header);
                        if (results.length > 1) {
                            filename = results[1];
                        }
                    } else {
                        filename = "download";
                    }
                }
                var blob = await response.blob();
                const fn = filename.split(/[\\\/]/g).join('_');
                this.dispatchEvent(new PropertyChangeEvent({
                    propertyName: 'fetching', oldValue: this._fetching, currentValue: this._fetching = false
                }));
                Utils.download(blob, fn);
            }
        }

    }
}