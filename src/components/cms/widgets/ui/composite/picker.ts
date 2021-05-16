/// <reference path="../../../scaffolding/types.ts" />
namespace Pacem.Components.Cms {

    /**
     * UI widget container that eases dragdrop-based enrollment into composite widgets.
     */
    @CustomElement({
        tagName: P + '-widget-picker', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-repeater datasource="{{ :host.items }}">
    <template>
        <${P}-panel behaviors="{{ [::_dragDrop] }}" class="${PCSS}-widget-itempicker display-flex flex-fill flex-middle flex-nowrap">
            <i class="${PCSS}-icon flex-auto" dragger>drag_indicator</i>
            <${P}-icon icon="{{ ^item.metadata.display.icon }}" class="flex-auto ${PCSS}-margin margin-x-1"></${P}-icon>
            <${P}-text text="{{ ^item.metadata.display.name }}"></${P}-text>
        </${P}-panel>
    </template>
</${P}-repeater>
<${P}-drag-drop handle-selector="i.${PCSS}-icon[dragger]"></${P}-drag-drop>
<${P}-content></${P}-content>`
    })
    export class PacemWidgetPickerElement extends PacemCompositeWidgetElement {

        register(item: PacemUiWidgetElement): boolean {
            const retval = super.register(item);
            if (retval) {
                item.hide = true;
            }
            return retval;
        }

        @ViewChild(P+'-drag-drop') private _dragDrop: Pacem.Components.PacemDragDropElement;

    }
}