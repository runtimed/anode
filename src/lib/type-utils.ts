/**
 * Type utility to check if T extends U
 * @example
 * type Test = Extends<string, string>; // true
 * type Test2 = Extends<number, string>; // false
 */
export type Extends<T, U> = T extends U ? true : false;

/**
 * Type utility to assert that T is true
 * @example
 * type Test = Expect<Extends<string, string>>; // true
 * type Test2 = Expect<Extends<number, string>>; // Type error
 */
export type Expect<T extends true> = T;

/**
 * Type utility to check if two types are equal
 * @example
 * type Test = TypeEqual<string, string>; // true
 * type Test2 = TypeEqual<string, number>; // false
 */
export type TypeEqual<T, U> =
  (<X>() => X extends T ? 1 : 2) extends <X>() => X extends U ? 1 : 2
    ? true
    : false;
