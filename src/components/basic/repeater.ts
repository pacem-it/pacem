﻿/// <reference path="../../core/decorators.ts" />
/// <reference path="../../core/utils-customelement.ts" />
/// <reference path="types.ts" />
/// <reference path="template-proxy.ts" />
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
    @CustomElement({ tagName: P + '-repeater' })
    export class PacemRepeaterElement extends PacemEventTarget implements Repeater {

        @Watch({ emit: false, converter: PropertyConverters.Eval }) datasource: any[];

        private _childItems: RepeaterItem[] = [];

        private _itemTemplate: HTMLTemplateElement;
        private _childTemplatePlaceholder: HTMLTemplateElement | PacemTemplateProxyElement;

        private _fragment = document.createDocumentFragment();

        removeItem(index: number) {
            this._removeItems(index, index);
        }

        private _setItem(item: any, index: number, frag: DocumentFragment) {
            const items = this._childItems;
            let _item: RepeaterItem;
            if (index >= items.length) {
                _item = new RepeaterItem(this, this._itemTemplate, frag, this._childTemplatePlaceholder);
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

        @Debounce(true)
        private _databind() {
            // no template? fail.
            let tmpl = this._itemTemplate,
                holder = this._childTemplatePlaceholder;
            if (tmpl == null)
                throw `Missing template element in ${PacemRepeaterElement.name}.`;
            // fill up
            let items = this._childItems,
                index = 0;
            try {
                for (var entity of this.datasource || []) {
                    this._setItem(entity, index, this._fragment);
                    index++;
                }
            } catch (e) {
                this.log(Logging.LogLevel.Error, e);
            }
            if (index < items.length) {
                this._removeItems(index, items.length - 1);
            } else
                // flush added items
                holder.parentNode.insertBefore(this._fragment, holder);
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

            let proxy = <PacemTemplateProxyElement>this.querySelector(P + '-template-proxy');
            if (!Utils.isNull(proxy)) {
                this._childTemplatePlaceholder = proxy;
                this._itemTemplate = proxy.target;
            } else {
                this._itemTemplate = this._childTemplatePlaceholder = this.querySelector('template');
            }
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

    export class RepeaterItem extends Pacem.RepeaterItem {

        constructor(
            private _repeater: PacemRepeaterElement,
            private _template: HTMLTemplateElement,
            private _fragment: DocumentFragment,
            private _holder: HTMLTemplateElement | PacemTemplateProxyElement
        ) {
            super(document.createComment('pacem-repeater-item'));

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

            // placeholder on roids:
            let placeholder = this.placeholder;
            Object.defineProperties(placeholder, {
                'item': {
                    get: function () {
                        return this[FIELD_PREFIX + 'item'];
                    },
                    set: function (v: any) {
                        _setScopeValue.apply(placeholder, ['item', v]);
                    }, configurable: true
                },
                'index': {
                    get: function () {
                        const val = this[FIELD_PREFIX + 'index'];
                        return Utils.isNull(val) ? -1 : val;
                    },
                    set: function (v: number) {
                        _setScopeValue.apply(placeholder, ['index', v]);
                    }, configurable: true
                }
            });

        }

        /** @internal */
        append(): void {
            let tmplRef = this._template,
                tmplParent = this._fragment;

            this._alterEgos.push(tmplParent.appendChild(this.placeholder));
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

        /** @internal */
        remove(): void {
            let tmplParent = this._holder.parentElement;
            for (var alterEgo of this._alterEgos) {
                if (alterEgo.parentElement === tmplParent) {
                    tmplParent.removeChild(alterEgo);
                }
            }
        }

        get index(): number {
            return this.placeholder['index'];
        }

        set index(v: number) {
            this.placeholder['index'] = v;
        }

        get item(): any {
            return this.placeholder['item'];
        }

        set item(v: any) {
            this.placeholder['item'] = v;
        }

        private _alterEgos: Node[] = [];
    }

}