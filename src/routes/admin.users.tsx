import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/users")({ component: UsersAdmin });

function UsersAdmin() {
  const { data } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role, created_at");
      return roles ?? [];
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Users & Roles</h1>
      <p className="text-sm text-muted-foreground">Role assignments. User detail view coming in Phase 2.</p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">User ID</th><th>Role</th><th>Assigned</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((r: any, i: number) => (
              <tr key={i} className="border-t border-border/60">
                <td className="p-3 font-mono text-xs">{r.user_id}</td>
                <td className="capitalize">{r.role}</td>
                <td className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-sm text-muted-foreground">No role records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
