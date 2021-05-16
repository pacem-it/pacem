/// <reference path="../../../dist/js/pacem-foundation.d.ts" />
namespace Pacem.Geometry.LinearAlgebra {

    const RAD2DEG = 180.0 / Math.PI;
    const DEG2RAD = 1.0 / RAD2DEG;

    export interface Point3D {
        x: number;
        y: number;
        z: number;
    }

    // #region Vector3D

    /** Represents a vector in the 3D space */
    export interface Vector3D extends Point3D {
    }

    export class Vector3D {

        static from(...args: number[]): Vector3D {
            const l = 3;
            if (args.length !== l) {
                throw new RangeError(`Must provide exactly ${l} numbers`);
            }
            return { x: args[0], y: args[1], z: args[2] };
        }

        static parse(input: string): Vector3D {
            const arr = Pacem.parseAsNumericalArray(input);
            if (arr && arr.length === 3) {
                return Vector3D.from.apply(null, arr);
            }
            throw new Error(`Cannot parse "${input}" as a valid Vector3D.`);
        }

        // notable vectors
        static i(): Vector3D {
            return { x: 1, y: 0, z: 0 };
        }
        static j(): Vector3D {
            return { x: 0, y: 1, z: 0 };
        }
        static k(): Vector3D {
            return { x: 0, y: 0, z: 1 };
        }

        /**
         * Subtracts a point p from another and returns the resulting vector.
         * @param p Point to subtract
         * @param from Point to be subtracted from
         */
        static subtract(p: Point3D, from: Point3D): Point3D {
            return { x: from.x - p.x, y: from.y - p.y, z: from.z - p.z };
        }

        /**
         * Adds a set of points together and returns the resulting vector.
         * @param points Points to add
         */
        static add(...points: Point3D[]): Point3D {
            var point: Point3D = { x: 0, y: 0, z: 0 };
            for (var p of points) {
                point.x += p.x;
                point.y += p.y;
                point.z += p.z;
            }
            return point;
        }

        /**
        * Returns the dot product between two vectors/points.
        * @param v1
        * @param v2
        */
        static dot(v1: Point3D, v2: Point3D): number {
            return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        }

        /**
         * Returns the cross product between two vectors/points (as a vector itself).
         * @param v1
         * @param v2
         */
        static cross(v1: Point3D, v2: Point3D): Vector3D {
            return {
                x: (v1.y * v2.z) - (v1.z * v2.y),
                y: (v1.z * v2.x) - (v1.x * v2.z),
                z: (v1.x * v2.y) - (v1.y * v2.x)
            };
        }

        static magSqr(v: Point3D): number {
            return v.x * v.x + v.y * v.y + v.z * v.z;
        }

        static mag(v: Point3D): number {
            return Math.sqrt(Vector3D.magSqr(v));
        }

        /**
         * Returns the unit (normalized) vector having the same direction and sense of the provided one.
         * @param v
         */
        static unit(v: Vector3D): Vector3D {
            const clone = { x: v.x, y: v.y, z: v.z };
            this.normalize(clone);
            return clone;
        }

        /**
         * Normalizes the provided vector in place.
         * @param v
         */
        static normalize(v: Vector3D): void {
            const l = Vector3D.mag(v);
            if (l <= 0) {
                throw 'Cannot normalize a vector of length 0.';
            }
            const inv = 1 / l;
            v.x *= inv;
            v.y *= inv;
            v.z *= inv;
        }

        /**
         * Returns the angle (in degrees) between two vectors.
         * @param vector1
         * @param vector2
         */
        static angleBetween(vector1: Vector3D, vector2: Vector3D): number {
            var num;
            var v1 = Vector3D.unit(vector1);
            var v2 = Vector3D.unit(vector2);
            var dot = Vector3D.dot(v1, v2);

            if (dot < 0.0) {
                const vectord = { x: -v1.x - v2.x, y: -v1.y - v2.y, z: -v1.z - v2.z };
                const length = Vector3D.mag(vectord);
                num = Math.PI - (2.0 * Math.asin(length / 2.0));
            }
            else {
                var vectord = { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
                const length = Vector3D.mag(vectord);
                num = 2.0 * Math.asin(length / 2.0);
            }

            return RAD2DEG * num;
        }
    }

    // #endregion

    // #region Matrix3D

