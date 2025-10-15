// web-admin/app/dashboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
 
export default async function DashboardIndex() {
 const uid = (await cookies()).get("uid")?.value;
 if (!uid) redirect("/login");
 redirect(`/dashboard/${uid}`);
}