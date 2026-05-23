import { supabase } from './supabase';

export interface SavedDesign {
  id: string;
  image_url: string;
  created_at: string;
}

/**
 * Fetch all saved designs for the given user, newest first.
 */
export async function fetchDesigns(userId: string): Promise<SavedDesign[]> {
  const { data, error } = await supabase
    .from('designs')
    .select('id, image_url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load designs: ${error.message}`);
  }

  return (data ?? []) as SavedDesign[];
}
