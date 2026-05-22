import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

/**
 * Upload the generated nail design image to Supabase Storage and
 * insert a row into the `designs` table.
 *
 * @param base64Data  The result image as a raw base64 string (no data-URI prefix).
 * @param userId      The authenticated user's ID.
 * @returns           The public URL of the stored image.
 */
export async function saveDesignToSupabase(
  base64Data: string,
  userId: string,
): Promise<string> {
  // 1. Generate a unique file path: {userId}/{timestamp}_{random}.jpg
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  const filePath = `${userId}/${timestamp}_${random}.jpg`;

  // 2. Upload to the "designs" storage bucket
  const { error: uploadError } = await supabase.storage
    .from('designs')
    .upload(filePath, decode(base64Data), {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // 3. Get the public URL
  const { data: urlData } = supabase.storage
    .from('designs')
    .getPublicUrl(filePath);

  const imageUrl = urlData.publicUrl;

  if (!imageUrl) {
    throw new Error('Could not retrieve public URL for uploaded image.');
  }

  // 4. Insert a row into the designs table
  const { error: insertError } = await supabase
    .from('designs')
    .insert({
      user_id: userId,
      image_url: imageUrl,
    });

  if (insertError) {
    throw new Error(`Database insert failed: ${insertError.message}`);
  }

  return imageUrl;
}
