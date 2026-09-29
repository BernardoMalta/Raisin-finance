// issue-certificate: issues (or returns the existing) certificate for a course
// the caller has fully completed. Everything printed on the certificate
// (name, hours, dates, code) is computed server side; the client only says
// which course.

import { bearerToken, guardPost, json } from "../_shared/cors.ts";
import type { CertificateRow, Course, IssueCertificateDeps, NewCertificate, Study } from "../_shared/types.ts";

export const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_PATTERN = /^RF-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/;
const MAX_CODE_RETRIES = 3;
const MAX_BODY_BYTES = 4096;

const MSG = {
  unauthorized: "Faça login para emitir o certificado.",
  badRequest: "Requisição inválida: informe o curso (courseId).",
  notFound: "Curso não encontrado.",
  noLessons: "Este curso ainda não tem aulas, então não emite certificado.",
  incomplete: "Conclua todas as aulas do curso para emitir o certificado.",
  noContent: "O conteúdo dos cursos não está disponível no momento. Tente novamente mais tarde.",
  internal: "Não foi possível emitir o certificado agora. Tente novamente em instantes.",
};

/** RF-XXXXX-XXXXX from an unambiguous alphabet (no 0/O, 1/I). 32 symbols → no modulo bias. */
export function generateCode(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `RF-${chars.slice(0, 5).join("")}-${chars.slice(5).join("")}`;
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function courseLessons(course: Course): { ids: string[]; minutes: number } {
  const ids = new Set<string>();
  let minutes = 0;
  for (const mod of Array.isArray(course.modules) ? course.modules : []) {
    for (const lesson of Array.isArray(mod?.lessons) ? mod.lessons : []) {
      if (!lesson || typeof lesson.id !== "string" || lesson.id === "" || ids.has(lesson.id)) continue;
      ids.add(lesson.id);
      const m = Number(lesson.minutes);
      if (Number.isFinite(m) && m > 0) minutes += m;
    }
  }
  return { ids: [...ids], minutes };
}

async function readCourseId(req: Request): Promise<string | null> {
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return null;
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const courseId = (body as Record<string, unknown>).courseId;
  if (typeof courseId !== "string") return null;
  const trimmed = courseId.trim();
  return trimmed.length > 0 && trimmed.length <= 100 ? trimmed : null;
}

function toResponse(cert: CertificateRow): Response {
  return json({
    code: cert.code,
    student_name: cert.student_name,
    course_title: cert.course_title,
    hours: cert.hours,
    completed_on: cert.completed_on,
    issued_at: cert.issued_at,
  });
}

export async function handler(req: Request, deps: IssueCertificateDeps): Promise<Response> {
  const early = guardPost(req);
  if (early) return early;

  try {
    const jwt = bearerToken(req);
    const user = jwt ? await deps.getUser(jwt) : null;
    if (!user) return json({ error: MSG.unauthorized }, 401);

    const courseId = await readCourseId(req);
    if (!courseId) return json({ error: MSG.badRequest }, 400);

    const content = await deps.getContent();
    if (!content) {
      console.error("issue-certificate: no content row");
      return json({ error: MSG.noContent }, 500);
    }
    const courses = Array.isArray(content.courses) ? content.courses : [];
    const course = courses.find((c) => c && c.id === courseId);
    if (!course) return json({ error: MSG.notFound }, 404);

    // Idempotency: a certificate already issued stays valid even if the course
    // later gains lessons, so this check comes before the completion check.
    const existing = await deps.findCertificate(user.id, courseId);
    if (existing) return toResponse(existing);

    const { ids, minutes } = courseLessons(course);
    if (ids.length === 0) return json({ error: MSG.noLessons }, 409);

    const [study, profileName] = await Promise.all([
      deps.getStudy(user.id),
      deps.getProfileName(user.id),
    ]);
    const progress = (study as Study | null)?.lessons;
    const lessonsProgress = progress && typeof progress === "object" ? progress : {};
    const missing = ids.filter((id) => lessonsProgress[id]?.completed !== true).length;
    if (missing > 0) return json({ error: MSG.incomplete, missing }, 409);

    const today = deps.now().toISOString().slice(0, 10);
    let completedOn: string | null = null;
    for (const id of ids) {
      const date = lessonsProgress[id]?.completedDate;
      if (isValidIsoDate(date) && (completedOn === null || date > completedOn)) completedOn = date;
    }
    // Missing, invalid or future dates fall back to today.
    if (completedOn === null || completedOn > today) completedOn = today;

    const emailPrefix = (user.email ?? "").split("@")[0].trim();
    const studentName = (profileName ?? "").trim() || emailPrefix || "Aluno";

    const base: Omit<NewCertificate, "code"> = {
      user_id: user.id,
      course_id: courseId,
      student_name: studentName,
      course_title: String(course.title ?? courseId),
      hours: Math.max(1, Math.round(minutes / 60)),
      completed_on: completedOn,
    };

    for (let attempt = 0; attempt <= MAX_CODE_RETRIES; attempt++) {
      const { data, error } = await deps.insertCertificate({ ...base, code: generateCode() });
      if (!error && data) return toResponse(data);
      if (error?.code !== "23505") {
        console.error("issue-certificate: insert failed", error);
        return json({ error: MSG.internal }, 500);
      }
      // Unique violation: either a concurrent request already issued this
      // (user, course) certificate, or the random code collided. Re-read to
      // tell them apart; if nothing exists it was the code, so retry.
      const raced = await deps.findCertificate(user.id, courseId);
      if (raced) return toResponse(raced);
    }
    console.error("issue-certificate: exhausted code retries");
    return json({ error: MSG.internal }, 500);
  } catch (err) {
    console.error("issue-certificate: unexpected error", err);
    return json({ error: MSG.internal }, 500);
  }
}
