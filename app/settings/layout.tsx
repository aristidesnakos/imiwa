import { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/journal" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </header>
      
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}