import { ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function ProductsPage() {
  const locale = await getServerLocale();

  return (
    <div className="space-y-4">
      <section className="dashboard-hero-surface premium-page-hero">
        <p className="premium-page-kicker">{t(locale, "page.productsKicker", "Products")}</p>
        <h1 className="premium-page-title">
          {t(locale, "page.productsTitle", "Product catalog intelligence")}
        </h1>
        <p className="premium-page-description">
          {t(
            locale,
            "page.productsDescription",
            "Teach Sysnova AI your catalog so support, sales, and marketing outputs stay product-aware and consistent."
          )}
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_370px]">
        <article className="premium-panel p-4">
          <h2 className="text-lg font-medium">{t(locale, "products.catalog", "Catalog")}</h2>
          <div className="mt-4 space-y-2">
            <div className="elevation-l1 p-4 text-sm text-secondary">
              {t(
                locale,
                "products.emptyCatalog",
                "No products yet. Add your real products and they will appear here."
              )}
            </div>
          </div>
        </article>

        <article className="elevation-l3 p-4">
          <h2 className="text-lg font-medium">{t(locale, "products.addProduct", "Add Product")}</h2>
          <form className="mt-4 space-y-4">
            <Input placeholder={t(locale, "products.form.productName", "Product name")} />
            <Input placeholder={t(locale, "products.form.category", "Category")} />
            <Input placeholder={t(locale, "products.form.shortDescription", "Short description")} />
            <Input placeholder={t(locale, "products.form.longDescription", "Long description")} />
            <Input placeholder={t(locale, "products.form.price", "Price")} />
            <Input placeholder={t(locale, "products.form.stock", "Stock")} />
            <Input placeholder={t(locale, "products.form.deliveryRules", "Delivery rules")} />
            <Input placeholder={t(locale, "products.form.paymentMethods", "Payment methods")} />
            <Input placeholder={t(locale, "products.form.tags", "Tags (comma separated)")} />
            <Button variant="secondary" className="w-full">
              <ImagePlus className="mr-2 h-4 w-4" />
              {t(locale, "products.form.addImage", "Add Image (Optional)")}
            </Button>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              {t(locale, "products.form.saveProduct", "Save Product")}
            </Button>
          </form>
        </article>
      </section>
    </div>
  );
}
