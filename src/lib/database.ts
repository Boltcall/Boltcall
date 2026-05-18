import { supabase } from './supabase';

export interface WorkspaceData {
  name: string;
  slug: string;
  user_id: string;
}

export interface BusinessProfileData {
  workspace_id: string;
  user_id: string;
  business_name: string;
  owner_name?: string | null;
  website_url?: string;
  main_category: string;
  country: string;
  service_areas: string[];
  opening_hours: Record<string, { open: string; close: string; closed: boolean }>;
  languages: string[];
}

export interface CreatedWorkspace {
  id: string;
  name: string;
  slug: string;
  user_id: string;
  created_at: string;
}

export interface CreatedBusinessProfile {
  id: string;
  workspace_id: string;
  user_id: string;
  business_name: string;
  website_url?: string;
  main_category: string;
  country: string;
  service_areas: string[];
  opening_hours: Record<string, { open: string; close: string; closed: boolean }>;
  languages: string[];
  created_at: string;
}

/**
 * Creates a new workspace for a user
 */
export async function createWorkspace(data: WorkspaceData): Promise<CreatedWorkspace> {
  try {
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating workspace:', error);

      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('workspaces_slug_key')) {
          throw new Error('A workspace with this identifier already exists. Please try again.');
        } else if (error.message.includes('unique_user_business_name')) {
          throw new Error('You already have a business with this name. Please choose a different name.');
        } else {
          // user_id unique constraint — user already has a workspace, return it
          const { data: existing } = await supabase
            .from('workspaces')
            .select('*')
            .eq('user_id', data.user_id)
            .single();
          if (existing) return existing;
        }
      }

      throw new Error(`Failed to create workspace: ${error.message}`);
    }

    return workspace;
  } catch (error) {
    console.error('Workspace creation error:', error);
    throw error;
  }
}

/**
 * Creates a new business profile for a workspace
 */
export async function createBusinessProfile(data: BusinessProfileData): Promise<CreatedBusinessProfile> {
  try {
    const { data: businessProfile, error } = await supabase
      .from('business_profiles')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating business profile:', error);

      if (error.code === '23505') {
        // Profile already exists for this user/workspace — return the existing one
        const { data: existing } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', data.user_id)
          .single();
        if (existing) return existing;
      }

      throw new Error(`Failed to create business profile: ${error.message}`);
    }

    return businessProfile;
  } catch (error) {
    console.error('Business profile creation error:', error);
    throw error;
  }
}

/**
 * Creates both workspace and business profile for a user
 * This is the main function to call when a user completes the business profile step
 */
export async function createUserWorkspaceAndProfile(
  userId: string,
  businessProfileData: Omit<BusinessProfileData, 'workspace_id' | 'user_id'>
): Promise<{ workspace: CreatedWorkspace; businessProfile: CreatedBusinessProfile }> {
  try {
    // Generate unique workspace slug using timestamp and random string to avoid duplicates
    const timestamp = Date.now().toString(36);
    const randomString = Math.random().toString(36).substr(2, 5);
    const businessSlug = businessProfileData.business_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 20); // Limit length
    const workspaceSlug = `${businessSlug}-${timestamp}-${randomString}`;

    // Create workspace first
    const workspace = await createWorkspace({
      name: businessProfileData.business_name,
      slug: workspaceSlug,
      user_id: userId,
    });

    // Create business profile
    const businessProfile = await createBusinessProfile({
      ...businessProfileData,
      workspace_id: workspace.id,
      user_id: userId,
    });

    return { workspace, businessProfile };
  } catch (error) {
    console.error('Error creating workspace and business profile:', error);
    throw error;
  }
}

/**
 * Gets all workspaces for a user
 */
export async function getUserWorkspaces(userId: string): Promise<CreatedWorkspace[]> {
  try {
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workspaces:', error);
      throw new Error(`Failed to fetch workspaces: ${error.message}`);
    }

    return workspaces || [];
  } catch (error) {
    console.error('Workspaces fetch error:', error);
    throw error;
  }
}

/**
 * Gets all business profiles for a user
 */
export async function getUserBusinessProfiles(userId: string): Promise<CreatedBusinessProfile[]> {
  try {
    const { data: businessProfiles, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching business profiles:', error);
      throw new Error(`Failed to fetch business profiles: ${error.message}`);
    }

    return businessProfiles || [];
  } catch (error) {
    console.error('Business profiles fetch error:', error);
    throw error;
  }
}
