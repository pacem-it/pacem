namespace Pacem.UI {

    export enum DragDataMode {
        /** Source element is dragged around (floater is the element itself so is the data). */
        Self = 'self',
        /** The floater is an element clone, while data is the element itself.  */
        Alias = 'alias',
        /** The floater is a clone of the element, while data is a copy of it. */
        Copy = 'copy'
    }

    export enum DropBehavior {
        /** Drag & drop task is meant to sort or swap items around. */
        InsertChild = 'insert',
        /** Drag & drop task has no logical meaning. Event listeners might be in charge for a specific scenario.  */
        None = 'none'
    }

    export enum DropTargetMissedBehavior {
        Revert = 'revert',
        Remove = 'remove',
        None = 'none'
    }

    export enum DragDropEventType {
        /** Initial state change before first dragging act. */
        Init = 'draginit',
        /** First dragging act. */
        Start = 'dragstart', // 'dragstart' might conflict with HTML Drag & Drop API event (and so the others)
        /** Any dragging act. */
        Drag = 'drag',
        /** Dropping act. */
        Drop = 'drop',
        /** Hovering a drop target. */
        Over = 'dragover',
        /** Exiting a drop target. */
        Out = 'dragout',
        /** Terminating the drag-drop activities. */
        End = 'dragend'
    }

    abstract class DragDropEventArgsBaseClass {

        protected constructor(private _builder: DragDropEventArgs) {
            this.currentPosition = _builder.currentPosition;
            this.target = _builder.target;
        }


        get element() {
            return this._builder.element;
        }

        abstract readonly placeholder: HTMLElement | SVGElement;

        get origin() {
            return this._builder.origin;
        }

        get initialDelta() {
            return this._builder.initialDelta;
        }

        get startTime() {
            return this._builder.startTime;
        }

        get data() {
            return this._builder.data;
        }

        get floater() {
            return this._builder.floater;
        }

        target: Element;
        currentPosition: Point;

        get delta() {
            var args = this;
            return Geom.add(
                args.initialDelta, /* included in `initialDelta` for perf sake => { x: this._builder.scroll.left, y: this._builder.scroll.top },*/
                Geom.subtract(args.origin, args.currentPosition)
            );
        }
    }

    export class DragDropInitEventArgsClass extends DragDropEventArgsBaseClass {

        private constructor(_builder: DragDropEventArgs) {
            super(_builder);
            this.placeholder = _builder.placeholder;
        }

        placeholder: HTMLElement | SVGElement;

        static fromArgs(builder: DragDropEventArgs) {
            return new DragDropInitEventArgsClass(Utils.extend({}, builder));
        }
    }

    export class DragDropEventArgsClass extends DragDropEventArgsBaseClass {
        private constructor(_builder: DragDropEventArgs, private _placeholder = _builder.placeholder) {
            super(_builder);
        }

        get placeholder() {
            return this._placeholder;
        }

        static fromArgs(builder: DragDropEventArgs) {
            return new DragDropEventArgsClass(Utils.extend({}, builder));
        }
    }

    export declare type DragDropEventArgs = {
        element: HTMLElement | SVGElement,
        placeholder: HTMLElement | SVGElement,
        origin: Point,
        currentPosition: Point,
        initialDelta: Point,
        startTime: number,
        data: any,
        floater: Element,
        target?: Element
    };

    export class DragDropEvent extends CustomTypedEvent<DragDropEventArgsClass | DragDropInitEventArgsClass> {

        constructor(type: DragDropEventType, args: DragDropEventArgsClass | DragDropInitEventArgsClass, eventInit?: EventInit) {
            super(type, args, eventInit);
        }

    }

    /**
    * Interface to be implemented in order to create a proper drag & drop adapter.
    */
    export interface DragDropper {

        addEventListener(evt: DragDropEventType, listener: (evt: DragDropEvent) => void, useCapture?: boolean): void;
        removeEventListener(evt: DragDropEventType, listener: (evt: DragDropEvent) => void, useCapture?: boolean): void;
        dispatchEvent(evt: DragDropEvent): boolean;

        /**
        * Enumerates the possible drop targets valid for all the registered draggable elements.
        */
        dropTargets: Element[];

        /**
        * Gets or sets the type of data dragged around (common to all the registered draggable elements).
        */
        mode: DragDataMode;

        /**
        * Element to be used as a dragging placeholder. If not null, will override the floater obtained via the `mode` property.
        */
        floater: Element;

        dropBehavior: DropBehavior;
    }

}