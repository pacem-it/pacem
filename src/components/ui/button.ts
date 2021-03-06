﻿/// <reference path="../../../dist/js/pacem-core.d.ts" />

namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-button'
    })
    export class PacemButtonElement extends PacemIterableElement {

        constructor() {
            super('button');
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) iconGlyph: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) iconUrl: string;

        @Watch({ emit: false, converter: PropertyConverters.String }) commandName: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) commandArgument: any;
        @Watch({ emit: false, converter: PropertyConverters.String }) confirmationMessage: string;
        @Watch({ emit: false, converter: PropertyConverters.Element }) confirmationDialog: PacemDialogBase;

        connectedCallback() {
            super.connectedCallback();
            if (!this.hasAttribute('tab-order')) {
                this.tabOrder = 0;
            }
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'iconGlyph':
                // suppose ligatures enabled
                case 'iconUrl':
                    // handle this via css attr(), considering that it's the proper way to access and modify pseudo::before content
                    this.dataset[name] = val;
                    break;
            }
        }

        protected emit(evt: Event) {

            let fn = (ev: Event) => {
                super.emit(ev);
                if (!ev.defaultPrevented) {
                    if (ev.type === 'click' && !Utils.isNullOrEmpty(this.commandName)) {
                        this.dispatchEvent(new Pacem.CommandEvent({ commandName: this.commandName, commandArgument: this.commandArgument }));
                    } else {
                        switch (ev.type) {
                            case 'mousedown':
                                if ((<MouseEvent>evt).button === 0) {
                                    Utils.addClass(this, PCSS + '-active');
                                }
                                break;
                            case 'keydown':
                                if ((<KeyboardEvent>ev).keyCode === 32 || (<KeyboardEvent>ev).keyCode === 13) {
                                    evt.preventDefault();
                                    Utils.addClass(this, PCSS + '-active');
                                }
                                break;
                            case 'blur':
                            case 'mouseup':
                                Utils.removeClass(this, PCSS + '-active');
                                break;
                            case 'keyup':
                                if ((<KeyboardEvent>ev).keyCode === 32 || (<KeyboardEvent>ev).keyCode === 13) {
                                    this.click();
                                    Utils.removeClass(this, PCSS + '-active');
                                }
                                break;
                        }
                    }
                }
            };

            if (!this.disabled && evt.type === 'click' && !Utils.isNull(this.confirmationDialog)) {
                this.confirmationDialog.open(this.confirmationMessage).then(r => {
                    if (r.button === DialogButton.Yes || r.button === DialogButton.Ok)
                        fn(evt);
                });
            } else if (!(evt instanceof MouseEvent) || evt.button === 0) {
                fn(evt);
            }
        }
    }
}