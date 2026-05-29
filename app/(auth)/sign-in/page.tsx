import { SignInForm } from "@/components/sign-in-form";

export default function SignInPage() {
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignInForm />
      </div>
    </div>
  );
}
