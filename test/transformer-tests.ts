/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const tTests = [{

        name: 'Transformers', test: function () {

            it('Array Filter', function () {

                const src = ['arrow', 'bow', 'chariot', 'arrow'];

                const pacem = window['pacem'];
                let res = pacem.filter(src, (e) => e === 'arrow');
                expect(res.length).toEqual(2);

            });

            it('Array Sort', function () {

                const src = [{ name: 'arrow' }, { name: 'bow' }, { name: 'chariot' }, { name: 'arrow' }];

                const pacem = window['pacem'];
                let res = pacem.orderby(src, 'name');
                expect(res.length).toEqual(4);
                expect(res[1].name).toEqual('arrow');

            });
        }
    }];

}