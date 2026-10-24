import { ProfileScreen } from "@/components/features/profile/profile-screen";
import { getCurrentUser } from "@/lib/auth/server";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  return <ProfileScreen email={user?.email ?? null} />;
}
