-- ============================================
-- Add payer_name column to expenses table
-- ============================================

-- Add the payer_name column (optional field)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS payer_name TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN expenses.payer_name IS 'Name of the person who paid for the expense';

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the updated table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses'
ORDER BY ordinal_position;
