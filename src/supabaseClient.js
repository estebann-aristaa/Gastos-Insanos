import { createClient } from "@supabase/supabase-js";

// Estas dos claves son seguras de exponer en el código del frontend:
// la "anon key" está diseñada para eso. La seguridad real la da el
// login (auth) + las políticas de Row Level Security en la base de
// datos, no el hecho de que esta clave esté oculta.
const supabaseUrl = "https://tvgceizemgordbjkxidr.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2Z2NlaXplbWdvcmRiamt4aWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NjQ5MDgsImV4cCI6MjEwMjA0MDkwOH0.wQc6wVmeFkv_uIeKUn_U8Lxj6baSRe4KDB87Kbrhsok";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
