"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Credenziali non valide.");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-neutral-100 p-4 sm:p-8">
        {/* Immagine di sfondo: sostituire con la foto reale in
            public/images/login-background.jpg (bg-cover, bg-center). */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/login-background.jpg')" }}
        />

        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border/40 bg-card p-8 shadow-2xl">
          <h1 className="font-serif text-2xl text-card-foreground">Accedi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Area amministrazione</p>

          {/* method="post" è un fallback, non il percorso primario: se il JS non
              si è ancora idratato, il browser invia nativamente e le credenziali
              finiscono nel body POST invece che in URL/history/referrer. */}
          <form method="post" onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Sei un dipendente? Usa il link personale che ti è stato fornito.
          </p>
        </div>
      </main>
    </div>
  );
}
