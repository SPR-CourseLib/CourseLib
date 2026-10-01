import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/axios";

function AdminRoute({ children }) {
  const [access, setAccess] = useState(() =>
    localStorage.getItem("accessToken") ? "checking" : "anonymous"
  );

  useEffect(() => {
    if (access !== "checking") return undefined;

    let active = true;

    api.get("/auth/me/")
      .then(({ data }) => {
        if (active) setAccess(data.is_staff ? "allowed" : "denied");
      })
      .catch(() => {
        if (active) setAccess("anonymous");
      });

    return () => {
      active = false;
    };
  }, [access]);

  if (access === "checking") {
    return <p role="status">Перевірка доступу...</p>;
  }

  if (access === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  if (access !== "allowed") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;