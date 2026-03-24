import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";

function strengthLabel(pw) {
  const p = String(pw || "");
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (p.length >= 12) score++;

  if (!p) return { text: "—", cls: "pwNone", pct: 0 };
  if (score <= 1) return { text: "Slabă", cls: "pwBad", pct: 25 };
  if (score === 2) return { text: "OK", cls: "pwOk", pct: 50 };
  if (score === 3) return { text: "Bună", cls: "pwGood", pct: 75 };
  return { text: "Foarte bună", cls: "pwGreat", pct: 100 };
}

export default function Register() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const pw = useMemo(() => strengthLabel(password), [password]);
  const match = confirm.length ? password === confirm : true;

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    if (String(password).length < 8) {
      setErr("Parola trebuie să aibă minim 8 caractere.");
      return;
    }
    if (password !== confirm) {
      setErr("Parolele nu coincid.");
      return;
    }

    setLoading(true);
    try {
      await api.register({ email, password });
      setOk("Cont creat. Te poți autentifica acum.");
      setTimeout(() => nav("/login"), 700);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authWrap">
      <div className="panel authCard">
        <div className="authHeader">
          <div className="authIcon">
            <UserPlus size={18} />
          </div>
          <div>
            <div className="authTitle">Register</div>
            <div className="authSub">
              Creează un cont nou. Recomandat: parolă de minim 8 caractere.
            </div>
          </div>
        </div>

        <form className="authForm" onSubmit={onSubmit}>
          <div>
            <div className="label">Email</div>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="ex: valeriu@email.com"
              required
            />
          </div>

          <div>
            <div className="label">Parolă</div>
            <div className="inputWithBtn">
              <input
                className="input inputGrow"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={show ? "text" : "password"}
                minLength={8}
                autoComplete="new-password"
                placeholder="minim 8 caractere"
                required
              />
              <button
                className="iconBtn"
                type="button"
                onClick={() => setShow((s) => !s)}
                title={show ? "Ascunde parola" : "Arată parola"}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="pwRow">
              <div className="pwLabel">
                <ShieldCheck size={14} />
                Putere parolă: <span className={pw.cls}>{pw.text}</span>
              </div>
              <div className="pwBar">
                <div className={`pwFill ${pw.cls}`} style={{ width: `${pw.pct}%` }} />
              </div>
            </div>
          </div>

          <div>
            <div className="label">Confirmă parola</div>
            <div className="inputWithBtn">
              <input
                className={`input inputGrow ${match ? "" : "inputError"}`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type={show2 ? "text" : "password"}
                autoComplete="new-password"
                placeholder="repetă parola"
                required
              />
              <button
                className="iconBtn"
                type="button"
                onClick={() => setShow2((s) => !s)}
                title={show2 ? "Ascunde parola" : "Arată parola"}
              >
                {show2 ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {!match && (
              <div className="pwHint">Parolele nu coincid.</div>
            )}
          </div>

          {err && <div className="error">{err}</div>}
          {ok && <div className="ok">{ok}</div>}

          <button className="btn btnPrimary" disabled={loading}>
            {loading ? "Se creează contul..." : "Creează cont"}
          </button>

          <div className="authFooter">
            <div className="authHint">Ai deja cont?</div>
            <Link className="btn authLinkBtn" to="/login">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}