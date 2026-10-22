import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** The signed-in home is Today (approved app mockup). */
export default function AppHome() {
  redirect("/app/today");
}
