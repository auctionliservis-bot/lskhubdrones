import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tables } from "@/integrations/supabase/types";

type SurveyRow = Tables<"survey_responses">;

async function userIsAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export const checkAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { isAdmin: await userIsAdmin(context.userId) };
  });

export const getAdminSurveyResponses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await userIsAdmin(context.userId))) {
      throw new Error("Нет прав администратора");
    }

    const { data, error } = await supabaseAdmin
      .from("survey_responses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { rows: (data ?? []) as SurveyRow[] };
  });