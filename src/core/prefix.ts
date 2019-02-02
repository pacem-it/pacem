namespace Pacem {

    var root: { Configuration: { prefix: string, css: string } };

    /** the overall cusotmelement prefix */
    export const P = (root = window['Pacem']) && root.Configuration && root.Configuration.prefix || 'pacem';
    export const PCSS = root.Configuration && root.Configuration.css || P;

}