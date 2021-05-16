namespace Pacem.Compile.Markdown {

    // #region HELPERS

    function htmlEncode(input: string): string {
        return (input ?? '').replace(/</g, '&lt;');
    }

    function extractReference(input: string): string {
        if (NullChecker.isNullOrEmpty(input)) {
            return void 0;
        }
        if (/^\(/.test(input) && /\)$/.test(input)) {
            return void 0;
        }
        if (/^\[/.test(input) && /\]$/.test(input)) {
            input = input.substr(1, input.length - 2);
        }
        return input;
    }

    function regexMatchIndex(arr: RegExpExecArray): number {
        return arr?.index || void 0;
    }

    function extractUrl(input: string): string {
        if (NullChecker.isNullOrEmpty(input)) {
            return void 0;
        }
        if (/^\[/.test(input) && /\]$/.test(input)) {
            return void 0;
        }
        if (/^\(/.test(input) && /\)$/.test(input)) {
            input = input.substr(1, input.length - 2);
        }
        return input;
    }

    function normalizeReference(input: string): string {
        return input?.replace(/[^\w]+/g, ' ').trim().replace(/ +/g, '-').toLowerCase();
    }

    function match(input: string, pattern: RegExp, fn: (arr: RegExpExecArray) => Token[]): Token[] {
        const arr = pattern.exec(input);
        if (arr && arr.length) {
            return fn(arr);
        }
        return null;
    }

    // #endregion

    const COMMENT = /(<!--)([\s\S]*?)(-->|$)/;

    const HR = /^ {0,3}(={3,}|_{3,}|-{3,})(\r?\n|$)/;
    const HEADING = /^ {0,3}(#{1,6})\s+([^\n]+)(\r?\n|$)+/;
    const HEADING1 = /^ {0,3}([^\n]+)(\r?\n=+(\r?\n|$))+/;
    const HEADING2 = /^ {0,3}([^\n]+)(\r?\n-+(\r?\n|$))+/;
    const CODEBLOCK = /^ {4,}.+(\r?\n {4,}.+)*(\r?\n|$)+/;
    const FENCES = /^ {0,3}``` *([^\n]*)\r?\n(([\s\S](?!\r?\n {0,3}```))*.(\r?\n)+) {0,3}```(\r?\n|$)+/;
    const BLOCKQUOTE = /^ {0,3}> *([^\n]+)(\r?\n {0,3}> *([^\n]*))*(\r?\n|$)+/;

    const ULIST = /^( {0,3}([-+]).*\r?\n|$)((?!(?: {0,3}(?:\d+[.\)]|\r?\n\S))).*(\r?\n|$))*/;
    const OLIST = /^( {0,3}(\d+[.\)]).*\r?\n|$)((?!(?: {0,3}(?:[+-]|\r?\n\S))).*(\r?\n|$))*/;
    const LISTITEM = /^(?:[-+*]|\d+[.\)])/m;

    const PARAGRAPH = /^(?! {4,})(.+(\n(?! {0,3}```)(?! {0,3}([-+]|\d+[.\)]))(?! {4,})(?! {0,3}>).+)*)/;
    const REF = /^ {0,3}(!?)\[([^\]]+)\]: +(\S+)(?: +['"\(](.+)['"\)])?(\r?\n|$)+/;

    const IMAGE_OR_LINK = /!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?(\[[^\[\]]*\]|\([^\(\)]*\))?/;
    const CODE = /(?:(?<!\\)`)(.+?)(?:(?<!\\)`)/;
    const EMPHASIZE = /(\*\*?|__?)((?!\1\s?)(?:(?!\1)[\S\s])*[^\s])\1/
    const STRIKE = /(~~?|__?)(?!\1\s?)([^\s][\s\S]*?(?!\1)[^\s])\1/
    const QUOTE = /(:")(?!":\s?)([^\s][\s\S]*?(?!":)[^\s])":/
    const SPACE = /^\s+/;
    const LINEBREAK = / {2,}\r?\n/;
    const TEXT = /^[^\r\n]+/;

    enum MARKDOWN_TYPES {
        Html = 'html',
        Text = 'text',
        Paragraph = 'paragraph',
        BlockQuote = 'blockquote',
        Space = 'space',
        Heading = 'heading',
        Bold = 'bold',
        Italic = 'italic',
        CodeBlock = 'codeblock',
        Code = 'code',
        Image = 'img',
        ImageLike = 'imglike',
        Link = 'link',
        LinkLike = 'linklike',
        LineBreak = 'br',
        StrikeThrough = 'strike',
        Quote = 'quote',
        HorizontalRule = 'hr',
        OrderedList = 'ol',
        UnorderedList = 'ul',
        ListItem = 'listitem',
        Reference = 'ref'
    }

    enum MARKDOWN_RULES {
        Comment = 0,

        Reference = 1,
        HorizontalRule = 2,
        Heading = 3,
        Heading1 = 4,
        Heading2 = 5,
        CodeBlock = 6,
        Fences = 7,
        BlockQuote = 8,
        OrderedList = 9,
        UnorderedList = 10,
        Paragraph = 11,

        ImageOrLink = 12,
        Emphasize = 13,
        StrikeThrough = 14,
        Quote = 15,
        Code = 16,
        LineBreak = 17,

        // lowest priority
        Text = 254,
        Space = 255
    }

    export declare type ExtraRule = (Rule | { rule: Rule, type: 'block' | 'inline' } | { rule: Rule, type: 'code', lang: string });

    function getGrammar(extra: ExtraRule[] = []): Rule[] {
        const inert: { [key: number]: Rule } = {

            // comment
            [MARKDOWN_RULES.Comment]: {
                exec: (input: string, lexer: Lexer) => match(input, COMMENT, arr => {
                    const index = regexMatchIndex(arr);
                    const output = [{
                        type: MARKDOWN_TYPES.Html, index, raw: arr[0], text: arr[2]
                    }];
                    if (index > 0) {
                        const left = input.substr(0, index),
                            tokens = lexer.tokenize(left, blockRules);
                        Array.prototype.unshift.apply(output, tokens);
                    }
                    return output;
                })
            },
            // reference
            [MARKDOWN_RULES.Reference]: {
                exec: (input: string) => match(input, REF, arr => {
                    const index = regexMatchIndex(arr),
                        raw = arr[0],
                        text = raw,
                        image = arr[1] === '!',
                        id = arr[2],
                        url = arr[3],
                        title = arr[4];
                    return [{
                        type: MARKDOWN_TYPES.Reference, index, raw, text, id, image, url, title
                    }];
                })
            },
        };

        const blockExtra: Rule[] = [],
            inlineExtra: Rule[] = [],
            codeExtra: { [lang: string]: Rule[] } = {};
        for (let r of extra) {
            let rule: Rule, type = 'inline';
            if ('type' in r) {
                type = r.type;
                rule = r.rule;
            } else {
                rule = r;
            }
            switch (type) {
                case 'block':
                    blockExtra.push(rule);
                    break;
                case 'code':
                    if ('lang' in r) {
                        const key = r.lang.toLowerCase();
                        (codeExtra[key] = codeExtra[key] || []).push(rule);
                    }
                    break;
                default:
                    const inlineRule: Rule = {
                        exec: (input, lexer) => {
                            const output = rule.exec(input, lexer);
                            inPlaceInlineExec(input, output, lexer);
                            return output;
                        }
                    };
                    inlineExtra.push(inlineRule);
                    break;
            }
        }

        // #region INLINE

        const inlinelowpriority: { [key: number]: Rule } = {

            // text
            [MARKDOWN_RULES.Text]: {
                exec: (input) => match(input, TEXT, arr => {
                    const raw = arr[0], text = raw;
                    return [{
                        index: regexMatchIndex(arr), raw, text, type: MARKDOWN_TYPES.Text
                    }]
                })
            },
            // sparse lines
            [MARKDOWN_RULES.Space]: {
                exec: (input: string) => match(input, SPACE, arr => {
                    const raw = arr[0];
                    return [{
                        type: MARKDOWN_TYPES.Space, raw, text: raw
                    }];
                })
            }

        }

        const inline: { [key: string]: Rule } = {

            // link/image
            [MARKDOWN_RULES.ImageOrLink]: {
                exec: (input: string, lexer) => inlineMatch(input, IMAGE_OR_LINK, lexer, arr => {

                    const index = regexMatchIndex(arr),
                        raw = arr[0],
                        image = raw.charAt(0) === '!',
                        text = arr[1],
                        url = extractUrl(arr[2]),
                        ref = normalizeReference(extractReference(arr[2]) ?? text)
                        ;

                    if (image) {

                        return [{
                            index, type: url ? MARKDOWN_TYPES.Image : MARKDOWN_TYPES.ImageLike,
                            raw, text, src: url, ref,
                            tokens: lexer.tokenize(text, inlineRules)
                        }];

                    } else {

                        return [{
                            index, type: url ? MARKDOWN_TYPES.Link : MARKDOWN_TYPES.LinkLike,
                            raw, text, href: url, ref,
                            tokens: lexer.tokenize(text, inlineRules)
                        }];
                    }
                })
            },

            // code
            [MARKDOWN_RULES.Code]: {
                exec: (input: string, lexer: Lexer) => inlineMatch(input, CODE, lexer, arr => {

                    const text = htmlEncode(arr[1]);
                    return [{
                        type: MARKDOWN_TYPES.Code, raw: arr[0], text, index: regexMatchIndex(arr)
                    }]

                })
            },

            // italic/bold
            [MARKDOWN_RULES.Emphasize]: {
                exec: (input: string, lexer: Lexer) => inlineMatch(input, EMPHASIZE, lexer, arr => {

                    if (arr.length < 3 || NullChecker.isNullOrEmpty(arr[2])) {
                        return null;
                    }

                    const type = arr[1].length > 1 ? MARKDOWN_TYPES.Bold : MARKDOWN_TYPES.Italic,
                        text = arr[2];
                    return [{
                        index: regexMatchIndex(arr),
                        type, raw: arr[0], text, tokens: lexer.tokenize(text, inlineRules)
                    }]
                })
            },

            // strike
            [MARKDOWN_RULES.StrikeThrough]: {
                exec: (input: string, lexer: Lexer) => inlineMatch(input, STRIKE, lexer, arr => {

                    if (arr.length < 3 || NullChecker.isNullOrEmpty(arr[2])) {
                        return null;
                    }

                    const type = MARKDOWN_TYPES.StrikeThrough,
                        text = arr[2];
                    return [{
                        index: regexMatchIndex(arr),
                        type, raw: arr[0], text, tokens: lexer.tokenize(text, inlineRules)
                    }]
                })
            },

            // quote
            [MARKDOWN_RULES.Quote]: {
                exec: (input: string, lexer: Lexer) => inlineMatch(input, QUOTE, lexer, arr => {

                    if (arr.length < 3 || NullChecker.isNullOrEmpty(arr[2])) {
                        return null;
                    }

                    const type = MARKDOWN_TYPES.Quote,
                        text = arr[2];
                    return [{
                        index: regexMatchIndex(arr),
                        type, raw: arr[0], text, tokens: lexer.tokenize(text, inlineRules)
                    }]
                })
            },

            // line break
            [MARKDOWN_RULES.LineBreak]: {
                exec: (input, lexer) => inlineMatch(input, LINEBREAK, lexer, arr => {
                    const raw = arr[0], text = raw;
                    return [{
                        index: regexMatchIndex(arr), raw, text, type: MARKDOWN_TYPES.LineBreak
                    }]
                })
            },
        };

        const inPlaceInlineExec = (input: string, output: Token[], lexer: Lexer): void => {
            const index = output?.length > 0 && output[0].index;
            if (index > 0) {
                const left = input.substr(0, index);
                const tokens = lexer.tokenize(left, inlineRules) || [];
                Array.prototype.unshift.apply(output, tokens);
            }
        }

        const inlineMatch = (input: string, pattern: RegExp, lexer: Lexer, fn: (arr: RegExpExecArray) => Token[]): Token[] => {
            const output = match(input, pattern, arr => {
                if (pattern != CODE) {
                    // prioritize code
                    const codeCheck = CODE.exec(input);
                    if (codeCheck
                        && codeCheck.length
                        && codeCheck.index < arr.index
                        // && (codeCheck.index + codeCheck[0].length) > arr.index
                    )
                    {
                        return null;
                    }
                }
                return fn(arr);
            });
            inPlaceInlineExec(input, output, lexer);
            return output;
        }

        const inlineRules = Object.values(inline);
        Array.prototype.push.apply(inlineRules, inlineExtra);
        inlineRules.push(inlinelowpriority[MARKDOWN_RULES.Text], inlinelowpriority[MARKDOWN_RULES.Space]);

        // #endregion

        // #region CODE

        const getLangGrammar = (lang: string): Rule[] => {
            const retval = [inlinelowpriority[MARKDOWN_RULES.Text], inlinelowpriority[MARKDOWN_RULES.Space]];
            const key = lang?.toLowerCase() || '';
            if (key && key in codeExtra) {
                Array.prototype.unshift.apply(retval, codeExtra[key]);
            }
            return retval;
        }

        // #endregion

        // #region BLOCK

        const lowpriority: { [key: number]: Rule } = {

            // paragraph
            [MARKDOWN_RULES.Paragraph]: {
                exec: (input: string, lexer: Lexer) => match(input, PARAGRAPH, arr => {
                    const raw = arr[0],
                        text = raw;
                    return [{
                        type: MARKDOWN_TYPES.Paragraph, raw, text,

                        // recursion (inline rules only)
                        tokens: lexer.tokenize(text, inlineRules)
                    }]
                })
            },
            // sparse lines
            [MARKDOWN_RULES.Space]: inlinelowpriority[MARKDOWN_RULES.Space]

        }

        const tokenizeListItem = (text: string, lexer: Lexer): Token[] => {
            const grammar = !/^ {0,3}(`{3,}|$|>|[+-]\s|\d+[.\)])/m.test(text) ? inlineRules : blockRules;
            return lexer.tokenize(text, grammar);
        }

        const block: { [key: number]: Rule } = {

            // hr
            [MARKDOWN_RULES.HorizontalRule]: {
                exec: (input: string, lexer: Lexer) => match(input, HR, arr => {
                    const raw = arr[0], text = raw;
                    return [{
                        type: MARKDOWN_TYPES.HorizontalRule, raw, text
                    }];
                })
            },

            // headings
            [MARKDOWN_RULES.Heading]: {
                exec: (input: string, lexer: Lexer) => match(input, HEADING, arr => {
                    const text = arr[2];
                    return [{
                        type: MARKDOWN_TYPES.Heading, raw: arr[0], text, level: arr[1].length, ref: normalizeReference(text),
                        tokens: lexer.tokenize(text, inlineRules)
                    }];
                })
            },
            [MARKDOWN_RULES.Heading1]: {
                exec: (input: string, lexer) => match(input, HEADING1, arr => {
                    const text = arr[1];
                    return [{
                        type: MARKDOWN_TYPES.Heading, raw: arr[0], text, level: 1, ref: normalizeReference(text),
                        tokens: lexer.tokenize(text, inlineRules)
                    }]
                })
            },
            [MARKDOWN_RULES.Heading2]: {
                exec: (input: string, lexer) => match(input, HEADING2, arr => {
                    const text = arr[1];
                    return [{
                        type: MARKDOWN_TYPES.Heading, raw: arr[0], text, level: 2, ref: normalizeReference(text),
                        tokens: lexer.tokenize(text, inlineRules)
                    }]
                })
            },

            // codeblock
            [MARKDOWN_RULES.CodeBlock]: {
                exec: (input: string, lexer: Lexer) => match(input, CODEBLOCK, arr => {

                    const raw = arr[0], text = htmlEncode(raw);
                    return [{
                        type: MARKDOWN_TYPES.CodeBlock, raw, text,
                        tokens: lexer.tokenize(text, [])
                    }]
                })
            },

            // codeblock
            [MARKDOWN_RULES.Fences]: {
                exec: (input: string, lexer: Lexer) => match(input, FENCES, arr => {

                    const text = htmlEncode(arr[2]),
                        lang = arr[1]?.toLowerCase();
                    return [{
                        type: MARKDOWN_TYPES.CodeBlock, raw: arr[0], text, lang,
                        tokens: lexer.tokenize(text, getLangGrammar(lang))
                    }]
                })
            },

            // blockquote
            [MARKDOWN_RULES.BlockQuote]: {
                exec: (input: string, lexer: Lexer) => match(input, BLOCKQUOTE, arr => {
                    const raw = arr[0], text = raw.replace(/^ {0,3}> */gm, '');
                    return [{
                        type: MARKDOWN_TYPES.BlockQuote, raw, text,

                        // recursion
                        tokens: lexer.tokenize(text, [
                            lowpriority[MARKDOWN_RULES.Paragraph],
                            lowpriority[MARKDOWN_RULES.Space]
                        ])
                    }]
                })
            },

            // lists
            [MARKDOWN_RULES.OrderedList]: {
                exec: (input: string, lexer: Lexer) => match(input, OLIST, arr => {

                    const raw = arr[0], items = raw.replace(/^ {0,3}/gm, '').split(LISTITEM).filter(i => !NullChecker.isNullOrEmpty(i)).map(i => i.trim());
                    return [{
                        type: MARKDOWN_TYPES.OrderedList, start: parseInt(/\d/.exec(arr[0])[0]), raw, text: raw, tokens: items.map(i => {
                            // avoid paragraphs if not strictly needed
                            return {
                                type: MARKDOWN_TYPES.ListItem, raw: i, text: i, tokens: tokenizeListItem(i, lexer)
                            }
                        })
                    }];
                })
            },
            [MARKDOWN_RULES.UnorderedList]: {
                exec: (input: string, lexer: Lexer) => match(input, ULIST, arr => {

                    const raw = arr[0], items = raw.replace(/^ {0,3}/gm, '').split(LISTITEM).filter(i => !NullChecker.isNullOrEmpty(i)).map(i => i.trim());
                    return [{
                        type: MARKDOWN_TYPES.UnorderedList, raw, text: raw, tokens: items.map(i => {
                            return {
                                type: MARKDOWN_TYPES.ListItem, raw: i, text: i, tokens: tokenizeListItem(i, lexer)
                            }
                        })
                    }];
                })
            }

        };

        const blockRules = Object.values(block);
        Array.prototype.push.apply(blockRules, blockExtra);
        blockRules.push(lowpriority[MARKDOWN_RULES.Paragraph], lowpriority[MARKDOWN_RULES.Space]);

        // #endregion

        return [
            // comment first
            inert[MARKDOWN_RULES.Comment],
            inert[MARKDOWN_RULES.Reference]
        ].concat(
            // block rules contain recursive inline rules (at least)
            blockRules
        );
    }

    // #region HTML RENDERER HELPER
    // meant to help in unnecessary spaces replacement.
    const CARRIAGE_RETURN_PLACEHOLDER = '\0';
    const TRIM_INSIDE = /[ \r\n]*\0+[ \r\n]*/g;

    function trim(input: string): string {
        return input?.replace(TRIM_INSIDE, '\n').trim();
    }
    // #endregion

    class HtmlRenderer implements Pacem.Compile.Renderer {

        constructor(private _extraItemRender: (token: Token, allTokens: Token[]) => string = (token, __) => token?.text || '') {
        }

        private _renderContent = (token: Token): string => {
            const children = token.tokens;
            if (NullChecker.isNullOrEmpty(children)) {
                return token.text;
            }
            return this._render(children);
        }

        private _rendeItem(token: Token, allTokens: Token[]) {
            const r = this._renderContent,
                R = CARRIAGE_RETURN_PLACEHOLDER;
            switch (token?.type) {
                case MARKDOWN_TYPES.Reference:
                    return '';
                case MARKDOWN_TYPES.Html:
                    return token.raw;
                case MARKDOWN_TYPES.BlockQuote:
                    return `<blockquote>\n${r(token)}</blockquote>${R}`;
                case MARKDOWN_TYPES.Bold:
                    return `<b>${r(token)}</b>`;
                case MARKDOWN_TYPES.CodeBlock:
                    const lang = token['lang'];
                    return `<pre>${R}<code${(lang ? (' class="' + lang + '"') : '')}>${r(token)}</code>${R}</pre>${R}`;
                case MARKDOWN_TYPES.Code:
                    return `<code>${r(token)}</code>`;
                case MARKDOWN_TYPES.HorizontalRule:
                    return `<hr />${R}`;
                case MARKDOWN_TYPES.Heading:
                    const hlevel = token['level'],
                        hid = token['ref'];
                    return `<h${hlevel} id="${hid}">${r(token)}</h${hlevel}>${R}`;
                case MARKDOWN_TYPES.Image:
                case MARKDOWN_TYPES.ImageLike:
                    const itk = <Token & { src: string, ref?: string }>token;
                    let isrc = itk.src,
                        ititle = '';
                    const alt = itk.text,
                        iref = itk.ref;
                    if (!isrc && iref) {
                        const ireftk = <Token & { url: string, title?: string }>allTokens.find(t => t.type === MARKDOWN_TYPES.Reference && t['image'] === true && t['id']?.toLowerCase() === iref.toLowerCase());
                        if (ireftk) {
                            isrc = ireftk.url;
                            ititle = ireftk.title ?? '';
                        }
                    }
                    return isrc ? `<img src="${isrc}" alt="${alt}"${(ititle ? (' title="' + ititle + '"') : '')} />` : `![${r(token)}]`;
                case MARKDOWN_TYPES.Italic:
                    return `<i>${r(token)}</i>`;
                case MARKDOWN_TYPES.StrikeThrough:
                    return `<s>${r(token)}</s>`;
                case MARKDOWN_TYPES.Quote:
                    return `<q>${r(token)}</q>`;
                case MARKDOWN_TYPES.LineBreak:
                    return '<br />' + R;
                case MARKDOWN_TYPES.OrderedList:
                    return `<ol start="${token['start']}">\n${r(token)}</ol>${R}`;
                case MARKDOWN_TYPES.UnorderedList:
                    return `<ul>\n${r(token)}</ul>${R}`;
                case MARKDOWN_TYPES.ListItem:
                    return `\t<li>${r(token)}</li>${R}`;
                case MARKDOWN_TYPES.Link:
                case MARKDOWN_TYPES.LinkLike:
                    const atk = <Token & { href: string, ref?: string }>token;
                    let ahref = atk.href, atitle = '';
                    const aref = atk.ref;
                    if (!ahref && aref) {
                        const areftk = <Token & { url: string, title?: string }>allTokens.find(t => t.type === MARKDOWN_TYPES.Reference && t['image'] !== true && t['id']?.toLowerCase() === aref.toLowerCase());
                        if (areftk) {
                            ahref = areftk.url;
                            atitle = areftk.title ?? '';
                        }
                    }
                    return ahref ? `<a href="${ahref}"${(atitle ? (' title="' + atitle + '"') : '')}>${r(token)}</a>` : `[${r(token)}]`;
                case MARKDOWN_TYPES.Paragraph:
                    return `<p>${r(token)}</p>${R}`;
                case MARKDOWN_TYPES.Text:
                case MARKDOWN_TYPES.Space:
                    return token.text;
            }
            return this._extraItemRender(token, allTokens);
        }

        private _render(tree: Token[]): string {
            let acc = '';
            for (let token of tree || []) {
                acc += this._rendeItem(token, tree);
            }
            return acc;
        }

        render(tree: Token[]): string {
            return trim(this._render(tree));
        }
    }

    class TokenRenderer implements Pacem.Compile.Renderer {

        private _render(token: Token): string {
            return Pacem.NullChecker.isNullOrEmpty(token) ? '' : JSON.stringify(token);
        }

        render(tree: Token[]): string {
            return '[' + tree.filter(i => !NullChecker.isNullOrEmpty(i)).map(this._render).join(',') + ']';
        }
    }

    function isRenderer(obj: any): obj is Pacem.Compile.Renderer {
        return obj && typeof obj === 'object' && typeof obj.render === 'function';
    }

    export class Parser extends Pacem.Compile.Parser {

        toHtml(input: string, extraGrammar?: ExtraRule[], extraItemRenderer?: (token: Token, allTokens: Token[]) => string): string {
            const renderer = new HtmlRenderer(extraItemRenderer);
            if (NullChecker.isNullOrEmpty(extraGrammar)) {
                return this.parse(input, renderer);
            }
            return this.parse(input, getGrammar(extraGrammar), renderer);
        }

        tokenize(input: string, extraGrammar?: ExtraRule[]): any[] {
            const json = this.parse(input, getGrammar(extraGrammar), new TokenRenderer());
            return JSON.parse(json);
        }

        parse(input: string): string
        parse(input: string, renderer: Pacem.Compile.Renderer): string
        parse(input: string, grammar: Rule[]): string
        parse(input: string, grammar: Rule[], renderer: Pacem.Compile.Renderer): string
        parse(input: string, grammarOrRenderer: Pacem.Compile.Renderer | Rule[] = getGrammar(), renderer = new HtmlRenderer()): string {
            if (isRenderer(grammarOrRenderer)) {
                return super.parse(input, getGrammar(), grammarOrRenderer);
            } else {
                return super.parse(input, grammarOrRenderer, renderer);
            }
        }

    }
}