import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = (userId: string | undefined) => {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        if (error) throw error;
        
        setRoles(data?.map(r => r.role) || []);
      } catch (error) {
        console.error("Error fetching roles:", error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [userId]);

  const hasRole = (role: string) => roles.includes(role);
  const isSuperAdmin = hasRole("super_admin");
  const isExecutive = hasRole("executive");
  const isVolunteer = hasRole("volunteer");
  const isMember = hasRole("member");

  return {
    roles,
    loading,
    hasRole,
    isSuperAdmin,
    isExecutive,
    isVolunteer,
    isMember
  };
};
