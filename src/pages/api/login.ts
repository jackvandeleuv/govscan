import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { AuthString } from '../index';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

type ResponseData = {
  message: string;
  token?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { email, password } = req.body as AuthString;
  
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  const token = data.session?.access_token;
  data.session?.refresh_token

  if (token) {
    res.status(200).json({ message: 'Logged in successfully', token });
  } else {
    res.status(500).json({ message: 'Failed to issue JWT' });
  }
}
