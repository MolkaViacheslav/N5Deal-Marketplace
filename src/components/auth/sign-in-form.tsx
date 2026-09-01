"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { homeFor } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";

// Deliberately loose: this validates *shape*, not policy. Telling a stranger
// "password must be 8 characters" on a sign-in form only helps them enumerate.
const signInSchema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type SignInValues = z.infer<typeof signInSchema>;

// The seeded accounts a reviewer is handed. Password is shared and documented
// in the README — these buttons exist so evaluating the three roles doesn't
// mean typing credentials three times.
const DEMO_ACCOUNTS = [
  { email: "buyer@demo.com", label: "Buyer" },
  { email: "seller@demo.com", label: "Seller" },
  { email: "manager@demo.com", label: "Platform Manager" },
] as const;

const DEMO_PASSWORD = "demo1234";

export function SignInForm({ nextPath }: { nextPath: string | null }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [demoPending, setDemoPending] = useState<string | null>(null);
  const [isRedirecting, startRedirect] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function signIn(values: SignInValues) {
    setFormError(null);

    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error || !data) {
      // Better Auth returns the same error for unknown email and wrong
      // password, which is the behaviour we want — don't unpack it further.
      setFormError(
        error?.message ?? "Could not sign in. Check your email and password."
      );
      return;
    }

    // A suspended or removed account can hold valid credentials. Don't branch
    // on status here — the client is not where that is decided; send them on
    // and let requireRole() route them to /suspended.
    const destination = nextPath ?? homeFor(data.user.role);

    startRedirect(() => {
      router.push(destination);
      // Guarded pages are Server Components — without a refresh the RSC cache
      // can still hold the signed-out render.
      router.refresh();
    });
  }

  // One click signs in outright rather than filling the form and waiting for a
  // second click — a reviewer works through all three roles, and the extra step
  // three times over buys nothing.
  async function signInAsDemo(email: string) {
    setDemoPending(email);
    try {
      await signIn({ email, password: DEMO_PASSWORD });
    } finally {
      setDemoPending(null);
    }
  }

  const busy = isSubmitting || isRedirecting || demoPending !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Use a demo account below, or your own credentials.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(signIn)} noValidate>
          <FieldGroup>
            <Field data-invalid={errors.email ? true : undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                aria-invalid={errors.email ? true : undefined}
                {...register("email")}
              />
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>

            <Field data-invalid={errors.password ? true : undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                {...register("password")}
              />
              {errors.password && (
                <FieldError>{errors.password.message}</FieldError>
              )}
            </Field>

            {formError && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </p>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </FieldGroup>
        </form>

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Demo accounts
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => signInAsDemo(account.email)}
              className="justify-between"
            >
              <span>
                {demoPending === account.email
                  ? "Signing in…"
                  : `Continue as ${account.label}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {account.email}
              </span>
            </Button>
          ))}
          <p className="mt-1 text-center text-xs text-muted-foreground">
            All demo accounts use the password{" "}
            <code className="font-mono">{DEMO_PASSWORD}</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
