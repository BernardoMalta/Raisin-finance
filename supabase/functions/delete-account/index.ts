import { realDeleteAccountDeps } from "../_shared/deps.ts";
import { handler } from "./handler.ts";

const deps = realDeleteAccountDeps();

Deno.serve((req) => handler(req, deps));
