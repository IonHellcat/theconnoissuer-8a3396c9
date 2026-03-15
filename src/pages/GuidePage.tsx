import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, MapPin, Building2 } from "lucide-react";

/* ── types ── */
interface TextBlock { type: "text"; label?: string; heading?: string; body: string }
interface CityCardBlock { type: "city_card"; city_slug: string; subtitle?: string; body?: string; tags?: string[] }
interface PullquoteBlock { type: "pullquote"; text: string }
interface CalloutBlock { type: "callout"; label?: string; body: string }
interface FaqBlock { type: "faq"; items: { question: string; answer: string }[] }
interface RankingAspect { name: string; type: "strength" | "weakness" | "mixed" }
interface RankingItem { rank: number; name: string; label?: string | null; detail?: string; score: number; aspects?: RankingAspect[] }
interface RankingTableBlock { type: "ranking_table"; label?: string; heading?: string; items: RankingItem[]; footer_text?: string; footer_link_text?: string; footer_link_slug?: string }
interface FactItem { label: string; value: string; detail?: string }
interface FactsGridBlock { type: "facts_grid"; label?: string; heading?: string; items: FactItem[] }
type ContentBlock = TextBlock | CityCardBlock | PullquoteBlock | CalloutBlock | FaqBlock | RankingTableBlock | FactsGridBlock;

interface Guide {
  id: string; slug: string; title: string; meta_description: string;
  hero_subtitle: string | null; content: ContentBlock[];
  guide_type: string; country: string | null;
  related_city_slugs: string[] | null;
  published_at: string | null; updated_at: string | null; created_at: string;
}

interface CityRow {
  slug: string; name: string; country: string; lounge_count: number; image_url: string | null;
}

const BASE = "https://theconnoisseur.app";

/* ── helpers ── */
function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

/* ── content block renderers ── */
function TextBlockRenderer({ block }: { block: TextBlock }) {
  return (
    <section className="space-y-3">
      {block.label && <p className="text-xs font-semibold tracking-[2px] uppercase text-primary">{block.label}</p>}
      {block.heading && <h2 className="font-display text-2xl sm:text-3xl font-bold">{block.heading}</h2>}
      <p className="text-muted-foreground leading-relaxed">{renderMarkdown(block.body)}</p>
    </section>
  );
}

