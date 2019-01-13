namespace Pacem.Components {

    export class RepeaterUtils {

        /**
         * Seeks for a PacemRepeaterItem element upwards through the DOM tree, given a starting element and the number of nesting levels.
         * @param element {HTMLElement} Element to start the upward search from
         * @param Optional upLevels {Number} 0-based nesting level
         */
        static findItemContext(element: Element, upLevels: number = 0, logFn: (message?: string) => void = console.warn): Components.RepeaterItem {
            let retval = RepeaterItem.findUpwards(element, upLevels, logFn);
            if (retval == null && logFn && element instanceof HTMLElement && element['isConnected'])
                logFn(`Couldn't find a ${RepeaterItem.name} up ${upLevels} level${((upLevels === 1) ? "" : "s")} from element "${element.constructor.name}".`);
            return retval;
        }

    }
}