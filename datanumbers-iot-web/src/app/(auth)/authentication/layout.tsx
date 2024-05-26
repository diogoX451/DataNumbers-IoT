"use client";
import { Container } from "react-bootstrap";

export default function AuthLayout({ children }) {
  return <Container className="d-flex flex-column">{children}</Container>;
}