    export interface Matrix3D {
        m11: number, m12: number, m13: number, m14: number,
        m21: number, m22: number, m23: number, m24: number,
        m31: number, m32: number, m33: number, m34: number,
        offsetX: number, offsetY: number, offsetZ: number, m44: number
    }

    export class Matrix3D {

        // notable matrices
        static identity(): Matrix3D {
            return {
                m11: 1, m12: 0, m13: 0, m14: 0,
                m21: 0, m22: 1, m23: 0, m24: 0,
                m31: 0, m32: 0, m33: 1, m34: 0,
                offsetX: 0, offsetY: 0, offsetZ: 0, m44: 1
            };
        }

        static from(...args: number[]): Matrix3D {
            const l = 16;
            if (args.length !== l) {
                throw new RangeError(`Must provide exactly ${l} numbers`);
            }
            return {
                m11: args[0],
                m12: args[1],
                m13: args[2],
                m14: args[3],
                m21: args[4],
                m22: args[5],
                m23: args[6],
                m24: args[7],
                m31: args[8],
                m32: args[9],
                m33: args[10],
                m34: args[11],
                offsetX: args[12],
                offsetY: args[13],
                offsetZ: args[14],
                m44: args[15]
            };
        }

        static toArray(m: Matrix3D): number[] {
            return [m.m11, m.m12, m.m13, m.m14,
            m.m21, m.m22, m.m23, m.m24,
            m.m31, m.m32, m.m33, m.m34,
            m.offsetX, m.offsetY, m.offsetZ, m.m44];
        }

        static clone(m: Matrix3D): Matrix3D {
            return Matrix3D.from.apply(null, Matrix3D.toArray(m));
        }

        static parse(input: string): Matrix3D {
            const arr = Pacem.parseAsNumericalArray(input);
            if (arr && arr.length === 16) {
                return Matrix3D.from.apply(null, arr);
            }
            throw new Error(`Cannot parse "${input}" as a valid Matrix3D.`);
        }

        static isIdentity(m: Matrix3D): boolean {
            return m.m11 == 1.0 && m.m12 == .0 && m.m13 == .0 && m.m14 == .0
                && m.m21 == .0 && m.m22 == 1.0 && m.m23 == .0 && m.m24 == .0
                && m.m31 == .0 && m.m32 == .0 && m.m33 == 1.0 && m.m34 == .0
                && m.offsetX == .0 && m.offsetY == .0 && m.offsetZ == .0 && m.m44 == 1.0;
        }

        static isAffine(m: Matrix3D): boolean {
            return m.m14 == .0 && m.m24 == .0 && m.m34 == .0 && m.m44 == 1.0;
        }

        static determinant(m: Matrix3D): number {
            if (Matrix3D.isIdentity(m)) return 1.0;
            else if (Matrix3D.isAffine(m)) {
                return m.m11 * (m.m22 * m.m33 - m.m32 * m.m23)
                    - m.m12 * (m.m21 * m.m33 - m.m31 * m.m23)
                    + m.m13 * (m.m21 * m.m32 - m.m31 * m.m22);
            }
            else {
                const num6 = (m.m13 * m.m24) - (m.m23 * m.m14);
                const num5 = (m.m13 * m.m34) - (m.m33 * m.m14);
                const num4 = (m.m13 * m.m44) - (m.offsetZ * m.m14);
                const num3 = (m.m23 * m.m34) - (m.m33 * m.m24);
                const num2 = (m.m23 * m.m44) - (m.offsetZ * m.m24);
                const num = (m.m33 * m.m44) - (m.offsetZ * m.m34);
                const num10 = ((m.m22 * num5) - (m.m32 * num6)) - (m.m12 * num3);
                const num9 = ((m.m12 * num2) - (m.m22 * num4)) + (m.offsetY * num6);
                const num8 = ((m.m32 * num4) - (m.offsetY * num5)) - (m.m12 * num);
                const num7 = ((m.m22 * num) - (m.m32 * num2)) + (m.offsetY * num3);
                const det = ((((m.offsetX * num10) + (m.m31 * num9)) + (m.m21 * num8)) + (m.m11 * num7));
                return det;
            }
        }

