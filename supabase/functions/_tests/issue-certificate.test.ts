import { assert, assertEquals, assertMatch, assertNotEquals } from "jsr:@std/assert@1";
import { CODE_PATTERN, generateCode, handler } from "../issue-certificate/handler.ts";
import type {
  CertificateRow,
  ContentData,
  DbError,
  IssueCertificateDeps,
  NewCertificate,
  Study,
} from "../_shared/types.ts";

const USER = { id: "11111111-1111-1111-1111-111111111111", email: "maria.silva@example.com" };
const JWT = "valid.jwt.token";
const NOW = new Date("2026-09-29T15:00:00Z");

const CONTENT: ContentData = {
  courses: [
    {
      id: "fundamentos",
      title: "Fundamentos das Finanças",
      modules: [
        { id: "m1", title: "M1", lessons: [{ id: "l1", title: "A", minutes: 50 }, { id: "l2", title: "B", minutes: 45 }] },
        { id: "m2", title: "M2", lessons: [{ id: "l3", title: "C", minutes: 40 }] },
      ],
    },
    { id: "curto", title: "Curso Curto", modules: [{ id: "m", title: "M", lessons: [{ id: "c1", minutes: 10 }] }] },
    { id: "vazio", title: "Sem aulas", modules: [{ id: "m", title: "M", lessons: [] }] },
  ],
};

const COMPLETE_STUDY: Study = {
  lessons: {
    l1: { completed: true, completedDate: "2026-09-10" },
    l2: { completed: true, completedDate: "2026-09-21" },
    l3: { completed: true, completedDate: "2026-09-15" },
    c1: { completed: true, completedDate: "not-a-date" },
  },
};

interface FakeOptions {
  study?: Study | null;
  profileName?: string | null;
  content?: ContentData | null;
  existing?: CertificateRow[];
  /** Errors returned by successive insert calls before a successful insert. */
  insertErrors?: DbError[];
  /** Row that "appears" after an insert error (simulates a concurrent request). */
  racedRow?: CertificateRow;
}

function fakeDeps(opts: FakeOptions = {}) {
  const store: CertificateRow[] = [...(opts.existing ?? [])];
  const inserted: NewCertificate[] = [];
  const insertErrors = [...(opts.insertErrors ?? [])];
  const deps: IssueCertificateDeps = {
    getUser: (jwt) => Promise.resolve(jwt === JWT ? { ...USER } : null),
    getContent: () => Promise.resolve(opts.content === undefined ? CONTENT : opts.content),
    getStudy: () => Promise.resolve(opts.study === undefined ? COMPLETE_STUDY : opts.study),
    getProfileName: () => Promise.resolve(opts.profileName === undefined ? "  Maria Silva  " : opts.profileName),
    findCertificate: (userId, courseId) =>
      Promise.resolve(store.find((c) => c.user_id === userId && c.course_id === courseId) ?? null),
    insertCertificate: (row) => {
      inserted.push(row);
      const error = insertErrors.shift();
      if (error) {
        if (opts.racedRow) store.push(opts.racedRow);
        return Promise.resolve({ data: null, error });
      }
      const saved: CertificateRow = { ...row, issued_at: "2026-09-29T15:00:01.000Z" };
      store.push(saved);
      return Promise.resolve({ data: saved, error: null });
    },
    now: () => NOW,
  };
  return { deps, inserted, store };
}

