declare class ResizeObserver {

    constructor(callback: (entries: ResizeObserverEntry[], observer?: ResizeObserver) => void);
    disconnect(): void;
    observe(target: Element, options?: {box: 'content-box' | 'border-box'}): void;
    unobserve(target: Element): void;

}

declare type ResizeObserverEntry = {
    readonly borderBoxSize: BoxSize;
    readonly contentBoxSize: BoxSize;
    readonly contentRect: DOMRectReadOnly;
    readonly target: Element;
};

declare type BoxSize = {
    readonly inlineSize: number,
    readonly blockSize: number
};