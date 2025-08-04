import { createSupabaseClient } from '../../utils/supabase.js';
import { verifyToken } from '../../utils/auth.js';

const supabase = createSupabaseClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify auth
  const { userId, error: authError } = verifyToken(req.headers.authorization);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const { id } = req.query;
  const { content } = req.body;

  if (!id || content === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if file exists and get project ID
    const { data: file } = await supabase
      .from('files')
      .select('project_id')
      .eq('id', id)
      .single();

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user has access to project
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', file.project_id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'No access to project' });
    }

    // Update file
    const { data: updatedFile } = await supabase
      .from('files')
      .update({ content, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    return res.status(200).json({ file: updatedFile });
  } catch (error) {
    console.error('Update file error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}