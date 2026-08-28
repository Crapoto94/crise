import { createContext, useContext, useState } from "react";
import { verifyAdminPassword } from "./api";
import { getAdminPassword, setAdminPassword, clearAdminPassword } from "./device";

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [password, setPassword] = useState(getAdminPassword());

  async function login(candidate) {
    const ok = await verifyAdminPassword(candidate);
    if (ok) {
      setAdminPassword(candidate);
      setPassword(candidate);
    }
    return ok;
  }

  function logout() {
    clearAdminPassword();
    setPassword("");
  }

  return (
    <AdminContext.Provider value={{ isAdmin: Boolean(password), password, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
