import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    // Find all recurring expenses due for generation
    const { data: expenses, error: fetchErr } = await supabase
      .from("expenses")
      .select("*")
      .eq("is_recurring", true)
      .lte("next_recurrence_date", today)
      .not("next_recurrence_date", "is", null);

    if (fetchErr) throw fetchErr;
    if (!expenses || expenses.length === 0) {
      return new Response(JSON.stringify({ success: true, generated: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;

    for (const expense of expenses) {
      // Create new expense record for this month
      const { error: insertErr } = await supabase
        .from("expenses")
        .insert({
          organization_id: expense.organization_id,
          category_id: expense.category_id,
          description: expense.description,
          amount: expense.amount,
          expense_date: expense.next_recurrence_date,
          is_recurring: false, // Generated copy is not recurring itself
          notes: expense.notes,
          created_by: expense.created_by,
          bank_account_id: expense.bank_account_id,
        });

      if (insertErr) {
        console.error(`Error generating expense for ${expense.id}:`, insertErr);
        continue;
      }

      // Advance next_recurrence_date by 1 month
      const nextDate = new Date(expense.next_recurrence_date + "T00:00:00");
      nextDate.setMonth(nextDate.getMonth() + 1);
      const nextDateStr = nextDate.toISOString().split("T")[0];

      const { error: updateErr } = await supabase
        .from("expenses")
        .update({ next_recurrence_date: nextDateStr })
        .eq("id", expense.id);

      if (updateErr) {
        console.error(`Error updating next_recurrence_date for ${expense.id}:`, updateErr);
      }

      generated++;
    }

    return new Response(JSON.stringify({ success: true, generated }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-recurring-expenses:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
