namespace Pacem.Components.Drawing {

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-svg-adapter' })
    export class PacemSvgAdapterElement extends Pacem2DAdapterElement {

        invalidateSize(scene: Pacem2DElement, size: Size) {
            const scenes = this._scenes;
            if (!Utils.isNull(scene) && !Utils.isNullOrEmpty(size)) {

                if (scenes.has(scene)) {

                    var svg = scenes.get(scene);
                    svg.setAttribute('width', size.width + '');
                    svg.setAttribute('height', size.height + '');

                    this.draw(scene);
                }
            }
        }

        initialize(scene: Pacem2DElement): HTMLElement | SVGElement {
            throw new Error("Method not implemented.");
        }

        dispose(scene: Pacem2DElement): void {
            throw new Error("Method not implemented.");
        }

        getHitTarget(scene: Pacem2DElement): Drawable {
            throw new Error("Method not implemented.");
        }

        draw(scene: Pacem2DElement) {
            throw new Error("Method not implemented.");
        }

        private _scenes = new WeakMap<Pacem2DElement, SVGSVGElement>();

    }

}