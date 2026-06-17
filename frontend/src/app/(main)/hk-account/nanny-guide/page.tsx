import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const steps = [
  {
    title: "出发前材料",
    items: ["身份证、港澳通行证", "内地住址证明或水电账单", "手机号与邮箱可正常收验证码"],
  },
  {
    title: "预约与到店",
    items: ["优先预约中银香港、汇丰、渣打等实体网点", "准备开户用途说明：投资、收款、跨境消费", "现场保持回答一致，不主动提及高频资金周转"],
  },
  {
    title: "账户激活",
    items: ["当天完成网银和 App 登录", "小额入金测试转账链路", "开启转账限额、双重验证与交易通知"],
  },
];

export default function HKNannyGuidePage() {
  return (
    <div className="max-w-4xl pb-20">
      <Link href="/hk-account" className="inline-flex items-center gap-2 text-sm font-bold text-blue-500 mb-8">
        <Icon name="lucide:arrow-left" className="size-4" />
        返回香港开户指南
      </Link>

      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 text-[0.75rem] font-black uppercase tracking-widest mb-5">
          <Icon name="lucide:book-open-check" className="size-4" />
          Step-by-step
        </div>
        <h2 className="text-4xl font-black tracking-tighter text-[var(--text-primary)] mb-3">
          保姆级开户指南.
        </h2>
        <p className="text-[var(--text-secondary)] text-lg font-medium leading-relaxed">
          适合第一次办理香港银行卡和券商账户的投资者。重点是材料齐、话术稳、到店流程不走回头路。
        </p>
      </header>

      <div className="space-y-5">
        {steps.map((step, index) => (
          <section key={step.title} className="card p-7">
            <div className="flex items-center gap-4 mb-5">
              <span className="size-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black">
                {index + 1}
              </span>
              <h3 className="text-xl font-black text-[var(--text-primary)]">{step.title}</h3>
            </div>
            <ul className="space-y-3">
              {step.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium text-[var(--text-secondary)]">
                  <Icon name="lucide:check-circle-2" className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
