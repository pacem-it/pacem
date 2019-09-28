/// <reference path="../../core/ui/drag-drop.ts" />
/// <reference path="behavior.ts" />
namespace Pacem.Components {

    const GET_VAL = CustomElementUtils.getAttachedPropertyValue;
    const SET_VAL = CustomElementUtils.setAttachedPropertyValue;
    const DEL_VAL = CustomElementUtils.deleteAttachedPropertyValue;

    const MOUSE_DOWN = 'pacem:dragdrop:mousedown';
    const DRAGGING = 'pacem:dragdrop:info';
    const DELEGATE = 'pacem:dragdrop:delegate';

    type DraggableElement = HTMLElement | SVGElement;

    type DragElementDelegateInitParams = {
        element: DraggableElement,
        dragDrop: UI.DragDropper,
        scrollPosition: Point,
        placeholder?: DraggableElement
    }

    /**
     * Class to whom delegate the window-relevant events (in a possible future, distopic, multi-pointer scenario)
     */
    class DragElementDelegate {

        constructor(initArgs: DragElementDelegateInitParams
            , private _logFn: (level: Logging.LogLevel, message: string, category?: string) => void) {

            this._dragDropper = initArgs.dragDrop;
            Utils.addClass(this._element = initArgs.element, PCSS + '-drag-lock');
            window.addEventListener('mouseup', this._endHandler, false);
            window.addEventListener('touchend', this._endHandler, false);
            window.addEventListener('mousemove', this._moveHandler, false);
            document.addEventListener('wheel', this._moveHandler, false);
            window.addEventListener('touchmove', this._moveHandler, <any>{ passive: false });
            this._dragDropper.dropTargets.forEach(t => {
                t.addEventListener('mouseenter', this._enterHandler, false);
                t.addEventListener('mouseleave', this._leaveHandler, false);
            });
            this._scroll = initArgs.scrollPosition;
            // is `_element` a dynamic one belonging to a repeater item?
            this._repeaterItem = <Components.RepeaterItem>Repeater.findItemContext(this._element, 0, null);
            //
            this._bootstrap(initArgs.placeholder);
        }

        private _dragDropper: UI.DragDropper;
        private _element: DraggableElement;
        private _scroll: Point;
        private _currentTarget: Element;
        private _currentHover: Node;
        private _repeaterItem: RepeaterItem;
        private _started = false;

        // #region PRIVATE UTILS

        private _getLogicalData(node: Node | RepeaterItem): any {
            if (node instanceof RepeaterItem)
                return node.item;
            if (node instanceof HTMLElement)
                return node.dataset;
            return node;
        }

        private _getPhysicalData(node: Node): Node[] {
            if (node instanceof RepeaterItem)
                return node.dom;
            return [node];
        }

        private _createFloater(src: Element, origin: Point): Element {
            const dragger = this._dragDropper;
            let floater = src;
            if (dragger.mode != UI.DragDataMode.Self) {
                floater = <HTMLElement | SVGElement>floater.cloneNode(true);
                CustomElementUtils.stripObservedAttributes(floater);
                if (floater instanceof HTMLElement || floater instanceof SVGElement) {
                    Utils.addClass(floater, PCSS + '-drag-floater');
                    document.body.appendChild(floater);
                    floater.style.position = 'absolute';
                    let pos = { left: origin.x + Utils.scrollLeft - this._scroll.x - floater.clientWidth / 2, top: origin.y + Utils.scrollTop - this._scroll.y - floater.clientHeight / 2 };

                    // if cloned the original element then preserve dimensions
                    if (src === this._element) {
                        let size = Utils.offset(this._element);
                        floater.style.boxSizing = 'border-box';
                        floater.style.width = size.width + 'px';
                        floater.style.height = size.height + 'px';
                        pos = { left: size.left, top: size.top };
                    }

                    // positioning
                    floater.style.left = `${pos.left}px`;
                    floater.style.top = `${pos.top}px`;
                }
            }
            if (floater instanceof HTMLElement || floater instanceof SVGElement) {
                floater.style.pointerEvents = 'none';
            }
            return floater;
        }

