import Link from "next/link";
import { GlobalMarketBar } from "@/components/GlobalMarketBar";
import { TickerWatchlist } from "@/components/TickerWatchlist";
import { SentimentDuel } from "@/components/SentimentDuel";
import { LazyMarketSentimentGauge } from "@/components/LazyCharts";
import { getCollection } from "@/lib/cms";

export default async function Home() {
  const articles = (await getCollection("analysis")).slice(0, 3);
  return <div className="max-w-[1240px] mx-auto space-y-8 pb-12">
    <header className="research-hero">
      <div className="text-xs font-semibold uppercase text-[var(--accent-strong)] mb-4">INVESTCOOL / 市场观察与研究</div>
      <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">看清市场，<br />让投资更从容。</h1>
      <p className="text-[var(--text-secondary)] max-w-xl mb-6">从核心资产到深度研究，把值得关注的信息放在一起，建立自己的投资判断。</p>
      <div className="flex flex-wrap gap-3"><Link className="primary-link" href="/analysis">浏览深度投研 ↗</Link><Link className="secondary-link" href="/tools">打开投资工具</Link></div>
    </header>
    <section aria-label="市场行情"><GlobalMarketBar /></section>
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
      <section><TickerWatchlist /></section>
      <div className="space-y-6"><section className="card p-6"><h2 className="font-bold mb-2">市场情绪观察</h2><p className="text-xs text-[var(--text-tertiary)] mb-3">基于技术与宏观数据的情绪指标</p><LazyMarketSentimentGauge /></section><SentimentDuel /></div>
    </div>
    <section className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-xl font-bold">研究手记</h2><Link href="/analysis" className="text-sm text-[var(--accent-strong)]">全部研究 →</Link></div>
      <div className="grid md:grid-cols-3 gap-4">{articles.map(article => <Link href={`/analysis/${article.slug}`} key={article.slug} className="card p-6 research-card"><span className="text-xs text-[var(--text-tertiary)]">{article.category || "深度研究"}</span><h3 className="font-bold text-lg my-3">{article.title}</h3><p className="text-sm text-[var(--text-secondary)] line-clamp-3">{article.description || article.summary}</p><span className="block mt-6 text-sm text-[var(--accent-strong)]">阅读研究 ↗</span></Link>)}</div>
    </section>
    <footer className="text-xs text-[var(--text-tertiary)] border-t border-[var(--border-color)] pt-5">行情可能存在延迟，请结合数据时间阅读。研究与计算工具供学习参考。</footer>
  </div>;
}
