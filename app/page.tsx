import { Poppins } from "next/font/google"
import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { Pricing } from "@/components/landing/pricing"
import { FaqSupport } from "@/components/landing/faq-support"
import { Footer } from "@/components/landing/footer"
import { cn } from "@/lib/utils"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

export default function Home() {
  return (
    <div className={cn("landing-legacy min-h-screen bg-background", poppins.className)}>
      <Header />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <FaqSupport />
      </main>
      <Footer />
    </div>
  )
}
