import { SiFacebook, SiTiktok } from "@icons-pack/react-simple-icons";
import { socialUrl } from "@/validators";

type Props = {
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  compact?: boolean;
};

export function SocialLinks({
  facebookUrl,
  tiktokUrl,
  compact = false,
}: Props) {
  const links = [
    { label: "Facebook", url: facebookUrl, icon: SiFacebook },
    { label: "TikTok", url: tiktokUrl, icon: SiTiktok },
  ].flatMap(({ url, ...link }) => {
    const parsed = socialUrl.safeParse(url ?? "");
    return parsed.success && parsed.data ? [{ ...link, url: parsed.data }] : [];
  });
  if (!links.length) return null;

  return (
    <div className={compact ? "social-group social-compact" : "social-group"}>
      {!compact && <p className="social-heading">Theo dõi VipeCam</p>}
      <div className="social-links">
        {links.map(({ label, url, icon: Icon }) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label} của VipeCam`}
            title={`${label} của VipeCam`}
            className="social-link"
          >
            <Icon size={20} aria-hidden="true" />
            {!compact && <span>{label}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
