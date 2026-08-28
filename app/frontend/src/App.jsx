import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import NameModal from "./components/NameModal";
import UploadPage from "./pages/UploadPage";
import MapPage from "./pages/MapPage";
import ListPage from "./pages/ListPage";
import { getUploaderName, setUploaderName } from "./lib/device";

export default function App() {
  const [name, setName] = useState(getUploaderName());

  if (!name) {
    return (
      <NameModal
        onSubmit={(value) => {
          setUploaderName(value);
          setName(value);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/carte" element={<MapPage />} />
            <Route path="/liste" element={<ListPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
