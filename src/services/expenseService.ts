import { supabase } from "../lib/supabase";

export interface Expense {
  id?: string;
  user_id: string;
  expense_name: string;
  expense_date: string;
  quantity?: string;
  rate?: string;
  amount: string;
  details?: string;
  created_at?: string;
}

export const saveExpense = async (
  userId: string,
  expenseName: string,
  expenseDate: string,
  amount: string,
  quantity?: string,
  rate?: string,
  details?: string
): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          user_id: userId,
          expense_name: expenseName,
          expense_date: expenseDate,
          quantity: quantity,
          rate: rate,
          amount: amount,
          details: details,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    console.error("Error saving expense:", error);
    throw error;
  }
};

export const getUserExpenses = async (userId: string): Promise<Expense[]> => {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", userId)
      .order("expense_date", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching expenses:", error);
    throw error;
  }
};

export const deleteExpense = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};