        static multiply(m1: Matrix3D, m2: Matrix3D): Matrix3D {
            if (Matrix3D.isIdentity(m1)) return m2;
            if (Matrix3D.isIdentity(m2)) return m1;
            return Matrix3D.from(
                (((m1.m11 * m2.m11) + (m1.m12 * m2.m21)) + (m1.m13 * m2.m31)) + (m1.m14 * m2.offsetX),
                (((m1.m11 * m2.m12) + (m1.m12 * m2.m22)) + (m1.m13 * m2.m32)) + (m1.m14 * m2.offsetY),
                (((m1.m11 * m2.m13) + (m1.m12 * m2.m23)) + (m1.m13 * m2.m33)) + (m1.m14 * m2.offsetZ),
                (((m1.m11 * m2.m14) + (m1.m12 * m2.m24)) + (m1.m13 * m2.m34)) + (m1.m14 * m2.m44),
                (((m1.m21 * m2.m11) + (m1.m22 * m2.m21)) + (m1.m23 * m2.m31)) + (m1.m24 * m2.offsetX),
                (((m1.m21 * m2.m12) + (m1.m22 * m2.m22)) + (m1.m23 * m2.m32)) + (m1.m24 * m2.offsetY),
                (((m1.m21 * m2.m13) + (m1.m22 * m2.m23)) + (m1.m23 * m2.m33)) + (m1.m24 * m2.offsetZ),
                (((m1.m21 * m2.m14) + (m1.m22 * m2.m24)) + (m1.m23 * m2.m34)) + (m1.m24 * m2.m44),
                (((m1.m31 * m2.m11) + (m1.m32 * m2.m21)) + (m1.m33 * m2.m31)) + (m1.m34 * m2.offsetX),
                (((m1.m31 * m2.m12) + (m1.m32 * m2.m22)) + (m1.m33 * m2.m32)) + (m1.m34 * m2.offsetY),
                (((m1.m31 * m2.m13) + (m1.m32 * m2.m23)) + (m1.m33 * m2.m33)) + (m1.m34 * m2.offsetZ),
                (((m1.m31 * m2.m14) + (m1.m32 * m2.m24)) + (m1.m33 * m2.m34)) + (m1.m34 * m2.m44),
                (((m1.offsetX * m2.m11) + (m1.offsetY * m2.m21)) + (m1.offsetZ * m2.m31)) + (m1.m44 * m2.offsetX),
                (((m1.offsetX * m2.m12) + (m1.offsetY * m2.m22)) + (m1.offsetZ * m2.m32)) + (m1.m44 * m2.offsetY),
                (((m1.offsetX * m2.m13) + (m1.offsetY * m2.m23)) + (m1.offsetZ * m2.m33)) + (m1.m44 * m2.offsetZ),
                (((m1.offsetX * m2.m14) + (m1.offsetY * m2.m24)) + (m1.offsetZ * m2.m34)) + (m1.m44 * m2.m44)
            );
        }

