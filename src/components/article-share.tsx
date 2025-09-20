"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ArticleShareProps {
  title: string;
  url: string;
}

export const ArticleShare = ({ title, url }: ArticleShareProps) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async (platform: 'twitter' | 'facebook' | 'copy') => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : url;
    
    switch (platform) {
      case 'twitter':
        if (typeof window !== 'undefined') {
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
            '_blank'
          );
        }
        break;
      case 'facebook':
        if (typeof window !== 'undefined') {
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            '_blank'
          );
        }
        break;
      case 'copy':
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          シェア
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleShare('twitter')}>
          X (Twitter)で共有
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('facebook')}>
          Facebookで共有
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('copy')}>
          {copied ? 'コピーしました！' : 'リンクをコピー'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};