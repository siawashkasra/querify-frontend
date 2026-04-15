export type HelpCategoryDef = {
  id: string
  name: string
  description: string
  icon: "Rocket" | "Server" | "MessageSquare" | "CreditCard" | "Wrench"
}

export const HELP_CATEGORIES: HelpCategoryDef[] = [
  { id: "getting-started", name: "Getting started", description: "Connect your database and run your first query in minutes.", icon: "Rocket" },
  { id: "database-setup", name: "Database setup", description: "Users, networking, and security for your connection.", icon: "Server" },
  { id: "using-querify", name: "Using Querify", description: "Chat, results, exports, and daily insights.", icon: "MessageSquare" },
  { id: "account-billing", name: "Account & billing", description: "Plans, invoices, and who can access your workspace.", icon: "CreditCard" },
  { id: "troubleshooting", name: "Troubleshooting", description: "Fix connection issues and common errors.", icon: "Wrench" },
]

export function getCategoryById(id: string) {
  return HELP_CATEGORIES.find((c) => c.id === id) ?? null
}
