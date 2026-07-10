// monaco-editor ships no "exports" map entry for the core-only ESM entry
// point, so the bundler-resolution build can't find its types; the runtime
// module is identical in API to the package root.
declare module 'monaco-editor/esm/vs/editor/editor.api' {
  export * from 'monaco-editor'
}
declare module 'monaco-editor/esm/vs/editor/editor.worker?worker' {
  const WorkerFactory: new () => Worker
  export default WorkerFactory
}
