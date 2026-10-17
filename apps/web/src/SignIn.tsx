import { useState } from "react";
import { loginUrl } from "./api";
import { Icon } from "./icons";

export function SignIn({ large = false }: { large?: boolean }) {
  const [connecting, setConnecting] = useState(false);
  return <a className={`button blue ${large ? "large" : ""}`} href={loginUrl} onClick={() => setConnecting(true)} aria-busy={connecting}>
    {connecting ? "Connecting to VAuth…" : "Sign in with VAuth"}<Icon name="arrow" />
  </a>;
}
