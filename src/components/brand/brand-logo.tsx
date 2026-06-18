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
    agenda: "text-[22px]",
    praJa: "text-[24px]",
    lines: "w-8 gap-1"
  },
  md: {
    icon: "h-12 w-12",
    agenda: "text-[30px]",
    praJa: "text-[32px]",
    lines: "w-10 gap-1.5"
  },
  lg: {
    icon: "h-14 w-14",
    agenda: "text-[42px] md:text-[48px]",
    praJa: "text-[44px] md:text-[50px]",
    lines: "w-12 gap-1.5"
  }
};

export function BrandLogo({ className, iconClassName, wordmarkClassName, size = "md" }: BrandLogoProps) {
  const current = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="Agenda Pra Já">
      <img
        src="/brand/logo.svg"
        alt=""
        className={cn("shrink-0 object-contain", current.icon, iconClassName)}
      />
      <div className={cn("font-display leading-none", wordmarkClassName)}>
        <div className={cn("font-extrabold text-[#082F8B]", current.agenda)}>Agenda</div>
        <div className="mt-0.5 flex items-center">
          <span className={cn("mr-2 flex flex-col", current.lines)} aria-hidden="true">
            <span className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8]" />
            <span className="h-1.5 w-3/4 rounded-full bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8]" />
            <span className="h-1.5 w-1/2 rounded-full bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8]" />
          </span>
          <span className={cn("font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#0F5EF7] to-[#38BDF8]", current.praJa)}>
            Pra
          </span>
          <span className={cn("ml-1 font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] to-[#4ADE80]", current.praJa)}>
            Já
          </span>
        </div>
      </div>
    </div>
  );
}
