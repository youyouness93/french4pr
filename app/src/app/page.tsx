import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

/** Sends each person to their own space. */
export default async function Home() {
  const { profile } = await requireProfile();
  redirect(profile.role === "student" ? "/dashboard" : "/admin");
}