        private _findTargetRepeaterItem(dropTarget: Element, nextSibling: Element): { repeater: PacemRepeaterElement, index: number } {
            var repItem = <Components.RepeaterItem>Repeater.findItemContext(nextSibling, 0, null);
            if (!Utils.isNull(repItem)) {
                return { repeater: repItem.repeater, index: repItem.index };
            } else {
                var repeater: PacemRepeaterElement = null,
                    index = -1;
                //
                if (dropTarget instanceof PacemRepeaterElement)
                    repeater = dropTarget;
                else
                    repeater = CustomElementUtils.findAncestorOfType(dropTarget, PacemRepeaterElement);
                //
                if (!Utils.isNull(repeater))
                    return { repeater: repeater, index: (repeater.datasource && repeater.datasource.length) || 0 };
            }
            return null;
        }

        /**
         * Finds the physical next sibling given a container and dragging event arguments.
         * @param target Container
         * @param args Event arguments
         */
        private _findNextSibling(target: Element, args: Pacem.UI.DragDropEventArgs): Element {
            var lastX: number = 0, lastY: number = 0;
            const children = Array.from(target.children),
                length = children.length;

            // first hit tested element
            const hover = document.elementFromPoint(args.currentPosition.x, args.currentPosition.y);

            // hit tested sibling (to spot)
            let hoverElement: Element;

            // 1. hit tested element is the drop target (container)
            if (hover === target) {
                this._currentHover = hoverElement = args.placeholder;
                return hoverElement.parentElement === target ? hoverElement.nextElementSibling : null;
            }

            // loop until the parent element is the drop target
            var hoverSibling = hover;
            while (hoverSibling.parentElement != target && hoverSibling.parentElement != null) {
                hoverSibling = hoverSibling.parentElement;
            }

            // 2. hit tested element is the moving placeholder or is outside a drop target
            if (hoverSibling.parentElement != target || hoverSibling === args.placeholder) {
                this._currentHover = hoverElement = args.placeholder;
                return hoverElement.nextElementSibling;
            }

            // 3. hit tested element has changed
            if (hoverSibling != this._currentHover) {
                hoverElement = <Element>this._currentHover;
                const
                    from = children.indexOf(hoverElement),
                    to = children.indexOf(hoverSibling);
                this._currentHover = hoverSibling;
                return from > to ? hoverSibling : hoverSibling.nextElementSibling;
            }

            // 4. just return something
            return hoverSibling;
        }

        /**
         * This method is computationally heavy due to forced reflow!
         */
        private _insertChild(targetContainer: Element, args: UI.DragDropEventArgs) {
            const drag: Node = args.placeholder || args.element,
                drop: Element = args.target,
                nextSibling = this._findNextSibling(drop, args)
                ;
            if (drag.nextSibling != nextSibling || drag.parentElement != drop) {
                if (Utils.isNull(nextSibling) || nextSibling.parentElement == targetContainer) {
                    // TODO: change logic (try to move elements around with css transforms)
                    targetContainer.insertBefore(drag, nextSibling);
                    this._logFn(Logging.LogLevel.Info, `Positioned before ${(nextSibling && (nextSibling.id || nextSibling.constructor.name)) || "null"} for drop`);
                }
            }
        }

        // #endregion

        private _enterHandler = (evt: Event) => {
            this._currentTarget = <Element>evt.target;
        };

        private _leaveHandler = (evt: Event) => {
            this._currentTarget = null;
        };

