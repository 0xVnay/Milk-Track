-- ============================================
-- COMPLETE ORGANIZATION MIGRATION
-- This file contains all migrations needed to add organization-level access control
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: CREATE ORGANIZATIONS INFRASTRUCTURE
-- ============================================

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_organizations junction table (many-to-many)
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_organizations_user_id_idx ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS user_organizations_organization_id_idx ON user_organizations(organization_id);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Organizations policies: users can see organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = organizations.id
      AND user_organizations.user_id = auth.uid()
    )
  );

-- Only admins can insert organizations
CREATE POLICY "Admins can insert organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = organizations.id
      AND user_organizations.user_id = auth.uid()
      AND user_organizations.role = 'admin'
    )
  );

-- Only admins can update organizations
CREATE POLICY "Admins can update organizations"
  ON organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = organizations.id
      AND user_organizations.user_id = auth.uid()
      AND user_organizations.role = 'admin'
    )
  );

-- Only admins can delete organizations
CREATE POLICY "Admins can delete organizations"
  ON organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = organizations.id
      AND user_organizations.user_id = auth.uid()
      AND user_organizations.role = 'admin'
    )
  );

-- User organizations policies
CREATE POLICY "Users can view their own memberships"
  ON user_organizations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can insert new members to their organizations
CREATE POLICY "Admins can add members to their organizations"
  ON user_organizations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.role = 'admin'
    )
  );

-- Admins can update memberships in their organizations
CREATE POLICY "Admins can update memberships in their organizations"
  ON user_organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.role = 'admin'
    )
  );

-- Admins can remove members from their organizations
CREATE POLICY "Admins can remove members from their organizations"
  ON user_organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.role = 'admin'
    )
  );

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- STEP 2: MIGRATE RECEIPTS TABLE
-- ============================================

-- Add organization_id column
ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS receipts_organization_id_idx ON receipts(organization_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Everyone can view all receipts" ON receipts;
DROP POLICY IF EXISTS "Admin and Members can insert receipts" ON receipts;
DROP POLICY IF EXISTS "Admin can update receipts" ON receipts;
DROP POLICY IF EXISTS "Admin can delete receipts" ON receipts;

-- Create new RLS policies based on organization membership
CREATE POLICY "Users can view receipts in their organizations"
  ON receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = receipts.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert receipts in their organizations"
  ON receipts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = receipts.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update receipts in their organizations"
  ON receipts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = receipts.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete receipts in their organizations"
  ON receipts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = receipts.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );


-- ============================================
-- STEP 3: MIGRATE EXPENSES TABLE
-- ============================================

-- Add organization_id column
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS expenses_organization_id_idx ON expenses(organization_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;

-- Create new RLS policies based on organization membership
CREATE POLICY "Users can view expenses in their organizations"
  ON expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = expenses.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert expenses in their organizations"
  ON expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = expenses.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update expenses in their organizations"
  ON expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = expenses.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete expenses in their organizations"
  ON expenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = expenses.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );


-- ============================================
-- STEP 4: MIGRATE AI_RECORDS TABLE
-- ============================================

-- Add organization_id column
ALTER TABLE ai_records
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS ai_records_organization_id_idx ON ai_records(organization_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own AI records" ON ai_records;
DROP POLICY IF EXISTS "Users can insert their own AI records" ON ai_records;
DROP POLICY IF EXISTS "Users can update their own AI records" ON ai_records;
DROP POLICY IF EXISTS "Users can delete their own AI records" ON ai_records;

-- Create new RLS policies based on organization membership
CREATE POLICY "Users can view AI records in their organizations"
  ON ai_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = ai_records.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert AI records in their organizations"
  ON ai_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = ai_records.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update AI records in their organizations"
  ON ai_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = ai_records.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete AI records in their organizations"
  ON ai_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = ai_records.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );


-- ============================================
-- STEP 5: MIGRATE DEWORMING_RECORDS TABLE
-- ============================================

-- Add organization_id column
ALTER TABLE deworming_records
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS deworming_records_organization_id_idx ON deworming_records(organization_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own deworming records" ON deworming_records;
DROP POLICY IF EXISTS "Users can insert their own deworming records" ON deworming_records;
DROP POLICY IF EXISTS "Users can update their own deworming records" ON deworming_records;
DROP POLICY IF EXISTS "Users can delete their own deworming records" ON deworming_records;

-- Create new RLS policies based on organization membership
CREATE POLICY "Users can view deworming records in their organizations"
  ON deworming_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = deworming_records.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert deworming records in their organizations"
  ON deworming_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = deworming_records.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update deworming records in their organizations"
  ON deworming_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = deworming_records.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete deworming records in their organizations"
  ON deworming_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.organization_id = deworming_records.organization_id
      AND user_organizations.user_id = auth.uid()
    )
  );


-- ============================================
-- STEP 6: DATA MIGRATION (MANUAL STEP)
-- ============================================

-- IMPORTANT: After running the above migrations, you MUST:
-- 1. Create at least one organization
-- 2. Assign all existing users to that organization
-- 3. Update all existing records with the organization_id

-- Example - REPLACE [YOUR_ORG_NAME] with actual name:
-- INSERT INTO organizations (name, description)
-- VALUES ('[YOUR_ORG_NAME]', 'Default organization for existing users');

-- Get the organization ID and use it below:
-- SELECT id FROM organizations WHERE name = '[YOUR_ORG_NAME]';

-- Then assign all users to this organization (REPLACE [ORG_ID_HERE]):
-- INSERT INTO user_organizations (user_id, organization_id, role)
-- SELECT id, '[ORG_ID_HERE]', 'admin'
-- FROM auth.users;

-- Update all existing records with organization_id (REPLACE [ORG_ID_HERE]):
-- UPDATE receipts SET organization_id = '[ORG_ID_HERE]' WHERE organization_id IS NULL;
-- UPDATE expenses SET organization_id = '[ORG_ID_HERE]' WHERE organization_id IS NULL;
-- UPDATE ai_records SET organization_id = '[ORG_ID_HERE]' WHERE organization_id IS NULL;
-- UPDATE deworming_records SET organization_id = '[ORG_ID_HERE]' WHERE organization_id IS NULL;

-- Finally, make organization_id NOT NULL (uncomment after data migration):
-- ALTER TABLE receipts ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE expenses ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE ai_records ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE deworming_records ALTER COLUMN organization_id SET NOT NULL;


-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Run this entire SQL file in Supabase SQL Editor
-- 2. Create your organization and assign users (see STEP 6 comments)
-- 3. Update existing data with organization_id (see STEP 6 comments)
-- 4. Make organization_id NOT NULL (see STEP 6 comments)
-- 5. Update your React components to use OrganizationContext
-- ============================================
