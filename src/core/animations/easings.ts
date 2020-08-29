
namespace Pacem.Animations {

    // TODO: Bezier

    const pi_half = Math.PI * .5;

    export const Easings = {

        // t: normalized `current time` [0,1]

        linear: t => t,

        sineIn: t => Math.sin(t * pi_half - pi_half) + 1.0,
        sineOut: t => Math.sin(t * pi_half),
        sineInOut: t => .5 * Math.sin(t * Math.PI - pi_half) + .5,

        expoIn: t => (Math.pow(Math.E, t) - 1.0) / (Math.E - 1.0),
        expoOut: t => Math.log(t * (Math.E - 1.0) + 1.0),
        expoInOut: t => t < .5 ? .5 * Easings.expoIn(t * 2) : .5 * (1 + Easings.expoOut(t * 2 - 1.0))
    };
}