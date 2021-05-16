/// <reference path="../../../dist/js/pacem-core.d.ts" />

namespace Pacem {

    const match = (input: string, pattern: RegExp, fn: (arr: RegExpExecArray) => Pacem.Compile.Token[]): Pacem.Compile.Token[] => {
        const arr = pattern.exec(input);
        if (arr && arr.length) {
            return fn(arr);
        }
        return null;
    }

    const MARKUP_RULES: Pacem.Compile.Rule[] = [
        {
            // comment
            exec: (input) => match(input, /^((<|&lt;)!--(?:(?!(--(>|&gt;)))[\s\S])*(--(?:>|&gt;)|$))/, arr => {
                const raw = arr[0], text = raw;
                return [{
                    type: 'code-comment', raw, text, index: arr.index
                }];
            })
        },
        {
            // opening/self-closing tag
            exec: (input, lexer) => match(input, /^(<|&lt;)([\w-]+)(?:\s+[\w-]+(?:=(?:'[^']*'|"[^"]*"))*)*(\s*\/?(?:&gt;|>))/, arr => {

                const openingTag = arr[1],
                    tagName = arr[2],
                    closingTag = arr[3];

                const closingTagIndex = arr[0].length - closingTag.length,
                    attributesIndex = openingTag.length + tagName.length,
                    attributesString = input.substring(attributesIndex, closingTagIndex);

                const attributes = lexer.tokenize(attributesString, [{
                    exec: (input) => match(input, /^(\s+[\w-]+)(=('[^']*'|"[^"]*"))?/, arr => {
                        const raw = arr[1];
                        const output = [{
                            type: 'code-attribute', raw, text: raw, index: arr[0].indexOf(raw)
                        }];
                        if (arr.length > 2) {
                            output.push({
                                type: 'code-string', raw: arr[2], text: arr[2], index: arr.index + arr[0].length - arr[2].length
                            })
                        }
                        return output;
                    })
                }]);

                const retval = [{
                    type: 'code-tag', raw: openingTag, text: openingTag, index: 0
                }, {
                    type: 'code-tagname', raw: tagName, text: tagName, index: openingTag.length
                }];
                // attributes
                Array.prototype.push.apply(retval, attributes);
                retval.push({
                    type: 'code-tag', raw: closingTag, text: closingTag, index: closingTagIndex
                });
                return retval;
            })
        },
        {
            // closing tag
            exec: (input) => match(input, /^((?:<|&lt;)\/)([\w-]+)(\s*(?:&gt;|>))/, arr => {

                const openingTag = arr[1],
                    tagName = arr[2],
                    closingTag = arr[3];

                return [{
                    type: 'code-tag', raw: openingTag, text: openingTag, index: 0
                }, {
                    type: 'code-tagname', raw: tagName, text: tagName, index: openingTag.length
                }, {
                    type: 'code-tag', raw: closingTag, text: closingTag, index: arr.index + arr[0].length - closingTag.length
                }]
            })
        },
        {
            // text
            exec: (input) => match(input, /^(<|&lt;)?((?!<|&lt;).)+/, arr => {
                const raw = arr[0], text = raw;
                return [{
                    type: 'text', raw, text
                }];
            })
        }
    ];

    const C_LIKE_RULES: Pacem.Compile.Rule[] = [{

        // comments
        exec: (input, _) => match(input, /^\/\/.*/, arr => {
            const raw = arr[0], text = raw;
            return [{
                type: 'code-comment', raw, text
            }];
        })
    }, {
        exec: (input, _) => match(input, /^\/\*(?:(?!(\*\/))[\s\S])*(?:\*\/|$)/, arr => {
            const raw = arr[0], text = raw;
            return [{
                type: 'code-comment', raw, text
            }];
        })
    }, {
        // string literal
        exec: (input, _) => match(input, /^('(\\'|[^'])*[^\\]?'|@?\$?"(\\"|[^"])*[^\\]?")/, arr => {
            const raw = arr[0], text = raw;
            return [{
                type: 'code-string', raw, text
            }];
        })
    }, {
        // keywords
        exec: (input, _) => match(input, /^\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|static|virtual|void|volatile|while|add|alias|ascending|async|await|descending|dynamic|from|get|global|group|into|join|let|nameof|orderby|partial|remove|select|set|value|var|when|where|yield)\b/, arr => {
            const raw = arr[0], text = raw;
            return [{
                type: 'code-keyword', raw, text
            }]
        })
    }, {
        // number 
        exec: (input, _) => match(input, /^\b((0x[0-9a-fA-F]|[\d])*\.?[\d]+)\b/, arr => {
            const raw = arr[0], text = raw;
            return [{
                type: 'code-number', raw, text
            }]
        })
    }, {
        // variables, operators, parentheses
        exec: (input, _) => match(input, /^(@?\w+|:|\?\??|\?=?|\|\|?|&&?|&=?|;|,|=|\*=?|--|-=?|\+\+|\+=?|\/=?|\^|\(|\[|\)|\]|\{|\})/, arr => {
            const raw = arr[0], text = raw;
            return [{
                type: 'text', raw, text
            }]
        }),
        }, {
            // spaces
            exec: (input, _) => match(input, /^\s+/, arr => {
                const raw = arr[0], text = raw;
                return [{
                    type: 'space', raw, text
                }]
            }),

        }];

    const SCRIPT_RULES: Pacem.Compile.Rule[] = [
        C_LIKE_RULES[0], C_LIKE_RULES[1], {
            // string literal
            exec: (input, _) => match(input, /^('(\\'|[^'])*[^\\]?'|"(\\"|[^"])*[^\\]?"|`(\\`|[^`])*[^\\]?`)/, arr => {
                const raw = arr[0], text = raw;
                return [{
                    type: 'code-string', raw, text
                }];
            })
        }, {
            // keywords
            exec: (input, _) => match(input, /^\b(abstract|any|arguments|async|await|boolean|break|byte|case|catch|char|class|const|continue|debugger|declare|default|delete|do|double|else|enum|eval|export|extends|false|final|finally|float|for|function|get|goto|if|implements|import|in|instanceof|int|interface|let|long|native|new|null|number|package|private|protected|public|return|short|static|string|super|switch|synchronized|this|throw|throws|transient|true|try|type|typeof|var|void|volatile|while|with|yield)\b/, arr => {
                const raw = arr[0], text = raw;
                return [{
                    type: 'code-keyword', raw, text
                }]
            })
        },
        C_LIKE_RULES[4],
        C_LIKE_RULES[5],
        C_LIKE_RULES[6]
    ];

    const TWITTER_RULE: { rule: Pacem.Compile.Rule, type: 'inline' } = {
        rule: {
            exec: (input) => {
                const arr = /\{tweet\}\(([^\)]+)\)/.exec(input);
                if (arr && arr.length > 1) {
                    return [{
                        type: 'tweet', raw: arr[0], text: arr[1], index: arr.index
                    }]
                }
                return null;
            }
        },
        type: 'inline'
    };

    const YOUTUBE_RULE: { rule: Pacem.Compile.Rule, type: 'inline' } = {
        rule: {
            exec: (input) => {
                const arr = /\{yt([\d]+x[\d]+)?\}\(([^\)]+)\)/.exec(input);
                if (arr && arr.length > 2) {
                    const m0 = arr[1] || '560x315';
                    const size = m0.split('x'),
                        w = size[0], h = size[1];
                    return [{
                        type: 'youtube', raw: arr[0], text: arr[2], index: arr.index, width: w, height: h
                    }]
                }
                return null;
            }
        },
        type: 'inline'
    };

    const RULES_TO_HTML = (token: Pacem.Compile.Token): string => {
        switch (token.type) {
            case 'youtube':
                return `<!-- youtube embed -->
<iframe width="${token['width']}" height="${token['height']}" src="https://www.youtube.com/embed/${token.text}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            case 'tweet':
                return `<!-- twitter embed -->
<${P}-tweetembed tweetid="${token.text}"></${P}-tweetembed>`;

            // code
            case 'code-string':
            case 'code-keyword':
            case 'code-number':
            case 'code-comment':
            case 'code-tag':
            case 'code-tagname':
            case 'code-attribute':
                return `<span class="${token.type}">${token.text}</span>`;
        }
    };

    export class MarkdownService {

        constructor() {

            const grammar: Pacem.Compile.Markdown.ExtraRule[] = [
                TWITTER_RULE,
                YOUTUBE_RULE
            ];

            for (let lang of ['c-sharp', 'c', 'c#', 'csharp', 'c++', 'cpp']) {
                const c_like_rules = C_LIKE_RULES.map(rule => { return { rule, lang, type: 'code' } });
                Array.prototype.push.apply(grammar, c_like_rules);
            }

            for (let lang of ['ts', 'js', 'typescript', 'javascript']) {
                const script_rules = SCRIPT_RULES.map(rule => { return { rule, lang, type: 'code' } });
                Array.prototype.push.apply(grammar, script_rules);
            }

            for (let lang of ['xml', 'html']) {
                const markup_rules = MARKUP_RULES.map(rule => { return { rule, lang, type: 'code' } });
                Array.prototype.push.apply(grammar, markup_rules);
            }

            this.#grammar = grammar;
        }

        #grammar: Pacem.Compile.Markdown.ExtraRule[];
        #md = new Pacem.Compile.Markdown.Parser();

        private _escape(md: string): string {
            // no html allowed
            return (md ?? '').replace(/</g, '&lt;');
        }

        toHtml(md: string) {

            return this.#md.toHtml(this._escape(md),
                this.#grammar,
                RULES_TO_HTML);

        }

        tokenize(md: string) {
            return this.#md.tokenize(this._escape(md),
                this.#grammar
            );
        }

    }

}