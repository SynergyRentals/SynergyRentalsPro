import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set the document title
document.title = "Synergy Rentals AI Brain";

// Add favicon
const link = document.createElement("link");
link.rel = "icon";
link.href = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>✨</text></svg>";
document.head.appendChild(link);

createRoot(document.getElementById("root")!).render(<App />);
