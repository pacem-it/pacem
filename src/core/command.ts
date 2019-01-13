/// <reference path="events.ts" />
namespace Pacem {

    export const CommandEventName: string = 'command';

    export declare type CommandEventArgs = {
        commandName: string,
        commandArgument: any
    };

    export class CommandEvent extends CustomTypedEvent<CommandEventArgs>{

        constructor(args: CommandEventArgs) {
            super(CommandEventName, args, { bubbles: true, cancelable: true });
        }

    }

}
