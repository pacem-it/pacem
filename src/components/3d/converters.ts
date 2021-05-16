namespace Pacem.Drawing3D {

    export const Point3DConverter: Pacem.PropertyConverter = {
        convert: (attr: string) => Pacem.Geometry.LinearAlgebra.Vector3D.parse(attr),
        convertBack: (prop: Pacem.Geometry.LinearAlgebra.Point3D) => `${prop.x || 0} ${prop.y || 0} ${prop.z || 0}`
    };

    export const QuaternionConverter: Pacem.PropertyConverter = {
        convert: (attr: string) => Pacem.Geometry.LinearAlgebra.Quaternion.parse(attr),
        convertBack: (prop: Pacem.Geometry.LinearAlgebra.Quaternion) => `${prop.x || 0} ${prop.y || 0} ${prop.z || 0} ${ prop.w || 0 }`
    };

}