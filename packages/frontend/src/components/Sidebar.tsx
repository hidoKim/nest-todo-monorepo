import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/today", label: "Today" },
  { to: "/tomorrow", label: "Tomorrow" },
  { to: "/this-week", label: "This Week" },
  { to: "/next-week", label: "Next Week" },
  { to: "/trash", label: "Trash" },
];

const Sidebar = () => {
  return (
    <aside className="w-full md:w-52 md:shrink-0">
      <div className="rounded-xl border border-muji-line bg-muji-panel p-4 shadow-note">
        <p className="text-xs uppercase tracking-[0.2em] text-muji-muted">
          Muji Note
        </p>
        <h1 className="mt-2 text-xl font-semibold text-muji-text">
          Todo Notebook
        </h1>
        <nav className="mt-5 grid gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "rounded-md border px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "border-muji-accent bg-muji-accent text-muji-panel"
                    : "border-muji-line text-muji-muted hover:bg-muji-bg hover:text-muji-text",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
