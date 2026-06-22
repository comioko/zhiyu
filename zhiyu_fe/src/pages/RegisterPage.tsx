import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Smartphone, KeyRound, Lock, Check, Sparkles } from "lucide-react";
import { authService } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";
import type { IdentifierType, RegisterRequest } from "@/types/auth";
import Button from "@/components/ui/Button";

const STEPS = [
  { id: 1, label: "填写账号" },
  { id: 2, label: "验证手机" },
  { id: 3, label: "设置密码" },
  { id: 4, label: "完成" },
];

const PERKS = [
  { emoji: "📚", text: "海量知识库，等你探索" },
  { emoji: "🎨", text: "创作你的专属内容" },
  { emoji: "👥", text: "找到志同道合的同好" },
  { emoji: "✨", text: "新人专属个性化推荐" },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const identifierType: IdentifierType = "PHONE";
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const redirectTimerRef = useRef<number | null>(null);

  const filledCount =
    (identifier ? 1 : 0) +
    (code ? 1 : 0) +
    (password ? 1 : 0) +
    (agreeTerms ? 1 : 0);
  const currentStep = Math.min(4, Math.max(1, Math.ceil((filledCount / 4) * 4)));

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleSendCode = async () => {
    if (!identifier) {
      setError("请先填写账号信息");
      return;
    }
    setError(null);
    setMessage(null);
    setSendingCode(true);
    try {
      await authService.sendCode({
        scene: "REGISTER",
        identifier,
        identifierType
      });
      setMessage("验证码已发送，请注意查收 ✉️");
      setCountdown(60);
    } catch (err) {
      const info = err instanceof Error ? err.message : "验证码发送失败";
      setError(info);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const payload: RegisterRequest = {
        identifierType,
        identifier,
        code,
        password,
        agreeTerms
      };
      await register(payload);
      setMessage("注册成功，已自动登录 🎉");
      const from = (location.state as { from?: string } | undefined)?.from ?? "/";
      redirectTimerRef.current = window.setTimeout(() => {
        navigate(from, { replace: true });
      }, 400);
    } catch (err) {
      const info = err instanceof Error ? err.message : "注册失败，请稍后重试";
      setError(info);
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled = submitting || !identifier || !code || !password || !agreeTerms;

  const labelStyle: React.CSSProperties = {
    color: "var(--color-cocoa-deep)",
    fontSize: 13,
    fontWeight: 700,
    paddingLeft: 4,
    display: "block",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--color-cream)",
    border: "var(--stroke-thin)",
    borderRadius: "var(--radius-input)",
    color: "var(--color-cocoa-deep)",
    boxShadow: "var(--shadow-toy-sm)",
    fontFamily: "inherit",
    fontSize: 14,
    outline: "none",
    width: "100%",
    padding: "12px 16px 12px 44px",
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8 relative overflow-hidden" style={{ background: "var(--color-milk)" }}>
      {/* 装饰 */}
      <img src="/illustrations/cloud.svg" alt="" className="pointer-events-none absolute -top-10 -left-10 w-72 opacity-70 animate-float" />
      <img src="/illustrations/star.svg" alt="" className="pointer-events-none absolute -bottom-10 -right-10 w-40 opacity-60" style={{ animation: "float 4s ease-in-out infinite 1s" }} />

      {/* 顶栏 */}
      <header className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{
            background: "var(--color-peach)",
            border: "var(--stroke-base)",
            boxShadow: "var(--shadow-toy-sm)",
          }}
        >
          <Sparkles size={22} strokeWidth={2.5} color="var(--color-cocoa-deep)" />
        </div>
        <span className="text-lg font-bold" style={{ color: "var(--color-cocoa-deep)" }}>
          知域
        </span>
      </header>

      <div className="absolute top-6 right-6 text-sm z-10" style={{ color: "var(--color-cocoa-soft)" }}>
        已有账号？
        <button
          onClick={() => navigate("/login")}
          className="ml-1 font-bold"
          style={{ color: "var(--color-cocoa-deep)" }}
        >
          返回登录 →
        </button>
      </div>

      {/* 主双栏 */}
      <div
        className="relative w-full max-w-5xl grid md:grid-cols-[1fr_1.1fr] overflow-hidden animate-fadeUp"
        style={{
          background: "var(--color-cream)",
          border: "var(--stroke-base)",
          borderRadius: "var(--radius-panel)",
          boxShadow: "var(--shadow-toy-lg)",
        }}
      >
        {/* 左侧：步骤 + 表单 */}
        <div className="p-8 md:p-10">
          <div className="mb-6">
            <div className="text-4xl mb-2">🎉</div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--color-cocoa-deep)" }}>
              加入知域
            </h1>
            <p className="text-sm" style={{ color: "var(--color-cocoa-soft)" }}>
              几步即可开启你的知识之旅
            </p>
          </div>

          {/* 步骤条 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-2">
              {STEPS.map((step, idx) => {
                const isDone = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                return (
                  <div key={step.id} className="flex flex-col items-center gap-1.5 flex-1 relative">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        background: isDone
                          ? "var(--color-matcha)"
                          : isCurrent
                          ? "var(--color-cocoa)"
                          : "var(--color-milk)",
                        color: isDone || isCurrent ? "var(--color-cream)" : "var(--color-cocoa-soft)",
                        border: "var(--stroke-thin)",
                        boxShadow: "var(--shadow-toy-sm)",
                      }}
                    >
                      {isDone ? <Check size={16} strokeWidth={3} /> : step.id}
                    </div>
                    <span
                      className="text-[11px] font-semibold"
                      style={{
                        color: isCurrent || isDone ? "var(--color-cocoa-deep)" : "var(--color-cocoa-soft)",
                      }}
                    >
                      {step.label}
                    </span>
                    {idx < STEPS.length - 1 && (
                      <div
                        className="absolute top-[18px] h-0.5"
                        style={{
                          left: "calc(50% + 22px)",
                          right: "calc(-50% + 22px)",
                          background: isDone ? "var(--color-matcha)" : "var(--color-cocoa-light)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* 进度条 */}
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--color-milk)" }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${(currentStep / 4) * 100}%`,
                  background: "var(--color-cocoa)",
                }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 手机号 */}
            <div>
              <label htmlFor="identifier" style={labelStyle}>
                手机号
              </label>
              <div className="relative">
                <Smartphone
                  size={16}
                  strokeWidth={2.5}
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--color-cocoa-soft)" }}
                />
                <input
                  id="identifier"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="请输入手机号"
                  type="tel"
                  autoComplete="tel"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* 验证码 */}
            <div>
              <label htmlFor="code" style={labelStyle}>
                验证码
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound
                    size={16}
                    strokeWidth={2.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "var(--color-cocoa-soft)" }}
                  />
                  <input
                    id="code"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="6 位数字验证码"
                    autoComplete="one-time-code"
                    style={inputStyle}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleSendCode}
                  disabled={sendingCode || countdown > 0}
                  style={{ flexShrink: 0 }}
                >
                  {countdown > 0 ? `${countdown}s 后重发` : sendingCode ? "发送中" : "获取验证码"}
                </Button>
              </div>
            </div>

            {/* 密码 */}
            <div>
              <label htmlFor="password" style={labelStyle}>
                登录密码
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  strokeWidth={2.5}
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--color-cocoa-soft)" }}
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="至少 8 位，含字母和数字"
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* 协议 */}
            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <div className="relative shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="peer sr-only"
                />
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{
                    background: agreeTerms ? "var(--color-cocoa)" : "var(--color-cream)",
                    border: "var(--stroke-thin)",
                    transition: "background 0.15s ease",
                  }}
                >
                  {agreeTerms ? <Check size={12} strokeWidth={4} color="var(--color-cream)" /> : null}
                </div>
              </div>
              <span className="text-xs leading-relaxed" style={{ color: "var(--color-cocoa-soft)" }}>
                我已阅读并同意
                <a
                  href="#"
                  onClick={e => e.preventDefault()}
                  className="font-bold mx-0.5"
                  style={{ color: "var(--color-cocoa-deep)" }}
                >
                  《用户协议》
                </a>
                和
                <a
                  href="#"
                  onClick={e => e.preventDefault()}
                  className="font-bold mx-0.5"
                  style={{ color: "var(--color-cocoa-deep)" }}
                >
                  《隐私政策》
                </a>
              </span>
            </label>

            {/* 提示 */}
            {error ? (
              <div
                className="px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: "#FBE3E3",
                  border: "var(--stroke-thin)",
                  borderColor: "var(--color-warning-deep)",
                  borderRadius: "var(--radius-button)",
                  color: "var(--color-warning-deep)",
                }}
              >
                {error}
              </div>
            ) : null}
            {message ? (
              <div
                className="px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: "var(--color-matcha)",
                  border: "var(--stroke-thin)",
                  borderRadius: "var(--radius-button)",
                  color: "var(--color-cocoa-deep)",
                }}
              >
                {message}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isDisabled}
              loading={submitting}
            >
              {submitting ? "注册中..." : "🌸 立即注册"}
            </Button>
          </form>
        </div>

        {/* 右侧：营销插画 */}
        <div
          className="hidden md:flex flex-col items-center justify-center p-10 relative overflow-hidden"
          style={{
            background: "var(--color-cocoa)",
            color: "var(--color-cream)",
            borderLeft: "var(--stroke-base)",
          }}
        >
          <div className="pointer-events-none absolute top-10 right-10 w-32 h-32 rounded-full" style={{ background: "rgba(251,246,238,0.12)" }} />
          <div className="pointer-events-none absolute bottom-10 left-10 w-40 h-40 rounded-full" style={{ background: "rgba(251,246,238,0.10)" }} />

          <div className="text-7xl mb-6 animate-float">✨</div>
          <h2 className="text-3xl font-bold mb-3 text-center">欢迎来到知域</h2>
          <p className="text-sm text-center mb-8" style={{ color: "rgba(251,246,238,0.85)" }}>
            在这里，让知识发光发热
          </p>

          <ul className="space-y-3 w-full max-w-xs">
            {PERKS.map((perk, idx) => (
              <li
                key={idx}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: "rgba(251,246,238,0.18)",
                  borderRadius: "var(--radius-button)",
                  border: "2px solid rgba(251,246,238,0.25)",
                }}
              >
                <span className="text-2xl">{perk.emoji}</span>
                <span className="text-sm font-bold">{perk.text}</span>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-xs" style={{ color: "rgba(251,246,238,0.75)" }}>
            已有 12,000+ 知识创作者加入
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;