import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Buffer = (window as any).Buffer || Buffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).process = (window as any).process || { env: {} };
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
