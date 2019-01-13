/// <reference path="../../index.d.ts" />

namespace Pacem.Components.Js {

    @CustomElement({
        tagName: 'pacemjs-descriptor', shadow: false,
        template: `<pacem-repeater>
    <template>
        <pacem-if match="{{ ^index == 0 }}" class="clearfix">
            
            <div class="pull-right"><pacem-checkbox value="{{ :host.showInherited, twoway }}" class="checkbox-toggle"
                                    true-value="true"
                                    false-value="false"></pacem-checkbox> <small>inherited</small></div>
            <h2><pacem-text text="{{ ^item.type }}"></pacem-text></h2>
            
        </pacem-if>
        <pacem-if match="{{ ^index != 0 }}">
            <h4><pacem-text text="{{ ^item.type }}"></pacem-text></h4>
        </pacem-if>
        <pacem-repeater datasource="{{ pacem.filter( ^item.properties, i => i.own || :host.showInherited ) }}">
            <ul>
                <template>
                    <li class="property"><pacem-span css-class="{{ {'small': !^item.own} }}" text="{{ ^item.name }}"></pacem-span> <pacem-span class="small" hide="{{ ^item.own }}">(inherited)</pacem-span></li>
                </template>
            </ul>
        </pacem-repeater>

        <pacem-repeater datasource="{{ ^item.methods }}">
            <ul>
                <template>
                    <li class="method"><pacem-text text="{{ ^item.name }}"></pacem-text></li>
                </template>
            </ul>
        </pacem-repeater>

    </template>
</pacem-repeater>`
    })
    export class PacemCustomElementDescriptorElement extends PacemElement {

        @Watch({ converter: Pacem.PropertyConverters.Element }) target: HTMLElement;
        @Watch({ converter: Pacem.PropertyConverters.Boolean }) showInherited: boolean;

        @ViewChild("pacem-repeater") private _repeater: PacemRepeaterElement;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'target' || name === 'showInherited')
                this._render();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._render();
        }

        private _render(t = this.target) {
            if (!t || !this._repeater)
                return;
            var datasource = [];
            const type = t.constructor;
            const typeName = type.name;
            let superClass: Function = type;
            let j = 0;
            do {
                var obj: {
                    type: string, methods: { name: string }[],
                    properties: { name: string, own: boolean }[]
                } = {
                    type: superClass.name, properties: [], methods: []
                };
                const attrs: string[] = superClass['observedAttributes'];
                // properties
                if (attrs) {
                    for (var attr of attrs) {
                        if (attr.charAt(0) === '_')
                            // omit private properties...
                            continue;
                        let prop = CustomElementUtils.kebabToCamel(attr);
                        obj.properties.push({ name: prop, own: superClass.prototype.hasOwnProperty(prop) });
                    }
                }
                obj.properties.sort((i, j) => i.name > j.name ? 1 : -1);
                // methods
                if (j === 0) {
                    for (let member of Object.getOwnPropertyNames(Object.getPrototypeOf(t))) {
                        let method = t[member];
                        if (!(method instanceof Function) || member === 'constructor' || member.charAt(0) === '_' || member.endsWith('Callback')) continue;
                        let methodSignature:string = method.toString();
                        methodSignature = methodSignature.substring(0, methodSignature.indexOf('{')).trim();
                        obj.methods.push({ name: methodSignature });
                    }
                    obj.methods.sort((i, j) => i.name > j.name ? 1 : -1);
                }
                datasource.push(obj);
            } while (!Utils.isNull(superClass = Object.getPrototypeOf(superClass)) && superClass != HTMLElement && 10 > j++);
            this._repeater.datasource = datasource;
        }

    }
}