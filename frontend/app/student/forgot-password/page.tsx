import ForgotPassword from "@/components/student/ForgotPassword";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | OriginBI Technical Assessment",
  description: "Recover your assessment portal credentials.",
};

export default function StudentForgotPasswordPage() {
  return <ForgotPassword />;
}
