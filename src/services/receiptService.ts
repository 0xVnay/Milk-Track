import { supabase } from "../lib/supabase";

export interface Receipt {
  id?: string;
  user_id: string;
  date: string;
  quantity: string;
  fat: string;
  clr: string;
  fat_kg?: string;
  snf_kg?: string;
  base_rate: string;
  rate: string;
  amount: string;
  image_url: string;
  created_at?: string;
}

export const saveReceipt = async (
  userId: string,
  receiptData: Omit<Receipt, "id" | "user_id" | "created_at">,
  imageBlob?: Blob
): Promise<string> => {
  try {
    let publicUrl = '';

    // Upload image to Supabase Storage if provided
    if (imageBlob) {
      const fileName = `${userId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, imageBlob, {
          contentType: "image/jpeg",
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl: url } } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);

      publicUrl = url;
    }

    // Save receipt data to Supabase database
    const { data, error } = await supabase
      .from("receipts")
      .insert([
        {
          user_id: userId,
          date: receiptData.date,
          quantity: receiptData.quantity,
          fat: receiptData.fat,
          clr: receiptData.clr,
          fat_kg: receiptData.fat_kg,
          snf_kg: receiptData.snf_kg,
          base_rate: receiptData.base_rate,
          rate: receiptData.rate,
          amount: receiptData.amount,
          image_url: publicUrl,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    console.error("Error saving receipt:", error);
    throw error;
  }
};

export const getUserReceipts = async (userId: string): Promise<Receipt[]> => {
  try {
    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching receipts:", error);
    throw error;
  }
};
