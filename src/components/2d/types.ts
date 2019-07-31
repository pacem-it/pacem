/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.Drawing {

    export declare type DrawablesEventArgs = {
        element: Drawable
    };

    export class DrawableElementEvent extends CustomEvent<DrawablesEventArgs> {

        constructor(type: string, args: DrawablesEventArgs) {
            super(type, { detail: args, bubbles: true, cancelable: true });
        }
    }

    export interface Stage {
        readonly adapter: Pacem2DAdapterElement;
        readonly stage: HTMLElement;
    }

    export const TAG_MIDDLE_NAME = "2d";
    export const TWO_PI = 2 * Math.PI;
    const DEG2RAD = Math.PI / 180.0;

    export abstract class Pacem2DAdapterElement extends PacemEventTarget {

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
        abstract getHitTarget(scene: Pacem2DElement): Drawable;

        /**
         * Draws the elements of provided the scene.
         * @param scene {Pacem2DElement} Container for the stage/scene
         */
        abstract draw(scene: Pacem2DElement);

    }

    export interface Drawable {
        readonly scene: Pacem2DElement;
    }

    export abstract class DrawableElement extends PacemCrossItemsContainerElement<DrawableElement> implements Drawable {

        get scene(): Pacem2DElement {
            return this['_scene'] = this['_scene'] || CustomElementUtils.findAncestorOfType(this, Pacem2DElement);
        }

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) tag: string;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            // don't register to the scene if you're not a DIRECT child
            if (Utils.isNull(this.container)) {
                const scene = this.scene;
                scene && scene.register(this);
            }
        }

        disconnectedCallback() {
            super.viewActivatedCallback();
            if (Utils.isNull(this.container)) {
                const scene = this.scene;
                scene && scene.unregister(this);
            }
        }

    }

    export abstract class ShapeElement extends DrawableElement {

        @Watch({ emit: false, converter: PropertyConverters.String }) protected data: string;
        @Watch({ converter: PropertyConverters.String }) stroke: string = '#000';
        @Watch({ converter: PropertyConverters.Number }) lineWidth: number = 1;
        @Watch({ converter: PropertyConverters.String }) fill: string = '#fff';
        @Watch({ converter: PropertyConverters.Number }) rotate: number = 0;
        @Watch({ converter: PropertyConverters.Number }) scaleX: number = 1;
        @Watch({ converter: PropertyConverters.Number }) scaleY: number = 1;
        @Watch({ converter: PropertyConverters.Number }) translateX: number = 0;
        @Watch({ converter: PropertyConverters.Number }) translateY: number = 0;

        validate(_: DrawableElement) {
            // shapes do not allow child drawables
            return false;
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            switch (name) {
                case 'data':
                case 'stroke':
                case 'lineWidth':
                case 'fill':
                case 'rotate':
                case 'scaleX':
                case 'scaleY':
                case 'translateX':
                case 'translateY':
                    if (!Utils.isNull(this.scene)) {
                        this.scene.draw();
                    }
                    break;
            }
        }

        getPathData(): string {
            return this.data;
        }

        abstract getBoundingRect(): Rect;

    }

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-path' })
    export class PacemPathElement extends ShapeElement {

        @Watch({ converter: PropertyConverters.String }) d: string;
        @Watch({ converter: PropertyConverters.Json }) boundingRect: Rect;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'd') {
                this._updateData();
            }
        }

        private _updateData() {
            this.data = this.d;
        }

        getBoundingRect(): Rect {
            return this.boundingRect || {x: 0, y: 0, width: 0, height: 0};
        }

    }

}