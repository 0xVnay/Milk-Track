-- Create deworming_records table for tracking animal deworming
CREATE TABLE IF NOT EXISTS deworming_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  animal_tag TEXT NOT NULL,
  deworming_date DATE NOT NULL,
  medicine_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS deworming_records_user_id_idx ON deworming_records(user_id);
CREATE INDEX IF NOT EXISTS deworming_records_deworming_date_idx ON deworming_records(deworming_date);

-- Enable Row Level Security
ALTER TABLE deworming_records ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own records
CREATE POLICY "Users can view their own deworming records"
  ON deworming_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own records
CREATE POLICY "Users can insert their own deworming records"
  ON deworming_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own records
CREATE POLICY "Users can update their own deworming records"
  ON deworming_records
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy for users to delete their own records
CREATE POLICY "Users can delete their own deworming records"
  ON deworming_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_deworming_records_updated_at
  BEFORE UPDATE ON deworming_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
