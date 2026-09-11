// "Remember me" works alongside Supabase's own persistent session cookie
// (which every page's client re-persists regardless, since the app assumes
// an always-logged-in Navbar) rather than trying to shorten that cookie's
// lifetime directly — attempting that runs into every other mounted
// Supabase client instance silently re-persisting the session anyway.
//
// Instead: sessionStorage naturally clears when the browser fully closes,
// while localStorage survives. So an unchecked "remember me" is recorded in
// both; if the browser is later reopened, sessionStorage's marker is gone
// while localStorage's "don't remember" flag remains — that mismatch is the
// signal to sign the user back out.
const REMEMBER_KEY = "sns-remember-me";
const SESSION_ALIVE_KEY = "sns-session-alive";

export function setRememberPreference(remember: boolean) {
  if (remember) {
    localStorage.removeItem(REMEMBER_KEY);
  } else {
    localStorage.setItem(REMEMBER_KEY, "0");
  }
  sessionStorage.setItem(SESSION_ALIVE_KEY, "1");
}

export function clearRememberPreference() {
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(SESSION_ALIVE_KEY);
}

export function shouldForceSignOut() {
  const notRemembered = localStorage.getItem(REMEMBER_KEY) === "0";
  if (!notRemembered) return false;
  return sessionStorage.getItem(SESSION_ALIVE_KEY) !== "1";
}
