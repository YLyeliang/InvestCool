import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const checklist = [
  "先办香港银行卡，再绑定券商入金。",
  "虚拟银行适合备用，实体银行更适合大额资金和长期使用。",
  "券商优先比较佣金、平台费、换汇成本、出入金速度。",
  "开户后先小额测试转入、换汇、买入、转出全链路。",
];

const avoidList = [
  "不要用临时邮箱或收不到验证码的手机号。",
  "不要把开户用途说成代收代付或频繁资金中转。",
  "不要忽略账户管理费、低结余费和跨境汇款中间行费用。",
];

export default function HKQuickGuidePage() {
  return (
    <div className="max-w-4xl pb-20">
      <Link href="/hk-account" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--success-color)] mb-8">
        <Icon name="lucide:arrow-left" className="size-4" />
        返回香港开户指南
      </Link>

      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-[var(--success-color)] text-xs font-black uppercase mb-5">
          <Icon name="lucide:zap" className="size-4" />
          Quick Path
        </div>
        <h2 className="text-4xl font-black text-[var(--text-primary)] mb-3">
          快速版开户指南.
        </h2>
        <p className="text-[var(--text-secondary)] text-lg font-semibold leading-8">
          如果你已经明确要配置港美股资产，这份清单用于快速确认办理顺序和关键风险点。
        </p>
      </header>

      <section className="card p-7 mb-6">
        <h3 className="text-xl font-black text-[var(--text-primary)] mb-5">核心顺序</h3>
        <div className="space-y-3">
          {checklist.map((item, index) => (
            <div key={item} className="flex items-start gap-3 text-base font-semibold text-[var(--text-secondary)]">
              <span className="size-6 rounded-lg bg-[var(--success-color)] text-white flex items-center justify-center text-xs font-black shrink-0">
                {index + 1}
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-7">
        <h3 className="text-xl font-black text-[var(--text-primary)] mb-5">避坑重点</h3>
        <ul className="space-y-3">
          {avoidList.map((item) => (
            <li key={item} className="flex items-start gap-3 text-base font-semibold text-[var(--text-secondary)]">
              <Icon name="lucide:alert-triangle" className="size-5 text-[var(--warning-color)] shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
