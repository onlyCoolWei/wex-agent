import { ArrowRight } from "lucide-react";

export function GeneratedSitePreview() {
  return (
    <div className="relative min-h-full w-full overflow-hidden bg-[#dfe8d8] font-body text-[#152019] animate-appear">
      <nav className="relative z-10 flex h-[66px] items-center justify-between border-b border-[#1a261d]/25 px-[4%] text-[10px]">
        <strong className="font-display text-[17px]">FORM.</strong>
        <div className="hidden gap-6 md:flex">
          <span>Work</span>
          <span>Studio</span>
          <span>Contact</span>
        </div>
        <button className="rounded-sm bg-[#18231b] px-3 py-[9px] text-[9px] text-[#eaf0e7]">
          Start a project
        </button>
      </nav>
      <div className="relative z-10 flex min-h-[calc(100%-66px)] flex-col px-[6%] pb-[5%] pt-[8%]">
        <p className="text-[8px] font-bold tracking-[0.13em]">
          INDEPENDENT CREATIVE STUDIO · SHANGHAI
        </p>
        <h2 className="mt-[6%] font-display text-5xl leading-[0.88] font-normal sm:text-[72px] lg:text-[112px]">
          Ideas made
          <br />
          visible.
        </h2>
        <div className="mt-auto flex flex-col items-start gap-[25px] sm:flex-row sm:items-end sm:justify-between">
          <p className="mt-[60px] max-w-[300px] text-[11px] leading-[1.7]">
            We shape thoughtful identities and digital experiences for people building what comes
            next.
          </p>
          <span className="flex items-center gap-2 border-b border-[#27342b] pb-[5px] text-[9px] font-semibold">
            <ArrowRight size={18} /> Explore our work
          </span>
        </div>
      </div>
      <div className="absolute right-[-3%] top-[18%] w-[48%] rotate-[-12deg] aspect-square">
        <i className="absolute inset-0 rounded-full border border-[#26372a]/40 bg-lime/60" />
        <i className="absolute inset-[16%] rounded-full border border-[#26372a]/40 bg-[#fffcf1]/55" />
        <i className="absolute inset-[33%] rounded-full border border-[#26372a]/40 bg-[#374f3d]" />
      </div>
    </div>
  );
}
