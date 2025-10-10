import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type SettingCategory = "general" | "payment" | "booking" | "moderation" | "gdpr" | "integration";

export const useAdminSettings = (category?: SettingCategory) => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings", category],
    queryFn: async () => {
      let query = supabase.from("system_settings").select("*");
      
      if (category) {
        query = query.eq("category", category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Convert array to object for easier access
      return data?.reduce((acc, setting) => {
        const jsonValue = setting.value as any;
        // Parse JSON values if they're strings
        acc[setting.key] = typeof jsonValue === "string" ? JSON.parse(jsonValue) : jsonValue;
        return acc;
      }, {} as Record<string, any>);
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ settingKey, value }: { settingKey: string; value: any }) => {
      // First get the existing setting to check if we need category
      const { data: existing } = await supabase
        .from("system_settings")
        .select("category")
        .eq("key", settingKey)
        .single();

      const { error } = await supabase
        .from("system_settings")
        .update({
          value: JSON.stringify(value),
          updated_at: new Date().toISOString(),
        })
        .eq("key", settingKey);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  const updateSetting = async (settingKey: string, value: any) => {
    return updateSettingMutation.mutateAsync({ settingKey, value });
  };

  return {
    settings,
    isLoading,
    updateSetting,
  };
};
