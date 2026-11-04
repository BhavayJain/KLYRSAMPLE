import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import KlyrExperience from "@/KlyrExperience";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<KlyrExperience />} />
        <Route path="/ingredient/:slug" element={<KlyrExperience />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
