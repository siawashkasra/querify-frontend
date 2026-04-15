import { HELP_CATEGORIES } from "@/lib/help/categories"
import { buildSearchIndex, getArticlesByCategory, getPopularInCategory } from "@/lib/help/loadContent"
import HelpSearch from "@/components/help/HelpSearch"
import HelpCategoryCards from "@/components/help/HelpCategoryCards"
import HelpSupportBanner from "@/components/help/HelpSupportBanner"

export default function HelpHomePage() {
  const index = buildSearchIndex()
  const categories = HELP_CATEGORIES.map((def) => ({
    def,
    articles: getArticlesByCategory(def.id),
    popular: getPopularInCategory(def.id, 3),
  }))
  return (
    <div className="px-4 pb-16 pt-10 md:pb-24 md:pt-14">
      <h1 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Help center</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-lg text-slate-600">Search guides or browse by topic.</p>
      <div className="mx-auto mt-10 flex justify-center px-2">
        <HelpSearch index={index} />
      </div>
      <div className="mx-auto mt-14 max-w-7xl">
        <HelpCategoryCards categories={categories} />
      </div>
      <div className="mx-auto mt-16 max-w-3xl px-2">
        <HelpSupportBanner />
      </div>
    </div>
  )
}
