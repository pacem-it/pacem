/// <reference path="material.ts" />
/// <reference path="../types.ts" />
namespace Pacem.Components.Drawing3D {

    @CustomElement({ tagName: `${P}-${TAG_MIDDLE_NAME}-material-basic` })
    export class BasicMaterialElement extends MaterialElement {

        constructor() {
            super(Pacem.Drawing3D.KnownShader.Basic);
        }

    }

}