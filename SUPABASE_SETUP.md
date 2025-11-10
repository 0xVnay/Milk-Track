# Supabase Setup Guide - MilkTrack

## Role Permissions:

- **Admin** (You): All rights - create, edit, delete everything
- **Member**: Can upload receipts + view all records
- **Viewer**: Can only view records (read-only)

---

## 1. Create Supabase Project ✅ DONE

You already have your project set up with:
- URL: `https://lqvzffcsqgofexhyridv.supabase.co`
- API Key: Already in `.env.local`

---

## 2. Create Database Tables

1. **Go to** SQL Editor in Supabase dashboard
2. **Click** "New query"
3. **Copy the entire file** `SUPABASE_SCHEMA.sql`
4. **Paste** into SQL Editor
5. **Click** "Run" (Ctrl+Enter)
6. **Should see** "Success" message

This creates:
- `profiles` table - User roles and info
- `receipts` table - All dairy receipts
- Automatic profile creation on signup
- Row-level security policies

---

## 3. Create Storage Bucket

1. **Click** "Storage" in sidebar
2. **Click** "New bucket"
3. **Name**: `receipts`
4. **Toggle ON** "Public bucket"
5. **Click** "Create bucket"

---

## 4. Set Storage Policies

1. **Click** on the `receipts` bucket
2. **Click** "Policies" tab at the top
3. **For each policy below:**
   - Click "New policy"
   - Select "For full customization"
   - Paste the SQL code
   - Click "Review" then "Save policy"

**Open file** `SUPABASE_STORAGE_POLICIES.sql` and **run each policy** (4 total)

---

## 5. Make Yourself Admin

After you sign up in the app, run this SQL to become admin:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

Replace with YOUR actual email!

---

## 6. Test the App

1. **Sign up** in the app
2. **Run the admin SQL** above
3. **Upload a receipt**
4. **Check Supabase:**
   - Table Editor → profiles (your role should be 'admin')
   - Table Editor → receipts (should see 1 row)
   - Storage → receipts (should see 1 image)

---

## Summary of Roles:

| Role | View All | Upload | Edit | Delete |
|------|----------|--------|------|--------|
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Member** | ✅ | ✅ | ❌ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ |

---

## Managing Users:

### To change someone's role:
```sql
-- Make someone a member
UPDATE profiles
SET role = 'member'
WHERE email = 'member@example.com';

-- Make someone a viewer
UPDATE profiles
SET role = 'viewer'
WHERE email = 'viewer@example.com';
```

---

## ✅ Done!

You now have:
- 3-tier role system (Admin, Member, Viewer)
- Automatic profile creation on signup
- Secure data access based on roles
- No credit card required!

## Files Created:
1. `SUPABASE_SCHEMA.sql` - Database tables
2. `SUPABASE_STORAGE_POLICIES.sql` - Storage permissions
3. This guide - `SUPABASE_SETUP.md`
