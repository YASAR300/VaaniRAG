import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config';

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
