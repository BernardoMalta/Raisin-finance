import { assertEquals } from "jsr:@std/assert@1";
import { handler } from "../delete-account/handler.ts";
import type { DeleteAccountDeps } from "../_shared/types.ts";

const USER = { id: "22222222-2222-2222-2222-222222222222", email: "joao@example.com" };
const JWT = "valid.jwt.token";

function fakeDeps(deleteError: unknown = null) {
  const deleted: string[] = [];
  const deps: DeleteAccountDeps = {
    getUser: (jwt) => Promise.resolve(jwt === JWT ? { ...USER } : null),
    deleteUser: (id) => {
      deleted.push(id);
      return Promise.resolve({ error: deleteError });
    },
  };
  return { deps, deleted };
}

function post(token: string | null = JWT): Request {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request("http://localhost/delete-account", { method: "POST", headers });
}

Deno.test("delete-account: OPTIONS preflight", async () => {
  const res = await handler(new Request("http://localhost/x", { method: "OPTIONS" }), fakeDeps().deps);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(res.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
  await res.body?.cancel();
});

Deno.test("delete-account: non-POST returns 405", async () => {
  const res = await handler(new Request("http://localhost/x", { method: "DELETE" }), fakeDeps().deps);
  assertEquals(res.status, 405);
  await res.body?.cancel();
});

Deno.test("delete-account: 401 without token or with invalid token, nothing deleted", async () => {
  for (const token of [null, "bogus"]) {
    const { deps, deleted } = fakeDeps();
    const res = await handler(post(token), deps);
    assertEquals(res.status, 401);
    assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
    assertEquals(typeof (await res.json()).error, "string");
    assertEquals(deleted.length, 0);
  }
});

Deno.test("delete-account: deletes the calling user", async () => {
  const { deps, deleted } = fakeDeps();
  const res = await handler(post(), deps);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true });
  assertEquals(deleted, [USER.id]);
});

Deno.test("delete-account: friendly 500 when deletion fails", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const res = await handler(post(), fakeDeps(new Error("boom")).deps);
    assertEquals(res.status, 500);
    assertEquals(await res.json(), {
      error: "Não foi possível excluir a conta agora. Tente novamente em instantes.",
    });
  } finally {
    console.error = original;
  }
});
