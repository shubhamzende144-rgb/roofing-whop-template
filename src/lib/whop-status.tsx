import { createContext, useContext } from "react";

/** Whether the Whop Elements SDK failed to load, plus a retry. Lets the site stay up if it does. */
export interface WhopLoadState {
  failed: boolean;
  retry: () => void;
}

export const WhopLoadContext = createContext<WhopLoadState>({ failed: false, retry: () => {} });
export const useWhopLoad = () => useContext(WhopLoadContext);