        static invert(m: Matrix3D): Matrix3D {
            if (Matrix3D.isAffine(m)) {
                // normalize affine invert
                const cofactor31 = (m.m12 * m.m23) - (m.m22 * m.m13);
                const cofactor21 = (m.m32 * m.m13) - (m.m12 * m.m33);
                const cofactor11 = (m.m22 * m.m33) - (m.m32 * m.m23);
                const determinant = Matrix3D.determinant(m);
                if (determinant == 0.0) {
                    return null;
                }
                //
                const num20 = (m.m21 * m.m13) - (m.m11 * m.m23);
                const num19 = (m.m11 * m.m33) - (m.m31 * m.m13);
                const num18 = (m.m31 * m.m23) - (m.m21 * m.m33);
                const num7 = (m.m11 * m.m22) - (m.m21 * m.m12);
                const num6 = (m.m11 * m.m32) - (m.m31 * m.m12);
                const num5 = (m.m11 * m.offsetY) - (m.offsetX * m.m12);
                const num4 = (m.m21 * m.m32) - (m.m31 * m.m22);
                const num3 = (m.m21 * m.offsetY) - (m.offsetX * m.m22);
                const num2 = (m.m31 * m.offsetY) - (m.offsetX * m.m32);
                const num17 = ((m.m23 * num5) - (m.offsetZ * num7)) - (m.m13 * num3);
                const num16 = ((m.m13 * num2) - (m.m33 * num5)) + (m.offsetZ * num6);
                const num15 = ((m.m33 * num3) - (m.offsetZ * num4)) - (m.m23 * num2);
                const num14 = num7;
                const num13 = -num6;
                const num12 = num4;
                const invdet = 1.0 / determinant;
                return Matrix3D.from(
                    cofactor11 * invdet, cofactor21 * invdet, cofactor31 * invdet, .0,
                    num18 * invdet, num19 * invdet, num20 * invdet, .0,
                    num12 * invdet, num13 * invdet, num14 * invdet, .0,
                    num15 * invdet, num16 * invdet, num17 * invdet, 1.0);
            } else {


                const determinant = Matrix3D.determinant(m);
                if (determinant == 0.0) {
                    return null;
                }

                const num1 = m.m33 * m.m44 - m.m34 * m.offsetZ;
                const num2 = m.m32 * m.m44 - m.m34 * m.offsetY;
                const num3 = m.m31 * m.m44 - m.m34 * m.offsetX;
                const num4 = m.m32 * m.offsetZ - m.m33 * m.offsetY;
                const num5 = m.m31 * m.offsetZ - m.m33 * m.offsetX;
                const num6 = m.m31 * m.offsetY - m.m32 * m.offsetX;

                const num7 = m.m33 * m.m44 - m.m34 * m.offsetZ;
                const num8 = m.m32 * m.m44 - m.m34 * m.offsetY;
                const num9 = m.m31 * m.m44 - m.m34 * m.offsetX;
                const num10 = m.m32 * m.offsetZ - m.m33 * m.offsetY;
                const num11 = m.m31 * m.offsetZ - m.m33 * m.offsetX;
                const num12 = m.m31 * m.offsetY - m.m32 * m.offsetX;

                const num13 = m.m23 * m.m44 - m.m24 * m.offsetZ;
                const num14 = m.m22 * m.m44 - m.m24 * m.offsetY;
                const num15 = m.m21 * m.m44 - m.m24 * m.offsetX;
                const num16 = m.m22 * m.offsetZ - m.m23 * m.offsetY;
                const num17 = m.m21 * m.offsetZ - m.m23 * m.offsetX;
                const num18 = m.m21 * m.offsetY - m.m22 * m.offsetX;

                const num19 = m.m23 * m.m34 - m.m24 * m.m33;
                const num20 = m.m22 * m.m34 - m.m24 * m.m32;
                const num21 = m.m21 * m.m34 - m.m24 * m.m31;
                const num22 = m.m22 * m.m33 - m.m23 * m.m32;
                const num23 = m.m21 * m.m33 - m.m23 * m.m31;
                const num24 = m.m21 * m.m32 - m.m22 * m.m31;

                const cofactor11 = (m.m22 * num1 - m.m23 * num2 + m.m24 * num4);
                const cofactor12 = -(m.m21 * num1 - m.m23 * num3 + m.m24 * num5);
                const cofactor13 = (m.m21 * num2 - m.m22 * num3 + m.m24 * num6);
                const cofactor14 = -(m.m21 * num4 - m.m22 * num5 + m.m23 * num6);

                const cofactor21 = -(m.m12 * num7 - m.m13 * num8 + m.m14 * num10);
                const cofactor22 = (m.m11 * num7 - m.m13 * num9 + m.m14 * num11);
                const cofactor23 = -(m.m11 * num8 - m.m12 * num9 + m.m14 * num12);
                const cofactor24 = (m.m11 * num10 - m.m12 * num11 + m.m13 * num12);

                const cofactor31 = (m.m12 * num13 - m.m13 * num14 + m.m14 * num16);
                const cofactor32 = -(m.m11 * num13 - m.m13 * num15 + m.m14 * num17);
                const cofactor33 = (m.m11 * num14 - m.m12 * num15 + m.m14 * num18);
                const cofactor34 = -(m.m11 * num16 - m.m12 * num17 + m.m13 * num18);

                const cofactor41 = -(m.m12 * num19 - m.m13 * num20 + m.m14 * num22);
                const cofactor42 = (m.m11 * num19 - m.m13 * num21 + m.m14 * num23);
                const cofactor43 = -(m.m11 * num20 - m.m12 * num21 + m.m14 * num24);
                const cofactor44 = (m.m11 * num22 - m.m12 * num23 + m.m13 * num24);

                const inverseDet = 1.0 / determinant;
                return Matrix3D.from(
                    cofactor11 * inverseDet, cofactor21 * inverseDet, cofactor31 * inverseDet, cofactor41 * inverseDet,
                    cofactor12 * inverseDet, cofactor22 * inverseDet, cofactor32 * inverseDet, cofactor42 * inverseDet,
                    cofactor13 * inverseDet, cofactor23 * inverseDet, cofactor33 * inverseDet, cofactor43 * inverseDet,
                    cofactor14 * inverseDet, cofactor24 * inverseDet, cofactor34 * inverseDet, cofactor44 * inverseDet
                );
            }
        }

