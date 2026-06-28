/**
 * Promise resolved value.
 */
export type AsyncReturn<T extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<T>>;
