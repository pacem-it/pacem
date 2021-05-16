/// <reference path="types.ts" />
/// <reference path="utils.ts" />
/// <reference path="utils-customelement.ts" />

namespace Pacem {

    const CONTEXT_PREFIX: string = '__context_pacem';

    /** the following pattern matches:
     * -------------------------------
     * ciao "a tutti \"quanti\" voi"                                    -> "a tutti \"quanti\" voi"
     * ciao 'a tutti "quanti" voi'+ mysel.value + 'e a nessun\' altra'  -> 'a tutti "quanti" voi'
     *                                                                     'e a nessun\' altra'
     */
    const stringPattern = /'(\\'|[^'])*[^\\]?'|"(\\"|[^"])*[^\\]?"/g;

    /** the following pattern matches:
     * -------------------------------
     * var l = new Date();  ->  new 
     * window.eval(         -> window.
     * eval(                -> eval(
     * eval  (              -> eval  (
     */
    const safetyPattern = /[^\w]new\s|[^\w]window\s*[\.\[]|[^\w]document\s*\.|[^\w]eval\s*\(/;

    /** the following pattern matches:
     * -------------------------------
     * ^^^item.ciao           -> ^^^item
     * !ciao.value            -> !ciao.
     * :host.value            -> :host.
     * ::child.prop           -> ::child.
     * _connectTo(me.value)   -> (me.
     * 009.ciao               -> 
     * this[that.value]       -> [that.
     */
    const variablePattern = /(^|[\s\(\[\+\-\*\/!])(:host\.|\^+item[\s\.,;\)\]]|\^+item$|\^+index[^\w\.]|\^+index$|\$?this[\.\s$]?|#[a-zA-Z_][\w]*|::[a-zA-Z_][\w]*)/g;

    ///** the following pattern tests:
    // * -------------------------------
    // * __context.$this.myself.value -> true
    // * !__context.myelem.value      -> false
    // * fn(myelem.value)             -> false
    // * $this == that                -> false
    // * ...
    // */
    //const purePropertyPathPattern = /^[\w\.\$]+/; 

    export class Expression {

        private _fnBody: string;
        private _voidBody: string;
        private _pending: boolean = false;
        private _independent: boolean = false;
        private _args: any;
        private _dependencies: PropertyDependency[];
        private _fn: Function;

        get dependencies(): PropertyDependency[] {
            return this._dependencies;
        }

        get functionBody(): string {
            return this._fnBody;
        }

        get voidBody() {
            return this._voidBody;
        }

        get pending(): boolean {
            return this._pending;
        }

        get independent(): boolean {
            return this._independent;
        }

        evaluate(): any {
            if (!this._fn) {
                this._fn = new Function('$pacem', CONTEXT_PREFIX, this._fnBody);
            }
            return this._fn.apply(null, [Utils.core, this._args]);
        }

        evaluateAsync(): PromiseLike<any> {
            const deferred = DeferPromise.defer();
            if (!this._fn) {
                this._fn = new Function('$pacem', CONTEXT_PREFIX, this._fnBody);
            }
            deferred.resolve(this._fn.apply(null, [Utils.core, this._args]));
            return deferred.promise;
        }

        evaluatePlus(args: { [key: string]: any } = {}): any {
            if (!this._fn) {
                let argNames: string[] = [CONTEXT_PREFIX];
                for (var prop in args)
                    argNames.push(prop);
                argNames.push('$pacem');
                this._fn = new Function(argNames.join(', '), this._voidBody);
            }
            let argValues = [].concat(this._args);
            for (var prop in args)
                argValues.push(args[prop]);
            argValues.push(Utils.core);
            return this._fn.apply(null, argValues);
        }

        private static _pendingExpression: Expression = null;
        private static _getPendingExpressionSingleton() {
            if (Expression._pendingExpression == null) {
                let xpr = new Expression();
                xpr._pending = true;
                xpr._dependencies = [];
                Expression._pendingExpression = xpr;
            }
            return Expression._pendingExpression;
        }

        static parse(expression: string, element: HTMLElement): Expression {

            var context = CustomElementUtils.findScopeContext(element);

            var args = { '$this': element };

            var dependencies: PropertyDependency[] = [];
            var expr: string = '';
            var independent = true;

            //1. remove strings
            var strings: { start: number, length: number }[] = [],
                stringMatches: RegExpExecArray,
                index = 0,
                trunks: string[] = [];
            while ((stringMatches = stringPattern.exec(expression)) != null) {
                trunks.push(expression.substr(index, stringMatches.index - index));
                let length = stringMatches[0].length;
                strings.push({ start: stringMatches.index, length: length });
                index = stringMatches.index + length;
            }
            if (index < expression.length)
                trunks.push(expression.substr(index, expression.length - index));

            //2. loop non string trunks
            // trunks.length >= strings.length (more precisely, the following statemente is always `true`:
            // trunks.length === strings.length || trunks.length === strings.length+1;
            for (var j = 0; j < trunks.length; j++) {
                let trunk = trunks[j];
                if (safetyPattern.test(trunk))
                    throw `Unsafe expression detected: "${trunk}".`;

                if (context == null) {
                    // context is null, means viewActivated event still to be fired.
                    // check whether this is a constant expression (then no need to instantiate actual binding listeners)
                    // or not.
                    if (new RegExp(variablePattern).test(trunk) === true) {
                        independent = false;
                        break;
                    }

                } else {

                    let processedTrunk = trunk.replace(variablePattern, (mwhole: string, mstart: string, melem: string, index: number, input: string): string => {

                        independent = false;
                        const cmpRef = `__host_pacem`;

                        // default initialization := assumes `this`
                        let retval = CONTEXT_PREFIX + '.$this' + (melem.endsWith('.') ? '.' : ''),
                            el: Node = element,
                            dotIndex = input.indexOf('.', index),
                            furtherParts = dotIndex > index ? input.substr(dotIndex + 1).trim() : '',
                            pathRegexArray = /^[\w\.\$]+/.exec(furtherParts),
                            path = pathRegexArray && pathRegexArray.length > 0 && pathRegexArray[0],
                            propArray,
                            prop = path && (propArray = path.split('.')).length > 0 && propArray[0]
                            // check whether a method is directly called against the possible dependency (element)
                            // ,isMethodCall = prop === path && (path && path.length > 0 && /^\(/.test(furtherParts.substr(path.length).trim()))
                            ;

                        if (melem === ':host.') {

                            el = args[cmpRef] = args[cmpRef] || CustomElementUtils.findHostContext(element);
                            retval = `${CONTEXT_PREFIX}.${cmpRef}.`;

                        } else if (melem.endsWith('^item') || melem.substr(0, melem.length - 1).endsWith('^item')) {

                            let lastChar = melem.endsWith('^item') ? '' : melem.substr(melem.length - 1, 1);
                            let upLevels = melem.length - (lastChar.length > 0 ? 6 : 5); // 5 = 'item'.length + 1 (zero-based)
                            let itemRef = `__item_${upLevels}_up_pacem`
                            let item: RepeaterItem = Repeater.findItemContext(element, upLevels);
                            el = args[itemRef] = args[itemRef] || (item && item.placeholder);
                            path = 'item' + (path ? ('.' + path) : '');
                            prop = 'item';
                            retval = `${CONTEXT_PREFIX}.${itemRef}.item${lastChar}`;

                        } else if (melem.endsWith('^index') || melem.substr(0, melem.length - 1).endsWith('^index')) {

                            let lastChar = melem.endsWith('^index') ? '' : melem.substr(melem.length - 1, 1);
                            let upLevels = melem.length - (lastChar.length > 0 ? 7 : 6); // 6 = 'index'.length + 1 (zero-based)
                            let itemRef = `__item_${upLevels}_up_pacem`;
                            let item: RepeaterItem = Repeater.findItemContext(element, upLevels);
                            el = args[itemRef] = args[itemRef] || (item && item.placeholder);
                            path = 'index';
                            prop = 'index';
                            retval = `${CONTEXT_PREFIX}.${itemRef}.index${lastChar}`;

                        } else if (melem.startsWith('::')) {

                            let melem0 = melem.substr(2, melem.length - 2);
                            let host = args[cmpRef] = args[cmpRef] || CustomElementUtils.findHostContext(element);
                            if (!Utils.isNull(host)) {
                                el = host[melem0];
                            } else {
                                el = null;
                            }
                            retval = `${CONTEXT_PREFIX}.${cmpRef}.${melem0}`;

                        } else if (melem.startsWith('#')) {

                            let melem0 = melem.substr(1, melem.length - 1);
                            el = args[melem0] = args[melem0] || <HTMLElement>context.querySelector('#' + melem0);
                            retval = `${CONTEXT_PREFIX}.${melem0}`;

                        }

                        // merge dependencies
                        if (prop && el && prop in el
                            // && it is not a direct method call (which means that the 'prop' isn't in fact a 'func')
                            && typeof el[prop] !== 'function' //!isMethodCall 
                            // && does not already exist as a dependency
                            && dependencies.find(d => d.element === el && d.property == prop) == null) {

                            dependencies.push({ element: el, property: prop, path: path, twowayAllowed: false });

                        }

                        // return value
                        return mstart + retval;
                    });

                    expr += processedTrunk;
                    if (j < strings.length) {
                        const s = strings[j];
                        expr += expression.substr(s.start, s.length);
                    }
                }

            }

            if (independent) {
                // constant expression
                var constexpr = new Expression();
                constexpr._independent = true;
                constexpr._fnBody = `return ${expression};`;
                constexpr._voidBody = expression;
                constexpr._dependencies = [];
                return constexpr;
            }

            if (context == null) {
                return this._getPendingExpressionSingleton();
            }

            // if some dependency elements aren't available yet, then postpone...
            for (var elem in args) {
                if (args[elem] == null)
                    return Expression._getPendingExpressionSingleton();
            }

            if (dependencies.length == 1
                // := && trimmed expression contains only letters, figures, underscores, dots, and '$'...
                && /[^\w\.\$]+/.test(expr.trim()) !== true) {
                // ...then 'twoway' binding might be applied/accepted
                dependencies[0].twowayAllowed = true;
            }

            var retexpr = new Expression();
            retexpr._args = args;
            retexpr._fnBody = `try{ var ___$$$r = ${expr}; return ___$$$r; }catch(e){  }`;
            retexpr._voidBody = `try{ ${expr} }catch(e){  }`;
            retexpr._dependencies = dependencies;

            return retexpr;
        }
    }

}