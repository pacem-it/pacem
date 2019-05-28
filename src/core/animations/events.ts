namespace Pacem.Animations {
    export declare type AnimationEventArgs = {
        time: number,
        value: number
    };

    export class AnimationEvent extends CustomTypedEvent<AnimationEventArgs>{
        constructor(args: AnimationEventArgs) {
            super("step", args);
        }
    }

    export class AnimationEndEvent extends CustomEvent<{}> {
        constructor() {
            super('end');
        }
    }

    export class AnimationStartEvent extends CustomEvent<{}> {
        constructor() {
            super('start');
        }
    }
}