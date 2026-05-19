import { redirect } from "next/navigation";

export default function AdminQuestionsRedirect() {
  redirect("/admin/question-banks");
}
