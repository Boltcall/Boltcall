import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { resetPassword } from "../../lib/auth";
import PasswordInput from "./password-input";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

interface AuthSwitchProps {
  defaultMode?: "login" | "signup";
  defaultRedirect?: string;
  /**
   * If provided, called after successful signup instead of navigating to `defaultRedirect`.
   * Lets the parent component chain post-auth work (workspace creation, agent provisioning, etc.)
   * without a route bounce.
   */
  onAuthenticated?: (info: { mode: "login" | "signup"; email: string }) => void | Promise<void>;
  /** Optional initial email value (e.g., prefilled from a wizard step). */
  prefillEmail?: string;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);
const MicrosoftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#F25022" d="M1 1h10v10H1z" /><path fill="#7FBA00" d="M13 1h10v10H13z" />
    <path fill="#00A4EF" d="M1 13h10v10H1z" /><path fill="#FFB900" d="M13 13h10v10H13z" />
  </svg>
);
const FacebookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const PillInput = ({
  error: fieldError,
  rightElement,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
  error?: string;
  rightElement?: React.ReactNode;
}) => (
  <div>
    <div className="relative">
      <input
        {...props}
        className={cn(
          "w-full px-5 py-3 bg-gray-100/80 rounded-full text-sm text-gray-800 placeholder-gray-400 border-none outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all duration-200",
          rightElement && "pr-11",
          className
        )}
      />
      {rightElement && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </span>
      )}
    </div>
    {fieldError && (
      <p className="mt-1 ml-4 text-xs text-red-500">{fieldError}</p>
    )}
  </div>
);

