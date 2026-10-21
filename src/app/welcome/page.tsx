import { redirect } from "next/navigation";

/** The landing page moved to /. */
export default function WelcomeRedirect() {
  redirect("/");
}
