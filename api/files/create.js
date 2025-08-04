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

  const { name, type, projectId } = req.body;

  if (!name || !type || !projectId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if user has access to project
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'No access to project' });
    }

    // Create file
    const { data: file } = await supabase
      .from('files')
      .insert([{
        name,
        type,
        project_id: projectId,
        content: ''
      }])
      .select()
      .single();

    return res.status(201).json({ file });
  } catch (error) {
    console.error('Create file error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}