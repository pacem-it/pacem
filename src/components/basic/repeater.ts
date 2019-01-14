/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    const GET_VAL = CustomElementUtils.getAttachedPropertyValue;
    const SET_VAL = CustomElementUtils.setAttachedPropertyValue;

    export class ItemCommandEvent extends CustomTypedEvent<CommandEventArgs>{

        constructor(args: CommandEventArgs) {
            super("item" + CommandEventName, args, { bubbles: false, cancelable: true });
        }
    }

    export class DeleteItemCommandEvent extends CustomTypedEvent<any> {
        constructor(args: any) {
            super("itemdelete", args, { bubbles: false, cancelable: true });
        }
    }

    export class SelectItemCommandEvent extends CustomTypedEvent<any> {
        constructor(args: any) {
            super("itemselect", args, { bubbles: false, cancelable: true });
        }
    }

    export class EditItemCommandEvent extends CustomTypedEvent<any> {
        constructor(args: any) {
            super("itemedit", args, { bubbles: false, cancelable: true });
        }
    }

    //
    /**
     * <pacem-repeater datasource="[{id:'first', items:['a','b','c']}, ...]">
     * <ol>
     *    <li>
     *      <template>
     *          <pacem-repeater datasource={{ ^item.items }}>
     *              <template>
     *                  <pacem-span text="{{ ^^item.id+': ': ^item.toUpperCase()  }}"></pacem-span>
     *              </template>
     *          </pacem-repeater>
     *      </template>
     *    </li>
     * </ol>
     * </pacem-repeater>
     */
    @CustomElement({ tagName: 'pacem-repeater' })
    export class PacemRepeaterElement extends PacemEventTarget implements OnPropertyChanged, OnViewActivated, OnDisconnected {

        constructor() {
            super();
        }

        @Watch({ emit: false, debounce: true, converter: PropertyConverters.Eval }) datasource: any[];

        private _childItems: RepeaterItem[] = [];

        private _itemTemplate: HTMLTemplateElement;

        private _fragment = document.createDocumentFragment();

        removeItem(index: number) {
            this._removeItems(index, index);
        }

        private _setItem(item: any, index: number, frag: DocumentFragment) {
            const items = this._childItems;
            let _item: RepeaterItem;
            if (index >= items.length) {
                _item = new RepeaterItem(this, this._itemTemplate, frag);
                this._setupItem(_item, index, item);
                items.push(_item);
                _item.append();
            } else {
                _item = items[index];
                this._setupItem(_item, index, item);
            }
            this.dispatchEvent(new RepeaterItemCreateEvent(_item));
        }

        private _removeItems(fromIndex: number, toIndex: number) {
            const items = this._childItems;
            let exceeding = items.splice(fromIndex, toIndex + 1 - fromIndex);
            for (var i = exceeding.length - 1; i >= 0; i--) {
                let item = exceeding[i];
                this.dispatchEvent(new RepeaterItemRemoveEvent(item));
                item.remove();
            }
        }

        private _setupItem = (item: RepeaterItem, index: number, entity: any) => {
            // FIRST set index on PacemRepeaterItemElement...
            item.index = index;
            // ...THEN the item entity itself.
            item.item = entity;
        };

        private _databind() {
            // no template? fail.
            let tmpl = this._itemTemplate;
            if (tmpl == null)
                throw `Missing template element in ${PacemRepeaterElement.name}.`;
            // fill up
            let items = this._childItems,
                index = 0
                ;
            for (var entity of this.datasource || []) {
                this._setItem(entity, index, this._fragment);
                index++;
            }
            if (index < items.length) {
                this._removeItems(index, items.length - 1);
            } else
                // flush added items
                tmpl.parentNode.insertBefore(this._fragment, tmpl);
        }

        private _onCommand(evt: CommandEvent) {
            Pacem.stopPropagationHandler(evt);
            const cmd = evt.detail.commandName.toLowerCase();
            this.dispatchEvent(new ItemCommandEvent(evt.detail));
            switch (cmd) {
                case 'select':
                    this.dispatchEvent(new SelectItemCommandEvent(evt.detail.commandArgument));
                    break;
                case 'edit':
                    this.dispatchEvent(new EditItemCommandEvent(evt.detail.commandArgument));
                    break;
                case 'delete':
                    this.dispatchEvent(new DeleteItemCommandEvent(evt.detail.commandArgument));
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.addEventListener(CommandEventName, this._onCommand, false);
            this._itemTemplate = this.querySelector('template');
            this._databind();
        }

        disconnectedCallback() {
            this.removeEventListener(CommandEventName, this._onCommand, false);
            this.datasource = [];
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old: any, val: any, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'datasource' && this._itemTemplate != null)
                this._databind();
        }

    }

    const REPEATERITEM_PLACEHOLDER = 'pacem:repeater-item';

    export class RepeaterItem {

        static findUpwards(element: Element, upLevels: number = 0, logFn: (message?: string) => void = console.warn) {
            if (Utils.isNull(element) || element.localName === 'template')
                return null;
            let item: RepeaterItem = null;
            let predicate: (node: any) => boolean = (node) => !Utils.isNull(item = RepeaterItem.getRepeaterItem(node));
            let retval: Node = CustomElementUtils.findPreviousSiblingOrAncestor(element, predicate, upLevels);
            if (retval == null && logFn && element instanceof HTMLElement && element['isConnected'])
                logFn(`Couldn't find a ${RepeaterItem.name} up ${upLevels} level${((upLevels === 1) ? "" : "s")} from element "${element.constructor.name}".`);
            return item;
        }

        static isRepeaterItem(node: Node) {
            return !Utils.isNull(GET_VAL(node, REPEATERITEM_PLACEHOLDER));
        }

        static getRepeaterItem(node: Node): RepeaterItem {
            return GET_VAL(node, REPEATERITEM_PLACEHOLDER);
        }

        constructor(
            private _repeater: PacemRepeaterElement,
            private _template: HTMLTemplateElement,
            private _fragment: DocumentFragment,
            private _placeholder: Comment = document.createComment('pacem-repeater-item')
        ) {
            SET_VAL(_placeholder, REPEATERITEM_PLACEHOLDER, this);

            const FIELD_PREFIX = '_';

            function _setScopeValue(name: string, v: any): any {
                var owner = this,
                    fieldName = FIELD_PREFIX + name;
                if (v !== owner[fieldName]) {
                    var old = owner[fieldName];
                    owner[fieldName] = v;
                    var evt = new PropertyChangeEvent({ propertyName: name, oldValue: old, currentValue: v });
                    owner.dispatchEvent(evt);
                }
            }

            Object.defineProperties(_placeholder, {
                'item': {
                    get: function () {
                        return this[FIELD_PREFIX + 'item'];
                    },
                    set: function (v: any) {
                        _setScopeValue.apply(_placeholder, ['item', v]);
                    }, configurable: true
                },
                'index': {
                    get: function () {
                        const val = this[FIELD_PREFIX + 'index'];
                        return Utils.isNull(val) ? -1 : val;
                    },
                    set: function (v: number) {
                        _setScopeValue.apply(_placeholder, ['index', v]);
                    }, configurable: true
                }
            });




        }

        /** @internal */
        append(): void {
            let tmplRef = this._template,
                tmplParent = this._fragment;

            this._alterEgos.push(tmplParent.appendChild(this._placeholder));
            const clonedTmpl = <HTMLTemplateElement>tmplRef.cloneNode(true);
            var host: any;
            if (!Utils.isNull(host = GET_VAL(this._repeater, INSTANCE_HOST_VAR)))
                CustomElementUtils.assignHostContext(host, clonedTmpl);
            var dom = clonedTmpl.content./*children*/childNodes;
            Array.prototype.push.apply(this._alterEgos, dom);
            tmplParent.appendChild(clonedTmpl.content);
        }

        get dom(): Node[] {
            return this._alterEgos.filter(n => !(n instanceof Comment || n instanceof Text));
        }

        get repeater(): PacemRepeaterElement {
            return this._repeater;
        }

        get placeholder() {
            return this._placeholder;
        }

        /** @internal */
        remove(): void {
            let tmplRef = this._template,
                tmplParent = tmplRef.parentElement;
            for (var alterEgo of this._alterEgos) {
                if (alterEgo.parentElement === tmplParent) {
                    tmplParent.removeChild(alterEgo);
                }
            }
        }

        get index(): number {
            return this._placeholder['index'];
        }

        set index(v: number) {
            this._placeholder['index'] = v;
        }

        get item(): any {
            return this._placeholder['item'];
        }

        set item(v: any) {
            this._placeholder['item'] = v;
            //
            //let ds = this._repeater.datasource,
            //    index = this._index;
            //if (index < ds.length && ds[index] !== v)
            //    this._repeater.datasource.splice(index, 1, v);
        }

        private _alterEgos: Node[] = [];
    }

}