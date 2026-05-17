import type { StructuredGuide } from "@/lib/guide-types";

export function GuideContent({ guide }: { guide: StructuredGuide }) {
  return (
    <div className="space-y-5">
      <Section title="简介">
        <p className="text-zinc-200">{guide.intro}</p>
      </Section>

      <Section title="推荐景点" icon="🗺️">
        <ItemList items={guide.attractions} />
      </Section>

      <Section title="当地美食" icon="🍜">
        <ItemList items={guide.food} />
      </Section>

      <Section title="住宿建议" icon="🏨">
        <ItemList items={guide.accommodation} />
      </Section>

      <Section title="最佳季节" icon="🌤️">
        <p className="text-zinc-200">{guide.season}</p>
      </Section>

      <Section title="交通建议" icon="🚇">
        <p className="text-zinc-200">{guide.transport}</p>
      </Section>

      <Section title="小贴士" icon="💡">
        <ul className="list-disc pl-5 space-y-1 text-zinc-200">
          {guide.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1">
        {icon && <span aria-hidden>{icon}</span>}
        <span>{title}</span>
      </h3>
      {children}
    </section>
  );
}

function ItemList({
  items,
}: {
  items: { name: string; description: string }[];
}) {
  if (items.length === 0)
    return <p className="text-zinc-500 text-xs">暂无</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="rounded-lg bg-zinc-800/60 px-3 py-2 border border-zinc-800"
        >
          <p className="font-medium text-zinc-100">{item.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
