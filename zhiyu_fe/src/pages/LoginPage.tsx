import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Smartphone, KeyRound, Eye, EyeOff, Sparkles } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import type { LoginRequest } from "@/types/auth";
import { authService } from "@/services/authService";

type LocationState = {
  from?: string;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const from = (location.state as LocationState | undefined)?.from ?? "/";

  useEffect(() => {
    if (!isLoading && user) {
      navigate(from, { replace: true });
    }
  }, [isLoading, user, navigate, from]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: LoginRequest = { identifierType: "PHONE", identifier, code };
      await login(payload);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "登录失败，请稍后重试";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendCode = async () => {
    if (!identifier) {
      setError("请先填写账号信息");
      return;
    }
    setError(null);
    setSendingCode(true);
    try {
      const response = await authService.sendCode({
        scene: "LOGIN",
        identifierType: "PHONE",
        identifier
      });
      setCountdown(Math.max(1, response.expireSeconds ?? 300));
    } catch (err) {
      const info = err instanceof Error ? err.message : "验证码发送失败";
      setError(info);
    } finally {
      setSendingCode(false);
    }
  };

  const isDisabled = submitting || !identifier || !code;

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10 relative overflow-hidden" style={{ background: "var(--color-milk)" }}>
      {/* 装饰：云朵 + 星星 */}
      <img
        src="/illustrations/cloud.svg"
        alt=""
        className="pointer-events-none absolute -top-10 -left-10 w-72 opacity-70 animate-float"
      />
      <img
        src="/illustrations/star.svg"
        alt=""
        className="pointer-events-none absolute -bottom-10 -right-10 w-48 opacity-60"
        style={{ animation: "float 4s ease-in-out infinite 1s" }}
      />
      <img
        src="/illustrations/leaf.svg"
        alt=""
        className="pointer-events-none absolute top-1/3 right-1/4 w-32 opacity-50"
        style={{ animation: "float 5s ease-in-out infinite 0.5s" }}
      />

      {/* 顶栏 Logo */}
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

      {/* 主卡片 */}
      <div
        className="relative w-full max-w-md p-8 animate-fadeUp"
        style={{
          background: "var(--color-cream)",
          border: "var(--stroke-base)",
          borderRadius: "var(--radius-panel)",
          boxShadow: "var(--shadow-toy-lg)",
        }}
      >
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold mb-1.5" style={{ color: "var(--color-cocoa-deep)" }}>
            欢迎回来
          </h1>
          <p className="text-sm" style={{ color: "var(--color-cocoa-soft)" }}>
            登录后继续你的知识之旅
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="identifier"
            label="手机号 / 邮箱"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="请输入手机号或邮箱"
            type="text"
            autoComplete="username"
            iconLeft={<Smartphone size={16} strokeWidth={2.5} />}
            helper="验证码会发到你的手机或邮箱，无需密码"
          />

          <div>
            <label
              htmlFor="code"
              className="block text-sm font-bold mb-1.5 px-1"
              style={{ color: "var(--color-cocoa-deep)" }}
            >
              验证码
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
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
                  type={showCode ? "text" : "password"}
                  className="w-full pl-11 pr-10 py-3 text-sm font-medium outline-none"
                  style={{
                    background: "var(--color-cream)",
                    border: "var(--stroke-thin)",
                    borderRadius: "var(--radius-input)",
                    color: "var(--color-cocoa-deep)",
                    boxShadow: "var(--shadow-toy-sm)",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCode(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--color-cocoa-soft)" }}
                  aria-label="切换验证码可见性"
                >
                  {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
                style={{ flexShrink: 0 }}
              >
                {countdown > 0 ? `${countdown}s` : sendingCode ? "发送中" : "获取验证码"}
              </Button>
            </div>
          </div>

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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isDisabled}
            loading={submitting}
          >
            {submitting ? "登录中..." : "登 录"}
          </Button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px" style={{ background: "var(--color-cocoa-light)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--color-cocoa-soft)" }}>
              或
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--color-cocoa-light)" }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="py-2.5 text-sm font-bold flex items-center justify-center gap-2"
              style={{
                background: "var(--color-cream)",
                border: "var(--stroke-thin)",
                borderRadius: "var(--radius-button)",
                color: "var(--color-cocoa-deep)",
                boxShadow: "var(--shadow-toy-sm)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              微信
            </button>
            <button
              type="button"
              className="py-2.5 text-sm font-bold flex items-center justify-center gap-2"
              style={{
                background: "var(--color-cream)",
                border: "var(--stroke-thin)",
                borderRadius: "var(--radius-button)",
                color: "var(--color-cocoa-deep)",
                boxShadow: "var(--shadow-toy-sm)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              手机一键
            </button>
          </div>

          <div className="text-center text-sm pt-2" style={{ color: "var(--color-cocoa-soft)" }}>
            还没有账号？
            <button
              type="button"
              onClick={() => navigate("/register", { state: { from } })}
              className="ml-1 font-bold"
              style={{ color: "var(--color-cocoa-deep)" }}
            >
              立即注册 →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;