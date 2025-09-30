export const assignRoleToUser = async (uid: string, role: string, canEdit: boolean) => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/set-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Optionally, add a token to verify admin privileges
        // "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ uid, role, canEdit }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to set role");
    alert(`Success: ${data.message}`);
  } catch (err: any) {
    console.error(err);
    alert(`Error: ${err.message}`);
  }
};
