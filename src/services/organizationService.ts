import { supabase } from "../lib/supabase";

export interface Organization {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'member';
  created_at?: string;
}

export interface OrganizationMember {
  user_id: string;
  email: string;
  role: 'admin' | 'member';
}

interface UserOrganizationWithOrg {
  organization_id: string;
  role: 'admin' | 'member';
  organizations: Organization;
}

interface UserOrganizationWithUser {
  user_id: string;
  role: 'admin' | 'member';
  users: {
    email: string;
  } | null;
}

/**
 * Get all organizations the current user belongs to
 */
export const getUserOrganizations = async (userId: string): Promise<Organization[]> => {
  try {
    const { data, error } = await supabase
      .from("user_organizations")
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name,
          description,
          created_at,
          updated_at
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;

    // Transform the data to return just the organizations
    return data?.map((item: UserOrganizationWithOrg) => item.organizations) || [];
  } catch (error) {
    console.error("Error fetching user organizations:", error);
    throw error;
  }
};

/**
 * Get all members of an organization
 */
export const getOrganizationMembers = async (
  organizationId: string
): Promise<OrganizationMember[]> => {
  try {
    const { data, error } = await supabase
      .from("user_organizations")
      .select(`
        user_id,
        role,
        users:user_id (
          email
        )
      `)
      .eq("organization_id", organizationId);

    if (error) throw error;

    // Transform the data to return member information
    return data?.map((item: UserOrganizationWithUser) => ({
      user_id: item.user_id,
      email: item.users?.email || 'Unknown',
      role: item.role
    })) || [];
  } catch (error) {
    console.error("Error fetching organization members:", error);
    throw error;
  }
};

/**
 * Get user's role in a specific organization
 */
export const getUserOrganizationRole = async (
  userId: string,
  organizationId: string
): Promise<'admin' | 'member' | null> => {
  try {
    const { data, error } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .single();

    if (error) throw error;

    return data?.role || null;
  } catch (error) {
    console.error("Error fetching user organization role:", error);
    return null;
  }
};

/**
 * Create a new organization (user becomes admin)
 */
export const createOrganization = async (
  name: string,
  description?: string
): Promise<Organization> => {
  try {
    // First, create the organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert([{ name, description }])
      .select()
      .single();

    if (orgError) throw orgError;

    // Then, add the current user as an admin
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("No authenticated user");

    const { error: memberError } = await supabase
      .from("user_organizations")
      .insert([{
        user_id: user.id,
        organization_id: org.id,
        role: 'admin'
      }]);

    if (memberError) throw memberError;

    return org;
  } catch (error) {
    console.error("Error creating organization:", error);
    throw error;
  }
};

/**
 * Add a user to an organization
 */
export const addUserToOrganization = async (
  userId: string,
  organizationId: string,
  role: 'admin' | 'member' = 'member'
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("user_organizations")
      .insert([{
        user_id: userId,
        organization_id: organizationId,
        role
      }]);

    if (error) throw error;
  } catch (error) {
    console.error("Error adding user to organization:", error);
    throw error;
  }
};

/**
 * Remove a user from an organization
 */
export const removeUserFromOrganization = async (
  userId: string,
  organizationId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("user_organizations")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", organizationId);

    if (error) throw error;
  } catch (error) {
    console.error("Error removing user from organization:", error);
    throw error;
  }
};

/**
 * Update organization details
 */
export const updateOrganization = async (
  organizationId: string,
  updates: Partial<Pick<Organization, 'name' | 'description'>>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", organizationId);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating organization:", error);
    throw error;
  }
};

/**
 * Delete an organization
 */
export const deleteOrganization = async (organizationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", organizationId);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting organization:", error);
    throw error;
  }
};
