/// <reference path="types.ts" />
/// <reference path="form.ts" />
namespace Pacem.Components.Scaffolding {

    declare type PropagatedProperty = {
        prop: string,
        alias?: string
    };


    /** For internal use ONLY! */
    @CustomElement({ tagName: P + '-childform-propagator' })
    export class PacemChildFormPropagatorElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.String })
        property: string;

        @Watch({ emit: false })
        watch: any;

        @Watch({ emit: false /* mandatory twoway binding */ })
        model: any;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'watch' || name === 'property' || (name === 'model' && val && val.length > (old && old.length || 0))) {
                this._synchronize();
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._synchronize();
        }

        private _synchronize() {
            const model = this.model,
                propagate = this.property,
                value = this.watch;
            if (Utils.isNullOrEmpty(model) || Utils.isNullOrEmpty(propagate)) {
                return;
            }

            if (Utils.isArray(model)) {
                for (let item of model) {
                    item[propagate] = value;
                }

                // trigger change
                model.splice(model.length);
            } else {

                model[propagate] = value;

                // trigger change
                this.model = Utils.clone(model);
            }

        }
    }

    /** Represents a sub-form for automatic generation of editing fields for sub-entities.  */
    @CustomElement({
        tagName: P + '-childform', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-repeater datasource="{{ :host._model }}" on-itemdelete=":host._deleteAt($event)" on-${RepeaterItemCreateEventName}=":host._itemCreate($event)">
    <div class="${PCSS}-childform">
    <template>
        <${P}-panel class="${PCSS}-childform-item" behaviors="{{ [::_dragger] }}">
            <${P}-panel class="childform-item-handle ${PCSS}-margin margin-right-1" hide="{{ :host.lockItems || :host.readonly || :host.mode !== 'array' || !(:host._model && :host._model.length > 1) }}"><i class="${PCSS}-icon drag-handle">drag_handle</i></${P}-panel>
            <${P}-panel class="childform-item-index text-small"><${P}-span hide="{{ !:host.readonly || :host.mode !== 'array' }}" class="${PCSS}-margin margin-right-1" text="{{ ^index+1 }}"></${P}-span></${P}-panel>
            <${P}-form entity="{{ ^item }}" fetch-headers="{{ :host.fetchHeaders }}" fetch-credentials="{{ :host.fetchCredentials }}" on-${PropertyChangeEventName}=":host._itemChange(^index, $event)" readonly="{{ :host.readonly }}" metadata="{{ :host.metadata }}" autogenerate="true" logger="{{ :host.logger }}"></${P}-form>
            <${P}-button tab-order="-1" class="flat circular circle-small clear ${PCSS}-margin margin-left-1" hide="{{ :host.lockItems || :host.readonly }}" command-name="delete" command-argument="{{ ^index }}"></${P}-button>
        </${P}-panel>
    </template>
    </div>
    <${P}-button tab-order="-1" class="flat circular circle-small add" hide="{{ :host.lockItems || :host.readonly || :host.mode !== 'array' }}" on-click=":host._addItem($event)"></${P}-button>
</${P}-repeater>
<div class="${PCSS}-childform-item-floater ${PCSS}-panel panel-border">
    <div class="corner top-left"></div><div class="corner top-right"></div><div class="corner bottom-left"></div><div class="corner bottom-right"></div>
</div>
<${P}-drag-drop floater="{{ ::_floater }}" disabled="{{ :host.lockItems }}"
    on-${Pacem.UI.DragDropEventType.Start}=":host._dragStart($event)"
    on-${Pacem.UI.DragDropEventType.End}=":host._dragEnd($event)" 
    drop-behavior="${Pacem.UI.DropBehavior.InsertChild}" mode="${Pacem.UI.DragDataMode.Alias}" handle-selector=".drag-handle" drop-targets="{{ [::_container] }}"></${P}-drag-drop>`
    })
    export class PacemChildFormElement extends PacemBaseElement implements Pacem.Net.OAuthFetchable {

        @Watch({ emit: false, converter: PropertyConverters.String }) fetchCredentials: RequestCredentials;
        @Watch({ emit: false, converter: PropertyConverters.Json }) fetchHeaders: { [key: string]: string; };

        protected get inputFields(): HTMLElement[] {
            return [];
        }

        protected toggleReadonlyView(readonly: boolean): void {
            // automatic
        }

        protected onChange(evt?: Event): PromiseLike<any> {
            return new Promise((resolve, _) => {
                var val = this._modelToEntity();
                resolve(this.value = val);
            });
        }

        protected acceptValue(val: any) {
            this._entityToModel(val);
        }

        protected getViewValue(value: any): string {
            return '';
        }

        protected convertValueAttributeToProperty(attr: string) {
            return PropertyConverters.Json.convert(attr, this);
        }

        @ViewChild('.' + PCSS + '-childform') private _container: HTMLElement;
        @ViewChild(P + '-drag-drop') private _dragger: PacemDragDropElement;
        @ViewChild('.' + PCSS + '-childform-item-floater') private _floater: Element;

        @Watch({ converter: PropertyConverters.String })
        mode: 'array' | 'object';

        @Watch({ converter: PropertyConverters.Boolean })
        lockItems: boolean;

        @Watch({ converter: PropertyConverters.Json })
        metadata: Pacem.Scaffolding.TypeMetadata | PropertyMetadata[];

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'mode':
                    this._entityToModel();
                    break;
            }
        }

        /** Internal representation of the entity. */
        @Watch({ converter: PropertyConverters.Json }) private _model: any[] = [];

        private _dragStart(evt: Pacem.UI.DragDropEvent) {
            var args = evt.detail as Pacem.UI.DragDropEventArgsClass;
            const size = Utils.offset(args.element),
                floater = args.floater as HTMLElement;
            floater.style.width = size.width + 'px';
            floater.style.height = size.height + 'px';
        }

        private _dragEnd(evt: Pacem.UI.DragDropEvent) {
            if (this.mode === 'array' /*&& !Utils.isNull(evt.detail.target)*/) {
                this._triggerChange();
            }
        }

        reset() {
            super.reset();

            // once the value/entity with this component is reset
            // it is not necessary to process the subForms
            this._subForms.forEach(f => {
                f.setPristine();
            });
        }

        private _subForms: PacemFormElement[] = [];
        private _itemCreate(evt: RepeaterItemCreateEvent) {
            const ndx = evt.detail.index,
                subForms = this._subForms;
            evt.detail.dom[0].childNodes.forEach(e => {
                if (e instanceof Element && e.localName === (P + '-form')) {
                    subForms.splice(ndx, subForms.length - ndx, e as PacemFormElement);
                }
            });
        }

        private _itemChange(ndx: number, evt: PropertyChangeEvent) {
            if (evt.detail.propertyName === 'entity'
                && Utils.Json.stringify(this._model[ndx]) !== Utils.Json.stringify(evt.detail.currentValue)) {
                this._model.splice(ndx, 1, evt.detail.currentValue);
                this._triggerChange();
            }
        }

        private _deleteAt(evt: CustomItemCommandEvent) {
            // prevent the event to bubble (nested scenarios).
            avoidHandler(evt.srcEvent);

            if (this.mode === 'array') {
                this._model.splice(evt.detail, 1);
            } else {
                this._model.splice(0, this._model.length, {});
            }
            this._triggerChange();
        }

        private _addItem(evt: Event) {
            if (this.mode === 'array') {
                this._model.push({});
                this._triggerChange();
            }
        }

        private _triggerChange() {
            this.changeHandler(new Event('change'));
        }

        private _entityToModel(entity = this.value) {
            switch (this.mode) {
                case 'array':
                    let arr = entity || [];
                    if (Utils.isArray(arr)) {
                        this._model.cloneFrom(arr);
                    }
                    break;
                default:
                    const model = this._model,
                        length = model.length;
                    if (length !== 1 || model[0] !== entity) {
                        model.splice(0, length, entity || {});
                    }
                    break;
            }
        }

        private _modelToEntity(model = this._model) {
            switch (this.mode) {
                case 'array':
                    return Utils.clone(model);
                default:
                    return model && model.length && model[0] || null;
            }
        }
    }

}