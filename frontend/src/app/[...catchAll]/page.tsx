// Catch-all route — redirect any unknown path to the landing page.
import { redirect } from "next/navigation";

export default function CatchAllPage() {
  redirect("/");
}
