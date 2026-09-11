import "@/store/initialize";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import { setupNavigation } from "@/routes/navigation";

setupNavigation();

const root: ReactDOM.Root = ReactDOM.createRoot(
  document.getElementById("root")!,
);
root.render(<App />);
