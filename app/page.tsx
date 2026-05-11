import { Montserrat } from "next/font/google"
import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { Pricing } from "@/components/landing/pricing"
import { FaqSupport } from "@/components/landing/faq-support"
import { Footer } from "@/components/landing/footer"
import { cn } from "@/lib/utils"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
})

export default function Home() {
  return (
    <div className={cn("landing-legacy min-h-screen bg-[#f7f7f5]", montserrat.className)}>
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
