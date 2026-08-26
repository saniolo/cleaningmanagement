import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Next.js Boilerplate
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          App Router · TypeScript · Tailwind · NextAuth · Prisma
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Accedi
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Registrati
          </Link>
        </div>
      </div>
    </main>
  );
}
