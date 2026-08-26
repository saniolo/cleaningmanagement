import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">Gestione Pulizie</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Piattaforma di gestione turni per aziende di pulizie
        </p>
        <Link
          href="/login"
          className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Accedi
        </Link>
      </div>
    </main>
  );
}
