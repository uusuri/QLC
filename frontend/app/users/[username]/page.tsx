"use client";

import { useParams } from "next/navigation";

import { PublicProfile } from "@/components/PublicProfile";

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  return <PublicProfile username={params.username} />;
}
