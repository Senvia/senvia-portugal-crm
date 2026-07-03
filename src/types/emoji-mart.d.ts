// emoji-mart ships as plain JS with no bundled type declarations. Declare the
// modules we use so TypeScript treats them as `any` instead of erroring (TS7016).
declare module "emoji-mart";
declare module "@emoji-mart/react";
declare module "@emoji-mart/data";

// The <em-emoji> web component (registered by emoji-mart's init) renders a single
// emoji in the initialized set (Apple), so it looks the same on every device.
declare namespace JSX {
  interface IntrinsicElements {
    "em-emoji": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      native?: string;
      id?: string;
      shortcodes?: string;
      set?: string;
      size?: string | number;
      fallback?: string;
    };
  }
}
