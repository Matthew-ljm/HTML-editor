import { createSupabaseClient } from '../../utils/supabase.js';
import { verifyToken } from '../../utils/auth.js';

const supabase = createSupabaseClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify auth
  const { userId, error: authError } = verifyToken(req.headers.authorization);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  try {
    // Get user projects
    const { data } = await supabase
      .from('project_members')
      .select(`
        projects (
          id,
          name,
          created_at,
          owner_id
        )
      `)
      .eq('user_id', userId);

    const projects = data.map(item => item.projects);
    return res.status(200).json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}