/// <reference path="../../core/decorators.ts" />
namespace Pacem.Components {

    @CustomElement({ tagName: 'pacem-data' })
    export class PacemDataElement extends PacemEventTarget implements OnPropertyChanged {

        constructor(private storage = new Pacem.Storage()) {
            super();
        }

        @Watch({ emit: false /* in order to debounce the propertychange emit */, converter: PropertyConverters.Eval }) model: any;

        @Watch({ emit: false, converter: PropertyConverters.String }) persistAs: string;

        /** Debounces the model change */
        @Watch({ emit: false, converter: PropertyConverters.Number }) debounce: number;
        /** Throttles the model change if debounce is > 0 */
        @Watch({ emit: false, converter: PropertyConverters.BooleanStrict }) throttle: boolean;

        private _handle: number = 0;
        private _flag: boolean = false;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'persistAs':
                    if (!Utils.isNullOrEmpty(old))
                        this.storage.removeProperty(old);
                    if (first === true && !Utils.isNullOrEmpty(val))
                        this.model = this.storage.getPropertyValue(val) || this.model;
                    break;
                case 'model':
                    const debounce = this.debounce,
                        throttle = this.throttle,
                        emit = () => {
                            this.dispatchEvent(new PropertyChangeEvent({ propertyName: name, oldValue: old, currentValue: val, firstChange: first }));
                        };
                    if (debounce > 0 && !first) {
                        if (throttle) {
                            if (this._flag) return;
                            this._flag = true;
                            emit();
                            this._handle = window.setTimeout(() => { this._flag = false; }, debounce);
                        } else {
                            clearTimeout(this._handle);
                            this._handle = window.setTimeout(emit, debounce);
                        }
                    } else {
                        emit();
                    }
                    // persist
                    if (!first && !Utils.isNullOrEmpty(this.persistAs)) {
                        if (Utils.isNull(val))
                            this.storage.removeProperty(this.persistAs);
                        else
                            this.storage.setPropertyValue(this.persistAs, val, true);
                    }
                    break;
            }
        }

    }

}