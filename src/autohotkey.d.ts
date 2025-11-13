declare module 'autohotkey.js' {
  class AutoHotkey {
    run(script: string): Promise<void>;
  }

  export default AutoHotkey;
}
