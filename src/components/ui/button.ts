/// <reference path="../../../dist/js/pacem-core.d.ts" />

namespace Pacem.Components.UI {

    //@CustomElement({
    //    tagName: 'pacem-button-depr', shadow: Defaults.USE_SHADOW_ROOT,
    //    template: `<button pacem><pacem-content></pacem-content></button>`
    //})
    //export class PacemButtonElementDeprecated extends PacemIterableElement implements OnViewActivated, OnDisconnected {

    //    private _focusHandler = (evt: Event) => {
    //        if (evt.type === 'focus')
    //            Utils.addClass(this, 'pacem-focus');
    //        else
    //            Utils.removeClass(this, 'pacem-focus');
    //        this.emit(evt);
    //    };

    //    @Watch({ emit: false, converter: PropertyConverters.String }) type: string;
    //    @Watch({ emit: false, converter: PropertyConverters.String }) commandName: string;
    //    @Watch({ emit: false, converter: PropertyConverters.String }) commandArgument: any;
    //    @Watch({ emit: false, converter: PropertyConverters.String }) confirmationMessage: string;
    //    @Watch({ emit: false, converter: PropertyConverters.Element }) confirmationDialog: PacemDialogBase;

    //    protected emit(evt: Event) {

    //        let fn = (ev: Event) => {
    //            super.emit(ev);
    //            if (ev.type === 'click' && !Utils.isNullOrEmpty(this.commandName)) {
    //                this.dispatchEvent(new Pacem.CommandEvent({ commandName: this.commandName, commandArgument: this.commandArgument }));
    //            }
    //        };

    //        if (!this.disabled && evt.type === 'click' && !Utils.isNull(this.confirmationDialog)) {
    //            this.confirmationDialog.open(this.confirmationMessage).then(r => {
    //                if (r.button === DialogButton.Yes || r.button === DialogButton.Ok)
    //                    fn(evt);
    //            });
    //        } else
    //            fn(evt);
    //    }

    //    // TODO: remove dependency from wrapped button element (not that easy, see specs...)
    //    /*
    //    form dependency, :active state, keydown/up events with SPACE_BAR and ENTER, ...
    //    */
    //    @ViewChild('button[pacem]') private _button: HTMLButtonElement;

    //    focus() {
    //        this._button &&
    //            this._button.focus();
    //    }

    //    propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
    //        super.propertyChangedCallback(name, old, val, first);
    //        if (name === 'type') {
    //            this._syncType();
    //        }
    //    }

    //    private _syncType() {
    //        if (!Utils.isNull(this._button)) {
    //            if (Utils.isNullOrEmpty(this.type)) {
    //                this._button.removeAttribute("type");
    //            } else {
    //                this._button.setAttribute("type", this.type);
    //            }
    //        }
    //    }

    //    viewActivatedCallback() {
    //        super.viewActivatedCallback();
    //        var btn = this._button;
    //        this._syncType();
    //        btn.addEventListener('blur', this._focusHandler, false);
    //        btn.addEventListener('focus', this._focusHandler, false);
    //    }

    //    disconnectedCallback() {
    //        var btn = this._button;
    //        if (!Utils.isNull(btn)) {
    //            btn.removeEventListener('focus', this._focusHandler, false);
    //            btn.removeEventListener('blur', this._focusHandler, false);
    //        }
    //        super.disconnectedCallback();
    //    }
    //}

    @CustomElement({
        tagName: 'pacem-button'
    })
    export class PacemButtonElement extends PacemIterableElement {

        constructor() {
            super('button');
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) commandName: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) commandArgument: any;
        @Watch({ emit: false, converter: PropertyConverters.String }) confirmationMessage: string;
        @Watch({ emit: false, converter: PropertyConverters.Element }) confirmationDialog: PacemDialogBase;

        connectedCallback() {
            super.connectedCallback();
            this.tabOrder = 0;
        }

        disconnectedCallback() {
            
            super.disconnectedCallback();
        }

        protected emit(evt: Event) {

            let fn = (ev: Event) => {
                super.emit(ev);
                if (ev.type === 'click' && !Utils.isNullOrEmpty(this.commandName)) {
                    this.dispatchEvent(new Pacem.CommandEvent({ commandName: this.commandName, commandArgument: this.commandArgument }));
                } else {
                    switch (ev.type) {
                        case 'mousedown':
                            Utils.addClass(this, 'pacem-active');
                            break;
                        case 'keydown':
                            if ((<KeyboardEvent>ev).keyCode === 32 || (<KeyboardEvent>ev).keyCode === 13) {
                                evt.preventDefault();
                                Utils.addClass(this, 'pacem-active');
                            }
                            break;
                        case 'blur':
                        case 'mouseup':
                            Utils.removeClass(this, 'pacem-active');
                            break;
                        case 'keyup':
                            if ((<KeyboardEvent>ev).keyCode === 32 || (<KeyboardEvent>ev).keyCode === 13) {
                                this.click();
                                Utils.removeClass(this, 'pacem-active');
                            }
                            break;
                    }
                }
            };

            if (!this.disabled && evt.type === 'click' && !Utils.isNull(this.confirmationDialog)) {
                this.confirmationDialog.open(this.confirmationMessage).then(r => {
                    if (r.button === DialogButton.Yes || r.button === DialogButton.Ok)
                        fn(evt);
                });
            } else
                fn(evt);
        }
    }
}