import { SignIn } from "@clerk/clerk-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function VercelLogo() {
  return (
    <svg
      className="w-9 h-9"
      viewBox="0 0 74 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M37.0001 0L74.0001 64H0L37.0001 0Z" fill="black" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-page">
      <Card className="auth-card w-full max-w-[420px] border shadow-lg">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex justify-center mb-2">
            <VercelLogo />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="clerk-widget">
            <SignIn routing="hash" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
