/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Drawing {

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-group' })
    export class PacemGroupElement extends DrawableElement implements Pacem.Drawing.Group {

        validate(item: DrawableElement): boolean {
            return item instanceof DrawableElement && item.parent === this;
        }

    }

}