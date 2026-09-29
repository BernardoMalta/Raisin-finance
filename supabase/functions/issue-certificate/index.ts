import { realIssueCertificateDeps } from "../_shared/deps.ts";
import { handler } from "./handler.ts";

const deps = realIssueCertificateDeps();

Deno.serve((req) => handler(req, deps));
