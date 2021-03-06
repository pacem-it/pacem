﻿/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.Scaffolding {

    class TagRemoveEvent extends CustomTypedEvent<{ index: number }> {
        constructor(value: number) {
            super('tagremove', { index: value })
        }
    }

    class TagAddEvent extends CustomTypedEvent<{ value: any }> {
        constructor(value: any) {
            super('tagadd', { value: value })
        }
    }

    @CustomElement({
        tagName: P + '-tag', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-text text="{{ :host.tag }}"></${P}-text>
                <${P}-button on-click=":host._remove()"></${P}-button>`
    })
    export class PacemTagElement extends PacemElement {

        @Watch({ converter: PropertyConverters.String }) tag: string;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) readonly: boolean;
        @ViewChild(P + '-button') private _btn: UI.PacemButtonElement;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'readonly':
                    let readonly = !!val;
                    (readonly ? Utils.addClass : Utils.removeClass)(this, 'tag-readonly');
                    this._btn.disabled = this._btn.hide = readonly;
                    break;
                case 'tag':
                    Utils.removeClass(this, 'tag-out');
                    break;
            }
        }

        private _remove() {
            const tag = this;
            Utils.addClass(tag, 'tag-out');
            Utils.addAnimationEndCallback(tag, () => {
                this.dispatchEvent(new Event("remove"));
            });
        }
    }

    @CustomElement({
        tagName: P + '-tags', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-repeater class="${PCSS}-tags">
    <ul class="${PCSS}-tags ${PCSS}-viewfinder ${PCSS}-list list-unstyled list-inline">
        <template>
            <li class="${PCSS}-tag">
                <${P}-tag on-remove=":host._tagRemove(^index)" css-class="{{ { 'tag-in': :host._justAddedIndex === ^index } }}" tag="{{ :host.mapEntityToViewValue(^item) }}" readonly="{{ :host.readonly }}"></${P}-tag>
            </li>
        </template>
        <li class="tag-new">
            <${P}-suggest logger="{{ :host.logger }}" placeholder="{{ :host.placeholder }}" allow-new="{{ :host.allowNew }}" class="${PCSS}-tags" on-change=":host._tagAdd($this.value)" hint="{{ :host.hint, twoway }}">
                <${P}-content></${P}-content>
            </${P}-suggest>
        </li>
    </ul>
</${P}-repeater>`
    })
    export class PacemTagsElement extends PacemDataSourceElement {

        constructor() {
            super(true);
        }

        @Watch({ converter: PropertyConverters.String }) hint: string;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) allowDuplicates: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) allowNew: boolean;
        @Watch({ converter: PropertyConverters.Number }) private _justAddedIndex: number;
        @ViewChild(P + '-suggest') private _suggest: PacemSuggestElement;
        @ViewChild(P + '-repeater.' + PCSS + '-tags') private _tags: PacemRepeaterElement;

        protected inputFields: HTMLElement[] = [];

        protected toggleReadonlyView(readonly: boolean): void {
            this._suggest.readonly = readonly;
            (<HTMLElement>this.querySelector('.tag-new')).hidden = readonly;
        }

        private _tagRemove(ndx: number) {
            this.changeHandler(new TagRemoveEvent(ndx));
        }

        private _tagAdd(v: any) {
            this.changeHandler(new TagAddEvent(v));
            // after the - just in case - assignment => reset the suggest component
        }

        protected handleDatasourceMismatch() {
            // do nothing!
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'datasource':
                case 'textProperty':
                    this._suggest[name] = val;
                    break;
                case 'valueProperty':
                    // DON't pass the value-property to the suggest
                    if (!Utils.isNullOrEmpty(val)) {
                        throw `Cannot set 'valueProperty' on ${this.constructor.name}s.`;
                    }
                    break;
                case 'value':
                    this._tags.datasource = val;
                    break;
            }
        }

        protected onChange(evt?: Event): PromiseLike<any> {
            return new Promise((resolve, reject) => {
                switch (evt.type) {
                    case 'tagremove':
                        this._justAddedIndex = -1;
                        const trev = <TagRemoveEvent>evt,
                            ndxrev = trev.detail.index,
                            // manipulate a copy of the array (to preserve the originalValue)
                            valrev = <any[]>Utils.clone(this.value);
                        const trunk2 = valrev.splice(ndxrev + 1),
                            trunk1 = valrev.splice(0, ndxrev);
                        resolve(this.value = trunk1.concat(trunk2));
                        break;
                    case 'tagadd':
                        const value = (<TagAddEvent>evt).detail.value,
                            // manipulate a copy of the array (to preserve the originalValue)
                            valadd = <any[]>Utils.clone(this.value);

                        if (// no empty items
                            !Utils.isNullOrEmpty(value)
                            // no duplicated items
                            && (this.allowDuplicates || Utils.isNullOrEmpty(valadd && (<any[]>valadd).find(i => this.mapEntityToViewValue(i) == this.mapEntityToViewValue(value))))
                        ) {
                            let newvalue = (valadd || []).concat([value]);
                            resolve(this.value = newvalue);
                            this._justAddedIndex = this.value.length - 1;
                            setTimeout(() => {
                                this._suggest.focus();
                            }, 250);
                            // this will allow to accept the hint change...
                            this._suggest.blur();
                            this._suggest.hint = '';
                            this._suggest.reset();
                        }
                        break;
                    default:
                        resolve(this.value);
                        break;
                }
            });
        }

        protected acceptValue(val: any) {
            // no need to implement
        }


    }

}