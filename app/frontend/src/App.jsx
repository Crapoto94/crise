import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import NameModal from "./components/NameModal";
import AdminBar from "./components/AdminBar";
import UploadPage from "./pages/UploadPage";
import MapPage from "./pages/MapPage";
import ListPage from "./pages/ListPage";
import AdminPage from "./pages/AdminPage";
import { getUploaderName, setUploaderName } from "./lib/device";
import { AdminProvider } from "./lib/AdminContext";
import { startGeoWarmup, stopGeoWarmup } from "./lib/geoWarmup";

export default function App() {
  const [name, setName] = useState(getUploaderName());

  useEffect(() => {
    if (!name) return;
    // Demarre le GPS des l'ouverture de l'app : la puce a ainsi le temps de
    // s'accrocher aux satellites avant qu'une photo soit prise, au lieu de
    // ne demander la position qu'a l'instant T (souvent trop tard pour du GPS precis).
    startGeoWarmup();
    return () => stopGeoWarmup();
  }, [name]);

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
    <AdminProvider>
      <BrowserRouter>
        <div className="app-shell">
          <AdminBar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/carte" element={<MapPage />} />
              <Route path="/liste" element={<ListPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </BrowserRouter>
    </AdminProvider>
  );
}
