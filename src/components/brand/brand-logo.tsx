import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: {
    icon: "h-10 w-10",
    agenda: "text-[27px]",
    praJa: "text-[30px]",
    lines: "mb-1.5 w-9 gap-1",
    lineHeight: "h-1.5",
    secondLine: "-mt-1",
    gap: "gap-2.5"
  },
  md: {
    icon: "h-12 w-12",
    agenda: "text-[38px]",
    praJa: "text-[42px]",
    lines: "mb-2 w-12 gap-1.5",
    lineHeight: "h-2",
    secondLine: "-mt-1.5",
    gap: "gap-3"
  },
  lg: {
    icon: "h-16 w-16",
    agenda: "text-[52px] md:text-[64px]",
    praJa: "text-[58px] md:text-[72px]",
    lines: "mb-3 w-16 gap-2",
    lineHeight: "h-2.5",
    secondLine: "-mt-2.5",
    gap: "gap-4"
  }
};

export function BrandLogo({ className, iconClassName, wordmarkClassName, size = "md" }: BrandLogoProps) {
  const current = sizes[size];

  return (
    <div className={cn("flex items-center", current.gap, className)} aria-label="Agenda Pra Já">
      <img
        src="/brand/logo-icon.png"
        alt=""
        className={cn("shrink-0 object-contain", current.icon, iconClassName)}
      />
      <div className={cn("font-display select-none leading-none tracking-normal", wordmarkClassName)}>
        <div className={cn("font-black leading-[0.88] text-[#082F8B]", current.agenda)}>Agenda</div>
        <div className={cn("flex items-end", current.secondLine)}>
          <span className={cn("mr-3 flex shrink-0 flex-col items-end", current.lines)} aria-hidden="true">
            <span className={cn("w-3/4 rounded-full bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8]", current.lineHeight)} />
            <span className={cn("w-full rounded-full bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8]", current.lineHeight)} />
            <span className={cn("w-5/6 rounded-full bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8]", current.lineHeight)} />
          </span>
          <span
            className={cn(
              "inline-block -skew-x-6 bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8] bg-clip-text font-black leading-[0.88] text-transparent",
              current.praJa
            )}
          >
            Pra
          </span>
          <span
            className={cn(
              "ml-2 inline-block -skew-x-6 bg-gradient-to-r from-[#22C55E] to-[#4ADE80] bg-clip-text font-black leading-[0.88] text-transparent",
              current.praJa
            )}
          >
            Já
          </span>
        </div>
      </div>
    </div>
  );
}
