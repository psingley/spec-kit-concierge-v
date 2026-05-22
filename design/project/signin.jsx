// Welcome / sign-in gate — shown when the user isn't fully authenticated yet.

function SignInScreen({ auth, setAuth }) {
  const ghOk = auth.gh === "ok";
  const copOk = auth.copilot === "ok";
  const ghStarting = auth.gh === "starting";
  const copStarting = auth.copilot === "starting";

  return (
    <div className="signin-stage">
      <div className="signin-card">
        <div className="signin-mark">
          <span className="ring" />
          <span className="ring" />
          <span className="ring" />
          <span className="dot" />
        </div>

        <h1 className="signin-h">Spec-kit Concierge</h1>
        <p className="signin-sub">
          Spec-driven feature work, with Copilot CLI in the loop.
          Sign in to GitHub and Copilot to load your organization.
        </p>

        <div className="signin-rows">
          <div className={"signin-row " + (ghOk ? "is-on" : "")}>
            <div className="signin-row-icon"><Ico.Github size={16} /></div>
            <div className="signin-row-main">
              <div className="signin-row-title">GitHub CLI</div>
              <div className="signin-row-sub">
                {ghOk ? "Signed in as a.kim" : "Required to discover org repositories"}
              </div>
            </div>
            {ghOk ? (
              <span className="signin-row-status">
                <span className="signin-dot ok" />
                Connected
              </span>
            ) : (
              <button
                className="btn primary"
                onClick={() => setAuth(a => ({ ...a, gh: "ok" }))}
                disabled={ghStarting}
              >
                <Ico.Github size={12} />
                {ghStarting ? "Signing in…" : "Sign in"}
              </button>
            )}
          </div>

          <div className={"signin-row "
            + (copOk ? "is-on " : "")
            + (!ghOk ? "is-disabled" : "")}>
            <div className="signin-row-icon"><Ico.Copilot size={16} /></div>
            <div className="signin-row-main">
              <div className="signin-row-title">GitHub Copilot CLI</div>
              <div className="signin-row-sub">
                {copOk
                  ? "Active subscription"
                  : !ghOk
                    ? "Requires GitHub CLI first"
                    : "Drives the spec-kit workflow"}
              </div>
            </div>
            {copOk ? (
              <span className="signin-row-status">
                <span className="signin-dot ok" />
                Connected
              </span>
            ) : (
              <button
                className="btn primary"
                onClick={() => setAuth(a => ({ ...a, copilot: "ok" }))}
                disabled={!ghOk || copStarting}
              >
                <Ico.Copilot size={12} />
                {copStarting ? "Signing in…" : "Sign in"}
              </button>
            )}
          </div>
        </div>

        <div className="signin-foot">
          <span>Trouble signing in? Use the gear menu to file a request.</span>
        </div>
      </div>
    </div>
  );
}

window.SignInScreen = SignInScreen;