        /**
         * Moves a given point in 3D space given the transformation matrix.
         * @param point
         * @param matrix
         */
        static transform(point: Point3D, matrix: Matrix3D): Point3D {
            var pt = { x: point.x, y: point.y, z: point.z };
            if (!Matrix3D.isIdentity(matrix)) {
                var x = pt.x;
                var y = pt.y;
                var z = pt.z;
                pt.x = (((x * matrix.m11) + (y * matrix.m21)) + (z * matrix.m31)) + matrix.offsetX;
                pt.y = (((x * matrix.m12) + (y * matrix.m22)) + (z * matrix.m32)) + matrix.offsetY;
                pt.z = (((x * matrix.m13) + (y * matrix.m23)) + (z * matrix.m33)) + matrix.offsetZ;
                if (!Matrix3D.isAffine(matrix)) {
                    var num4 = (((x * matrix.m14) + (y * matrix.m24)) + (z * matrix.m34)) + matrix.m44;
                    if (num4 != .0) {
                        pt.x /= num4;
                        pt.y /= num4;
                        pt.z /= num4;
                    }
                }
            }
            return pt;
        }
    }

    // #endregion

    // #region Quaternion

    export interface Quaternion {
        x: number, y: number, z: number, w: number
    }

    export class Quaternion {

        static from(...args: number[]): Quaternion {

            const l = 4;
            if (args.length !== l) {
                throw new RangeError(`Must provide exactly ${l} numbers`);
            }
            return {
                x: args[0],
                y: args[1],
                z: args[2],
                w: args[3],
            }
        }

        static parse(input: string): Quaternion {
            const arr = Pacem.parseAsNumericalArray(input);
            if (arr && arr.length === 4) {
                return Quaternion.from.apply(null, arr);
            }
            throw new Error(`Cannot parse "${input}" as a valid Quaternion.`);
        }

        /**
         * Creates a quaternion instance given the rotation axis and an angle (in degrees).
         * @param axis
         * @param angleDeg
         */
        static fromAxisAngle(axis: Vector3D, angleDeg: number) {
            angleDeg %= 360.0;
            var angleInRadians = DEG2RAD * angleDeg;
            var length = Vector3D.mag(axis);
            if (length == 0.0) {
                throw new RangeError('Invalid argument');
            }
            var factor = Math.sin(0.5 * angleInRadians) / length;
            var x = axis.x * factor;
            var y = axis.y * factor;
            var z = axis.z * factor;
            return Quaternion.from(x, y, z, Math.cos(.5 * angleInRadians));
        }