        private _bootstrap(placeholder) {
            var el = this._element,
                dragger = this._dragDropper,
                origin: Point,
                args: UI.DragDropEventArgs;

            if (!Utils.isNull(origin = GET_VAL(el, MOUSE_DOWN))) {

                this._started = false;

                DEL_VAL(el, MOUSE_DOWN);
                Utils.addClass(el, PCSS + '-dragging');
                let style = getComputedStyle(el),
                    initialDelta = { x: 0, y: 0 },
                    css = Utils.deserializeTransform(style);
                //
                initialDelta.x += css.x;
                initialDelta.y += css.y;

                // === floater (first)
                let floater = this._createFloater(dragger.floater || el, origin);

                // === placeholder (then)
                if (Utils.isNull(placeholder)) {
                    switch (dragger.mode) {
                        case UI.DragDataMode.Alias:
                            placeholder = <HTMLElement>el;
                            break;
                        case UI.DragDataMode.Copy:
                            placeholder = <HTMLElement>el.cloneNode(true);
                            break;
                    }
                }

                // add peculiar css class
                if (!Utils.isNull(placeholder)) {
                    Utils.addClass(placeholder, 'drag-placeholder');
                }

                // inside a repeater? freeze the item
                if (!Utils.isNull(this._repeaterItem) && !Utils.isNull(placeholder)) {

                    CustomElementUtils.freezeObservedAttributes(placeholder);
                }

                const data = this._getLogicalData(this._repeaterItem || el);

                // setup args
                args = {
                    element: el,
                    placeholder: placeholder || el,
                    data: data,
                    startTime: Date.now(),
                    origin: origin,
                    initialDelta: initialDelta,
                    currentPosition: origin,
                    floater: floater
                };
                SET_VAL(el, DRAGGING, args);
            }
        }

        private _moveHandler = (evt: MouseEvent | TouchEvent | WheelEvent) => {
            if (evt.type !== 'wheel') {
                avoidHandler(evt);
            }

            var el = this._element,
                dragger = this._dragDropper,
                currentPosition: Point,
                args: UI.DragDropEventArgs = GET_VAL(el, DRAGGING);

            //
            function getCurrentPosition() {
                return currentPosition = currentPosition || (evt instanceof MouseEvent ? { x: evt.clientX, y: evt.clientY } : { x: evt.touches[0].clientX, y: evt.touches[0].clientY });
            }

            // start
            if (!this._started) {
                this._logFn(Logging.LogLevel.Info, 'Dragging act started');
                this._started = true;
                // starting from a container/drop-target?
                if (dragger.dropBehavior === UI.DropBehavior.InsertChild) {
                    var container: Element = el;
                    do {
                        // could have nested containers,
                        // keep navigating up the dom tree
                        container = container.parentElement;
                    } while (container && dragger.dropTargets.indexOf(container) == -1);
                    this._currentTarget = container;
                }

                dragger.dispatchEvent(new UI.DragDropEvent(UI.DragDropEventType.Start, UI.DragDropEventArgsClass.fromArgs(args)));
            }

            // move
            if (!Utils.isNull(args)) {
                this._logFn(Logging.LogLevel.Debug, 'Dragging act ongoing');
                const isMouseFlag = evt instanceof MouseEvent;
                //if (evt.type !== 'wheel')
                //    Pacem.avoidHandler(evt);
                Utils.addClass(CustomElementUtils.findAncestorShell(el), PCSS + '-dragging');
                const pos = args.currentPosition = getCurrentPosition();
                let floater = args.floater;
                let moveEvt = new UI.DragDropEvent(UI.DragDropEventType.Drag, UI.DragDropEventArgsClass.fromArgs(args), { cancelable: true });
                // dispatch move event
                dragger.dispatchEvent(moveEvt);
                if (!moveEvt.defaultPrevented // obey the - eventual - canceling feedback
                    && (floater instanceof HTMLElement || floater instanceof SVGElement)) {
                    // move
                    let delta = { x: moveEvt.detail.delta.x + Utils.scrollLeft, y: moveEvt.detail.delta.y + Utils.scrollTop };
                    floater.style.transform = `translate3d(${delta.x}px, ${delta.y}px, 0)`;
                }
                // what am I over?
                var hover = this._currentTarget;
                if (!isMouseFlag && dragger.dropTargets.length > 0) {
                    const doc: any = document; // Workaround. Waiting for TS 2.8.2 bugfix: https://github.com/Microsoft/TypeScript/issues/22943
                    hover = (<DocumentOrShadowRoot>doc).elementsFromPoint(args.currentPosition.x, args.currentPosition.y).find(e => dragger.dropTargets.indexOf(e) >= 0);
                }
                // changed hover element since last time?
                if (hover !== args.target) {
                    if (!Utils.isNull(args.target)) {
                        Utils.removeClass(<HTMLElement | SVGElement>args.target, PCSS + '-dropping');
                        dragger.dispatchEvent(new UI.DragDropEvent(UI.DragDropEventType.Out, UI.DragDropEventArgsClass.fromArgs(args)));
                        this._logFn(Logging.LogLevel.Info, `Drop area left (${(args.target['id'] || args.target.constructor.name)})`);
                    }
                    if (dragger.dropTargets.indexOf(hover) != -1) {
                        args.target = hover;
                        this._logFn(Logging.LogLevel.Info, `Drop area entering (${(args.target['id'] || args.target.constructor.name)})`);
                        let evt = new UI.DragDropEvent(UI.DragDropEventType.Over, UI.DragDropEventArgsClass.fromArgs(args), { cancelable: true });
                        dragger.dispatchEvent(evt);
                        if (evt.defaultPrevented) {
                            delete args.target;
                        } else {
                            Utils.addClass(<HTMLElement | SVGElement>args.target, PCSS + '-dropping');
                            this._logFn(Logging.LogLevel.Info, `Drop area entered (${(args.target['id'] || args.target.constructor.name)})`);
                        }
                    } else
                        delete args.target;
                }
                // positioning
                if (!Utils.isNull(args.target) && dragger.dropBehavior === UI.DropBehavior.InsertChild) {
                    this._insertChild(hover, args);
                } else
                    // if spilling out from a drop target, avoid undesired `copy` of an element.
                    if (Utils.isNull(args.target) && dragger.mode === UI.DragDataMode.Copy) {
                        const ph = args.placeholder;
                        if (ph instanceof Element)
                            ph.remove();
                    }
            }
        }

