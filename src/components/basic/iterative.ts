/// <reference path="types.ts" />
/// <reference path="items-container.ts" />
/// <reference path="adapter.ts" />
namespace Pacem.Components {

    export abstract class PacemIterableElement extends PacemItemElement {

        /** @overrides */
        protected findContainer() {
            return CustomElementUtils.findAncestor(this, n => n instanceof PacemIterativeElement);
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            const iter: PacemIterativeElement<any> = <any>this.container;
            if (!Utils.isNull(iter))
                iter.register(this);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            const iter: PacemIterativeElement<any> = <any>this.container;
            iter
                && iter.adapter
                && iter.adapter.itemPropertyChangedCallback(iter.items.indexOf(this), name, old, val, first);
        }
    }

    export abstract class PacemIterativeElement<TItem extends PacemIterableElement> extends PacemItemsContainerElement<TItem>
        implements Iterative<TItem> {

        @Watch({ emit: false, converter: PropertyConverters.Element }) adapter: PacemAdapter<PacemIterativeElement<TItem>, TItem>;
        @Watch({ converter: PropertyConverters.Number }) index: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            // notify the adapter, if any.
            this.adapter && this.adapter.masterPropertyChangedCallback(name, old, val, first);

            switch (name) {
                case 'adapter':
                    if (!Utils.isNull(val))
                        this.adapter.initialize(this);
                    break;
                case 'items':
                    let ndx = 0;
                    if (!Utils.isNullOrEmpty(this.items)) {
                        if (this.index < this.items.length) {
                            ndx = this.index;
                        }
                    }
                    this.index = ndx;
                    break;
            }

        }

        disconnectedCallback() {
            if (!Utils.isNull(this.adapter))
                this.adapter.destroy();
            super.disconnectedCallback();
        }

    }
}