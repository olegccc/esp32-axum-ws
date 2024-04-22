declare module '*.css' {
  const exports: { [exportName: string]: string };
  export = exports;
}

declare module '*.scss' {
  const exports: { [exportName: string]: string };
  export = exports;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}
