import { Outlet } from "react-router-dom";

import Header from "../components/Header";
import Footer from "../components/Footer";

function MainLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />

      <main className="container py-4 flex-grow-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default MainLayout;