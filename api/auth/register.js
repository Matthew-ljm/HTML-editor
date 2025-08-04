import { createSupabaseClient } from '../../utils/supabase.js';
import bcrypt from 'bcryptjs';

const supabase = createSupabaseClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const { data: newUser } = await supabase
      .from('users')
      .insert([
        { username, password: hashedPassword }
      ])
      .select();

    if (!newUser || newUser.length === 0) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    return res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}