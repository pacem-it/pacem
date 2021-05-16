namespace Pacem.Components.Scaffolding {

    function isRoot(element: Node): element is HTMLDivElement {
        return element instanceof HTMLDivElement
            && element.contentEditable === 'true'
            && element.hasAttribute('pacem')
            && element.hasAttribute('role')
            && element.attributes['role'].value === 'presenter';
    }

    export class ContenteditableDOMObserver {

        constructor(contentElement: HTMLElement, mutationCallback: (item: Node, removed?: boolean) => void, selector = '*[contenteditable=false]') {

            this.#callback = mutationCallback;
            this.#selector = selector;
            this.#mutationObserver = new MutationObserver(list => {

                const fn = (item: Node, removed: boolean) => {
                    item.childNodes.forEach(i => /* recursion here */fn(i, removed));
                    mutationCallback(item, removed);
                };

                for (let entry of list) {
                    const added = entry.addedNodes;
                    const removed = entry.removedNodes;
                    for (let j = 0; j < added.length; j++) {
                        const item = added.item(j);
                        fn(item, false);
                    }
                    for (let j = 0; j < removed.length; j++) {
                        const item = removed.item(j);
                        fn(item, true);
                    }
                }
            });
            this._initContainer(contentElement);
        }

        private _initContainer(contentElement: HTMLElement) {
            contentElement.querySelectorAll(this.#selector).forEach(el => this.#callback(el));
            this.#mutationObserver.observe(contentElement, { subtree: true, childList: true });
            this.#contentElement = contentElement;
        }

        private _disposeContainer(contentElement: HTMLElement) {
            const observer = this.#mutationObserver;
            if (!Utils.isNull(observer)) {
                observer.disconnect();
            }
            contentElement.querySelectorAll(this.#selector).forEach(el => this.#callback(el, true));
        }

        dispose() {
            this._disposeContainer(this.#contentElement);
        }

        #selector: string;
        #callback: (item: Node, removed?: boolean) => void;
        #contentElement: HTMLElement;
        #mutationObserver: MutationObserver;

    }

    export declare type RangeWrapTestResult = { result: boolean, element?: Node };

    export class ContenteditableUtils {

        static getDefaultDashboard(): DocumentFragment {
            const frag = new DocumentFragment();

            const toolbar0 = document.createElement('div');
            Utils.addClass(toolbar0, PCSS + '-contenteditable-toolbar');

            const undo = new PacemContenteditableHistoryCommandElement();
            undo.command = 'undo';
            undo.keyboardShortcut = "Ctrl+Z";

            const redo = new PacemContenteditableHistoryCommandElement();
            redo.command = 'redo';
            redo.keyboardShortcut = "Ctrl+Y";

            toolbar0.append(undo, redo);

            const separator0 = document.createElement('div');
            Utils.addClass(separator0, PCSS + '-contenteditable-separator');

            const toolbar1 = document.createElement('div');
            Utils.addClass(toolbar1, PCSS + '-contenteditable-toolbar');

            const bold = new PacemContenteditableExecCommandElement();
            bold.command = KnownExecCommand.Bold;
            bold.keyboardShortcut = "Ctrl+B";

            const italic = new PacemContenteditableExecCommandElement();
            italic.command = KnownExecCommand.Italic;
            italic.keyboardShortcut = "Ctrl+I";

            const underline = new PacemContenteditableExecCommandElement();
            underline.command = KnownExecCommand.Underline;
            underline.keyboardShortcut = "Ctrl+U";

            const strike = new PacemContenteditableExecCommandElement();
            strike.command = KnownExecCommand.StrikeThrough;
            underline.keyboardShortcut = "Ctrl+K";

            const ul = new PacemContenteditableExecCommandElement();
            ul.command = KnownExecCommand.UnorderedList;

            const ol = new PacemContenteditableExecCommandElement();
            ol.command = KnownExecCommand.OrderedList;

            const alignLeft = new PacemContenteditableAlignCommandElement();
            alignLeft.align = 'left';

            const alignCenter = new PacemContenteditableAlignCommandElement();
            alignCenter.align = 'center';

            const alignRight = new PacemContenteditableAlignCommandElement();
            alignRight.align = 'right';

            const justify = new PacemContenteditableAlignCommandElement();
            justify.align = 'justify';

            toolbar1.append(bold, italic, underline, strike, ul, ol, alignLeft, alignCenter, alignRight, justify);

            const separator1 = document.createElement('div');
            Utils.addClass(separator1, PCSS + '-contenteditable-separator');

            const toolbar2 = document.createElement('div');
            Utils.addClass(toolbar2, PCSS + '-contenteditable-toolbar');

            const link = new PacemContenteditableLinkCommandElement();
            const img = new PacemContenteditableImageCommandElement();

            toolbar2.append(link, img);

            frag.append(toolbar0, separator0, toolbar1, separator1, toolbar2);
            return frag;
        }

        /**
         * Seeks for a Selection' surrounding node of a given type and returns it, if any.
         * @param range
         * @param type
         */
        static findSurroundingNode(range: Range, tagName: string): Element
        static findSurroundingNode(node: Node, tagName: string): Element
        static findSurroundingNode(range: Range, filter: (node: Node) => boolean): Element
        static findSurroundingNode<TNode extends Node>(range: Range, type: Type<TNode>): TNode
        static findSurroundingNode<Element>(range: Range | Node, arg1: string | Type<Element> | ((node: Node) => boolean)): Node {
            var node: Node = range instanceof Node ? range : range.commonAncestorContainer;

            while (node && !(typeof arg1 === 'string' && node instanceof Element && node.tagName === arg1.toUpperCase()
                || typeof arg1 === 'function' && Utils.isNull(arg1.prototype) && (<((node: Node) => boolean)>arg1)(node)
                || typeof arg1 === 'function' && !Utils.isNull(arg1.prototype) && node instanceof arg1)) {
                const parent = node.parentNode;
                if (isRoot(parent)) {
                    node = null;
                    break;
                }
                node = parent;
            }

            return node;
        }

        static findSurroundingBlockElement(range: Range): Element {
            return this.findSurroundingNode(range, ContenteditableUtils.isBlockElement);
        }

        static findSurroundingSiblingBlockElements(range: Range): Element[] {

            let output: Element[] = [];
            if (isRoot(range.startContainer)) {
                if (!range.collapsed) {
                    const root = range.startContainer;
                    for (let k = range.startOffset; k <= range.endOffset; k++) {
                        const child = root.children.item(k);
                        if (this.isBlockElement(child)) {
                            output.push(root.children.item(k));
                        }
                    }
                }
                return output;
            }

            // simil-collapsed
            if (range.startContainer === range.endContainer) {
                let retval: Node = range.startContainer;
                while (!ContenteditableUtils.isBlockElement(retval) && retval.parentElement.contentEditable != 'true') {
                    retval = retval.parentElement;
                }
                return retval instanceof Element ? [retval] :
                    (retval.parentElement.contentEditable === 'true' ? [] : [retval.parentElement]);
            }

            // generic
            let root = range.commonAncestorContainer,
                started = false;
            for (let j = 0; j < root.childNodes.length; j++) {
                const iNode = root.childNodes.item(j);

                const pick = (!started && iNode.contains(range.startContainer))
                    || started;

                if (pick && ContenteditableUtils.isBlockElement(iNode)) {
                    output.push(iNode);
                    started = true;
                    if (iNode.contains(range.endContainer)) {
                        break;
                    }
                }
            }

            return started ? output : (root instanceof Element && !isRoot(root) ? [root] : []);
        }

        static findContainingRootElements(range: Range): Element[] {
            const range1 = range.cloneRange(),
                range2 = range.cloneRange();
            range1.collapse(true);
            range2.collapse();
            let root = this.findSurroundingNode(range1, n => n.parentElement.contentEditable === 'true');
            const retval: Element[] = [root];
            while (!root.contains(range2.startContainer)) {
                retval.push(root = root.nextElementSibling);
            }
            return retval;
        }

        static isBlockElement(node: Node): node is Element {
            return node instanceof Element && !getComputedStyle(node).display.startsWith('inline');
        }

        static select(node: Node, inside = false): Range {
            const range = document.createRange();
            if (!inside) {
                range.setStartBefore(node);
                range.setEndAfter(node);
            } else {
                range.setStart(node, 0);
                range.setEnd(node, node.childNodes.length);
            }
            const selection = document.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            return range;
        }

        static copyAttributes(to: Element, from: Element): void {
            const attrs = from.attributes;
            for (let j = 0; j < attrs.length; j++) {
                const attr = attrs.item(j);
                to.setAttribute(attr.name, attr.value);
            }
        }

        /**
         * Checks whether the provided range wraps an 'inert' (contentEditable=false) element, and returns result accordingly.
         * @param range
         */
        static testInertElementWrapping(range: Range): RangeWrapTestResult {
            if (!Utils.isNull(range)) {
                const parent = range.startContainer,
                    index = range.startOffset;
                var node: Node;
                if (parent === range.endContainer && index == (range.endOffset - 1) && (node = parent.childNodes.item(index)) instanceof HTMLElement && node.contentEditable === 'false') {
                    return { result: true, element: node };
                }
            }
            return { result: false };
        }
    }

}