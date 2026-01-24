import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useMemo } from "react";

interface BreadcrumbsProps {
  productName?: string;
  category?: string;
  loading?: boolean;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  isLast: boolean;
}

export const Breadcrumbs = ({ productName, category, loading = false }: BreadcrumbsProps) => {
  const location = useLocation();

  // Generate breadcrumb items based on props or pathname
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    // Always start with home
    items.push({
      label: "Home",
      href: "/",
      isLast: false
    });

    // If we have explicit product info, use that for structured breadcrumbs
    if (category || productName) {
      // Add Products link
      items.push({
        label: "Products",
        href: "/products",
        isLast: false
      });

      // Add Category if provided
      if (category) {
        const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
        items.push({
          label: category,
          href: `/products?category=${categorySlug}`,
          isLast: !productName
        });
      }

      // Add Product name if provided
      if (productName) {
        items.push({
          label: productName,
          href: undefined,
          isLast: true
        });
      }
    } else {
      // Fallback to auto-generating from pathname
      const pathnames = location.pathname.split('/').filter((x) => x);

      pathnames.forEach((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        // Format the name: capitalize and replace hyphens with spaces
        const formattedName = name
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        items.push({
          label: formattedName,
          href: isLast ? undefined : routeTo,
          isLast
        });
      });
    }

    return items;
  }, [location.pathname, productName, category]);

  // Generate JSON-LD structured data for SEO
  const structuredData = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbItems.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.label,
        ...(item.href && { "item": `${baseUrl}${item.href}` })
      }))
    };
  }, [breadcrumbItems]);

  // Don't render if only home breadcrumb exists (we're on homepage)
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />

      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6"
      >
        <ol className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
          {breadcrumbItems.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center gap-2"
            >
              {/* Separator (skip for first item) */}
              {index > 0 && (
                <ChevronRight
                  className="h-4 w-4 flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              {/* Breadcrumb Item */}
              {loading && item.isLast ? (
                // Loading state for last item
                <span className="flex items-center gap-2">
                  <span className="h-4 w-24 bg-muted animate-pulse rounded" />
                </span>
              ) : item.href ? (
                // Clickable breadcrumb
                <Link
                  to={item.href}
                  className="hover:text-foreground transition-colors flex items-center gap-1.5 hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-1"
                  aria-current={item.isLast ? "page" : undefined}
                >
                  {index === 0 && <Home className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                  <span className={index === 0 ? "sr-only sm:not-sr-only" : ""}>
                    {item.label}
                  </span>
                </Link>
              ) : (
                // Current page (non-clickable)
                <span
                  className="text-foreground font-medium flex items-center gap-1.5 px-1"
                  aria-current="page"
                  title={item.label}
                >
                  {index === 0 && <Home className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                  <span className={`
                    ${index === 0 ? "sr-only sm:not-sr-only" : ""}
                    ${item.label.length > 30 ? "truncate max-w-[150px] sm:max-w-[250px] md:max-w-[300px]" : ""}
                  `}>
                    {item.label}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};