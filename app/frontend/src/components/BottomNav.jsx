import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Ajouter", icon: "+" },
  { to: "/carte", label: "Carte", icon: "◎" },
  { to: "/liste", label: "Liste", icon: "≡" },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === "/"}
          className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
