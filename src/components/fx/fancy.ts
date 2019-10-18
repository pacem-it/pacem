/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Fx {

    const FANCY_CSS = PCSS + "-fancy";
    const FANCIFY_CSS = PCSS + "-fancify";
    const DEFAULT_GAP = 20;

    @CustomElement({ tagName: P + '-fx-fancy' })
    export class PacemFxFancyElement extends PacemFxElement {


        private _textNodes: Node[];
        private _originalContent: string;
        private _handle: number;
        private _handle1: number;
        private _progress = .0;
        private _started = false;

        get progress(): number {
            return this._progress;
        }

        get started(): boolean {
            return this._started;
        }

        @Watch({ converter: Pacem.PropertyConverters.Boolean }) fancify: boolean
        @Watch({ converter: Pacem.PropertyConverters.Number }) delay: number;
        @Watch({ converter: Pacem.PropertyConverters.Number }) gap: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'fancify' || name === 'target') {
                if (!Utils.isNull(this.target)) {
                    if (this.fancify) {
                        this.start();
                    } else {
                        this._reset();
                    }
                }
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (this.fancify && !Utils.isNull(this.target))
                this.start();
        }

        disconnectedCallback() {
            cancelAnimationFrame(this._handle);
            clearTimeout(this._handle1);
            if (!Utils.isNull(this.target))
                this._reset();
            super.disconnectedCallback();
        }

        private _reset() {
            Utils.removeClass(this.target, FANCY_CSS);
            if (this._started) {
                this.dispatchEvent(new PropertyChangeEvent({ propertyName: 'started', oldValue: this._started, currentValue: this._started = false }));
            }
            this.dispatchEvent(new PropertyChangeEvent({ propertyName: 'progress', oldValue: this._progress, currentValue: this._progress = 0 }));
            if (Utils.isNull(this._originalContent))
                this._originalContent = this.target.innerHTML;
            else
                this.target.innerHTML = this._originalContent;
        }

        private _parse() {
            let n: Node, a = [], walker = document.createTreeWalker(this.target, NodeFilter.SHOW_TEXT, null, false);
            while (n = walker.nextNode()) {
                if (n.textContent) {
                    a.push(n);
                }
            }
            this._textNodes = a;
        }

        start() {
            if (!this.disabled) {
                this._reset();
                this._parse();
                this._startShow();
                this._handle1 = setTimeout(() => {
                    this.dispatchEvent(new PropertyChangeEvent({ propertyName: 'started', oldValue: this._started, currentValue: this._started = true }));
                }, this.delay || 0);

            }
        }

        private _startShow(ndx: number = 0) {

            Utils.addClass(this.target, FANCY_CSS);

            const trunks = this._textNodes,
                length = trunks.length;
            this._fancify(trunks[ndx]);
            const old = this._progress;
            ndx++;
            const curr = this._progress = ndx / length;
            this.dispatchEvent(new PropertyChangeEvent({ propertyName: 'progress', oldValue: old, currentValue: curr }));
            if (ndx < length) {
                this._handle = requestAnimationFrame(() => {
                    this._startShow(ndx);
                });
            }
        }

        private _fancify(node: Node) {
            const content = node.textContent;
            if (Utils.isNullOrEmpty(content) || !/[^\s]/.test(content)) {
                return;
            }
            const leftPad = /^\s/.test(content),
                rightPad = /\s$/.test(content);
            node.textContent = '';
            //
            const words = content.trim().split(' '),
                gap = this.gap || DEFAULT_GAP,
                delay = this.delay || 0;
            let j = 0;
            for (let word of words) {
                var span = document.createElement('span');
                span.className = FANCIFY_CSS;
                span.style.animationDelay = `${(delay + j * gap)}ms`;
                if (leftPad || j > 0)
                    node.parentElement.insertBefore(document.createTextNode(' '), node);
                span.textContent = word;
                node.parentElement.insertBefore(span, node);
                j++;
            }
            //
            if (rightPad)
                node.parentElement.insertBefore(document.createTextNode(' '), node);
        }

    }

}