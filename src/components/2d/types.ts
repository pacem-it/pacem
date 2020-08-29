/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Drawing {

    export declare type ViewBoxAlignment = 'min' | 'mid' | 'max';
    export declare type ViewBoxAspectRatio = 'none' | {
        x: ViewBoxAlignment, y: ViewBoxAlignment, slice?: boolean
    }

    export interface Stage extends EventTarget {
        draw(item?: Drawable);
        viewbox: Rect,
        aspectRatio?: ViewBoxAspectRatio,
        readonly transformMatrix: Matrix2D;
        readonly stage: HTMLElement;
    }

    export interface Drawable {
        readonly stage: Stage;
        /** Gets or sets whether the drawable is hit-testable. */
        inert?: boolean;
        hide?: boolean;

        /** @deprecated will be likely removed sooner or later to be handled outside the stage/adapter. */
        draggable?: boolean;
        tag?: string;
    }

    export function isDrawable(object: any): object is Drawable {
        return !Utils.isNull(object) && 'stage' in object;
    }

    export interface UiObject extends Drawable {
        rotate?: number;
        scaleX?: number;
        scaleY?: number;
        translateX?: number;
        translateY?: number;
        opacity?: number;
        readonly transformMatrix?: Matrix2D;
    }

    export function isUiObject(object: any): object is UiObject {
        return /*'transformMatrix' in object &&*/ isDrawable(object);
    }

    export interface Shape extends UiObject {
        pathData: string;
        stroke?: string;
        lineWidth?: number;
        fill?: string;
        dashArray?: number[],
        lineJoin?: CanvasLineJoin,
        lineCap?: CanvasLineCap,
        readonly boundingRect?: Rect;
    }

    export function isShape(object: any): object is Shape {
        return isUiObject(object) && 'pathData' in object;
    }

    export interface Group extends UiObject {
        items: Drawable[];
    }

    export function isGroup(object: any): object is Pacem.Drawing.Group {
        return isUiObject(object) && 'items' in object && !Utils.isNullOrEmpty(object['items']);
    }

    export interface Text extends UiObject {
        text: string;
        fontFamily?: string;
        fontSize?: number;
        color?: string;
        anchor?: Point,
        textAnchor?: 'start' | 'middle' | 'end';
    }

    export function isText(object: any): object is Pacem.Drawing.Text {
        return isUiObject(object) && 'text' in object && typeof object['text'] === 'string';
    }

    export interface Image extends UiObject {
        src: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    }

    export function isImage(object: any): object is Pacem.Drawing.Image {
        return isUiObject(object) && 'src' in object && typeof object['src'] === 'string';
    }

    export interface DragEventArgs {
        readonly offset: Point;
        readonly item: Drawable;
    }

    export abstract class UI2DEvent<T> extends CustomUIEvent<T>{
        constructor(type: string, eventInit: CustomEventInit<T>, originalEvent: MouseEvent | TouchEvent | KeyboardEvent, transformMatrix: Matrix2D) {
            super(type, eventInit, originalEvent);
            this.#transformMatrix = transformMatrix;
        }

        #transformMatrix: Matrix2D;
        /** Gets the screen transform matrix. */
        get transformMatrix() {
            return this.#transformMatrix;
        }

        project(pt: Point = { x: this.screenX, y: this.screenY }) {
            return Matrix2D.multiply(pt, this.#transformMatrix);
        }
    }

    export class DragEvent extends UI2DEvent<DragEventArgs> {
    }

    export class DrawableEvent extends UI2DEvent<Drawable> {

        constructor(type: string, args: Drawable, originalEvent: MouseEvent | TouchEvent | KeyboardEvent, m: Matrix2D
        ) {
            super(type, { detail: args, bubbles: true, cancelable: true }, originalEvent, m);
        }

    }
}

namespace Pacem.Components.Drawing {

    export interface Stage extends Pacem.Drawing.Stage {
        readonly adapter: Pacem2DAdapterElement;
    }

    export const TAG_MIDDLE_NAME = "2d";
    export const TWO_PI = 2 * Math.PI;
    const DEG2RAD = Math.PI / 180.0;

    export abstract class Pacem2DAdapterElement extends PacemEventTarget {

        protected DefaultShapeValues = {
            stroke: "#000",
            lineWidth: 1,
            fill: "#fff"
        };

        /**
         * Returns the transform matrix that projects page coords into stage coords.
         * @param scene {Pacem2DElement} Container for the stage/scene
         */
        abstract getTransformMatrix(scene: Pacem2DElement): Matrix2D;

        /**
         * Updates the stage with the new size.
         * @param scene {Pacem2DElement} Container for the stage/scene
         * @param size {Size} New size
         */
        abstract invalidateSize(scene: Pacem2DElement, size: Size);

        /**
         * Initializes the 2d scene and returns its corresponding DOM element.
         * @param scene {Pacem2DElement} Container for the stage/scene
         */
        abstract initialize(scene: Pacem2DElement): HTMLElement | SVGElement;

        /**
         * Disposes the 2d scene resources.
         * @param scene {Pacem2DElement} Container for the stage/scene
         */
        abstract dispose(scene: Pacem2DElement): void;

        /**
         * Returns the foremost drawable element under the pointer.
         * @param scene {Pacem2DElement} Container for the stage/scene
         */
        abstract getHitTarget(scene: Pacem2DElement): Pacem.Drawing.Drawable;

        /**
         * Draws the elements of provided the scene.
         * @param scene {Pacem2DElement} Container for the stage/scene
         * @param item {Drawable} If provided, tries to limit the drawing execution to the drawable itself
         * @param forceGroupRedraw {Boolean} In case the item is a group, it forces the redraw of its content
         */
        abstract draw(scene: Pacem2DElement, item?: Pacem.Drawing.Drawable, forceGroupRedraw?: boolean);

        /**
         * Processes the stage content and returns an image accordingly.
         * */
        abstract snapshot(stage: Pacem2DElement): PromiseLike<Blob>;
    }

    export abstract class DrawableElement extends PacemCrossItemsContainerElement<DrawableElement> implements Pacem.Drawing.Drawable {

        validate(_: DrawableElement): boolean {
            // by default no children allowed (Group will except)
            return false;
        }

        protected findContainer() {
            // override
            return this.parent || this.stage;
        }

        get stage(): Pacem2DElement {
            return this['_scene'] = this['_scene'] || CustomElementUtils.findAncestorOfType(this, Pacem2DElement);
        }

        get parent(): DrawableElement {
            return this['_drawableParent'] = this['_drawableParent'] || CustomElementUtils.findAncestor(this, i => i instanceof DrawableElement);
        }

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) tag: string;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) inert: boolean;

        disconnectedCallback() {
            delete this['_scene'];
            delete this['_drawableParent'];
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'hide':
                case 'items':
                    const scene = this.stage;
                    if (!Utils.isNull(scene)) {
                        name === 'hide' ? scene.draw(this) : scene.requestDraw(this, true);
                    }
                    break;
            }
        }

    }

    export abstract class UiElement extends DrawableElement implements Pacem.Drawing.UiObject {
        @Watch({ emit: false, converter: PropertyConverters.Number }) rotate: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) scaleX: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) scaleY: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) translateX: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) translateY: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) opacity: number;

        private _transformMatrix = Pacem.Matrix2D.identity;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            if (!first) {
                switch (name) {
                    case 'rotate':
                    case 'scaleX':
                    case 'scaleY':
                    case 'translateX':
                    case 'translateY':
                        this._updateTransformMatrix();
                    // flow down
                    case 'opacity':
                        if (!Utils.isNull(this.stage)) {
                            this.stage.draw(this);
                        }
                        break;
                }
            }
        }

        private _updateTransformMatrix() {
            let rotation = DEG2RAD * (this.rotate || 0),
                cos = Math.cos(rotation),
                sin = Math.sin(rotation),
                a = this.scaleX * cos,
                b = -sin,
                c = sin,
                d = this.scaleY * cos,
                e = this.translateX,
                f = this.translateY;
            this._transformMatrix = { a: a, b: b, c: c, d: d, e: e, f: f };
        }

        /** @internal */
        get transformMatrix() {
            const m = this._transformMatrix;
            return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f };
        }
    }

    export abstract class ShapeElement extends UiElement implements Pacem.Drawing.Shape {

        @Watch({ emit: false, converter: PropertyConverters.String }) protected data: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) stroke: string;
        @Watch({ emit: false, converter: PropertyConverters.Number }) lineWidth: number;
        @Watch({ emit: false, converter: PropertyConverters.String }) fill: string;
        @Watch({
            emit: false, converter: {
                convert: (attr) => attr?.split(',').map(i => parseInt(i)).filter(i => !Number.isNaN(i)),
                convertBack: (prop) => prop?.join(',')
            }
        }) dashArray?: number[];
        @Watch({ emit: false, converter: PropertyConverters.String }) lineJoin?: CanvasLineJoin;
        @Watch({ emit: false, converter: PropertyConverters.String }) lineCap?: CanvasLineCap;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            if (!first) {
                switch (name) {
                    case 'data':
                    case 'stroke':
                    case 'lineWidth':
                    case 'fill':
                        if (!Utils.isNull(this.stage)) {
                            this.stage.draw(this);
                        }
                        break;
                }
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.data = this.getPathData();
        }

        get pathData(): string {
            return this.data;
        }

        protected abstract getPathData(): string;

        abstract get boundingRect(): Rect;

    }

    export declare type StageOptions = {
        panControl: boolean,
        zoomControl: boolean,
        panModifiers: EventKeyModifier[],
        zoomModifiers: EventKeyModifier[]
    };
}