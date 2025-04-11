import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wmadihwzqalzlybqdjsi.supabase.co'; // Замените на свой URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtYWRpaHd6cWFsemx5YnFkanNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMDYxNjIsImV4cCI6MjA1OTU4MjE2Mn0.H9p9jMxY_2UJ2milbGN5KpvWAlYL2JN51OEvIe7_A4Y'; // Замените на свой ключ

export const supabase = createClient(supabaseUrl, supabaseKey);
