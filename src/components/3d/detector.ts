namespace Pacem.Components.ThreeD {

    export class Pacem3DDetector {

        private _detected: {
            supported: boolean, info: {
                main?: any,
                bits?: any,
                shader?: any,
                tex?: any,
                misc?: any
            }
        } = {
            supported: false, info: {}
        };

        constructor() {
            let cvs = document.createElement('canvas');
            let contextNames = ['webgl', 'experimental-webgl', 'moz-webgl', 'webkit-3d'];
            let ctx: WebGLRenderingContext;
            let getParam = function (str) {
                if (!str) return undefined;
                return ctx.getParameter(str);
            }
            // addLine
            let addLine = (section, name, value) => {
                let detected = this._detected;
                var info = detected.info[section] = detected.info[section] || {};
                name = name.replace(/[^\w]+/g, '');
                name = name.substring(0, 1).toLowerCase() + name.substring(1);
                info[name] = value;
            };

            if (navigator.userAgent.indexOf('MSIE') >= 0) {
                try {
                    ctx = window['WebGLHelper'].CreateGLContext(cvs, 'canvas');
                } catch (e) { }
            }
            else {
                for (var i = 0; i < contextNames.length; i++) {
                    try {
                        ctx = <WebGLRenderingContext>cvs.getContext(contextNames[i]);
                        if (ctx) {
                            addLine('main', 'Context Name', contextNames[i]);
                            break;
                        }
                    } catch (e) { }
                }
            }

            this._detected.supported = !!ctx;

            addLine('main', 'Platform', navigator.platform);
            addLine('main', 'Agent', navigator.userAgent);

            if (ctx) {
                addLine('main', 'Vendor', getParam(ctx.VENDOR));
                addLine('main', 'Version', getParam(ctx.VERSION));
                addLine('main', 'Renderer', getParam(ctx.RENDERER));
                addLine('main', 'Shading Language Version', getParam(ctx.SHADING_LANGUAGE_VERSION));

                addLine('bits', 'Rgba Bits', getParam(ctx.RED_BITS) + ', ' + getParam(ctx.GREEN_BITS) + ', ' + getParam(ctx.BLUE_BITS) + ', ' + getParam(ctx.ALPHA_BITS));
                addLine('bits', 'Depth Bits', getParam(ctx.DEPTH_BITS));

                addLine('shader', 'Max Vertex Attribs', getParam(ctx.MAX_VERTEX_ATTRIBS));
                addLine('shader', 'Max Vertex Texture Image Units', getParam(ctx.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
                addLine('shader', 'Max Varying Vectors', getParam(ctx.MAX_VARYING_VECTORS));
                addLine('shader', 'Max Uniform Vectors', getParam(ctx.MAX_VERTEX_UNIFORM_VECTORS));

                addLine('tex', 'Max Combined Texture Image Units', getParam(ctx.MAX_COMBINED_TEXTURE_IMAGE_UNITS));
                addLine('tex', 'Max Texture Size', getParam(ctx.MAX_TEXTURE_SIZE));
                addLine('tex', 'Max Cube Map Texture Size', getParam(ctx.MAX_CUBE_MAP_TEXTURE_SIZE));
                addLine('tex', 'Num. Compressed Texture Formats', getParam(ctx.COMPRESSED_TEXTURE_FORMATS));

                addLine('misc', 'Max Render Buffer Size', getParam(ctx.MAX_RENDERBUFFER_SIZE));
                addLine('misc', 'Max Viewport Dimensions', getParam(ctx.MAX_VIEWPORT_DIMS));
                addLine('misc', 'Aliased Line Width Range', getParam(ctx.ALIASED_LINE_WIDTH_RANGE));
                addLine('misc', 'Aliased Point Size Range', getParam(ctx.ALIASED_POINT_SIZE_RANGE));

                addLine('misc', 'Supported Extensions', ctx.getSupportedExtensions() || []);
            }
        }

        get info(): {
            main?: any,
            bits?: any,
            shader?: any,
            tex?: any,
            misc?: any
        } {
            return this._detected.info;
        }

        get supported() {
            return this._detected.supported;
        }
    }
}