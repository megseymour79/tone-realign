import { NBButton, NBPanel } from "@/components/nb";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import { trackEvent } from "@/lib/analytics";
import { ArrowRight, AudioWaveform, Loader2, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      trackEvent("auth_otp_requested");
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      trackEvent("auth_signed_in", { method: "email_otp" });
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      trackEvent("auth_signed_in", { method: "guest" });
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Failed to sign in as guest: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="nb-dots flex min-h-screen bg-paper">
      {/* Left brand panel */}
      <div className="nb-stripes hidden w-[42%] flex-col justify-between border-r-2 border-ink bg-ink p-10 text-paper lg:flex">
        <div className="flex items-center gap-3">
          <img src={logo} alt="ShiftedTone" width={40} height={40} className="nb size-10 bg-ink" />
          <span className="font-display text-lg">
            Shifted<span className="text-sun">Tone</span>
          </span>
        </div>
        <div>
          <h2 className="font-display text-4xl leading-tight text-balance">
            The voice is honest.
            <br />
            <span className="text-sun">
              <span className="italic">Train</span> it.
            </span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/70">
            Sign in so your takes, streak, and reframes are here when you come
            back. Your audio never leaves your device — we keep the scores, not
            the recordings.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className="flex h-10 items-end gap-1" aria-hidden>
              {[40, 75, 55, 90, 45, 70].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-mint"
                  style={{
                    height: `${h}%`,
                    animation: `nb-eq ${0.9 + i * 0.15}s ease-in-out infinite`,
                  }}
                />
              ))}
            </div>
            <AudioWaveform className="size-5 text-sun" />
          </div>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-paper/50">
          Calm is a skill · Practice the pause
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <NBPanel className="w-full max-w-md">
          {step === "signIn" ? (
            <>
              <div className="border-b-2 border-ink bg-sun px-6 py-4">
                <div className="flex items-center gap-3">
                  <img
                    src={logo}
                    alt="ShiftedTone"
                    width={40}
                    height={40}
                    className="nb size-10 bg-ink cursor-pointer lg:hidden"
                    onClick={() => navigate("/")}
                  />
<p className="text-xs text-neutral-500 text-center mt-4">
  By signing up or continuing, you agree to ShiftedTone's{" "}
  <a href="/terms" className="underline hover:text-neutral-800 transition-colors">
    Terms of Service
  </a>{" "}
  and acknowledge our{" "}
  <a href="/privacy" className="underline hover:text-neutral-800 transition-colors">
    Privacy Policy
  </a>.
</p>
                  <div>
                    <p className="font-display text-xl leading-none">
                      Welcome in
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      Log in or make an account — it's free
                    </p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleEmailSubmit}>
                <div className="flex flex-col gap-4 p-6">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest">
                      Email
                    </label>
                    <Input
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      className="nb h-11 rounded-none bg-card px-3 shadow-none focus-visible:ring-2 focus-visible:ring-sun"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  {error && (
                    <p className="nb bg-coral px-3 py-2 text-sm font-medium">
                      {error}
                    </p>
                  )}
                  <NBButton
                    type="submit"
                    variant="ink"
                    disabled={isLoading}
                    className="w-full py-3"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        Continue <ArrowRight className="size-4" />
                      </>
                    )}
                  </NBButton>

                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2 border-dashed border-ink/30" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-card px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>

                  <NBButton
                    type="button"
                    variant="paper"
                    className="w-full py-3"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                  >
                    <UserX className="size-4" /> Just looking — continue as guest
                  </NBButton>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="border-b-2 border-ink bg-mint px-6 py-4">
                <p className="font-display text-xl leading-none">Check your email</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Just sent a 6-digit code to {step.email}
                </p>
              </div>
              <form onSubmit={handleOtpSubmit}>
                <div className="flex flex-col gap-5 p-6">
                  <input type="hidden" name="email" value={step.email} />
                  <input type="hidden" name="code" value={otp} />
                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          otp.length === 6 &&
                          !isLoading
                        ) {
                          const form = (e.target as HTMLElement).closest("form");
                          if (form) form.requestSubmit();
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && (
                    <p className="nb bg-coral px-3 py-2 text-center text-sm font-medium">
                      {error}
                    </p>
                  )}
                  <NBButton
                    type="submit"
                    variant="ink"
                    className="w-full py-3"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Verifying…
                      </>
                    ) : (
                      <>
                        That's the one <ArrowRight className="size-4" />
                      </>
                    )}
                  </NBButton>
                  <button
                    type="button"
                    onClick={() => setStep("signIn")}
                    className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-ink"
                  >
                    ← Wrong email? Go back
                  </button>
                </div>
              </form>
            </>
          )}
        </NBPanel>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
