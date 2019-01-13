namespace Pacem.RegularExpressions {

    export declare type RegexMatchSegment = { value: string, match: boolean, index: number };

    export const EMPTY_MATCHER = /a^/;
    
    export class Regex {

        /**
         * Splits an input string into segments based on a matching pattern.
         * @param input Input string
         * @param pattern RegExp pattern
         */
        static split(input: string, pattern: RegExp) {
            var matches: RegExpExecArray,
                index = 0,
                trunks: RegexMatchSegment[] = [];
            while ((matches = pattern.exec(input)) != null) {
                trunks.push({ value: input.substr(index, matches.index - index), match: false, index: index });
                let length = matches[0].length;
                trunks.push({ value: input.substr(matches.index, length), match: true, index: matches.index });
                index = matches.index + length;
            }
            if (index < input.length)
                trunks.push({ value: input.substr(index, input.length - index), match: false, index: index });
            return trunks;
        }
        
    }

}