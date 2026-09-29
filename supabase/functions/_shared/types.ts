// Dependency contracts for the Edge Function handlers. Handlers only talk to
// the outside world through these interfaces, so tests can inject fakes.

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface Lesson {
  id: string;
  title?: string;
  minutes?: number;
  [key: string]: unknown;
}

export interface Module {
  id: string;
  title?: string;
  lessons?: Lesson[];
  [key: string]: unknown;
}

export interface Course {
  id: string;
  title: string;
  modules?: Module[];
  [key: string]: unknown;
}

export interface ContentData {
  courses?: Course[];
  [key: string]: unknown;
}

export interface LessonProgress {
  completed?: boolean;
  completedDate?: string;
  [key: string]: unknown;
}

export interface Study {
  lessons?: Record<string, LessonProgress>;
  [key: string]: unknown;
}

export interface CertificateRow {
  code: string;
  user_id: string;
  course_id: string;
  student_name: string;
  course_title: string;
  hours: number;
  completed_on: string; // YYYY-MM-DD
  issued_at: string; // ISO timestamp
}

export type NewCertificate = Omit<CertificateRow, "issued_at">;

/** Subset of a PostgREST / Postgres error. `code` is the SQLSTATE (e.g. '23505'). */
export interface DbError {
  code?: string;
  message?: string;
  details?: string;
}

export interface AuthDeps {
  /** Resolves the user behind a JWT; null when the token is invalid or expired. */
  getUser(jwt: string): Promise<AuthUser | null>;
}

export interface IssueCertificateDeps extends AuthDeps {
  /** Course catalog; null when no content row exists. Throws on DB failure. */
  getContent(): Promise<ContentData | null>;
  /** user_state.study of the user; null when the user has no state row. */
  getStudy(userId: string): Promise<Study | null>;
  /** profiles.name of the user; null when there is no profile. */
  getProfileName(userId: string): Promise<string | null>;
  findCertificate(userId: string, courseId: string): Promise<CertificateRow | null>;
  /** Inserts and returns the stored row, or the DB error (never throws on constraint errors). */
  insertCertificate(row: NewCertificate): Promise<{ data: CertificateRow | null; error: DbError | null }>;
  now(): Date;
}

export interface DeleteAccountDeps extends AuthDeps {
  /** Deletes the auth user; profile, state and certificates cascade. */
  deleteUser(userId: string): Promise<{ error: unknown | null }>;
}
