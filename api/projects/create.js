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

  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    // Create project
    const { data: project } = await supabase
      .from('projects')
      .insert([{ name, owner_id: userId }])
      .select()
      .single();

    // Add owner as collaborator
    await supabase
      .from('project_members')
      .insert([{ project_id: project.id, user_id: userId, role: 'owner' }]);

    return res.status(201).json({ project });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}