/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const deepCloneTests = [{

        name: 'Deep clone', test: function () {

            it('Keep references', function () {

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

                let clone = DeepCloner.clone(obj);

                // unmodified input
                expect(obj.baz === obj).toBeTruthy();
                expect(clone.baz === clone).toBeTruthy();
                expect(clone.baz === obj.baz).toBeFalsy();

                expect(clone.dom === obj.dom).toBeTruthy();
                expect(clone.now.valueOf()).toEqual(now.valueOf());

            });

        }
    }
    ];

}