/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const tests = [{

        name: 'JSON vs Function', test: function () {

            it('Parsing JSON', function () {

                expect(JSON.parse('2')).toEqual(2);
                expect(JSON.parse('"foo"')).toEqual('foo');
                expect(JSON.parse("{ \"foo\" : \"baz\"}").foo).toEqual("baz");

            });

            const that_id: string = 'myinp';

            it('Evaluating expression', function () {

                var inp = document.createElement('input');
                inp.setAttribute('type', 'hidden');
                inp.setAttribute('value', 'foo');
                inp.setAttribute('id', that_id);
                document.body.appendChild(inp);

                var inp2 = document.createElement('input');
                inp2.setAttribute('type', 'hidden');
                inp2.setAttribute('value', 'foo');
                document.body.appendChild(inp2);

                let cmd = 'return "foo" === this.value';
                let cmd2 = `return ${that_id}.value === this.value`;
                let fn = new Function(cmd);
                let fn1 = new Function('that', `return ${that_id}.value === that.value`);
                let fn2 = new Function(that_id, cmd2);
                let fn3 = new Function(cmd2);

                expect(fn.apply(inp2)).toEqual(true);
                expect(fn1.apply(window, [inp2])).toEqual(true);
                expect(fn2.apply(inp2, [inp])).toEqual(true);
                expect(fn3.apply(inp2)).toEqual(true);
            });

            it('Evaluating in private context (ShadowRoot)', function () {
                var div = document.createElement('div');
                document.body.appendChild(div);
                var root = div.attachShadow({ mode: 'open' });
                var inp = document.createElement('input');
                inp.setAttribute('type', 'hidden');
                inp.setAttribute('value', 'bar');
                inp.setAttribute('id', that_id);
                root.appendChild(inp);

                var inp2 = document.createElement('input');
                inp2.setAttribute('type', 'hidden');
                inp2.setAttribute('value', 'bar');
                root.appendChild(inp2);

                let cmd0 = `return ${that_id}.value`;
                let cmd = `return ${that_id}.value === this.value`;
                let fn0 = new Function(cmd0);
                // 'myinp' gets resolved onto root dom's `myinp` (see test above)
                // not onto the shadow root one!
                expect(fn0.apply(inp2)).not.toEqual('bar');
                let fn = new Function(cmd);
                expect(fn.apply(inp2)).toEqual(false);
            });
        }
    },
    {
        name: 'Base JavaScript', test: function () {

            it('Context scope', function () {
                var div = document.createElement('div');
                div.setAttribute('id', 'foo');
                var parent = document.createElement('div');
                document.body.appendChild(parent);
                parent.appendChild(div);

                expect(window['foo']).toBe(div);

                var div2 = document.createElement('div');
                div2.setAttribute('id', 'foo-second');
                parent.appendChild(div2);

                expect(window['fooSecond']).toBeUndefined();
                expect(window['foo-second']).toBe(div2);
            });

            it('OwnerDocument vs ShadowRoot', function () {
                var div = document.createElement('div');
                div.setAttribute('id', 'bar');
                document.body.appendChild(div);

                expect(div.ownerDocument).toBe(document);
                expect(div.shadowRoot).toBeNull();
                expect(window['bar']).toBe(div);

                var root = div.attachShadow({ mode: 'open' });

                var div2 = document.createElement('div');
                div2.setAttribute('id', 'baz');
                root.appendChild(div2);

                expect(window['baz']).not.toBe(div2);
                expect(div2.ownerDocument).toBe(document);

                expect(document.getElementById('baz')).not.toBe(div2);

                expect(div.shadowRoot.querySelector('#baz')).toBe(div2);
            })

            it('TreeWalker vs templates', function () {

                var template = document.createElement('template');
                template.innerHTML = '<img />';
                var walker = document.createTreeWalker(template.content, NodeFilter.SHOW_DOCUMENT_FRAGMENT + NodeFilter.SHOW_ELEMENT);
                var flag = false;
                while (walker.nextNode()) {
                    if (walker.currentNode['localName'] === 'img')
                        flag = true;
                }
                expect(flag).toBeTruthy();
            })

            it('MutationObserver on comments', function (done) {
                var json = { foo: 'bar' };
                var comment = document.createComment(JSON.stringify(json));
                document.body.appendChild(comment);
                var callback: MutationCallback = (records: MutationRecord[], instance: MutationObserver) => {
                    records.forEach(mutation => {
                        let cmt = <Comment>mutation.target;
                        let data = JSON.parse(cmt.data);
                        instance.disconnect();
                        expect(data.foo).toEqual('baz');
                        done();
                    });
                };
                var observer = new MutationObserver(callback);
                observer.observe(comment, { characterData: true });
                comment.data = JSON.stringify(json);
                json.foo = 'baz';
                comment.data = JSON.stringify(json);
            })
        }
    },

    {

        name: 'Base ES6', test: function () {

            it('CustomEvent instantiation', function () {

                var evt = new CustomEvent('foo', { detail: 'baz' });
                expect(evt.detail).toEqual('baz');

            });

            it('CustomElement instantiation', function (done) {

                class MyCustomElement extends HTMLElement {
                    constructor() {
                        super();
                    }

                    myProp: string = 'hello';

                    connectedCallback(): void {
                        expect(this.myProp).toEqual('hello');
                        done();
                    }
                }

                window['customElements'].define('foo-baz', MyCustomElement);
                document.body.appendChild(document.createElement('foo-baz'));

            });
        }
    },
    {
        name: 'Utils', test: function () {

            it('Cookie parsing', function () {
                const cookie = "_ga=GA1.2.679931875.1534678768; _gid=GA1.2.2024408861.1534678768; _gat_gtag_UA_9595229_8=1";
                const cookie2 = "_ga=GA1.2.679931875.1534678768; _gid=GA1.2.2024408861.1534678768; .pacem.cookieconsent=ARRAffinity%2C.pacem.auth%2CGoogleAnalytics%2C.pacem.culture";

                const cookies = Pacem.Utils.cookies(cookie),
                    cookies2 = Pacem.Utils.cookies(cookie2);

                expect(cookies['_gat_gtag_UA_9595229_8']).toEqual('1');

                const commaSeparated = cookies2['.pacem.cookieconsent'].split(',');
                expect(commaSeparated.length).toEqual(4);
                expect(commaSeparated.indexOf('GoogleAnalytics')).toEqual(2);
            });

            it('JSON stringification equality', function () {
                var obj1 = { a: 1, b: 2 },
                    obj2 = { b: 2, a: 1 };
                expect(JSON.stringify(obj1)).not.toEqual(JSON.stringify(obj2));
                expect(JSON.stringify(obj1, Object.keys(obj1).sort())).toEqual(JSON.stringify(obj2, Object.keys(obj2).sort()));
            });

            it('Strange innerHTML behavior', function () {
                var obj = document.createElement('div');
                obj.setAttribute('hidden', '');
                document.body.appendChild(obj);
                const html = `<form id="frm__RFzKYbi" class="p-form" pacem novalidate>
<p-repeater class="p-animatable-list p-list-bottom" datasource="{{ #_RFzKYbi.metadata && (#_RFzKYbi.metadata.props || #_RFzKYbi.metadata) }}">  
<p-panel css="{{ #_RFzKYbi.metadata.css }}" css-class="{{ #_RFzKYbi.metadata.cssClass }}">      
<template>            
<p-form-field css-class="{{ ^item.display && ^item.display.cssClass }}" css="{{ ^item.display && ^item.display.css }}" 
logger="{{ #_RFzKYbi.logger }}" entity="{{ #_RFzKYbi.entity, twoway }}" metadata="{{ ^item }}" readonly="{{ #_RFzKYbi.readonly }}"></p-form-field>
</template>
</p-panel>
</p-repeater>
<p-fetch logger="{{ #_RFzKYbi.logger }}" id="fetch_RFzKYbi" method="POST"></p-fetch>
<p-button logger="{{ #_RFzKYbi.logger }}" on-click="#_RFzKYbi._submit(#fetch_RFzKYbi, $event)" type="submit" hide="{{ #_RFzKYbi.readonly || Pacem.Utils.isNullOrEmpty(#_RFzKYbi.action) }}" class="button primary" disabled="{{ !(#_RFzKYbi.valid && #_RFzKYbi.dirty) || #fetch_RFzKYbi.fetching }}">Ok</p-button>
<p-button logger="{{ #_RFzKYbi.logger }}" on-click="#_RFzKYbi._reset($event)" type="reset" class="button" hide="{{ #_RFzKYbi.readonly || !#_RFzKYbi.dirty }}" disabled="{{ #fetch_RFzKYbi.fetching }}">Reset</p-button>
</form>`;
                obj.innerHTML = html;
                expect(document.getElementById('frm__RFzKYbi')).not.toBeNull();
            });
        }
    },
    {
        name: 'CustomElements', test: function () {

            it('Lifecycle', function (done) {

                let ticker = 0;

                @Pacem.CustomElement({ tagName: 'pacem-element' })
                class MyElement extends HTMLElement implements Pacem.OnConnected, Pacem.OnAttributeChanged, Pacem.OnAdopted {

                    constructor() {
                        super();
                    }

                    static get observedAttributes(): string[] {
                        return ['foo', 'data-pacem-foo'];
                    }

                    connectedCallback() {
                        console.log('connected', arguments);
                        ticker++;
                        expect(ticker).toEqual(2);
                        //this.setAttribute('foo', 'baz');
                        this.dataset['pacemFoo'] = JSON.stringify('baz');
                    }

                    adoptedCallback() {
                        console.log('adopted', arguments);
                        ticker++;
                        expect(ticker).toEqual(3);
                    }

                    attributeChangedCallback() {
                        console.log('attribute changed', arguments);
                        ticker++;
                        if (ticker > 1)
                            done();
                        else
                            expect(ticker).toEqual(1);
                    }

                    prop: string = '';
                }

                var instance = document.createElement('pacem-element');
                instance.setAttribute('foo', 'bar');
                document.body.appendChild(instance);

            });

            it('Inheritance', function (done) {

                abstract class MyBaseElement extends HTMLElement {

                    constructor() {
                        super();
                    }

                    connectedCallback() {
                        done();
                    }

                    @Pacem.Watch({ emit: false, converter: Pacem.PropertyConverters.String })
                    prop: string;
                }

                @Pacem.CustomElement({ tagName: 'my-super-element' })
                class MySubElement extends MyBaseElement {

                    constructor() {
                        super();
                    }
                }

                //var supa = document.createElement('my-super-element');
                expect(MySubElement['observedAttributes']).not.toBeUndefined();
                expect(MySubElement['observedAttributes'].length).toEqual(1);
                expect(MySubElement['observedAttributes'][0]).toEqual('prop');

                const el = document.createElement('my-super-element');
                document.body.appendChild(el);
            });

            it('PacemEventTarget inheritance', function (done) {

                @Pacem.CustomElement({ tagName: 'my-evttarget' })
                class MyEventTargetElement extends Pacem.Components.PacemEventTarget {

                    @Watch({ converter: Pacem.PropertyConverters.Number }) ticker: number;

                    connectedCallback() {
                        super.connectedCallback();
                        this.ticker = 0;
                    }

                    viewActivatedCallback() {
                        super.viewActivatedCallback();
                        expect(this.ticker).toEqual(0);
                        this.ticker++;
                    }

                    propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
                        super.propertyChangedCallback(name, old, val, first);
                        console.log('propertyChanged', arguments);
                        if (this.ticker === 1)
                            done();
                    }
                }

                const el = document.createElement('my-evttarget');
                el.setAttribute('ticker', '2');
                document.body.appendChild(el);

            });

            it('PacemEventTarget load event', function (done) {

                var ticker = 0;
                const el = <Pacem.Components.PacemEventTarget>document.querySelector('pacem-data#declared');
                if (!el)
                    throw `Need to write a <pacem-data id="declared"> element on the test page.`;
                const fnDone = function (evt?) {
                    expect(++ticker).toBeTruthy();
                    done();
                }
                if (el.isReady)
                    fnDone();
                else
                    el.addEventListener('load', fnDone, false);

            });

            it('PacemText plain attribute', function (done) {

                var instance = <Pacem.Components.PacemTextElement>document.createElement('pacem-text');
                document.body.appendChild(instance);
                var txt = 'lorem-ipsum';
                instance.setAttribute('text', txt);
                setTimeout(function () {
                    expect(instance.textContent).toEqual(txt);
                    done();
                }, 10);
            });

            it('PacemSpan custom element', function (done) {

                var instance = <Pacem.Components.PacemSpanElement>document.createElement('pacem-span');
                var instance2 = <Pacem.Components.PacemSpanElement>document.createElement('pacem-span');
                var instance3 = <Pacem.Components.PacemSpanElement>document.createElement('pacem-span');
                instance.setAttribute('id', 'myspan');

                // current "limitation": set attributes AFTER dom insertion!
                instance2.setAttribute('text', '{{ #myspan.text }}');
                instance3.setAttribute('content', '{{ #myspan.text }}');
                //

                document.body.appendChild(instance);
                document.body.appendChild(instance2);
                document.body.appendChild(instance3);

                const text = '<span id="nesty">nesty!</span>';
                instance.text = text;
                setTimeout(function () {
                    expect(instance.textContent).toEqual(instance2.textContent, 'wrong here!');
                    expect(instance.textContent).toEqual(text);
                    expect(instance3.children.length).toEqual(1);
                    expect(instance3.querySelector('#nesty').tagName).toEqual('SPAN');
                    done();
                }, 10);
            });

            it('PacemButton load event', function (done) {

                var ticker = 0;
                const el = document.createElement('pacem-button');
                el.textContent = 'click me!';
                const fnDone = function (evt) {
                    expect(++ticker).toBeTruthy();
                    done()
                }
                el.addEventListener('load', fnDone, false);
                document.body.appendChild(el);

            });
        }
    },

    {
        name: 'Expressions', test: function () {

            it('Parsing attributes', function () {

                var div = document.createElement('div');

                var expr1 = `{{ 'foo' }}`;
                var parsed1 = CustomElementUtils.parseBindingAttribute(expr1, div).evaluate();
                expect(typeof parsed1).toEqual('string');

                var expr2 = `{{ 0 }}`;
                var parsed2 = CustomElementUtils.parseBindingAttribute(expr2, div).evaluate();
                expect(typeof parsed2).toEqual('number');

                var expr3 = `{{ { baz: 'bar' } }}`;
                var parsed3 = CustomElementUtils.parseBindingAttribute(expr3, div).evaluate();
                expect(typeof parsed3).toEqual('object');
                expect(parsed3.baz).toEqual('bar');

            });

            it('Parsing {{ ... }}', function () {

                let id = '_' + Utils.uniqueCode();

                var div = document.createElement('div');
                div.setAttribute('id', id);
                div['prop'] = 'foo';
                document.body.appendChild(div);

                //{ binding this[^myel.prop] == 'ciao' && this['myprop'] == 'bye'}
                var expr = `{{ #${id}.prop == 'foo' }}`;

                var parsed = CustomElementUtils.parseBindingAttribute(expr, div);

                expect(parsed.dependencies).not.toBeNull();
                expect(parsed.dependencies.length).toEqual(1);
                expect(parsed.dependencies[0].mode).not.toEqual('twoway');

            });

            it('Dodgy method recognition', function () {

                let id = '_' + Utils.uniqueCode();

                var div = document.createElement('div');
                div.setAttribute('id', id);
                div['prop'] = 'foo';
                document.body.appendChild(div);

                //{ binding this[^myel.prop] == 'ciao' && this['myprop'] == 'bye'}
                var expr = `{{ #${id}.prop.toString() }}`;

                var parsed = CustomElementUtils.parseBindingAttribute(expr, div);

                expect(parsed.dependencies).not.toBeNull();
                expect(parsed.dependencies.length).toEqual(1);
                expect(parsed.dependencies[0].twowayAllowed).toBeFalsy();

            });

            it('Repeater item twoway', function (done) {

                let id = '_' + Utils.uniqueCode();

                var div = document.createElement('div');
                div.setAttribute('id', id);
                div.innerHTML = `<pacem-repeater datasource="['apples','apricots','bananas']">
    <template>
        <pacem-text text="{{ ^item.split('').join('-') }}"></text>
    </template>
</pacem-repeater>`;
                document.body.appendChild(div);
                var repeater = div.firstElementChild;
                repeater.addEventListener(Pacem.Components.RepeaterItemCreateEventName, (evt: Pacem.Components.RepeaterItemCreateEvent) => {
                    var txt = <Pacem.Components.PacemTextElement>evt.detail.dom[0];
                    var parsed = CustomElementUtils.parseBindingAttribute(txt.getAttribute('text'), txt);

                    expect(parsed.dependencies).not.toBeNull();
                    expect(parsed.dependencies.length).toEqual(1);
                    expect(parsed.dependencies[0].twowayAllowed).toBeFalsy();
                    switch (evt.detail.index) {
                        case 0:
                            expect(parsed.evaluate()).toEqual('a-p-p-l-e-s');
                            break;
                        case 1:
                            expect(parsed.evaluate()).toEqual('a-p-r-i-c-o-t-s');
                            break;
                        case 2:
                            expect(parsed.evaluate()).toEqual('b-a-n-a-n-a-s');
                            done();
                            break;
                    }

                }, false);

            });

            it('Parsing (complex string concatenation)', function () {

                let binding = "{{ this.datasource.length + ' color' + (this.datasource.length == 1 ? '' : 's') }}";
                var div = document.createElement('div');
                div['datasource'] = ['a', 'b', 'c'];
                document.body.appendChild(div);

                var expression = CustomElementUtils.parseBindingAttribute(binding, div);

                expect(expression instanceof Expression).toBeTruthy();
            });

            it('Binding in action', function (done) {

                let ticker: number = 0;
                let flag: boolean = false;

                @Pacem.CustomElement({ tagName: 'pacem-element2' })
                class MyElement2 extends HTMLElement implements Pacem.OnPropertyChanged, Pacem.OnAttributeChanged, Pacem.OnConnected {

                    constructor() {
                        super();
                    }

                    connectedCallback(): void {
                        console.log('connected', arguments);
                        this.setAttribute('my-prop', 'bye');
                    }

                    attributeChangedCallback(name?: string, old?: string, val?: string): void {
                        console.log('attribute changed', arguments);
                        if (name === 'my-prop')
                            expect(ticker % 2).toEqual(0);
                        else if (name === 'my-other-prop')
                            expect(ticker % 2).toEqual(1);
                        ticker++;
                    }

                    propertyChangedCallback(name?: string, old?: any, val?: any): void {
                        console.log('property changed', arguments);

                        if (name === 'myOtherProp') {
                            if (val === 'hello')
                                flag = true;
                            expect(val).toEqual(this.myProp);
                            if (val === 'bye') {
                                expect(flag).toBeFalsy();
                                done();
                            }
                        }
                    }

                    @Pacem.Watch({ converter: Pacem.PropertyConverters.String })
                    myProp: string = 'hello';

                    @Pacem.Watch({ converter: Pacem.PropertyConverters.String })
                    myOtherProp: string;
                }

                var instance = <MyElement2>document.createElement('pacem-element2');
                document.body.appendChild(instance);
                instance.setAttribute('my-other-prop', '{{ this.myProp }}');

            });

        }
    }];

}