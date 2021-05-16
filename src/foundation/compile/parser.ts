namespace Pacem.Compile {

    export interface Rule {
        exec: (input: string, lexer?: Lexer) => Token[];
    }

    export interface Token {
        readonly index?: number;
        readonly type: string;
        readonly raw: string;
        readonly text: string;
        readonly tokens?: Token[];
    }

    export interface Lexer {
        tokenize(input: string, grammar: Rule[]): Token[];
    }

    class LexerClass implements Lexer {

        tokenize(input: string, grammar: Rule[]): Token[] {
            const tokens: Token[] = [];
            while (input) {
                const start = input.length;
                for (let rule of grammar) {
                    const newTokens = rule.exec(input, /* arguments that ease recursion when needed */ this),
                        length = newTokens?.length;
                    if (length > 0) {
                        Array.prototype.push.apply(tokens, newTokens);
                        const last = newTokens[length - 1];
                        input = input.substr((last.index || 0) + last.raw.length);
                        break;
                    }
                }
                if (input.length >= start) {
                    // break infinite loop
                    throw new Error(`Cannot parse\n"${input}"\n using the provided grammar.`);
                }
            }
            return tokens;
        }

    }

    export interface Renderer {
        render: (tree: Token[]) => string;
    }

    export class Parser {

        constructor(private _lexer: Lexer = new LexerClass()) {
        }

        parse(input: string, grammar: Rule[], renderer: Renderer): string {
            const tokens = this._lexer.tokenize(input, grammar);
            return renderer.render(tokens);
        }

    }

}