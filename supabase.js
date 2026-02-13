
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"

const SUPABASE_URL = "https://rqdwpnddynwjgekopiea.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxZHdwbmRkeW53amdla29waWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzQ3MzcsImV4cCI6MjA4NjQxMDczN30.i431TCpDpYQ6wObMnr62iRiqF6tyDj5hRGk73ZPFe4Y"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});
