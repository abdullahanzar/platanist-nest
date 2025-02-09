"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import type React from "react";
import axios, { AxiosError } from "axios";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import BasicLoader from "./loaders/basic-loader";

//I haven't used any validation library rather relied on states deliberately.
//I intend to package this into a PWAClient and use it as a standalone app so minimal dependencies.

export function AuthForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [isLogin, setIsLogin] = useState(true);
  const [auth, setAuth] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });
  const [showOTP, setShowOTP] = useState(false);
  const [error, setError] = useState({
    disabled: false,
    text: "",
  });
  const [serverError, setServerError] = useState("");
  const [loader, setLoader] = useState({
    enabled: false,
    text: "",
  });

  const toggleMode = () => setIsLogin(!isLogin);

  const register = async () => {
    try {
      const res = await axios.post("/api/auth/create-user", {
        name: auth.name,
        email: auth.email,
        password: auth.password,
        userOTP: auth.otp,
      });
      if (!res.data.status && res.data.reason == "verification") {
        setShowOTP(true);
      } else if (!res.data.status) {
        setServerError(res.data.reason);
      }
      setLoader({ enabled: false, text: "" });
    } catch (error: AxiosError | any) {
      setError(error.response.data.reason);
      setLoader({ enabled: false, text: "" });
    }
  };

  useEffect(() => {
    if (isLogin) {
      setError({
        disabled:
          auth.email.length === 0 || auth.password.length === 0 ? true : false,
        text: "Email and password are required.",
      });
      return;
    }
    if (auth.name.length > 256) {
      setError({
        disabled: true,
        text: "Maximum name length can only be 256 characters.",
      });
      return;
    }
    if (auth.confirmPassword !== auth.password) {
      setError({
        disabled: true,
        text: "Confirm password should be same as password.",
      });
      return;
    }
    if (
      !isLogin &&
      auth.confirmPassword.length > 0 &&
      auth.confirmPassword.length < 8
    ) {
      setError({
        disabled: true,
        text: "Password should be at least 8 characters long.",
      });
      return;
    }
    if (auth.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auth.email)) {
      setError({
        disabled: true,
        text: "Please enter a valid email address.",
      });
      return;
    }
    if (!auth.name || !auth.email || !auth.password || !auth.confirmPassword) {
      setError({
        disabled: true,
        text: "Fields are empty.",
      });
      return;
    } else {
      setError({
        disabled: false,
        text: "",
      });
    }
  }, [auth, isLogin]);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Image
                  src="/platanist.svg"
                  alt="Platanist"
                  width={32}
                  height={32}
                  className="bg-white"
                />
              </div>
              <span className="sr-only">Nest by Platanist</span>
            </a>
            <h1 className="text-xl font-bold">
              {isLogin ? "Welcome to the Nest" : "Join the Nest"}
            </h1>
            <div className="text-center text-sm">
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <button
                type="button"
                onClick={toggleMode}
                className="underline underline-offset-4"
              >
                {isLogin ? "Sign up" : "Log in"}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            {!isLogin && (
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  required={!isLogin}
                  onChange={(e) => setAuth({ ...auth, name: e.target.value })}
                  disabled={showOTP}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                onChange={(e) => setAuth({ ...auth, email: e.target.value })}
                disabled={showOTP}
              />
              {auth.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auth.email) && (
                <p className="text-xs text-red-600">
                  Please enter a valid email address.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                onChange={(e) => setAuth({ ...auth, password: e.target.value })}
                disabled={showOTP}
              />
              {!isLogin &&
                auth.password.length > 0 &&
                auth.password.length < 8 && (
                  <p className="text-xs text-red-600">
                    Password should be at least 8 characters long.
                  </p>
                )}
            </div>
            {!isLogin && (
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required={!isLogin}
                  onChange={(e) =>
                    setAuth({ ...auth, confirmPassword: e.target.value })
                  }
                  disabled={showOTP}
                />
                {!isLogin &&
                  auth.confirmPassword.length > 0 &&
                  auth.confirmPassword !== auth.password && (
                    <p className="text-xs text-red-600">
                      Confirm password should be same as password.
                    </p>
                  )}
              </div>
            )}
            {!isLogin && showOTP && (
              <div className="grid gap-2">
                <Label htmlFor="confirmOTP">Confirm OTP</Label>
                <Input
                  id="confirmOTP"
                  type="password"
                  placeholder="••••••••"
                  required={!isLogin}
                  onChange={(e) => setAuth({ ...auth, otp: e.target.value })}
                />
              </div>
            )}
            {!isLogin && showOTP && auth.otp.length === 0 && (
              <p className="text-purple-600 text-xs">
                Please enter the received OTP on your email. Only valid for 3
                minutes.
              </p>
            )}
            {loader.enabled && (
              <p className="text-purple-600 text-xs">{loader.text + " "}</p>
            )}
            {serverError && (
              <p className="text-red-600 text-xs">{serverError}</p>
            )}
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      type="submit"
                      className="w-full"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          setLoader({
                            enabled: true,
                            text: `Please wait while we ${
                              isLogin ? "try to log you in" : "register you"
                            }.`,
                          });
                          if (isLogin) {
                            await axios.post("/api/auth/login", {
                              email: auth.email,
                              password: auth.password,
                            });
                            setLoader({ enabled: false, text: "" });
                          } else {
                            await register();
                            setLoader({ enabled: false, text: "" });
                          }
                        } catch (error: any) {
                          setServerError(
                            axios.isAxiosError(error) ? error.response?.data.reason : "An unexpected error occurred"
                          );
                          setLoader({ enabled: false, text: "" });
                        }
                      }}
                      disabled={error.disabled || loader.enabled}
                    >
                      {isLogin ? "Login" : "Sign Up"}
                      {loader.enabled && (
                        <div className="absolute">
                          <BasicLoader width={"12rem"} height={"12rem"} />
                        </div>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent asChild>
                  <div>
                    {error.disabled ? (
                      <div>
                        <p>{error.disabled && error.text + " "}</p>
                        <p>
                          Button will enable once you fill all the details
                          correctly.
                        </p>
                      </div>
                    ) : (
                      <p>All ready? Click me to see the other side!</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" className="w-full">
              <Image
                src="/github.svg"
                alt="GitHub"
                width={32}
                height={32}
                className="bg-white size-4"
              />
              Continue with GitHub
            </Button>
            <Button variant="outline" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Continue with Google
            </Button>
          </div>
        </div>
      </form>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