        private _endHandler = (evt: MouseEvent | TouchEvent) => {
            var el = this._element,
                shell = CustomElementUtils.findAncestorShell(el),
                dragger = this._dragDropper,
                args: UI.DragDropEventArgs;
            if (!Utils.isNull(args = GET_VAL(el, DRAGGING))) {
                if (evt instanceof MouseEvent)
                    Pacem.avoidHandler(evt);


                // #region dispose fn
                let fnDispose = () => {

                    let floater = args.floater;

                    if (floater instanceof HTMLElement || floater instanceof SVGElement) {
                        floater.style.pointerEvents = '';
                    }
                    if (dragger.mode !== UI.DragDataMode.Self) {
                        args.floater.remove();
                    }
                    Utils.removeClass(el, PCSS + '-dragging');
                    Utils.removeClass(el, PCSS + '-drag-lock');
                    DEL_VAL(el, DRAGGING);
                    if (!Utils.isNull(args.placeholder)) {
                        Utils.removeClass(<HTMLElement | SVGElement>args.placeholder, PCSS + '-dragging');
                        Utils.removeClass(<HTMLElement | SVGElement>args.placeholder, 'drag-placeholder');
                        Utils.removeClass(<HTMLElement | SVGElement>args.placeholder, PCSS + '-drag-lock');
                        DEL_VAL(args.placeholder, DRAGGING);
                    }

                    // === drop

                    // TODO: add animation to fit the target and to fit back when reverting...
                    if (!Utils.isNull(args.target)) {
                        dragger.dispatchEvent(new UI.DragDropEvent(UI.DragDropEventType.Drop, UI.DragDropEventArgsClass.fromArgs(args)));
                        Utils.removeClass(<HTMLElement>args.target, PCSS + '-dropping');
                    }

                    // === cleanup
                    const data = args.data,
                        placeholder = args.placeholder,
                        repItem = this._repeaterItem,
                        sourceRepeater = repItem && repItem.repeater,
                        targetRepItem = placeholder && this._findTargetRepeaterItem(args.placeholder.parentElement, args.placeholder.nextElementSibling),
                        targetRepeater = targetRepItem && targetRepItem.repeater;
                    // refresh origin datasource and, eventually, target datasource


                    if (!Utils.isNull(sourceRepeater)) {
                        sourceRepeater.removeItem(repItem.index);
                    }

                    if (!Utils.isNull(targetRepeater)) {
                        args.placeholder.remove();
                    }

                    if (!Utils.isNull(sourceRepeater) && targetRepeater === sourceRepeater) {
                        let from = repItem.index, to = targetRepItem.index;
                        if (to > from) {
                            // tweak
                            to--;
                        }
                        sourceRepeater.datasource.moveWithin(from, to);
                    } else {
                        sourceRepeater && sourceRepeater.datasource.splice(repItem.index, 1);
                        targetRepeater && (targetRepeater.datasource = targetRepeater.datasource || []).splice(targetRepItem.index, 0, data);
                    }

                    // TODO: check spill behavior
                    // === end

                    dragger.dispatchEvent(new UI.DragDropEvent(UI.DragDropEventType.End, UI.DragDropEventArgsClass.fromArgs(args)));
                    //
                    Utils.removeClass(shell, PCSS + '-dragging');
                }
                // #endregion

                // animate to target position
                const drag = args.placeholder || args.element
                if (args.floater != drag) {

                    let floater = <HTMLElement>args.floater;
                    const m = Utils.deserializeTransform(getComputedStyle(floater));

                    // dropping?
                    if (!Utils.isNull(args.target)) {

                        // overlap to placeholder
                        const tgetPos = Utils.offset(drag),
                            srcPos = Utils.offset(floater);
                        floater.style.transition = 'transform .2s ease-in-out';
                        m.x += (tgetPos.left - srcPos.left);
                        m.y += (tgetPos.top - srcPos.top);

                    } else {

                        // scale down to 0
                        m.a = m.d = 0;
                    }
                    Utils.addAnimationEndCallback(floater, fnDispose, 300);
                    floater.style.transform = `matrix(${m.a},${m.b},${m.c},${m.d},${m.x},${m.y}`;

                } else {
                    fnDispose();
                }
            }

            Utils.removeClass(el, PCSS + '-drag-lock');

            // dispose
            this.dispose();

            this._logFn(Logging.LogLevel.Info, 'Dragging act disposed');
        }

