/// <reference path="events.ts" />
/// <reference path="eventtarget.ts" />
namespace Pacem {

    export interface ItemsContainer<TItem> extends NotifyPropertyChange {
        items: TItem[];
        register(item: TItem): boolean;
        unregister(item: TItem): boolean;
    }

    export interface Iterative<TItem> extends ItemsContainer<TItem> {
        index: number;
    }

    export declare type IndexChangeEventArgs = {
        currentIndex: number,
        previousIndex: number
    };

    export class CurrentIndexChangeEvent extends CustomTypedEvent<IndexChangeEventArgs> {

        constructor(args: IndexChangeEventArgs) {
            super('currentindexchange', args );
        }
    }
}