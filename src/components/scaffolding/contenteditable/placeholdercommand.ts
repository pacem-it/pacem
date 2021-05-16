/// <reference path="../contenteditable.ts" />
/// <reference path="utils.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    function insertPlaceholder(range: Range, placeholder: string): HTMLElement {
        const ins = document.createElement('ins');
        ins.textContent = placeholder;
        ins.setAttribute('contenteditable', 'false');
        // not necessary:
        // ins.style.display = 'inline-block';
        ins.tabIndex = 0;
        range.deleteContents();
        range.insertNode(ins);
        return ins;
    }

    function isPlaceholder(node: Node): node is HTMLModElement {
        return node instanceof HTMLModElement && node.tagName === 'INS';
    }

    declare type PlaceholderRelevancy = RangeWrapTestResult & { placeholder?: string };

    function isRelevant(range: Range): PlaceholderRelevancy {
        const wraps = ContenteditableUtils.testInertElementWrapping(range);
        if (wraps.result && isPlaceholder(wraps.element)) {
            const element = wraps.element, placeholder = element.textContent;
            return { result: true, element, placeholder };
        }
        return { result: false };
    }

    @CustomElement({
        tagName: P + '-contenteditable-placeholder', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<template>
<${P}-span text="{{ ^item.viewValue }}" class="text-tech"></${P}-span>
<${P}-markdown hide="{{ $pacem.isNullOrEmpty(^item.data.definition) || ^item.viewValue === ^item.data.definition }}" class="${PCSS}-margin margin-0 text-small" value="{{ ^item.data.definition }}"></${P}-markdown>
</template>
<${P}-suggest placeholder="Placeholder" class="pacem-button button" disabled="{{ $pacem.isNull(:host.range) }}"
              on-change=":host.execCommand($this.value)"
              css-class="{{ {'text-primary': :host.isRelevant(:host.range)} }}" 
              compare-by="placeholder" text-property="placeholder" itemtemplate="{{ ::_itemtemplate }}" prevent-focus="true" allow-typing="false"></${P}-suggest>`
    })
    export class PacemContenteditablePlaceholderElement extends PacemContenteditableCommandElement {
        
        #relevancy: PlaceholderRelevancy;
        #normalizedDatasource: { placeholder: string, definition?: string }[];

        @ViewChild('template') private _itemtemplate: HTMLTemplateElement;
        @ViewChild(P + '-suggest') private _dropdown: PacemSuggestElement;

        cleanUp(content: HTMLElement): void {
            content.querySelectorAll('ins[contenteditable=false]').forEach(ins => {
                Utils.removeClass(<HTMLElement>ins, 'placeholder-selected');
            });
        }

        exec(ph: string): Promise<any> {
            const el = insertPlaceholder(this.range, ph);
            const range = ContenteditableUtils.select(el);
            range.collapse(false);
            return Promise.resolve(el);
        }

        @Watch({ emit: false, converter: PropertyConverters.Json }) datasource: (string | { placeholder: string, definition?: string })[];

        isRelevant(_: Range): boolean {
            return this.#relevancy?.result ?? false;
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._fillDropdown();
            this._initContainer();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'datasource':
                        this._fillDropdown();
                        break;
                    case 'contentElement':
                        if (old) {
                            this._disposeContainer(old);
                        }
                        if (val) {
                            this._initContainer(val);
                        }
                        break;
                    case 'range':
                        this._changeRelevancy();
                        break;
                }
            }
        }

        disconnectedCallback() {
            this._disposeContainer();
            super.disconnectedCallback();
        }

        private _changeRelevancy(range = this.range) {
            const old = this.#relevancy;
            if (!Utils.isNull(old?.element)) {
                Utils.removeClass(<HTMLElement>old.element, 'placeholder-selected');
            }
            const val = this.#relevancy = isRelevant(range);
            if (!Utils.isNull(val?.element)) {
                Utils.addClass(<HTMLElement>val.element, 'placeholder-selected');
            }

            if (val.result) {
                this._dropdown.value = val.placeholder;
            } else {
                this._dropdown.popout();
                this._dropdown.value = void 0;
            }
        }

        private _fillDropdown(datasource = this.datasource || []) {
            const ds = this.#normalizedDatasource = datasource.map(i => { return typeof i === 'string' ? { placeholder: i, definition: i } : i });
            const dd = this._dropdown;
            dd.textProperty =
            dd.valueProperty = 'placeholder';
            dd.datasource = ds;
        }

        // #region mutation observer

        #observer: ContenteditableDOMObserver;

        private _initContainer(contentElement = this.contentElement) {
            this.#observer = new ContenteditableDOMObserver(contentElement, (item, removed) => {
                if (isPlaceholder(item)) {
                    if (removed) {
                        this._downgradePlaceholderElement(item);
                    } else {
                        this._enhancePlaceholderElement(item);
                    }
                }
            }, 'ins[contenteditable=false]');
        }

        private _disposeContainer(_ = this.contentElement) {
            const observer = this.#observer;
            if (!Utils.isNull(observer)) {
                observer.dispose();
            }
        }

        private _focusHandler = (evt: Event) => {
            const ins = evt.target as Node;
            this.range = ContenteditableUtils.select(ins);
        };

        private _enhancePlaceholderElement(ins: HTMLElement) {
            ins.addEventListener('focus', this._focusHandler, false);
        }

        private _downgradePlaceholderElement(ins: HTMLElement) {
            ins.removeEventListener('focus', this._focusHandler, false);
        }

        // #endregion
    }

}