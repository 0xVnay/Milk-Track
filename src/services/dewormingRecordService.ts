import { supabase } from "../lib/supabase";

export interface DewormingRecord {
  id?: string;
  user_id: string;
  animal_tag: string;
  deworming_date: string;
  medicine_name?: string;
  notes?: string;
  created_at?: string;
}

export const saveDewormingRecord = async (
  userId: string,
  animalTag: string,
  dewormingDate: string,
  medicineName?: string,
  notes?: string
): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from("deworming_records")
      .insert([
        {
          user_id: userId,
          animal_tag: animalTag,
          deworming_date: dewormingDate,
          medicine_name: medicineName,
          notes: notes,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    console.error("Error saving deworming record:", error);
    throw error;
  }
};

export const getUserDewormingRecords = async (userId: string): Promise<DewormingRecord[]> => {
  try {
    const { data, error } = await supabase
      .from("deworming_records")
      .select("*")
      .eq("user_id", userId)
      .order("deworming_date", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching deworming records:", error);
    throw error;
  }
};

export const deleteDewormingRecord = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("deworming_records")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting deworming record:", error);
    throw error;
  }
};
