import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-center px-4">
      <div>
        <p className="text-7xl font-bold text-primary">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Button render={<Link href="/" />} nativeButton={false}>
        Back to Home
      </Button>
    </div>
  );
}
