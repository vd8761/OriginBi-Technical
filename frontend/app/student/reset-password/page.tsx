import ResetPassword from "@/components/student/ResetPassword";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | OriginBI Technical Assessment",
  description: "Set a new password for your assessment portal account.",
};

export default function StudentResetPasswordPage() {
  return <ResetPassword />;
}