function CityCardRenderer({ block, city }: { block: CityCardBlock; city?: CityRow }) {
  const name = city?.name ?? block.city_slug.replace(/-/g, " ");
  const loungeCount = city?.lounge_count ?? 0;
  return (
    <Card className="bg-card border-border/50 rounded-xl overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold">{name}</h3>
            {block.subtitle && <p className="text-sm text-muted-foreground mt-1">{block.subtitle}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <span className="font-display text-3xl font-bold text-primary">{loungeCount}</span>
            <p className="text-xs text-muted-foreground">lounges</p>
          </div>
        </div>
        {block.body && <p className="text-muted-foreground text-sm leading-relaxed">{renderMarkdown(block.body)}</p>}
        {block.tags && block.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {block.tags.map((tag, i) => (
              <span key={tag} className={`text-xs px-3 py-1 rounded-full border ${i < 2 ? "border-primary/60 text-primary" : "border-border text-muted-foreground"}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <Link to={`/city/${block.city_slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          View all {name} lounges <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

function PullquoteRenderer({ block }: { block: PullquoteBlock }) {
  return (
    <blockquote className="border-l-4 border-primary pl-6 py-2">
      <p className="font-display text-xl sm:text-2xl italic text-foreground/90 leading-relaxed">{block.text}</p>
    </blockquote>
  );
}

function CalloutRenderer({ block }: { block: CalloutBlock }) {
  return (
    <div className="bg-secondary/60 border border-border/50 rounded-xl p-6 space-y-2">
      {block.label && <p className="text-xs font-semibold tracking-[2px] uppercase text-primary">{block.label}</p>}
      <p className="text-muted-foreground leading-relaxed text-sm">{renderMarkdown(block.body)}</p>
    </div>
  );
}

function FaqRenderer({ block }: { block: FaqBlock }) {
  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl font-bold">Frequently Asked Questions</h2>
      {block.items.map((item, i) => (
        <div key={i} className="space-y-2">
          <h3 className="font-display font-bold text-lg">{item.question}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{item.answer}</p>
        </div>
      ))}
    </section>
  );
}

const aspectColors: Record<string, string> = {
  strength: "border-green-500/60 text-green-400",
  weakness: "border-red-400/60 text-red-400",
  mixed: "border-yellow-500/60 text-yellow-400",
};

const labelColors: Record<string, string> = {
  Legendary: "bg-primary text-primary-foreground",
  Outstanding: "bg-primary/20 text-primary",
  Excellent: "bg-primary/10 text-primary",
};

function RankingTableRenderer({ block }: { block: RankingTableBlock }) {
  return (
    <section className="space-y-4">
      {block.label && <p className="text-xs font-semibold tracking-[2px] uppercase text-primary">{block.label}</p>}
      {block.heading && <h2 className="font-display text-2xl sm:text-3xl font-bold">{block.heading}</h2>}
      <div className="space-y-2">
        {block.items.map((item) => (
          <div key={item.rank} className={`bg-card border border-border/50 rounded-xl p-4 flex items-start gap-4 ${item.rank <= 3 ? "border-l-2 border-l-primary" : ""}`}>
            <span className="font-display text-xl font-bold text-primary w-8 flex-shrink-0">{item.rank}</span>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-semibold">{item.name}</span>
                {item.label && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${labelColors[item.label] ?? "bg-secondary text-muted-foreground"}`}>{item.label}</span>}
              </div>
              {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
              {item.aspects && item.aspects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.aspects.map(a => (
                    <span key={a.name} className={`text-[10px] px-2 py-0.5 rounded-full border ${aspectColors[a.type] ?? "border-border text-muted-foreground"}`}>{a.name}</span>
                  ))}
                </div>
              )}
            </div>
            <span className="font-display text-xl font-bold text-primary flex-shrink-0">{item.score}</span>
          </div>
        ))}
      </div>
      {(block.footer_text || block.footer_link_slug) && (
        <div className="text-center pt-4 space-y-3">
          {block.footer_text && <p className="text-sm text-muted-foreground">{block.footer_text}</p>}
          {block.footer_link_slug && (
            <Link to={`/city/${block.footer_link_slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary border border-primary/50 rounded-lg px-6 py-3 hover:bg-primary/10 transition-colors">
              {block.footer_link_text ?? "See All Venues →"}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function FactsGridRenderer({ block }: { block: FactsGridBlock }) {
  return (
    <section className="space-y-4">
      {block.label && <p className="text-xs font-semibold tracking-[2px] uppercase text-primary">{block.label}</p>}
      {block.heading && <h2 className="font-display text-2xl sm:text-3xl font-bold">{block.heading}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {block.items.map((item, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-5 space-y-1">
            <p className="text-[10px] font-semibold tracking-[2px] uppercase text-primary">{item.label}</p>
            <p className="font-display text-xl font-bold">{item.value}</p>
            {item.detail && <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── page ── */
export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: guide, isLoading } = useQuery({
    queryKey: ["guide", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("*")
        .eq("slug", slug!)
        .eq("published", true)
        .single();
      if (error) throw error;
      return { ...data, content: data.content as unknown as ContentBlock[] } as Guide;
    },
    enabled: !!slug,
  });

  const { data: cities } = useQuery({
    queryKey: ["guide-cities", guide?.related_city_slugs],
    queryFn: async () => {
      const slugs = guide!.related_city_slugs!;
      const { data, error } = await supabase
        .from("cities")
        .select("slug, name, country, lounge_count, image_url")
        .in("slug", slugs);
      if (error) throw error;
      return data as CityRow[];
    },
    enabled: !!guide?.related_city_slugs?.length,
  });

  const { data: moreGuides } = useQuery({
    queryKey: ["more-guides", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("slug, title, country, guide_type")
        .eq("published", true)
        .neq("slug", slug!)
        .order("published_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const cityMap = useMemo(() => {
    const m = new Map<string, CityRow>();
    cities?.forEach(c => m.set(c.slug, c));
    return m;
  }, [cities]);

  const totalLounges = useMemo(() => cities?.reduce((s, c) => s + c.lounge_count, 0) ?? 0, [cities]);
  const totalCities = cities?.length ?? 0;

  const faqBlocks = useMemo(() =>
    guide?.content.filter((b): b is FaqBlock => b.type === "faq") ?? []
  , [guide]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="pt-20 pb-16 container mx-auto px-4 max-w-3xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </main>
      </>
    );
  }

  if (!guide) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Guide not found</h1>
          <Link to="/guides" className="text-primary hover:underline">Browse all guides</Link>
        </main>
        <Footer />
      </>
    );
  }

  const canonicalUrl = `${BASE}/guide/${guide.slug}`;

  return (
    <>
      <Helmet>
        <title>{guide.title}</title>
        <meta name="description" content={guide.meta_description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={guide.title} />
        <meta property="og:description" content={guide.meta_description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.meta_description,
          datePublished: guide.published_at,
          dateModified: guide.updated_at,
          author: { "@type": "Organization", name: "The Connoisseur" },
          publisher: { "@type": "Organization", name: "The Connoisseur" },
          mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
        })}</script>
        {faqBlocks.length > 0 && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqBlocks.flatMap(b => b.items.map(i => ({
              "@type": "Question",
              name: i.question,
              acceptedAnswer: { "@type": "Answer", text: i.answer },
            }))),
          })}</script>
        )}
      </Helmet>

      <Navbar />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">The Connoisseur</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbLink asChild><Link to="/guides">Guides</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>{guide.title}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Hero */}
          <header className="border-b border-border/50 pb-8 mb-10 space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-primary border-primary/50 text-xs">
                {guide.guide_type === "country" ? "Country Guide" : "City Guide"}
              </Badge>
              {guide.published_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(guide.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold leading-tight">{guide.title}</h1>
            {guide.hero_subtitle && (
              <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">{guide.hero_subtitle}</p>
            )}

            {/* Stats pills */}
            {totalCities > 0 && (
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 bg-card border border-border/50 rounded-full px-5 py-2.5">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-display text-xl font-bold text-primary">{totalLounges}</span>
                  <span className="text-xs text-muted-foreground">lounges</span>
                </div>
                <div className="flex items-center gap-2 bg-card border border-border/50 rounded-full px-5 py-2.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-display text-xl font-bold text-primary">{totalCities}</span>
                  <span className="text-xs text-muted-foreground">cities</span>
                </div>
              </div>
            )}
          </header>

          {/* Content blocks */}
          <div className="space-y-10">
            {guide.content.map((block, i) => {
              switch (block.type) {
                case "text": return <TextBlockRenderer key={i} block={block} />;
                case "city_card": return <CityCardRenderer key={i} block={block} city={cityMap.get(block.city_slug)} />;
                case "pullquote": return <PullquoteRenderer key={i} block={block} />;
                case "callout": return <CalloutRenderer key={i} block={block} />;
                case "faq": return <FaqRenderer key={i} block={block} />;
                default: return null;
              }
            })}
          </div>

          {/* All Cities grid (country guides) */}
          {guide.guide_type === "country" && cities && cities.length > 0 && (
            <section className="mt-16 space-y-6">
              <h2 className="font-display text-2xl font-bold">All Cities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cities.map(c => (
                  <Link key={c.slug} to={`/city/${c.slug}`}
                    className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/40 transition-colors">
                    <p className="font-display font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.lounge_count} lounges</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* More Guides */}
          {moreGuides && moreGuides.length > 0 && (
            <section className="mt-16 space-y-6">
              <h2 className="font-display text-2xl font-bold">More Guides</h2>
              <div className="grid gap-3">
                {moreGuides.map(g => (
                  <Link key={g.slug} to={`/guide/${g.slug}`}
                    className="flex items-center justify-between bg-card border border-border/50 rounded-xl p-4 hover:border-primary/40 transition-colors">
                    <div>
                      <p className="font-display font-semibold text-sm">{g.title}</p>
                      {g.country && <p className="text-xs text-muted-foreground">{g.country}</p>}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
