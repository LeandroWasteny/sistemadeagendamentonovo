import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  iconClassName?: string;
  showName?: boolean;
  wordmarkClassName?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: {
    icon: "h-10 w-10",
    agenda: "text-[22px]",
    praJa: "text-[24px]",
    lines: "mb-1 w-6 gap-0.5",
    lineHeight: "h-1",
    secondLine: "-mt-0.5 ml-[15px]",
    gap: "gap-2.5"
  },
  md: {
    icon: "h-12 w-12",
    agenda: "text-[31px]",
    praJa: "text-[34px]",
    lines: "mb-1.5 w-8 gap-1",
    lineHeight: "h-1.5",
    secondLine: "-mt-1 ml-[22px]",
    gap: "gap-3"
  },
  lg: {
    icon: "h-16 w-16",
    agenda: "text-[38px] md:text-[46px]",
    praJa: "text-[42px] md:text-[50px]",
    lines: "mb-2 w-10 gap-1",
    lineHeight: "h-1.5",
    secondLine: "-mt-1.5 ml-[28px] md:ml-[34px]",
    gap: "gap-4"
  }
};

export function BrandLogo({ className, iconClassName, showName = true, wordmarkClassName, size = "md" }: BrandLogoProps) {
  const current = sizes[size];

  return (
    <div className={cn("inline-flex items-center", current.gap, className)} aria-label="Agenda Pra Já">
      <img
        src="/brand/logo-icon.png"
        alt=""
        className={cn("shrink-0 object-contain", current.icon, iconClassName)}
      />
      {showName && (
        <div className={cn("font-display select-none leading-none tracking-normal", wordmarkClassName)}>
          <div className={cn("font-black leading-[0.92] text-[#082F8B]", current.agenda)}>Agenda</div>
          <div className={cn("flex items-end", current.secondLine)}>
            <span className={cn("mr-2 flex shrink-0 flex-col items-end", current.lines)} aria-hidden="true">
              <span className={cn("w-4/5 rounded-full bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8]", current.lineHeight)} />
              <span className={cn("w-full rounded-full bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8]", current.lineHeight)} />
              <span className={cn("w-3/4 rounded-full bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8]", current.lineHeight)} />
            </span>
            <span
              className={cn(
                "inline-block -skew-x-6 bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8] bg-clip-text font-black italic leading-[0.92] text-transparent",
                current.praJa
              )}
            >
              Pra
            </span>
            <span
              className={cn(
                "ml-1.5 inline-block -skew-x-6 bg-gradient-to-r from-[#22C55E] to-[#4ADE80] bg-clip-text font-black italic leading-[0.92] text-transparent",
                current.praJa
              )}
            >
              Já
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
