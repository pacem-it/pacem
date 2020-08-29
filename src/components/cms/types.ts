/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="../../../dist/js/pacem-scaffolding.d.ts" />
/// <reference path="../../../dist/js/pacem-plus.d.ts" />
namespace Pacem.Cms {

    export interface Permission {

        claimType: string,
        claimValue: string,
        translate: boolean,
        read: boolean,
        update: boolean,
        create: boolean,
        delete: boolean

    }

    export const PermissionEditEventName = 'permissionedit';

    export class PermissionEditEvent extends CustomEvent<Permissible>{

        constructor(permissible: Permissible) {
            super(PermissionEditEventName, { detail: permissible, cancelable: false, bubbles: true });
        }

    }

    export interface Permissible {

        permissions: Permission[];

    }

    export declare type Claims = { [name: string]: string[] };

    export class Permissible {

        public static canEdit(claims: Claims, resource: Permissible) { return this._canDoSomethingToResource(claims, resource, p => p.update); }
        public static canRead(claims: Claims, resource: Permissible) { return this._canDoSomethingToResource(claims, resource, p => p.read); }
        public static canAdd(claims: Claims, resource: Permissible) { return this._canDoSomethingToResource(claims, resource, p => p.create); }
        public static canDelete(claims: Claims, resource: Permissible) { return this._canDoSomethingToResource(claims, resource, p => p.delete); }
        public static canTranslate(claims: Claims, resource: Permissible) { return this._canDoSomethingToResource(claims, resource, p => p.translate); }

        private static _canDoSomethingToResource(claims: Claims, resource: Permissible, predicate: (p: Permission) => boolean): boolean {
            if (Utils.isNullOrEmpty(claims) || Utils.isNull(resource)) {
                return false;
            }

            // if no permissions are set, then you're free to go!
            var editable = true;

            if (resource.permissions && resource.permissions.length > 0) {
                // check correspondence otherwise
                editable = false;
                for (let permission of resource.permissions) {
                    if (predicate(permission) && claims[permission.claimType] && claims[permission.claimType].indexOf(permission.claimValue) >= 0) {
                        return true;
                    }
                }
            }

            // return
            return editable;
        }
    }

}