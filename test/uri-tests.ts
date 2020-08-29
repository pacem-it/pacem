/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const uriTests = [{

        name: 'Templated URIs', test: function () {

            it('Format template with single optional segment', function () {

                const urlTmpl = "https://example.com/root/{foo}/{bar}/{baz?}";
                const parameters = { foo: "branch", bar: "leaf" };

                const url = Utils.URIs.format(urlTmpl, parameters, true);

                expect(url).toEqual("https://example.com/root/branch/leaf");
                expect(Utils.isNullOrEmpty(Object.keys(parameters))).toBeTruthy();
            });

            it('Format template and complete by appending query', function () {

                const urlTmpl = "https://example.com/root/{foo}/{bar}/{baz?}/{jak?}";
                const parameters = { foo: "branch", bar: "leaf", q: "search query" };

                const url = Utils.URIs.appendQuery( Utils.URIs.format(urlTmpl, parameters, true), parameters);

                expect(url).toEqual("https://example.com/root/branch/leaf?q=search%20query");
                expect(Utils.isNullOrEmpty(Object.keys(parameters))).toBeFalsy();
            });

        }
    }
    ];

}