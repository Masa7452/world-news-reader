import Image from "next/image";
import { ReactNode } from "react";

interface FeatureSectionProps {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  reversed?: boolean;
  children?: ReactNode;
}

export const FeatureSection = ({
  title,
  description,
  imageSrc,
  imageAlt,
  reversed = false,
  children
}: FeatureSectionProps) => {
  return (
    <section className="section">
      <div className="container">
        <div className={`grid gap-12 lg:gap-20 items-center ${reversed ? 'lg:grid-cols-2' : 'lg:grid-cols-2'}`}>
          {/* Text Content */}
          <div className={`space-y-6 ${reversed ? 'lg:order-2' : 'lg:order-1'}`}>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[color:var(--text)]">
              {title}
            </h2>
            <p className="text-lg text-[color:var(--mut)] leading-relaxed">
              {description}
            </p>
            {children && (
              <div className="space-y-4">
                {children}
              </div>
            )}
          </div>

          {/* Image */}
          <div className={`relative ${reversed ? 'lg:order-1' : 'lg:order-2'}`}>
            <div className="relative overflow-hidden rounded-2xl bg-[color:var(--card)] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={600}
                height={400}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};