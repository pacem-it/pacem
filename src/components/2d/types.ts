/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Drawing {

    export interface Matrix2D  {
        readonly a: number;
        readonly b: number;
        readonly c: number;
        readonly d: number;
        readonly e: number;
        readonly f: number;
    }

    export class Matrix2D {
        static isIdentity(m: Matrix2D) {
            return m.a === 1 && m.d === 1 && m.b === 0 && m.f === 0 && m.c === 0 && m.e === 0;
        }
    }

    export declare type ViewBoxAlignment = 'min' | 'mid' | 'max';
    export declare type ViewBoxAspectRatio = 'none' | {
        x: ViewBoxAlignment, y: ViewBoxAlignment, slice?: boolean
    }

    export interface Stage extends EventTarget {
        draw(item?: Drawable);
        viewbox: Rect,
        aspectRatio?: ViewBoxAspectRatio, 
        readonly stage: HTMLElement;
    }

    export interface Drawable {
        readonly stage: Stage;
        /** Gets or sets whether the drawable is hit-testable. */
        inert?: boolean;
        hide?: boolean;
        draggable?: boolean;
    }

    export function isDrawable(object: any): object is Drawable {
        return 'stage' in object;
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
        readonly boundingRect?: Rect;
    }

    export function isShape(object: any): object is Shape {
        return 'pathData' in object
            && isUiObject(object);
    }

    export interface DragEventArgs {
        readonly offset: Point;
        readonly item: Drawable;
    }

    export class DragEvent extends CustomEvent<DragEventArgs> implements DragEvent {}

    export class Event extends CustomEvent<Drawable>{}
}

namespace Pacem.Components.Drawing {

    const Identity: Pacem.Drawing.Matrix2D = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

    export class DrawableElementEvent extends CustomEvent<Pacem.Drawing.Drawable> {

        constructor(type: string, args: Pacem.Drawing.Drawable) {
            super(type, { detail: args, bubbles: true, cancelable: true });
        }
    }

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
         */
        abstract draw(scene: Pacem2DElement, item?: Pacem.Drawing.Drawable);

    }

    export abstract class DrawableElement extends PacemCrossItemsContainerElement<DrawableElement> implements Pacem.Drawing.Drawable {

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
                        name === 'hide'? scene.draw(this) : scene.requestDraw();
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

        private _transformMatrix: Pacem.Drawing.Matrix2D = Identity;

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

        validate(_: DrawableElement) {
            // shapes do not allow child drawables
            return false;
        }

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

}