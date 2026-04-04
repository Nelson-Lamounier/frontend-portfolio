declare module 'vinxi/http' {
  export function getCookie(name: string): string | undefined;
  export function setCookie(name: string, value: string, options?: any): void;
  export function deleteCookie(name: string, options?: any): void;
}