        dispose() {
            this._dragDropper.dropTargets.forEach(t => {
                t.removeEventListener('mouseenter', this._enterHandler, false);
                t.removeEventListener('mouseleave', this._leaveHandler, false);
            });
            window.removeEventListener('mouseup', this._endHandler, false);
            window.removeEventListener('touchend', this._endHandler, false);
            window.removeEventListener('mousemove', this._moveHandler, false);
            document.removeEventListener('wheel', this._moveHandler, false);
            window.removeEventListener('touchmove', this._moveHandler, <any>{ passive: false });
        }
    }

    /**
     * Pacem Drag & Drop element adapter.
     */
    @CustomElement({ tagName: P + '-drag-drop' })
    export class PacemDragDropElement extends Pacem.Behaviors.PacemBehavior implements Pacem.UI.DragDropper {

        private _startHandler = (evt: MouseEvent | TouchEvent) => {

            // sudden exit when disabled
            if (this.disabled) {
                return;
            }

            // check the handle selector
            if (!Utils.isNullOrEmpty(this.handleSelector)
                && (<HTMLElement>evt.currentTarget).querySelector(this.handleSelector) !== evt.target) {
                return;
            }

            // fair to go...
            // stop and prevent
            avoidHandler(evt);

            var el = evt.currentTarget,
                origin: Point;

            if (evt instanceof MouseEvent) {
                origin = { x: evt.clientX, y: evt.clientY };
            } else {
                if (evt.touches.length != 1)
                    return;
                origin = { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
            }

            const lockFn = () => {
                let element = <HTMLElement | SVGElement>el;
                let args = UI.DragDropInitEventArgsClass.fromArgs({
                    element: element,
                    placeholder: null,
                    currentPosition: origin,
                    origin: origin,
                    initialDelta: { x: 0, y: 0 },
                    startTime: null,
                    floater: null,
                    data: null
                });
                this.dispatchEvent(new Pacem.UI.DragDropEvent(Pacem.UI.DragDropEventType.Init, args));
                this.log(Logging.LogLevel.Info, 'Drag locked!');
                el.removeEventListener('mouseup', unlockFn, false);
                el.removeEventListener('touchend', unlockFn, false);
                SET_VAL(el, MOUSE_DOWN, origin);
                SET_VAL(el, DELEGATE, new DragElementDelegate({
                    element: element, dragDrop: this, placeholder: args.placeholder, scrollPosition: { x: Utils.scrollLeft, y: Utils.scrollTop }
                }, (level, message, category) => this.log.apply(this, [level, message, category])));
            };
            const unlockFn = (evt?: Event) => {
                this.log(Logging.LogLevel.Info, 'Drag avoided!');
                clearTimeout(toHandle);
            };
            const toHandle = setTimeout(lockFn, this.lockTimeout);
            el.addEventListener('mouseup', unlockFn, false);
            el.addEventListener('touchend', unlockFn, false);
        }

        protected decorate(element: Element) {
            const options: any = { capture: false, passive: true };
            // TODO: add special effects starting the drag process after a while (timeout) the element is pressed. 
            element.addEventListener('mousedown', this._startHandler, false);
            element.addEventListener('touchstart', this._startHandler, options);
        }

        protected undecorate(element: Element) {
            const options: any = { capture: false, passive: true };
            element.removeEventListener('mousedown', this._startHandler, false);
            element.removeEventListener('touchstart', this._startHandler, options);
        }

        addEventListener(type: Pacem.UI.DragDropEventType, listener: (evt: Pacem.UI.DragDropEvent) => void, useCapture?: boolean) {
            super.addEventListener(type, listener, useCapture);
        }

        removeEventListener(type: Pacem.UI.DragDropEventType, listener: (evt: Pacem.UI.DragDropEvent) => void, useCapture?: boolean) {
            super.removeEventListener(type, listener, useCapture);
        }

        dispatchEvent(evt: Pacem.UI.DragDropEvent) {
            if (evt.type === UI.DragDropEventType.End) {
                DEL_VAL(evt.detail.element, MOUSE_DOWN);
                DEL_VAL(evt.detail.element, DELEGATE);
            }
            return super.dispatchEvent(evt);
        }

        /** Gets or sets the amount of milliseconds to wait, while pressing on the draggable object, until the object itself must be considered "locked to drag". */
        @Watch({ emit: false, converter: PropertyConverters.Number }) lockTimeout: number = 100;
        /** Gets or sets the drop targets (array of elements). */
        @Watch({ emit: false }) dropTargets: Element[] = [];
        /** Gets or sets the drag mode ("self", "alias", "copy"). */
        @Watch({ emit: false, converter: PropertyConverters.String }) mode: Pacem.UI.DragDataMode = Pacem.UI.DragDataMode.Self;
        /** Gets or sets the floating element while dragging around. */
        @Watch({ emit: false, converter: PropertyConverters.Element }) floater: Element;
        /** Gets or sets the drop mode ("insert", "nonde"). */
        @Watch({ emit: false, converter: PropertyConverters.String }) dropBehavior: Pacem.UI.DropBehavior;
        /** Gets or sets the handle selector to be matched when starting the drop gesture. */
        @Watch({ emit: false, converter: PropertyConverters.String }) handleSelector: string;

    }
}