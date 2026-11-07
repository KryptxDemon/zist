export interface CuteAvatar {
  id: string;
  name: string;
  tag: string;
  svg: string;
}

export const cuteAvatars: readonly CuteAvatar[] = [
  {
    id: "milo",
    name: "Milo",
    tag: "Cosmic Cat",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="bg_cat" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><rect width="200" height="200" rx="60" fill="url(#bg_cat)"/><polygon points="65,85 50,45 85,65" fill="#ffffff"/><polygon points="65,80 55,55 80,70" fill="#f472b6"/><polygon points="135,85 150,45 115,65" fill="#ffffff"/><polygon points="135,80 145,55 120,70" fill="#f472b6"/><circle cx="100" cy="115" r="50" fill="#ffffff"/><circle cx="82" cy="110" r="6" fill="#1e1b4b"/><circle cx="118" cy="110" r="6" fill="#1e1b4b"/><circle cx="80" cy="108" r="2" fill="#ffffff"/><circle cx="116" cy="108" r="2" fill="#ffffff"/><polygon points="100,118 95,123 105,123" fill="#f472b6"/><path d="M 95 125 Q 100 130 105 125" stroke="#1e1b4b" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="72" cy="120" rx="6" ry="3.5" fill="#fbcfe8"/><ellipse cx="128" cy="120" rx="6" ry="3.5" fill="#fbcfe8"/><circle cx="45" cy="40" r="2" fill="#ffffff" opacity="0.8"/><circle cx="155" cy="40" r="2.5" fill="#ffffff" opacity="0.8"/><circle cx="160" cy="160" r="2" fill="#ffffff" opacity="0.8"/><circle cx="35" cy="155" r="2.5" fill="#ffffff" opacity="0.8"/></svg>`,
  },
  {
    id: "kiko",
    name: "Kiko",
    tag: "Kitsune Fox",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="bg_fox" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ea580c"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient></defs><rect width="200" height="200" rx="60" fill="url(#bg_fox)"/><polygon points="65,80 45,35 85,60" fill="#c2410c"/><polygon points="65,75 52,48 80,64" fill="#ffedd5"/><polygon points="135,80 155,35 115,60" fill="#c2410c"/><polygon points="135,75 148,48 120,64" fill="#ffedd5"/><circle cx="100" cy="115" r="50" fill="#f97316"/><path d="M 60 120 C 65 145 90 155 100 155 C 110 155 135 145 140 120 C 130 100 115 115 100 125 C 85 115 70 100 60 120 Z" fill="#ffffff"/><path d="M 75 105 Q 85 98 90 105" stroke="#431407" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M 125 105 Q 115 98 110 105" stroke="#431407" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="100" cy="126" rx="6" ry="4" fill="#431407"/><ellipse cx="68" cy="124" rx="7" ry="4" fill="#fecdd3"/><ellipse cx="132" cy="124" rx="7" ry="4" fill="#fecdd3"/></svg>`,
  },
  {
    id: "bao",
    name: "Bao",
    tag: "Mochi Panda",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="bg_panda" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs><rect width="200" height="200" rx="60" fill="url(#bg_panda)"/><circle cx="62" cy="72" r="18" fill="#18181b"/><circle cx="138" cy="72" r="18" fill="#18181b"/><circle cx="100" cy="115" r="50" fill="#ffffff"/><ellipse cx="80" cy="110" rx="12" ry="15" fill="#18181b" transform="rotate(-15 80 110)"/><ellipse cx="120" cy="110" rx="12" ry="15" fill="#18181b" transform="rotate(15 120 110)"/><circle cx="82" cy="108" r="4" fill="#ffffff"/><circle cx="118" cy="108" r="4" fill="#ffffff"/><ellipse cx="100" cy="124" rx="6" ry="4" fill="#18181b"/><path d="M 96 128 Q 100 133 104 128" stroke="#18181b" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="68" cy="124" rx="8" ry="5" fill="#fbcfe8"/><ellipse cx="132" cy="124" rx="8" ry="5" fill="#fbcfe8"/></svg>`,
  },
  {
    id: "luna",
    name: "Luna",
    tag: "Retro Bunny",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="bg_bunny" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs><rect width="200" height="200" rx="60" fill="url(#bg_bunny)"/><ellipse cx="78" cy="65" rx="13" ry="38" fill="#ffffff" transform="rotate(-10 78 65)"/><ellipse cx="78" cy="65" rx="7" ry="26" fill="#f472b6" transform="rotate(-10 78 65)"/><ellipse cx="122" cy="65" rx="13" ry="38" fill="#ffffff" transform="rotate(10 122 65)"/><ellipse cx="122" cy="65" rx="7" ry="26" fill="#f472b6" transform="rotate(10 122 65)"/><circle cx="100" cy="120" r="46" fill="#ffffff"/><circle cx="82" cy="116" r="6" fill="#3b0764"/><circle cx="118" cy="116" r="6" fill="#3b0764"/><circle cx="80" cy="114" r="2" fill="#ffffff"/><circle cx="116" cy="114" r="2" fill="#ffffff"/><ellipse cx="100" cy="124" rx="4" ry="3" fill="#f472b6"/><path d="M 96 127 Q 100 131 104 127" stroke="#3b0764" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="68" cy="126" rx="7" ry="4" fill="#fbcfe8"/><ellipse cx="132" cy="126" rx="7" ry="4" fill="#fbcfe8"/></svg>`,
  },
  {
    id: "rexy",
    name: "Rexy",
    tag: "Baby Dino",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="bg_dino" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0d9488"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><rect width="200" height="200" rx="60" fill="url(#bg_dino)"/><polygon points="80,68 88,52 96,68" fill="#facc15"/><polygon points="98,64 106,46 114,64" fill="#facc15"/><polygon points="116,68 124,52 132,68" fill="#facc15"/><ellipse cx="100" cy="115" rx="48" ry="44" fill="#4ade80"/><ellipse cx="100" cy="124" rx="36" ry="26" fill="#bbf7d0"/><circle cx="80" cy="106" r="7" fill="#064e3b"/><circle cx="120" cy="106" r="7" fill="#064e3b"/><circle cx="78" cy="104" r="2.5" fill="#ffffff"/><circle cx="118" cy="104" r="2.5" fill="#ffffff"/><circle cx="94" cy="118" r="2" fill="#064e3b"/><circle cx="106" cy="118" r="2" fill="#064e3b"/><path d="M 94 126 Q 100 132 106 126" stroke="#064e3b" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="68" cy="116" rx="6" ry="3.5" fill="#86efac"/></svg>`,
  },
  {
    id: "kuma",
    name: "Kuma",
    tag: "Coffee Bear",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="bg_bear" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#b45309"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><rect width="200" height="200" rx="60" fill="url(#bg_bear)"/><circle cx="65" cy="72" r="18" fill="#78350f"/><circle cx="65" cy="72" r="10" fill="#fde68a"/><circle cx="135" cy="72" r="18" fill="#78350f"/><circle cx="135" cy="72" r="10" fill="#fde68a"/><circle cx="100" cy="116" r="48" fill="#92400e"/><ellipse cx="100" cy="124" rx="24" ry="18" fill="#fde68a"/><circle cx="82" cy="108" r="6" fill="#451a03"/><circle cx="118" cy="108" r="6" fill="#451a03"/><circle cx="80" cy="106" r="2" fill="#ffffff"/><circle cx="116" cy="106" r="2" fill="#ffffff"/><ellipse cx="100" cy="118" rx="7" ry="5" fill="#451a03"/><path d="M 96 125 Q 100 129 104 125" stroke="#451a03" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="70" cy="120" rx="7" ry="4" fill="#fca5a5"/><ellipse cx="130" cy="120" rx="7" ry="4" fill="#fca5a5"/></svg>`,
  },
  {
    id: "hoot",
    name: "Hoot",
    tag: "Wise Owlet",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="bg_owl" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#4338ca"/></linearGradient></defs><rect width="200" height="200" rx="60" fill="url(#bg_owl)"/><polygon points="65,70 55,42 80,60" fill="#818cf8"/><polygon points="135,70 145,42 120,60" fill="#818cf8"/><ellipse cx="100" cy="118" rx="46" ry="48" fill="#6366f1"/><circle cx="78" cy="108" r="18" fill="#ffffff"/><circle cx="122" cy="108" r="18" fill="#ffffff"/><circle cx="80" cy="108" r="10" fill="#f59e0b"/><circle cx="120" cy="108" r="10" fill="#f59e0b"/><circle cx="80" cy="108" r="6" fill="#1e1b4b"/><circle cx="120" cy="108" r="6" fill="#1e1b4b"/><circle cx="78" cy="106" r="2.5" fill="#ffffff"/><circle cx="118" cy="106" r="2.5" fill="#ffffff"/><polygon points="100,116 95,124 105,124" fill="#f59e0b"/><ellipse cx="100" cy="140" rx="24" ry="16" fill="#e0e7ff"/></svg>`,
  },
  {
    id: "hachi",
    name: "Hachi",
    tag: "Astro Shiba",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="bg_shiba" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient></defs><rect width="200" height="200" rx="60" fill="url(#bg_shiba)"/><circle cx="100" cy="115" r="54" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/><polygon points="68,82 58,54 82,72" fill="#d97706"/><polygon points="132,82 142,54 118,72" fill="#d97706"/><circle cx="100" cy="115" r="42" fill="#f59e0b"/><ellipse cx="100" cy="124" rx="26" ry="18" fill="#ffffff"/><circle cx="82" cy="110" r="5" fill="#1e293b"/><circle cx="118" cy="110" r="5" fill="#1e293b"/><ellipse cx="100" cy="118" rx="6" ry="4" fill="#1e293b"/><path d="M 96 124 Q 100 128 104 124" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="74" cy="118" rx="5" ry="3" fill="#fbcfe8"/><ellipse cx="126" cy="118" rx="5" ry="3" fill="#fbcfe8"/></svg>`,
  },
];

export function getCuteAvatarUri(svgMarkup: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarkup.trim())}`;
}

export function getInitials(
  firstName: string,
  lastName: string,
  displayName: string,
): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  if (first || last) return `${first}${last}`.trim().toUpperCase();

  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }

  return (displayName.trim().charAt(0) || "U").toUpperCase();
}

export function createInitialsAvatar(
  initials: string,
  colors: readonly [string, string] = ["#1f2937", "#4f46e5"],
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colors[0]}" />
          <stop offset="100%" stop-color="${colors[1]}" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#bg)" />
      <circle cx="256" cy="256" r="176" fill="rgba(255,255,255,0.08)" />
      <text x="50%" y="54%" text-anchor="middle" font-family="Arial, sans-serif" font-size="164" font-weight="700" fill="white" dominant-baseline="middle">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