export default function AuthSwitch({
  defaultMode = "login",
  defaultRedirect = "/dashboard",
  onAuthenticated,
  prefillEmail,
}: AuthSwitchProps) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);

  const { login, signup, signInWithGoogle, signInWithMicrosoft, signInWithFacebook } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const rawRedirect = new URLSearchParams(location.search).get("redirect");
  const baseRedirect = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
    ? rawRedirect
    : defaultRedirect;
  // Signup must always go to /setup regardless of which page the form is on
  const redirectTo = mode === "signup" ? "/setup" : baseRedirect;

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: prefillEmail ?? "", password: "" },
  });

  // Re-apply prefill if it arrives async (e.g., parent state updates)
  useEffect(() => {
    if (prefillEmail) {
      signupForm.setValue("email", prefillEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillEmail]);

  const isLogin = mode === "login";

  // Clear stale API error when validation errors appear
  const loginHasValidationErrors = Object.keys(loginForm.formState.errors).length > 0;
  const signupHasValidationErrors = Object.keys(signupForm.formState.errors).length > 0;
  useEffect(() => {
    if ((isLogin && loginHasValidationErrors) || (!isLogin && signupHasValidationErrors)) {
      setError("");
      setLoginFailed(false);
    }
  }, [loginHasValidationErrors, signupHasValidationErrors, isLogin]);

  const switchMode = (newMode: "login" | "signup", prefillEmail?: string) => {
    if (newMode === mode && !prefillEmail) return;
    setError("");
    setResetSent(false);
    setLoginFailed(false);
    loginForm.reset();
    signupForm.reset();
    if (prefillEmail) {
      signupForm.setValue("email", prefillEmail);
    }
    setMode(newMode);
  };

  const onLogin = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError("");
      setLoginFailed(false);
      await login(data);
      if (onAuthenticated) {
        await onAuthenticated({ mode: "login", email: data.email });
      } else {
        navigate(redirectTo);
      }
    } catch {
      setError("Invalid email or password.");
      setLoginFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onSignup = async (data: SignupFormData) => {
    try {
      setIsLoading(true);
      setError("");
      await signup({ name: '', email: data.email, password: data.password, company: "" });
      if (onAuthenticated) {
        await onAuthenticated({ mode: "signup", email: data.email });
      } else {
        navigate(redirectTo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = loginForm.getValues("email");
    if (!email || !z.string().email().safeParse(email).success) {
      loginForm.setError("email", { message: "Enter your email above first" });
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      await resetPassword(email);
      setResetSent(true);
    } catch {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try { setIsLoading(true); setError(""); await signInWithGoogle(); }
    catch (err) { if (err instanceof Error && err.message === "OAuth redirect initiated") return; setError("Google login failed."); }
    finally { setIsLoading(false); }
  };
  const handleMicrosoftLogin = async () => {
    try { setIsLoading(true); setError(""); await signInWithMicrosoft(); }
    catch (err) { if (err instanceof Error && err.message === "OAuth redirect initiated") return; setError("Microsoft login failed."); }
    finally { setIsLoading(false); }
  };
  const handleFacebookLogin = async () => {
    try { setIsLoading(true); setError(""); await signInWithFacebook(); }
    catch (err) { if (err instanceof Error && err.message === "OAuth redirect initiated") return; setError("Facebook login failed."); }
    finally { setIsLoading(false); }
  };

  const submitButton = (text: string, loadingText: string) => (
    <button
      type="submit"
      disabled={isLoading}
      className="w-52 mx-auto block py-3 rounded-full bg-blue-600 text-white font-bold text-sm tracking-widest uppercase shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {loadingText}
        </span>
      ) : (
        text
      )}
    </button>
  );

  /*
   * The clip-path creates the curved wave divider.
   * When gradient is on LEFT  → curve bulges out to the right
   * When gradient is on RIGHT → curve bulges out to the left (mirrored)
   */
  /*
   * Uses a huge ellipse to create a smooth convex curve on the divider edge.
   * Login:  gradient on left  → ellipse centered far left so right edge arcs into white
   * Signup: gradient on right → ellipse centered far right so left edge arcs into white
   */
  const clipLeft = "ellipse(42% 100% at 5% 50%)";
  const clipRight = "ellipse(42% 100% at 95% 50%)";

  // Only animate left position on desktop (lg breakpoint = 1024px)
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 px-4 py-6 sm:p-4 overflow-hidden">
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[700px] min-h-0 lg:h-[460px] rounded-[20px] sm:rounded-[28px] shadow-2xl overflow-hidden bg-white"
      >
        {/* Logo */}
        <div className="absolute top-4 left-5 z-30 hidden lg:block">
          <Link to="/">
            <img
              src="/boltcall_full_logo.png"
              alt="Boltcall"
              className="h-8 w-auto brightness-0 invert"
              width={120}
              height={32}
              loading="eager"
              decoding="async"
            />
          </Link>
        </div>
        {/* ── GRADIENT PANEL with curved clip-path (desktop only) ── */}
        <div className="absolute inset-0 z-10 hidden lg:block pointer-events-none">
          <motion.div
            className="absolute top-0 bottom-0 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800"
            initial={false}
            animate={{
              clipPath: isLogin ? clipLeft : clipRight,
            }}
            transition={{ type: "spring", stiffness: 170, damping: 26 }}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </div>

        {/* ── GRADIENT PANEL CONTENT (desktop only) ── */}
        <motion.div
          className="absolute top-0 bottom-0 w-[45%] z-20 hidden lg:flex items-center justify-center pointer-events-auto"
          initial={false}
          animate={{ left: isLogin ? "0%" : "55%" }}
          transition={{ type: "spring", stiffness: 170, damping: 26 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="text-center px-8 text-white"
            >
              <h3 className="text-2xl font-bold mb-3">
                {isLogin ? "New here?" : "One of us?"}
              </h3>
              <p className="text-white/80 text-sm leading-relaxed mb-6 max-w-[240px] mx-auto">
                {isLogin
                  ? "Join us today and discover a world of possibilities. Create your account in seconds!"
                  : "Welcome back! Sign in to continue your journey with us."}
              </p>
              <button
                type="button"
                onClick={() => switchMode(isLogin ? "signup" : "login")}
                className="px-8 py-2.5 rounded-full border-2 border-white text-white text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-blue-600 transition-all duration-300"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ── FORM SIDE ── */}
        <motion.div
          className="relative lg:absolute lg:top-0 lg:bottom-0 w-full lg:w-[50%] z-[5] flex flex-col items-center justify-center px-6 py-8 sm:px-12 sm:py-10 lg:py-0"
          initial={false}
          animate={isDesktop ? { left: isLogin ? "50%" : "0%" } : { left: "0%" }}
          transition={{ type: "spring", stiffness: 170, damping: 26 }}
        >
          {/* Mobile toggle */}
          <div className="flex bg-gray-100 p-1 rounded-full mb-5 w-full max-w-[280px] lg:hidden">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={cn(
                "flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-300",
                isLogin ? "bg-blue-600 text-white shadow" : "text-gray-500"
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={cn(
                "flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-300",
                !isLogin ? "bg-blue-600 text-white shadow" : "text-gray-500"
              )}
            >
              Sign Up
            </button>
          </div>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-[340px]"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-6 sm:mb-8">
                  Sign in
                </h2>
                <form noValidate onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-3 sm:space-y-4">
                  <PillInput
                    {...loginForm.register("email")}
                    type="email"
                    placeholder="Email"
                    aria-label="Email"
                    error={loginForm.formState.errors.email?.message}
                  />
                  <PasswordInput
                    {...loginForm.register("password")}
                    placeholder="Password"
                    id="login-password"
                    aria-label="Password"
                    showStrength={false}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="ml-4 text-xs text-red-500 -mt-2">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                  <div className="text-right -mt-1">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isLoading}
                      className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  {resetSent && (
                    <div className="bg-green-50 rounded-full px-4 py-2">
                      <p className="text-green-600 text-xs text-center">Password reset email sent! Check your inbox.</p>
                    </div>
                  )}
                  {error && (
                    <div className="bg-red-50 rounded-xl px-4 py-2.5 text-center">
                      <p className="text-red-500 text-xs">{error}</p>
                      {loginFailed && (
                        <button
                          type="button"
                          onClick={() => switchMode("signup", loginForm.getValues("email"))}
                          className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 transition-colors"
                        >
                          No account? Sign up instead →
                        </button>
                      )}
                    </div>
                  )}
                  <div className="pt-2">{submitButton("LOGIN", "Signing in...")}</div>
                </form>
                <div className="mt-5">
                  <p className="text-gray-400 text-xs text-center mb-3">Or continue with</p>
                  <div className="flex justify-center gap-3">
                    {[
                      { icon: <GoogleIcon />, handler: handleGoogleLogin, label: "Google" },
                      { icon: <MicrosoftIcon />, handler: handleMicrosoftLogin, label: "Microsoft" },
                      { icon: <FacebookIcon />, handler: handleFacebookLogin, label: "Facebook" },
                    ].map((s, i) => (
                      <button key={i} type="button" onClick={s.handler} disabled={isLoading}
                        className="w-10 h-10 rounded-full border border-blue-200 flex items-center justify-center hover:border-blue-400 hover:shadow-md transition-all duration-200 disabled:opacity-50 bg-white"
                        title={s.label}>
                        {s.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-[340px]"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-6 sm:mb-8">
                  Sign up
                </h2>
                <form noValidate onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-3 sm:space-y-4">
                  <PillInput
                    {...signupForm.register("email")}
                    type="email"
                    placeholder="Email"
                    aria-label="Email"
                    error={signupForm.formState.errors.email?.message}
                  />
                  <PasswordInput
                    {...signupForm.register("password")}
                    placeholder="Password"
                    id="signup-password"
                    aria-label="Password"
                  />
                  {signupForm.formState.errors.password && (
                    <p className="ml-4 text-xs text-red-500 -mt-2">
                      {signupForm.formState.errors.password.message}
                    </p>
                  )}
                  {error && (
                    <div className="bg-red-50 rounded-full px-4 py-2">
                      <p className="text-red-500 text-xs text-center">{error}</p>
                    </div>
                  )}
                  <div className="pt-2">{submitButton("SIGN UP", "Creating account...")}</div>
                </form>
                <div className="mt-5">
                  <p className="text-gray-400 text-xs text-center mb-3">Or continue with</p>
                  <div className="flex justify-center gap-3">
                    {[
                      { icon: <GoogleIcon />, handler: handleGoogleLogin, label: "Google" },
                      { icon: <MicrosoftIcon />, handler: handleMicrosoftLogin, label: "Microsoft" },
                      { icon: <FacebookIcon />, handler: handleFacebookLogin, label: "Facebook" },
                    ].map((s, i) => (
                      <button key={i} type="button" onClick={s.handler} disabled={isLoading}
                        className="w-10 h-10 rounded-full border border-blue-200 flex items-center justify-center hover:border-blue-400 hover:shadow-md transition-all duration-200 disabled:opacity-50 bg-white"
                        title={s.label}>
                        {s.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 text-center lg:hidden">
            <p className="text-gray-500 text-sm">
              {isLogin ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => switchMode("signup")} className="text-blue-600 font-medium">Sign up</button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => switchMode("login")} className="text-blue-600 font-medium">Sign in</button>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
