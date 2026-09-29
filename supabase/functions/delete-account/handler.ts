// delete-account: permanently deletes the calling user. Profile, user_state,
// subscriptions and certificates are removed by ON DELETE CASCADE.

import { bearerToken, guardPost, json } from "../_shared/cors.ts";
import type { DeleteAccountDeps } from "../_shared/types.ts";

const MSG = {
  unauthorized: "Faça login para excluir a conta.",
  internal: "Não foi possível excluir a conta agora. Tente novamente em instantes.",
};

export async function handler(req: Request, deps: DeleteAccountDeps): Promise<Response> {
  const early = guardPost(req);
  if (early) return early;

  try {
    const jwt = bearerToken(req);
    const user = jwt ? await deps.getUser(jwt) : null;
    if (!user) return json({ error: MSG.unauthorized }, 401);

    const { error } = await deps.deleteUser(user.id);
    if (error) {
      console.error("delete-account: deleteUser failed", error);
      return json({ error: MSG.internal }, 500);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("delete-account: unexpected error", err);
    return json({ error: MSG.internal }, 500);
  }
}
