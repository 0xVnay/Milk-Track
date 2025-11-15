import { supabase } from "../lib/supabase";

export interface AIRecord {
  id?: string;
  user_id: string;
  animal_tag: string;
  ai_date: string;
  created_at?: string;
}

export const saveAIRecord = async (
  userId: string,
  animalTag: string,
  aiDate: string
): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from("ai_records")
      .insert([
        {
          user_id: userId,
          animal_tag: animalTag,
          ai_date: aiDate,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    console.error("Error saving AI record:", error);
    throw error;
  }
};

export const getUserAIRecords = async (userId: string): Promise<AIRecord[]> => {
  try {
    const { data, error } = await supabase
      .from("ai_records")
      .select("*")
      .eq("user_id", userId)
      .order("ai_date", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching AI records:", error);
    throw error;
  }
};

export const deleteAIRecord = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("ai_records")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting AI record:", error);
    throw error;
  }
};
