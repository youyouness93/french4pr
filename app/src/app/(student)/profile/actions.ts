"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

const str = (v: FormDataEntryValue | null, max: number) => {
  const s = String(v ?? "").trim().slice(0, max);
  return s || null;
};

export async function updateMyProfile(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const testType = String(formData.get("test_type") ?? "");
  const { error } = await supabase.from("profiles").update({
    full_name: str(formData.get("full_name"), 200),
    phone: str(formData.get("phone"), 40),
    city: str(formData.get("city"), 100),
    immigration_status: str(formData.get("immigration_status"), 60),
    permit_expiry: str(formData.get("permit_expiry"), 10),
    test_type: testType === "TEF" || testType === "TCF" ? testType : null,
    test_date: str(formData.get("test_date"), 10),
  }).eq("id", profile.id); // role, level and plan are protected by a database trigger
  revalidatePath("/", "layout");
  redirect(error ? "/profile?error=1" : "/profile?saved=1");
}
