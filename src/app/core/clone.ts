/** Deep copy for plain JSON data (the mock API's records). */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
