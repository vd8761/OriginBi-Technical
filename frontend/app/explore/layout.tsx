"use client";

import React from "react";
import { AuthGuard } from "@/components/student/AuthGuard";

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
