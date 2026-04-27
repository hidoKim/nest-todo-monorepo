import { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-muji-bg px-4 py-6 font-notebook text-muji-text md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <Sidebar />
        <main className="flex-1">
          <div className="rounded-xl border border-muji-line bg-muji-panel p-4 shadow-note md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
