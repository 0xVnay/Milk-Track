-- Create ai_records table for tracking animal artificial insemination
CREATE TABLE IF NOT EXISTS ai_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  animal_tag TEXT NOT NULL,
  ai_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS ai_records_user_id_idx ON ai_records(user_id);
CREATE INDEX IF NOT EXISTS ai_records_ai_date_idx ON ai_records(ai_date);

-- Enable Row Level Security
ALTER TABLE ai_records ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own records
CREATE POLICY "Users can view their own AI records"
  ON ai_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own records
CREATE POLICY "Users can insert their own AI records"
  ON ai_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own records
CREATE POLICY "Users can update their own AI records"
  ON ai_records
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy for users to delete their own records
CREATE POLICY "Users can delete their own AI records"
  ON ai_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ai_records_updated_at
  BEFORE UPDATE ON ai_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
