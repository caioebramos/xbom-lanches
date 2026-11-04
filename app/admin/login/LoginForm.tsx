"use client";

import { Loader2, Lock } from "lucide-react";
import { useActionState } from "react";
import { login } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input id="password" name="password" type="password" required autoFocus autoComplete="current-password" className="field pl-10" placeholder="••••••••••••" />
        </div>
      </div>
      {state?.error && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-bad">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />} Entrar
      </button>
    </form>
  );
}
