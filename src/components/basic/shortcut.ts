/// <reference path="../../core/types.ts" />
/// <reference path="../../core/eventtarget.ts" />
namespace Pacem.Components {

    const KEYEVT = "keydown";

    type KeyComboMatch = boolean | 'ongoing';

    function matchesKeyCombination(evt: KeyboardEvent, combo: string, accumulator: string[] = []): KeyComboMatch {
        if (Utils.isNullOrEmpty(combo)) {
            return false;
        }

        const modifierPattern = /(\w+)\s*\+/;
        const modifiers: string[] = [];
        let regExc: RegExpExecArray;
        while (!Utils.isNullOrEmpty(regExc = modifierPattern.exec(combo))) {
            combo = combo.substr(regExc.index + regExc[0].length);
            modifiers.push(regExc[1]);
        }

        if (!CustomEventUtils.matchModifiers(evt, modifiers)) {
            return false;
        }

        const pieces = combo.split(',').map(p => p.trim().toLowerCase());
        if (Utils.isNullOrEmpty(pieces)) {
            // bad combination format
            return false;
        }

        var char = evt.key.toLowerCase();

        if (charEquals(char, pieces[accumulator.length])) {
            accumulator.push(char);
            return accumulator.length == pieces.length ? true : "ongoing";
        }

        return false;
    }

    function charEquals(key: string, piece: string) {
        return key === piece
            // adjust some aliases
            || (key === "escape" && piece === "esc")
            || (key === "backspace" && piece === "back")
            || (key === "control" && piece === "ctrl")
            || (key === "delete" && (piece === "del" || piece === "canc"))
            || (/^arrow/.test(key) && (piece === key.substr(5)))
            ;
    }

    export const KeyboardShortcutExecuteEventName = "execute";

    @CustomElement({ tagName: P + '-shortcut' })
    export class PacemShortcutElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.String }) combination: string;
        @Watch({ emit: false, converter: PropertyConverters.Element }) target: EventTarget;

        viewActivatedCallback() {
            super.connectedCallback();
            this._addHandler();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'target' && !first) {
                this._removeHandler(old);
                this._addHandler(val);
            }
        }

        disconnectedCallback() {
            this._removeHandler();
            super.disconnectedCallback();
        }

        private _removeHandler(target: EventTarget = this.target) {
            (target || window).removeEventListener(KEYEVT, this._shortcutHandler, false);
        }

        private _addHandler(target: EventTarget = this.target) {
            (target || window).addEventListener(KEYEVT, this._shortcutHandler, false);
        }

        private _accumulator: string[] = [];
        private _shortcutHandler = (evt: KeyboardEvent) => {

            const result = (matchesKeyCombination(evt, this.combination, this._accumulator));

            switch (result) {
                case true:
                    avoidHandler(evt);
                    this.dispatchEvent(new Event(KeyboardShortcutExecuteEventName, { bubbles: false, cancelable: false }));
                // let flow below...
                case false:
                    this._accumulator.splice(0);
                    break;
            }
        }
    };

}