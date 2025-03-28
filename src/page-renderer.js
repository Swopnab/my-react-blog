import React from "react";
import { useParams } from "react-router-dom";

export default function PageRenderer() {
  const { path } = useParams();

  try {
    const PageComponent = require(`./pages/${path}`).default;
    return <PageComponent />;
  } catch (err) {
    console.warn(`Page "${path}" not found. Rendering 404.`);
    return <h1>404 - Page Not Found</h1>;
  }
}
