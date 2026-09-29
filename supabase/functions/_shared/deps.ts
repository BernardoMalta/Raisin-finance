// Real dependency implementations backed by supabase-js with the service role.
// Only index.ts files import this module; handlers receive deps by parameter.

import { createClient } from "npm:@supabase/supabase-js@2";
import type {
  AuthUser,
  CertificateRow,
  ContentData,
  Course,
  DeleteAccountDeps,
  IssueCertificateDeps,
  Study,
} from "./types.ts";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

export function adminClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

type Client = ReturnType<typeof adminClient>;

async function getUser(client: Client, jwt: string): Promise<AuthUser | null> {
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

// All course content lives in a single row, id 'main', edited by admins.
async function getContent(client: Client): Promise<ContentData | null> {
  const { data, error } = await client.from("content").select("data").eq("id", "main").maybeSingle();
  if (error) throw error;
  const content = (data?.data ?? null) as ContentData | null;
  return content && Array.isArray(content.courses) ? { courses: content.courses as Course[] } : null;
}

async function getStudy(client: Client, userId: string): Promise<Study | null> {
  const { data, error } = await client.from("user_state").select("study").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data?.study ?? null) as Study | null;
}

async function getProfileName(client: Client, userId: string): Promise<string | null> {
  const { data, error } = await client.from("profiles").select("name").eq("id", userId).maybeSingle();
  if (error) throw error;
  return (data?.name ?? null) as string | null;
}

const CERT_COLUMNS = "code, user_id, course_id, student_name, course_title, hours, completed_on, issued_at";

export function realIssueCertificateDeps(): IssueCertificateDeps {
  const client = adminClient();
  return {
    getUser: (jwt) => getUser(client, jwt),
    getContent: () => getContent(client),
    getStudy: (userId) => getStudy(client, userId),
    getProfileName: (userId) => getProfileName(client, userId),
    async findCertificate(userId, courseId) {
      const { data, error } = await client
        .from("certificates")
        .select(CERT_COLUMNS)
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CertificateRow | null;
    },
    async insertCertificate(row) {
      const { data, error } = await client.from("certificates").insert(row).select(CERT_COLUMNS).single();
      return { data: (data ?? null) as CertificateRow | null, error };
    },
    now: () => new Date(),
  };
}

export function realDeleteAccountDeps(): DeleteAccountDeps {
  const client = adminClient();
  return {
    getUser: (jwt) => getUser(client, jwt),
    async deleteUser(userId) {
      const { error } = await client.auth.admin.deleteUser(userId);
      return { error };
    },
  };
}