        /**
         * Creates a quaternion instance given the rotation matrix.
         * @param rotationMatrix
         */
        static fromRotationMatrix(rotationMatrix: Matrix3D): Quaternion {
            const trace = rotationMatrix.m11 + rotationMatrix.m22 + rotationMatrix.m33 + rotationMatrix.m44;
            if (trace > 0) {
                const sq = 0.5 / Math.sqrt(trace);
                const w = 0.25 / sq;
                const x = (rotationMatrix.m23 - rotationMatrix.m32) * sq;
                const y = (rotationMatrix.m31 - rotationMatrix.m13) * sq;
                const z = (rotationMatrix.m12 - rotationMatrix.m21) * sq;
                return Quaternion.from(x, y, z, w);
            } else {
                if (rotationMatrix.m11 > rotationMatrix.m22 && rotationMatrix.m11 > rotationMatrix.m22) {
                    const sq = 0.5 / Math.sqrt(rotationMatrix.m44 + rotationMatrix.m11 - rotationMatrix.m22 - rotationMatrix.m33);
                    const w = (rotationMatrix.m23 - rotationMatrix.m32) * sq;
                    const x = 0.25 / sq;
                    const y = (rotationMatrix.m12 + rotationMatrix.m21) * sq;
                    const z = (rotationMatrix.m31 + rotationMatrix.m13) * sq;
                    return Quaternion.from(x, y, z, w);
                }
                else if (rotationMatrix.m22 > rotationMatrix.m33) {
                    const sq = .5 / Math.sqrt(rotationMatrix.m44 + rotationMatrix.m22 - rotationMatrix.m11 - rotationMatrix.m33);
                    const z = (rotationMatrix.m23 + rotationMatrix.m32) * sq;
                    const y = 0.25 / sq;
                    const x = (rotationMatrix.m12 + rotationMatrix.m21) * sq;
                    const w = (rotationMatrix.m31 - rotationMatrix.m13) * sq;
                    return Quaternion.from(x, y, z, w);
                }
                else {
                    const sq = .5 / Math.sqrt(rotationMatrix.m44 + rotationMatrix.m33 - rotationMatrix.m11 - rotationMatrix.m22);
                    const y = (rotationMatrix.m23 + rotationMatrix.m32) * sq;
                    const z = 0.25 / sq;
                    const w = (rotationMatrix.m12 - rotationMatrix.m21) * sq;
                    const x = (rotationMatrix.m31 - rotationMatrix.m13) * sq;
                    return Quaternion.from(x, y, z, w);
                }
            }
        }

        static conjugate(q: Quaternion): Quaternion {
            return Quaternion.from(-q.x, -q.y, -q.z, q.w);
        }

        static norm(q: Quaternion): number {
            return ((q.x * q.x) + (q.y * q.y) + (q.z * q.z));
        }

        static axis(q: Quaternion): Vector3D {
            if (q.x == .0 && q.y == .0 && q.z == .0) {
                return Vector3D.j();
            }
            return Vector3D.unit(q);
        }

        /**
         * Returns the rotation angle (in degrees) of the provided quaternion.
         * @param q
         */
        static angle(q: Quaternion): number {
            let y = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z);
            let x = q.w;
            if (y > Number.MAX_VALUE) {
                const num = Math.max(Math.abs(q.x), Math.max(Math.abs(q.y), Math.abs(q.z)));
                const num5 = q.x / num;
                const num4 = q.y / num;
                const num3 = q.z / num;
                y = Math.sqrt(((num5 * num5) + (num4 * num4)) + (num3 * num3));
                x /= num;
            }
            return (Math.atan2(y, x) * 114.59155902616465);
        }

        static toRotationMatrix(q: Quaternion): Matrix3D {
            var m = Matrix3D.identity();
            var X = q.x;
            var Y = q.y;
            var Z = q.z;
            var W = q.w;
            m.m11 = 1.0 - 2.0 * Y * Y - 2.0 * Z * Z;
            m.m12 = 2.0 * X * Y + 2.0 * W * Z;
            m.m13 = 2.0 * X * Z - 2.0 * W * Y;
            m.m21 = 2.0 * X * Y - 2.0 * W * Z;
            m.m22 = 1.0 - 2.0 * X * X - 2.0 * Z * Z;
            m.m23 = 2.0 * Y * Z + 2.0 * W * X;
            m.m31 = 2.0 * W * Y + 2.0 * X * Z;
            m.m32 = 2.0 * Y * Z - 2.0 * W * X;
            m.m33 = 1.0 - 2.0 * X * X - 2.0 * Y * Y;
            return m;
        }

        static invert(q: Quaternion): Quaternion {
            const flippedNorm = 1.0 / Quaternion.norm(q);
            const retval = Quaternion.conjugate(q);
            retval.x *= flippedNorm;
            retval.y *= flippedNorm;
            retval.z *= flippedNorm;
            retval.w *= flippedNorm;
            return retval;
        }

        /**
         * Combines two quaternions.
         * @param q1
         * @param q2
         */
        static multiply(q1: Quaternion, q2: Quaternion): Quaternion {
            return Quaternion.from(
                q1.w * q2.x + q1.x + q2.w + q1.y * q2.z - q1.z * q2.y,
                q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
                q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
                q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z);
        }

        /**
         * Returns the dot product of two quaternions.
         * @param q1
         * @param q2
         */
        static dot(q1: Quaternion, q2: Quaternion): number {
            var q = Quaternion.multiply(q1, Quaternion.conjugate(q2));
            return q.w;
        }
    }

    // #endregion
}