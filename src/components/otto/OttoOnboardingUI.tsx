import { OttoSpotlight } from "./OttoSpotlight";
import { OttoModalHost } from "./OttoModalHost";

// Single mount point for Otto's visual layer (spotlight tours + managed modals).
// Rendered once inside the authenticated app layout so tours can drive navigation
// and modals from anywhere.
export function OttoOnboardingUI() {
  return (
    <>
      <OttoSpotlight />
      <OttoModalHost />
    </>
  );
}