function post(body: unknown, token: string | null = JWT): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request("http://localhost/issue-certificate", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function assertCors(res: Response) {
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(res.headers.get("Access-Control-Allow-Headers"), "authorization, x-client-info, apikey, content-type");
  assertEquals(res.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
}

async function quietly<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

Deno.test("OPTIONS preflight returns 200 with CORS headers", async () => {
  const res = await handler(new Request("http://localhost/x", { method: "OPTIONS" }), fakeDeps().deps);
  assertEquals(res.status, 200);
  assertCors(res);
  await res.body?.cancel();
});

Deno.test("non-POST returns 405 with CORS", async () => {
  const res = await handler(new Request("http://localhost/x", { method: "GET" }), fakeDeps().deps);
  assertEquals(res.status, 405);
  assertCors(res);
  await res.body?.cancel();
});

Deno.test("missing token returns 401", async () => {
  const res = await handler(post({ courseId: "fundamentos" }, null), fakeDeps().deps);
  assertEquals(res.status, 401);
  assertCors(res);
  assertEquals(await res.json(), { error: "Faça login para emitir o certificado." });
});

Deno.test("invalid token returns 401", async () => {
  const res = await handler(post({ courseId: "fundamentos" }, "bogus"), fakeDeps().deps);
  assertEquals(res.status, 401);
  await res.body?.cancel();
});

Deno.test("bad bodies return 400", async () => {
  const bodies: unknown[] = ["not json", {}, { courseId: "" }, { courseId: "   " }, { courseId: 42 }, {
    courseId: "x".repeat(101),
  }, [1, 2], "null"];
  for (const body of bodies) {
    const res = await handler(post(body), fakeDeps().deps);
    assertEquals(res.status, 400, `body ${JSON.stringify(body)}`);
    assertCors(res);
    assert(typeof (await res.json()).error === "string");
  }
});

Deno.test("unknown course returns 404", async () => {
  const res = await handler(post({ courseId: "nao-existe" }), fakeDeps().deps);
  assertEquals(res.status, 404);
  assertEquals(await res.json(), { error: "Curso não encontrado." });
});

Deno.test("missing content returns friendly 500", async () => {
  const res = await quietly(() => handler(post({ courseId: "fundamentos" }), fakeDeps({ content: null }).deps));
  assertEquals(res.status, 500);
  assert(typeof (await res.json()).error === "string");
});

Deno.test("course without lessons is rejected", async () => {
  const { deps, inserted } = fakeDeps();
  const res = await handler(post({ courseId: "vazio" }), deps);
  assertEquals(res.status, 409);
  await res.body?.cancel();
  assertEquals(inserted.length, 0);
});

Deno.test("incomplete course returns 409 with missing count", async () => {
  const { deps, inserted } = fakeDeps({
    study: { lessons: { l1: { completed: true, completedDate: "2026-09-10" }, l2: { completed: false } } },
  });
  const res = await handler(post({ courseId: "fundamentos" }), deps);
  assertEquals(res.status, 409);
  assertEquals(await res.json(), {
    error: "Conclua todas as aulas do curso para emitir o certificado.",
    missing: 2,
  });
  assertEquals(inserted.length, 0);
});

Deno.test("user without study state counts every lesson as missing", async () => {
  const res = await handler(post({ courseId: "fundamentos" }), fakeDeps({ study: null }).deps);
  assertEquals(res.status, 409);
  assertEquals((await res.json()).missing, 3);
});

Deno.test("success issues a certificate computed server side", async () => {
  const { deps, inserted } = fakeDeps();
  // Extra client fields must be ignored.
  const res = await handler(post({ courseId: "fundamentos", hours: 999, name: "Hacker" }), deps);
  assertEquals(res.status, 200);
  assertCors(res);
  const body = await res.json();
  assertMatch(body.code, CODE_PATTERN);
  assertEquals(body.student_name, "Maria Silva");
  assertEquals(body.course_title, "Fundamentos das Finanças");
  assertEquals(body.hours, 2); // 135 min → round(2.25) = 2
  assertEquals(body.completed_on, "2026-09-21"); // latest completedDate
  assertEquals(body.issued_at, "2026-09-29T15:00:01.000Z");
  assertEquals(inserted.length, 1);
  assertEquals(inserted[0].user_id, USER.id);
  assertEquals(inserted[0].course_id, "fundamentos");
});

Deno.test("short course gets at least 1 hour, invalid date falls back to today, name falls back to email", async () => {
  const { deps } = fakeDeps({ profileName: "   " });
  const res = await handler(post({ courseId: "curto" }), deps);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.hours, 1);
  assertEquals(body.completed_on, "2026-09-29");
  assertEquals(body.student_name, "maria.silva");
});

Deno.test("future completedDate is clamped to today", async () => {
  const { deps } = fakeDeps({ study: { lessons: { c1: { completed: true, completedDate: "2030-01-01" } } } });
  const res = await handler(post({ courseId: "curto" }), deps);
  assertEquals((await res.json()).completed_on, "2026-09-29");
});

Deno.test("second call is idempotent: same code, no new insert", async () => {
  const { deps, inserted } = fakeDeps();
  const first = await (await handler(post({ courseId: "fundamentos" }), deps)).json();
  const res = await handler(post({ courseId: "fundamentos" }), deps);
  assertEquals(res.status, 200);
  const second = await res.json();
  assertEquals(second.code, first.code);
  assertEquals(second, first);
  assertEquals(inserted.length, 1);
});

Deno.test("code collision is retried with a new code", async () => {
  const collision: DbError = {
    code: "23505",
    message: 'duplicate key value violates unique constraint "certificates_pkey"',
  };
  const { deps, inserted } = fakeDeps({ insertErrors: [collision, collision] });
  const res = await handler(post({ courseId: "fundamentos" }), deps);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(inserted.length, 3);
  assertEquals(body.code, inserted[2].code);
  for (const row of inserted) assertMatch(row.code, CODE_PATTERN);
});

Deno.test("persistent code collisions give up after 3 retries with 500", async () => {
  const collision: DbError = { code: "23505", message: "certificates_pkey" };
  const { deps, inserted } = fakeDeps({ insertErrors: [collision, collision, collision, collision, collision] });
  const res = await quietly(() => handler(post({ courseId: "fundamentos" }), deps));
  assertEquals(res.status, 500);
  await res.body?.cancel();
  assertEquals(inserted.length, 4); // 1 attempt + 3 retries
});

Deno.test("race on (user_id, course_id) returns the concurrently issued certificate", async () => {
  const racedRow: CertificateRow = {
    code: "RF-ABCDE-FGHJK",
    user_id: USER.id,
    course_id: "fundamentos",
    student_name: "Maria Silva",
    course_title: "Fundamentos das Finanças",
    hours: 2,
    completed_on: "2026-09-21",
    issued_at: "2026-09-29T14:59:59.000Z",
  };
  const { deps, inserted } = fakeDeps({
    insertErrors: [{
      code: "23505",
      message: 'duplicate key value violates unique constraint "certificates_user_id_course_id_key"',
    }],
    racedRow,
  });
  const res = await handler(post({ courseId: "fundamentos" }), deps);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.code, "RF-ABCDE-FGHJK");
  assertEquals(body.issued_at, racedRow.issued_at);
  assertEquals(inserted.length, 1);
});

Deno.test("other insert errors return friendly 500", async () => {
  const { deps } = fakeDeps({ insertErrors: [{ code: "23514", message: "check violation" }] });
  const res = await quietly(() => handler(post({ courseId: "fundamentos" }), deps));
  assertEquals(res.status, 500);
  assertEquals((await res.json()).error, "Não foi possível emitir o certificado agora. Tente novamente em instantes.");
});

Deno.test("dependency exceptions return friendly 500", async () => {
  const { deps } = fakeDeps();
  deps.getContent = () => Promise.reject(new Error("db down"));
  const res = await quietly(() => handler(post({ courseId: "fundamentos" }), deps));
  assertEquals(res.status, 500);
  assertCors(res);
  await res.body?.cancel();
});

Deno.test("generateCode format and variability", () => {
  const codes = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const code = generateCode();
    assertMatch(code, CODE_PATTERN);
    codes.add(code);
  }
  assertNotEquals(codes.size, 1);
  assertEquals(codes.size, 200);
});
