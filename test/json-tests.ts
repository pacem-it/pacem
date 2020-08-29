/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const jsonTests = [{

        name: 'Circular JSON', test: function () {

            it('Stringify and parse back', function () {

                const now = new Date();
                var obj: any = { foo: 'bar' };
                obj.baz = obj;

                let arr = [0, obj];
                obj.rec = arr;
                obj.now = now;

                var div = document.createElement('div');
                div.id = 'my-id';
                div.hidden = true;
                
                obj.dom = document.body.appendChild(div);

                let json: string = Utils.Json.stringify(obj);

                // unmodified input
                expect(obj.baz).toEqual(obj);
                expect(obj.rec[1]).toEqual(obj.baz);

                // sorted props
                expect(json.startsWith('{"$refId":')).toBeTruthy();

                // parse
                let revived = Utils.Json.parse(json);

                expect(revived.dom instanceof HTMLElement).toBeTruthy();
                expect(revived.baz).toEqual(revived);
                expect(revived.rec[1]).toEqual(revived.baz);
                expect(Utils.parseDate(revived.now).valueOf()).toEqual(now.valueOf());
            });

        }
    }
    ];

}