import Image from "next/image";

export function BrandLogo({ preload = false }: { preload?: boolean }) {
  return (
    <Image
      src="/images/logo.png"
      width={1159}
      height={382}
      alt="VipeCam - Cho thuê máy ảnh máy film"
      preload={preload}
      sizes="(max-width: 767px) 155px, 200px"
      className="brand-logo"
    />
  );
}
