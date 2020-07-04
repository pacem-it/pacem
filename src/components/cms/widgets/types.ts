namespace Pacem.Components.Cms {

    const DEFAULT_PERMISSION_METADATA: Pacem.Scaffolding.TypeMetadata = {
        props: [
            {
                prop: 'permissions',
                // child form-fields
                type: 'array',
                display: { name: 'Permissions' },
                props: {
                    display: { cssClass: [PCSS + '-cell', PCSS + '-grid', 'grid-novgap', 'grid-tiny-colgap', 'grid-nospace'], name: 'Permission' },
                    props: Array.prototype.concat.apply([
                        {
                            prop: 'claimType', type: 'string',
                            display: { cssClass: [PCSS + '-cell', 'cols-hd-4', 'cols-lg-6', 'field-stretch', 'field-minimal'], name: 'Claim type' },
                            validators: [{ type: 'required', errorMessage: '!' }]
                        },
                        {
                            prop: 'claimValue', type: 'string',
                            display: { cssClass: [PCSS + '-cell', 'cols-hd-4', 'cols-lg-6', 'field-stretch', 'field-minimal'], name: 'Claim value' },
                            validators: [{ type: 'required', errorMessage: '!' }]
                        },
                    ], ['read', 'update', 'create', 'delete'].map((p, j) => {
                        return {
                            prop: p,
                            type: 'boolean',
                            display: { cssClass: [PCSS + '-cell', 'cols-hd-1', 'cols-3', 'field-minimal', PCSS + '-pad pad-left-2'], name: p.charAt(0).toUpperCase() + p.substr(1) }
                        };
                    }))
                }
            }
        ]
    };

    export const DEFAULT_METADATA: Pacem.Scaffolding.TypeMetadata = {
        display: { name: 'Widget', cssClass: [PCSS + '-grid', 'grid-novgap', 'grid-tiny-colgap', 'grid-nospace'] },
        props: [
            { prop: 'tag', type: 'string', display: { name: 'Tag', cssClass: [PCSS + '-cell'] } }
        ]
    };

    function cellifyMetadata(p: Pacem.Scaffolding.PropertyMetadata) {
        // ensure pacem-cell cssClass
        p.display = p.display || { name: p.prop, cssClass: [] };
        const css = p.display.cssClass = p.display.cssClass || [];
        css.push(PCSS + '-cell');
    }

    export function gridifyMetadata(metadata?: Pacem.Scaffolding.TypeMetadata): Pacem.Scaffolding.TypeMetadata {
        var props = metadata && metadata.props || [];
        var display = metadata && metadata.display || { name: 'Element' };
        if (!Utils.isNull(display)) {
            const css = display.cssClass = display.cssClass || [];
            Array.prototype.push.apply(css, DEFAULT_METADATA.display.cssClass);
        }
        props.forEach(cellifyMetadata);
        return { display: display, props: props };
    }

    export function buildWidgetMetadata(metadata?: Pacem.Scaffolding.TypeMetadata): Pacem.Scaffolding.TypeMetadata {
        var display: Pacem.Scaffolding.DisplayMetadata = Utils.extend({}, DEFAULT_METADATA.display, metadata && metadata.display || {});

        var props: Pacem.Scaffolding.PropertyMetadata[] = Utils.clone(DEFAULT_METADATA.props);
        Array.prototype.push.apply(props, (metadata && metadata.props || []).filter(p => {

            if (p.prop === 'tag') {
                return false;
            }

            cellifyMetadata(p);

            return true;
        }));
        return { display: display, props: props };
    }

    const WIDGET_CSS_CLASS = PCSS + '-widget';

    /** Default metadata ('expression' field) 'extra' object. */
    export const EXPRESSION_WIDGET_METADATA_EXTRA = {
        selector: '.' + WIDGET_CSS_CLASS,
        labeler: (e: Widget) => {
            if (!Utils.isNullOrEmpty(e.tag)) {
                return e.tag;
            }
            return (e.metadata && e.metadata.display && e.metadata.display.name || '') + '#' + e.id;
        }
    };

    export interface Widget extends Pacem.Cms.Permissible {
        metadata: Pacem.Scaffolding.TypeMetadata;
        permissionMetadata: Pacem.Scaffolding.TypeMetadata;
        /** Gets or sets whether the widget is currently in editing mode. */
        editing: boolean;
        /** Gets or sets whether thet widget might be edited or not. */
        editable: boolean;
        tag: string;
        readonly id: string;
    }

    export class Widget {

        /**
         * Utility method for widget gathering.
         * @param predicate Predicate for filtering
         */
        static findAll(predicate?: (w: PacemWidgetElement) => boolean): PacemWidgetElement[] {
            return CustomElementUtils.findAll<PacemWidgetElement>('.' + WIDGET_CSS_CLASS, (widget) => widget instanceof PacemWidgetElement && !Utils.isNullOrEmpty(widget.id) && (Utils.isNull(predicate) || predicate(widget)));
        }

    }

    @CustomElement({
        tagName: P + '-widget-toolbar', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-span class="toolbar-text" content="{{ '<i class=&quot;${PCSS}-icon&quot;>'+ (::target.metadata && ::target.metadata.display && ::target.metadata.display.icon || 'widgets') +'</i> '+ (::target.tag || (::target.metadata && ::target.metadata.display && ::target.metadata.display.name || ::target.localName) +'#'+ ::target.id) }}"></${P}-span>
<div class="buttons ${PCSS}-buttonset ${PCSS}-pad ${PCSS}-margin pad-0 margin-left-2">
    <div class="buttonset-left">
        <${P}-button edit class="button edit" on-click=":host._edit($event)"></${P}-button>
        <${P}-button permissions class="button" on-click=":host._editPermissions($event)" css-class="{{ {'button-success': ::target.permissions.length > 0} }}" icon-glyph="verified_user"></${P}-button>
        <${P}-button remove class="button button-danger delete"></${P}-button>
    </div>
<div>
<${P}-shell-proxy>
    <${P}-modal-form autogenerate="true" core></${P}-modal-form>
    <${P}-modal-form autogenerate="true" permissions></${P}-modal-form>
</${P}-shell-proxy>`
    })
    export class PacemWidgetToolbarElement extends PacemElement {

        @Watch({ emit: false, converter: PropertyConverters.Element }) target: PacemWidgetElement;

        @ViewChild('.buttons > div') private _toolbar: HTMLElement;
        @ViewChild(P + '-button[edit]') private _btnEdit: Pacem.Components.UI.PacemButtonElement;
        @ViewChild(P + '-button[permissions]') private _btnPerms: Pacem.Components.UI.PacemButtonElement;
        @ViewChild(P + '-button[remove]') private _btnRemove: Pacem.Components.UI.PacemButtonElement;

        @ViewChild(P + '-shell-proxy') private _proxy: Pacem.Components.PacemTransferProxyElement;

        /** Gets the toolbar's edit button. */
        get editButton() {
            return this._btnEdit;
        }

        /** Gets the toolbar's permimssions button. */
        get permissionsButton() {
            return this._btnPerms;
        }

        /** Gets the toolbar's remove button. */
        get removeButton() {
            return this._btnRemove;
        }

        private _edit(evt: Event) {
            const form = <Pacem.Components.Plus.PacemModalFormElement>this._proxy.dom.find(e => 'core' in e.attributes);
            form.open(this.target)/*.then(_ => {
                // reset metadata (this will force complete recycle next time)
                // form.metadata = [];
            })*/;
            form.metadata = this.target.metadata;
            // popout
            this._popoutJustInCase();
        }

        private _editPermissions(evt: Event) {
            const form = <Pacem.Components.Plus.PacemModalFormElement>this._proxy.dom.find(e => 'permissions' in e.attributes);
            form.open(this.target);
            form.metadata = this.target.permissionMetadata;
            // popout
            this._popoutJustInCase();
        }

        private _popoutJustInCase() {
            const balloon = CustomElementUtils.findAncestorOfType(this, Pacem.Components.UI.PacemBalloonElement);
            if (!Utils.isNullOrEmpty(balloon)) {
                balloon.popout();
            }
        }

    }

    export abstract class PacemWidgetElement extends PacemElement implements Widget {

        constructor(metadata: Pacem.Scaffolding.TypeMetadata, role = 'widget') {
            super(role);
            this.metadata = metadata;
        }

        connectedCallback() {
            super.connectedCallback();
            // ensure an explicit id for each widget
            if (Utils.isNullOrEmpty(this.id)) {
                this.id = 'wdg' + Utils.uniqueCode();
            }
            Utils.addClass(this, WIDGET_CSS_CLASS);
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'editable':
                    if (!val) {
                        this._disposeBalloon();
                    } else if (this.isReady) {
                        this._ensureBalloon();
                    }
                    break;
                case 'editing':
                    if (!Utils.isNull(this._balloon)) {
                        this._balloon.disabled = !val;
                    }
                    (val ? Utils.addClass : Utils.removeClass).apply(this, [this, 'widget-' + name]);
                    break;
                case 'metadata':
                    this._assignIcon(val);
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._assignIcon();
            this._ensureBalloon();
        }

        disconnectedCallback() {
            super.disconnectedCallback();
        }

        private _assignIcon(val = this.metadata) {
            this.dataset['icon'] = (val && val.display && val.display.icon) || 'widgets';
        }

        // #region TAG Balloon

        private _balloon: Pacem.Components.UI.PacemBalloonElement;

        private _ensureBalloon() {
            if (Utils.isNull(this._balloon)) {
                const balloon = this._balloon = document.createElement(P + '-balloon') as Pacem.Components.UI.PacemBalloonElement;
                balloon.target = this;
                balloon.disabled = !this.editing;
                balloon.options = {
                    behavior: UI.BalloonBehavior.Menu,
                    trigger: UI.BalloonTrigger.Hover
                };

                // innerHTML before appending the balloon to the DOM.
                balloon.innerHTML = `<${P}-widget-toolbar target="{{ #${this.id} }}"><${P}-widget-toolbar>`;

                // append to trigger connected/viewActivated callbacks
                CustomElementUtils.findAncestorShell(this).appendChild(balloon);
            }
        }

        private _disposeBalloon() {
            if (!Utils.isNull(this._balloon)) {
                this._balloon.remove();
                this._balloon = null;
            }
        }

        // #endregion TAG Balloon

        /** Gets or sets whether the widget is currently in editing mode. */
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) editing: boolean;

        @Watch({ emit: false, converter: PropertyConverters.Boolean }) editable: boolean;

        @Watch({ emit: true, reflectBack: true, converter: PropertyConverters.String }) tag: string;

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Json }) permissions: Pacem.Cms.Permission[];

        @Watch({ emit: false, converter: PropertyConverters.Json }) metadata: Pacem.Scaffolding.TypeMetadata;

        @Watch({ emit: false, converter: PropertyConverters.Json }) permissionMetadata: Pacem.Scaffolding.TypeMetadata = DEFAULT_PERMISSION_METADATA;


    }

}